import { PineTS } from 'pinets'
import {
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type SeriesType,
  type Time,
} from 'lightweight-charts'
import { PineLabelPrimitive, type PineLabel } from './PineLabelPrimitive'
import { getPlotItems } from './PinePlotItems'
import { PineLinePrimitive, type PineLine } from './PineLinePrimitive'

type PinePlotPoint = {
  time?: number
  timestamp?: number
  value?: number
  options?: Record<string, any>
}

type PinePlot = {
  data?: unknown[]
  options?: { color?: string, style?: string }
}

type PineLineItem = {
  color?: string
  extend?: string
  end?: { price?: number, timestamp?: number }
  style?: string
  start?: { price?: number, timestamp?: number }
  width?: number
  x1?: number
  x2?: number
  xloc?: string
  y1?: number
  y2?: number
}

type PineLabelItem = {
  color?: string
  text?: string
  textcolor?: string
  x?: number
  xloc?: string
  y?: number
  yloc?: string
}

type PineCandle = {
  high: number
  low: number
  openTime: Time
}

const toTimestamp = (time: unknown): Time | undefined => {
  if (typeof time !== 'number' || !Number.isFinite(time)) return undefined
  return (time > 10_000_000_000 ? Math.trunc(time / 1_000) : Math.trunc(time)) as Time
}

const toPlotPoints = (plot: PinePlot) => (plot.data ?? []).flatMap((item, index) => {
  const points = Array.isArray((item as { value?: unknown }).value)
    ? (item as { value: unknown[] }).value
    : [item]
  return points.flatMap((pointValue) => {
    const point = pointValue as PinePlotPoint
    const time = toTimestamp(point.timestamp ?? point.time)
    const value = point.value
    const options = point.options
    if (time === undefined || typeof value !== 'number' || !Number.isFinite(value)) return []
    return [{ time, value, index, ...options }]
  })
})

const isHistogram = (plot: PinePlot) => plot.options?.style === 'histogram' || plot.options?.style === 'columns'

export class PinePlotIndicator implements ISeriesPrimitive<Time> {
  private baseSeries: ISeriesApi<SeriesType> | undefined
  private chart: IChartApi | undefined
  private plotSeries = new Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>()
  private linePrimitive = new PineLinePrimitive()
  private labelPrimitive = new PineLabelPrimitive()
  private renderVersion = 0

  constructor(private readonly source: string) {}

  attached({ chart, series }: SeriesAttachedParameter<Time, SeriesType>) {
    this.chart = chart
    this.baseSeries = series
    series.attachPrimitive(this.linePrimitive)
    series.attachPrimitive(this.labelPrimitive)
    series.subscribeDataChanged(this.update)
    void this.update()
  }

  detached() {
    this.renderVersion += 1
    this.baseSeries?.unsubscribeDataChanged(this.update)
    this.baseSeries?.detachPrimitive(this.linePrimitive)
    this.baseSeries?.detachPrimitive(this.labelPrimitive)
    this.plotSeries.forEach((series) => this.chart?.removeSeries(series))
    this.plotSeries.clear()
    this.baseSeries = undefined
    this.chart = undefined
  }

  private drawPlots = (plots: unknown) => {
    const activePlotNames = new Set(getPlotItems(plots, 'plot').map((item) => item.key))
    this.plotSeries.forEach((series, name) => {
      if (!activePlotNames.has(name)) {
        this.chart?.removeSeries(series)
        this.plotSeries.delete(name)
      }
    })

    getPlotItems(plots, 'plot').forEach(({ key, value }) => {
      const plot = value as PinePlot
      const points = toPlotPoints(plot)
      const existingSeries = this.plotSeries.get(key)
      const histogram = isHistogram(plot)
      const series = existingSeries ?? (histogram
        ? this.chart!.addSeries(HistogramSeries, { color: plot.options?.color })
        : this.chart!.addSeries(LineSeries, { color: plot.options?.color, lineWidth: 2 }))
      this.plotSeries.set(key, series)
      series.setData(points.map(({ index: _index, ...point }) => point))
    })
  }

  private drawLines = (plots: unknown, candles: PineCandle[]) => {
    const lines = getPlotItems(plots, 'line').flatMap(({ value }) => {
      const line = value as PineLineItem
      const startValue = line.start?.price ?? line.y1
      const endValue = line.end?.price ?? line.y2
      const startTime = toTimestamp(line.start?.timestamp) ?? this.toLineTime(line.x1, line.xloc, candles)
      const endTime = toTimestamp(line.end?.timestamp) ?? this.toLineTime(line.x2, line.xloc, candles)
      if (typeof startValue !== 'number' || typeof endValue !== 'number' || startTime === undefined || endTime === undefined) return []
      return [{
        color: line.color,
        extend: line.extend,
        endTime,
        endValue,
        startTime,
        startValue,
        style: line.style,
        width: line.width,
      } satisfies PineLine]
    })
    this.linePrimitive.setLines(lines)
  }

  private drawLabels = (plots: unknown, candles: PineCandle[]) => {
    console.log(plots)
    const labels = getPlotItems(plots, 'label').flatMap(({ value }) => {
      if (!value || typeof value !== 'object') return []
      const label = value as PineLabelItem
      const time = this.toLineTime(label.x, label.xloc, candles)
      const candle = typeof label.x === 'number' && label.xloc !== 'bar_time'
        ? candles[Math.trunc(label.x)]
        : undefined
      const price = typeof label.y === 'number'
        ? label.y
        : label.yloc === 'abovebar'
          ? candle?.high
          : label.yloc === 'belowbar'
            ? candle?.low
            : undefined
      if (time === undefined || price === undefined) return []
      return [{
        backgroundColor: label.color,
        text: label.text ?? '',
        textColor: label.textcolor,
        time,
        value: price,
      } satisfies PineLabel]
    })
    this.labelPrimitive.setLabels(labels)
  }

  private toLineTime = (value: unknown, xloc: unknown, candles: PineCandle[]) => {
    if (typeof value !== 'number') return undefined
    if (xloc === 'bar_time') return toTimestamp(value)
    return candles[Math.trunc(value)]?.openTime
  }

  private update = async () => {
    const baseSeries = this.baseSeries
    if (!baseSeries) return

    const candles = baseSeries.data().flatMap((item) => {
      if (!('open' in item) || typeof item.open !== 'number') return []
      const time = toTimestamp(item.time)
      if (time === undefined) return []
      return [{
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: 'volume' in item && typeof item.volume === 'number' ? item.volume : 0,
        openTime: time,
      }]
    })
    if (candles.length === 0) return

    const version = ++this.renderVersion
    const context = await new PineTS(candles).run(this.source)
    if (version !== this.renderVersion || !this.chart) return

    this.drawPlots(context.plots)
    this.drawLines(context.plots, candles)
    this.drawLabels(context.plots, candles)
  }
}
