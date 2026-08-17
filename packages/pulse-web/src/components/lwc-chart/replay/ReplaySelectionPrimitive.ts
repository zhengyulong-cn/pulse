import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'

class ReplaySelectionRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly x: number) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ bitmapSize, context, horizontalPixelRatio }) => {
      context.save()
      context.strokeStyle = '#2563eb'
      context.lineWidth = 2 * horizontalPixelRatio
      context.setLineDash([5 * horizontalPixelRatio, 4 * horizontalPixelRatio])
      context.beginPath()
      context.moveTo(this.x * horizontalPixelRatio, 0)
      context.lineTo(this.x * horizontalPixelRatio, bitmapSize.height)
      context.stroke()
      context.restore()
    })
  }
}

class ReplaySelectionPaneView implements IPrimitivePaneView {
  private x: number | undefined

  constructor(
    private readonly chart: SeriesAttachedParameter<Time, SeriesType>['chart'],
    private readonly getTime: () => Time | undefined,
  ) {}

  update() {
    const time = this.getTime()
    this.x = time === undefined ? undefined : this.chart.timeScale().timeToCoordinate(time) ?? undefined
  }

  renderer() {
    return this.x === undefined ? null : new ReplaySelectionRenderer(this.x)
  }
}

export class ReplaySelectionPrimitive implements ISeriesPrimitive<Time> {
  private time: Time | undefined
  private paneView: ReplaySelectionPaneView | undefined
  private requestUpdate: (() => void) | undefined

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new ReplaySelectionPaneView(parameter.chart, () => this.time)
  }

  updateAllViews() {
    this.paneView?.update()
  }

  paneViews() {
    return this.paneView ? [this.paneView] : []
  }

  setTime(time: Time | undefined) {
    this.time = time
    this.paneView?.update()
    this.requestUpdate?.()
  }
}
