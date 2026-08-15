import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import dayjs from 'dayjs'
import type { IPrimitivePaneRenderer, IPrimitivePaneView, ISeriesApi, ISeriesPrimitive, SeriesAttachedParameter, SeriesType, Time } from 'lightweight-charts'

import { getTwoPointDrawingStrategy } from './strategies/drawingStrategyRegistry'
import type { DrawingCoordinates, TwoPointDrawing } from './strategies/types'
import type { DrawingDocument } from './drawingDocument'

export type { DrawingPoint, TwoPointDrawing, TwoPointDrawingTool } from './strategies/types'

export type { DrawingHitPart } from './strategies/types'

class DrawingRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly drawings: DrawingCoordinates[], private readonly selectedDrawingId: string | undefined) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, verticalPixelRatio }) => {
      context.save()
      context.lineWidth = 2 * horizontalPixelRatio
      context.strokeStyle = '#2563eb'
      context.fillStyle = '#2563eb'
      for (const drawing of this.drawings) {
        getTwoPointDrawingStrategy(drawing.tool)?.draw(drawing, { context, horizontalPixelRatio, verticalPixelRatio })
        if (drawing.id === this.selectedDrawingId) getTwoPointDrawingStrategy(drawing.tool)?.drawSelection?.(drawing, { context, horizontalPixelRatio, verticalPixelRatio })
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
    private readonly selectedDrawingId: () => string | undefined,
  ) {}

  update() {
    this.coordinates = this.drawings().flatMap((drawing) => {
      const startX = this.chart.timeScale().timeToCoordinate(drawing.start.time)
      const endX = this.chart.timeScale().timeToCoordinate(drawing.end.time)
      const startY = this.series.priceToCoordinate(drawing.start.price)
      const endY = this.series.priceToCoordinate(drawing.end.price)
      if (startX === null || endX === null || startY === null || endY === null) return []
      const positionLevels = drawing.positionLevels
      const upperY = positionLevels ? this.series.priceToCoordinate(positionLevels.upperPrice) : undefined
      const lowerY = positionLevels ? this.series.priceToCoordinate(positionLevels.lowerPrice) : undefined
      return [{ ...drawing, endX, endY, startX, startY, ...(upperY !== null && lowerY !== null ? { upperY, lowerY } : {}) }]
    })
  }

  renderer() {
    return this.coordinates.length ? new DrawingRenderer(this.coordinates, this.selectedDrawingId()) : null
  }

  getCoordinates() {
    return this.coordinates
  }
}

export class DrawingPrimitive implements ISeriesPrimitive<Time> {
  private drawings: DrawingDocument[] = []
  private draft: TwoPointDrawing | undefined
  private paneView: DrawingPaneView | undefined
  private requestUpdate: (() => void) | undefined
  private selectedDrawingId: string | undefined

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new DrawingPaneView(parameter.chart, parameter.series, () => this.allDrawings(), () => this.selectedDrawingId)
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

  addDrawing(drawing: DrawingDocument) {
    this.drawings = [...this.drawings, drawing]
    this.refresh()
  }

  setDrawings(drawings: DrawingDocument[]) {
    this.drawings = drawings
    this.refresh()
  }

  getDrawings() {
    return this.drawings
  }

  setSelectedDrawing(id: string | undefined) {
    this.selectedDrawingId = id
    this.refresh()
  }

  hitTestDrawing(x: number, y: number) {
    const selectable = this.paneView?.getCoordinates() ?? []
    for (const drawing of [...selectable].reverse()) {
      const hit = getTwoPointDrawingStrategy(drawing.tool)?.hitTest?.(drawing, x, y)
      if (hit) return { drawing, part: hit.part }
    }
    return undefined
  }

  updateDrawing(id: string, update: Partial<TwoPointDrawing>) {
    this.drawings = this.drawings.map((drawing) => drawing.id === id ? { ...drawing, ...update, updatedAt: dayjs().toISOString() } : drawing)
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
