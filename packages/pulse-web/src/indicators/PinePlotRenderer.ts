import { PineTS } from 'pinets'

export type PineChartBar = {
  close: number
  high: number
  low: number
  open: number
  time: number
  volume: number
}

type ChartPoint = {
  price: number
  time: number
}

export type PineChartApi = {
  createMultipointShape: (points: ChartPoint[], options: Record<string, unknown>) => Promise<string>
  createShape: (point: ChartPoint | Pick<ChartPoint, 'time'>, options: Record<string, unknown>) => Promise<string>
  removeEntity: (entityId: string) => void
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const toNumber = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
)

const toChartTime = (value: number) => value > 10_000_000_000 ? Math.trunc(value / 1000) : value

const getColor = (value: unknown, fallback: string) => {
  if (typeof value !== 'string' || value.length === 0) return fallback

  return /^#[0-9a-f]{8}$/i.test(value) ? value.slice(0, 7) : value
}

const getLineStyle = (style: unknown) => {
  if (style === 'style_dotted') return 1
  if (style === 'style_dashed') return 2
  return 0
}

const getPlotItems = (plots: unknown, name: string) => {
  if (!isRecord(plots)) return []

  return Object.entries(plots)
    .filter(([key]) => key === name || key.startsWith(`${name}-`))
    .flatMap(([, plot]) => {
      if (!isRecord(plot) || !Array.isArray(plot.data)) return []

      return plot.data.flatMap((item) => isRecord(item) && Array.isArray(item.value) ? item.value : [item])
    })
}

export class PinePlotRenderer {
  private bars: PineChartBar[] = []
  private chart: PineChartApi | undefined
  private drawingIds: string[] = []
  private renderVersion = 0
  private visible = true

  constructor(private readonly source: string) {}

  setChart(chart: PineChartApi) {
    this.clearDrawings()
    this.chart = chart
    void this.render()
  }

  setBars(nextBars: PineChartBar[]) {
    this.bars = [...nextBars].sort((first, second) => first.time - second.time)
    void this.render()
  }

  setVisible(visible: boolean) {
    if (this.visible === visible) return

    this.visible = visible
    this.renderVersion += 1
    if (!visible) {
      this.clearDrawings()
      return
    }
    void this.render()
  }

  dispose() {
    this.renderVersion += 1
    this.clearDrawings()
    this.chart = undefined
    this.bars = []
  }

  private getPoint(value: unknown): ChartPoint | undefined {
    if (!isRecord(value)) return undefined

    const price = toNumber(value.price)
    const timestamp = toNumber(value.timestamp)
    const barIndex = toNumber(value.barIndex)
    const time = timestamp ?? (barIndex === undefined ? undefined : this.bars[barIndex]?.time)
    if (price === undefined || time === undefined) return undefined

    return { price, time: toChartTime(time) }
  }

  private getBarPoint(barIndex: unknown, price: unknown): ChartPoint | undefined {
    const index = toNumber(barIndex)
    const pointPrice = toNumber(price)
    const time = index === undefined ? undefined : this.bars[index]?.time
    if (pointPrice === undefined || time === undefined) return undefined

    return { price: pointPrice, time: toChartTime(time) }
  }

  private clearDrawings() {
    for (const drawingId of this.drawingIds) {
      this.chart?.removeEntity(drawingId)
    }
    this.drawingIds = []
  }

  private async drawLine(line: unknown, version: number) {
    if (!this.chart || !isRecord(line)) return

    const start = this.getPoint(line.start) ?? this.getBarPoint(line.x1, line.y1)
    const end = this.getPoint(line.end) ?? this.getBarPoint(line.x2, line.y2)
    if (!start || !end) return

    const drawingId = await this.chart.createMultipointShape([start, end], {
      shape: 'trend_line',
      lock: true,
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      overrides: {
        extendLeft: line.extend === 'left' || line.extend === 'both',
        extendRight: line.extend === 'right' || line.extend === 'both',
        linecolor: getColor(line.color, '#000000'),
        linestyle: getLineStyle(line.style),
        linewidth: toNumber(line.width) ?? 1,
      },
    })
    this.trackDrawing(drawingId, version)
  }

  private async drawLabel(label: unknown, version: number) {
    if (!this.chart || !isRecord(label)) return

    const point = this.getPoint(label) ?? this.getBarPoint(label.x, label.y)
    if (!point) return

    const drawingId = await this.chart.createShape(point, {
      shape: 'text',
      text: typeof label.text === 'string' ? label.text : '',
      lock: true,
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      overrides: {
        color: getColor(label.color, '#000000'),
        textColor: getColor(label.textcolor, '#ffffff'),
      },
    })
    this.trackDrawing(drawingId, version)
  }

  private async drawBox(box: unknown, version: number) {
    if (!this.chart || !isRecord(box)) return

    const left = toNumber(box.left)
    const right = toNumber(box.right)
    const top = toNumber(box.top)
    const bottom = toNumber(box.bottom)
    if (left === undefined || right === undefined || top === undefined || bottom === undefined) return

    const startTime = this.bars[left]?.time
    const endTime = this.bars[right]?.time
    if (startTime === undefined || endTime === undefined) return

    const drawingId = await this.chart.createMultipointShape([
      { price: top, time: toChartTime(startTime) },
      { price: bottom, time: toChartTime(endTime) },
    ], {
      shape: 'rectangle',
      lock: true,
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      overrides: {
        backgroundColor: getColor(box.bgcolor, '#000000'),
        borderColor: getColor(box.border_color, '#000000'),
        linewidth: toNumber(box.border_width) ?? 1,
      },
    })
    this.trackDrawing(drawingId, version)
  }

  private trackDrawing(drawingId: string, version: number) {
    if (version === this.renderVersion) {
      this.drawingIds.push(drawingId)
      return
    }
    this.chart?.removeEntity(drawingId)
  }

  private async render() {
    if (!this.visible || !this.chart || this.bars.length === 0) return

    const version = ++this.renderVersion
    const candles = this.bars.map((bar) => ({
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      openTime: bar.time,
    }))

    try {
      const context = await new PineTS(candles).run(this.source)
      if (version !== this.renderVersion || !this.chart) return

      this.clearDrawings()
      for (const line of getPlotItems(context.plots, '__lines__')) await this.drawLine(line, version)
      for (const label of getPlotItems(context.plots, '__labels__')) await this.drawLabel(label, version)
      for (const box of getPlotItems(context.plots, '__boxes__')) await this.drawBox(box, version)
    } catch (error) {
      console.error('Failed to render Pine indicator', error)
    }
  }
}
