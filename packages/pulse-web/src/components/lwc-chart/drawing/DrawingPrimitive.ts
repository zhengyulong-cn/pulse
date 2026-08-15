import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import type { IPrimitivePaneRenderer, IPrimitivePaneView, ISeriesApi, ISeriesPrimitive, SeriesAttachedParameter, SeriesType, Time } from 'lightweight-charts'

import { getTwoPointDrawingStrategy } from './strategies/drawingStrategyRegistry'
import type { DrawingCoordinates, TwoPointDrawing } from './strategies/types'

export type { DrawingPoint, TwoPointDrawing, TwoPointDrawingTool } from './strategies/types'

class DrawingRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly drawings: DrawingCoordinates[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, verticalPixelRatio }) => {
      context.save()
      context.lineWidth = 2 * horizontalPixelRatio
      context.strokeStyle = '#2563eb'
      context.fillStyle = '#2563eb'
      for (const drawing of this.drawings) {
        getTwoPointDrawingStrategy(drawing.tool)?.draw(drawing, { context, horizontalPixelRatio, verticalPixelRatio })
      }
      context.restore()
    })
  }
}

class DrawingPaneView implements IPrimitivePaneView {
  private coordinates: DrawingCoordinates[] = []

  constructor(
    private readonly chart: SeriesAttachedParameter<Time, SeriesType>['chart'],
    private readonly series: ISeriesApi<SeriesType>,
    private readonly drawings: () => TwoPointDrawing[],
  ) {}

  update() {
    this.coordinates = this.drawings().flatMap((drawing) => {
      const startX = this.chart.timeScale().timeToCoordinate(drawing.start.time)
      const endX = this.chart.timeScale().timeToCoordinate(drawing.end.time)
      const startY = this.series.priceToCoordinate(drawing.start.price)
      const endY = this.series.priceToCoordinate(drawing.end.price)
      if (startX === null || endX === null || startY === null || endY === null) return []
      return [{ ...drawing, endX, endY, startX, startY }]
    })
  }

  renderer() {
    return this.coordinates.length ? new DrawingRenderer(this.coordinates) : null
  }
}

export class DrawingPrimitive implements ISeriesPrimitive<Time> {
  private drawings: TwoPointDrawing[] = []
  private draft: TwoPointDrawing | undefined
  private paneView: DrawingPaneView | undefined
  private requestUpdate: (() => void) | undefined

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new DrawingPaneView(parameter.chart, parameter.series, () => this.allDrawings())
  }

  updateAllViews() {
    this.paneView?.update()
  }

  paneViews() {
    return this.paneView ? [this.paneView] : []
  }

  setDraft(draft: TwoPointDrawing | undefined) {
    this.draft = draft
    this.refresh()
  }

  addDrawing(drawing: TwoPointDrawing) {
    this.drawings = [...this.drawings, drawing]
    this.refresh()
  }

  private allDrawings() {
    return this.draft ? [...this.drawings, this.draft] : this.drawings
  }

  private refresh() {
    this.paneView?.update()
    this.requestUpdate?.()
  }
}
