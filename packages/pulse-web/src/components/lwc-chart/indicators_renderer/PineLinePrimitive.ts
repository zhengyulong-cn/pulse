import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'

export type PineLine = {
  color?: string
  endTime: Time
  extend?: string
  endValue: number
  startTime: Time
  startValue: number
  style?: string
  width?: number
}

type LineCoordinates = PineLine & {
  endX: number
  endY: number
  startX: number
  startY: number
}

class PineLineRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly lines: LineCoordinates[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context, horizontalPixelRatio, bitmapSize, verticalPixelRatio } = scope
      context.save()
      for (const line of this.lines) {
        const startX = line.startX * horizontalPixelRatio
        const startY = line.startY * verticalPixelRatio
        const endX = line.endX * horizontalPixelRatio
        const endY = line.endY * verticalPixelRatio
        const deltaX = endX - startX
        const deltaY = endY - startY
        const length = Math.hypot(deltaX, deltaY)
        if (length === 0) continue

        const extendLeft = line.extend === 'left' || line.extend === 'both'
        const extendRight = line.extend === 'right' || line.extend === 'both'
        const directionX = deltaX / length
        const directionY = deltaY / length
        const drawStartX = extendLeft ? startX - directionX * bitmapSize.width : startX
        const drawStartY = extendLeft ? startY - directionY * bitmapSize.width : startY
        const drawEndX = extendRight ? endX + directionX * bitmapSize.width : endX
        const drawEndY = extendRight ? endY + directionY * bitmapSize.width : endY

        context.beginPath()
        context.strokeStyle = line.color ?? '#2962ff'
        context.lineWidth = (line.width ?? 1) * verticalPixelRatio
        context.setLineDash(
          line.style === 'style_dashed'
            ? [6 * horizontalPixelRatio, 4 * horizontalPixelRatio]
            : line.style === 'style_dotted'
              ? [2 * horizontalPixelRatio, 3 * horizontalPixelRatio]
              : [],
        )
        context.moveTo(drawStartX, drawStartY)
        context.lineTo(drawEndX, drawEndY)
        context.stroke()
      }
      context.restore()
    })
  }
}

class PineLinePaneView implements IPrimitivePaneView {
  private coordinates: LineCoordinates[] = []

  constructor(
    private readonly chart: SeriesAttachedParameter<Time, SeriesType>['chart'],
    private readonly series: ISeriesApi<SeriesType>,
    private readonly lines: () => PineLine[],
  ) {}

  update() {
    this.coordinates = this.lines().flatMap((line) => {
      const startX = this.chart.timeScale().timeToCoordinate(line.startTime)
      const endX = this.chart.timeScale().timeToCoordinate(line.endTime)
      const startY = this.series.priceToCoordinate(line.startValue)
      const endY = this.series.priceToCoordinate(line.endValue)
      if (startX === null || endX === null || startY === null || endY === null) return []
      return [{ ...line, startX, startY, endX, endY }]
    })
  }

  renderer() {
    return this.coordinates.length === 0 ? null : new PineLineRenderer(this.coordinates)
  }
}

export class PineLinePrimitive implements ISeriesPrimitive<Time> {
  private lines: PineLine[] = []
  private paneView: PineLinePaneView | undefined
  private requestUpdate: (() => void) | undefined

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new PineLinePaneView(parameter.chart, parameter.series, () => this.lines)
  }

  updateAllViews() {
    this.paneView?.update()
  }

  paneViews() {
    return this.paneView ? [this.paneView] : []
  }

  setLines(lines: PineLine[]) {
    this.lines = lines
    this.paneView?.update()
    this.requestUpdate?.()
  }
}
