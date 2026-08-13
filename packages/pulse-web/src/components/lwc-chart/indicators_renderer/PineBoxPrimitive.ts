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

export type PineBox = {
  backgroundColor?: string
  borderColor?: string
  borderStyle?: string
  borderWidth?: number
  bottom: number
  extend?: string
  leftTime: Time
  rightTime: Time
  top: number
}

type BoxCoordinates = PineBox & { bottomY: number, leftX: number, rightX: number, topY: number }

const withTransparency = (color: string, alpha = '33') => (
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
)

class PineBoxRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly boxes: BoxCoordinates[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      const { bitmapSize, context, horizontalPixelRatio, verticalPixelRatio } = scope
      context.save()
      for (const box of this.boxes) {
        const extendLeft = box.extend === 'left' || box.extend === 'both'
        const extendRight = box.extend === 'right' || box.extend === 'both'
        const left = (extendLeft ? 0 : box.leftX) * horizontalPixelRatio
        const right = (extendRight ? bitmapSize.width / horizontalPixelRatio : box.rightX) * horizontalPixelRatio
        const top = Math.min(box.topY, box.bottomY) * verticalPixelRatio
        const bottom = Math.max(box.topY, box.bottomY) * verticalPixelRatio
        const width = right - left
        const height = bottom - top
        if (width <= 0 || height <= 0) continue

        context.fillStyle = box.backgroundColor ?? 'rgba(41, 98, 255, 0.15)'
        context.fillRect(left, top, width, height)
        context.beginPath()
        context.strokeStyle = box.borderColor ?? withTransparency(box.backgroundColor ?? '#2962ff', 'cc')
        context.lineWidth = (box.borderWidth ?? 1) * verticalPixelRatio
        context.setLineDash(box.borderStyle === 'style_dashed'
          ? [6 * horizontalPixelRatio, 4 * horizontalPixelRatio]
          : box.borderStyle === 'style_dotted'
            ? [2 * horizontalPixelRatio, 3 * horizontalPixelRatio]
            : [])
        context.rect(left, top, width, height)
        context.stroke()
      }
      context.restore()
    })
  }
}

class PineBoxPaneView implements IPrimitivePaneView {
  private coordinates: BoxCoordinates[] = []

  constructor(
    private readonly chart: SeriesAttachedParameter<Time, SeriesType>['chart'],
    private readonly series: ISeriesApi<SeriesType>,
    private readonly boxes: () => PineBox[],
  ) {}

  update() {
    this.coordinates = this.boxes().flatMap((box) => {
      const leftX = this.chart.timeScale().timeToCoordinate(box.leftTime)
      const rightX = this.chart.timeScale().timeToCoordinate(box.rightTime)
      const topY = this.series.priceToCoordinate(box.top)
      const bottomY = this.series.priceToCoordinate(box.bottom)
      if (leftX === null || rightX === null || topY === null || bottomY === null) return []
      return [{ ...box, bottomY, leftX, rightX, topY }]
    })
  }

  renderer() {
    return this.coordinates.length === 0 ? null : new PineBoxRenderer(this.coordinates)
  }
}

export class PineBoxPrimitive implements ISeriesPrimitive<Time> {
  private boxes: PineBox[] = []
  private paneView: PineBoxPaneView | undefined
  private requestUpdate: (() => void) | undefined

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new PineBoxPaneView(parameter.chart, parameter.series, () => this.boxes)
  }

  updateAllViews() {
    this.paneView?.update()
  }

  paneViews() {
    return this.paneView ? [this.paneView] : []
  }

  setBoxes(boxes: PineBox[]) {
    this.boxes = boxes
    this.paneView?.update()
    this.requestUpdate?.()
  }
}
