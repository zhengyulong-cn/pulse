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

export type PineLabel = {
  backgroundColor?: string
  position?: 'down' | 'up'
  text: string
  textColor?: string
  time: Time
  value: number
}

type LabelCoordinate = PineLabel & { x: number; y: number }

class PineLabelRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly labels: LabelCoordinate[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context, horizontalPixelRatio, verticalPixelRatio } = scope
      const fontSize = 12 * verticalPixelRatio
      const paddingX = 5 * horizontalPixelRatio
      const paddingY = 3 * verticalPixelRatio
      context.save()
      context.font = `${fontSize}px sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'

      for (const label of this.labels) {
        const x = label.x * horizontalPixelRatio
        const y = label.y * verticalPixelRatio
        const textWidth = context.measureText(label.text).width
        const width = textWidth + paddingX * 2
        const height = fontSize + paddingY * 2

        context.fillStyle = label.backgroundColor ?? '#2962ff'
        context.beginPath()
        context.roundRect(
          x - width / 2,
          label.position === 'up' ? y : y - height,
          width,
          height,
          3 * verticalPixelRatio,
        )
        context.fill()
        context.fillStyle = label.textColor ?? '#ffffff'
        context.fillText(label.text, x, label.position === 'up' ? y + height / 2 : y - height / 2)
      }
      context.restore()
    })
  }
}

class PineLabelPaneView implements IPrimitivePaneView {
  private coordinates: LabelCoordinate[] = []

  constructor(
    private readonly chart: SeriesAttachedParameter<Time, SeriesType>['chart'],
    private readonly series: ISeriesApi<SeriesType>,
    private readonly labels: () => PineLabel[],
  ) {}

  update() {
    this.coordinates = this.labels().flatMap((label) => {
      const x = this.chart.timeScale().timeToCoordinate(label.time)
      const y = this.series.priceToCoordinate(label.value)
      if (x === null || y === null) return []
      return [{ ...label, x, y }]
    })
  }

  renderer() {
    return this.coordinates.length === 0 ? null : new PineLabelRenderer(this.coordinates)
  }
}

export class PineLabelPrimitive implements ISeriesPrimitive<Time> {
  private labels: PineLabel[] = []
  private paneView: PineLabelPaneView | undefined
  private requestUpdate: (() => void) | undefined

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new PineLabelPaneView(parameter.chart, parameter.series, () => this.labels)
  }

  updateAllViews() {
    this.paneView?.update()
  }

  paneViews() {
    return this.paneView ? [this.paneView] : []
  }

  setLabels(labels: PineLabel[]) {
    this.labels = labels
    this.paneView?.update()
    this.requestUpdate?.()
  }
}
