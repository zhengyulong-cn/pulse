import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import dayjs from 'dayjs'
import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'

import type { DrawingStrategyRegistry } from './strategies/drawingStrategyRegistry'
import type { DrawingCoordinates, TwoPointDrawing } from './strategies/types'
import type { DrawingDocument } from './drawingDocument'

export type { DrawingPoint, TwoPointDrawing, TwoPointDrawingTool } from './strategies/types'

export type { DrawingHitPart } from './strategies/types'

class DrawingRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly drawings: DrawingCoordinates[],
    private readonly selectedDrawingId: string | undefined,
    private readonly strategies: DrawingStrategyRegistry,
  ) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, verticalPixelRatio }) => {
      context.save()
      context.lineWidth = 2 * horizontalPixelRatio
      context.strokeStyle = '#2563eb'
      context.fillStyle = '#2563eb'
      for (const drawing of this.drawings) {
        const style = (drawing as DrawingDocument).style
        context.lineWidth = style?.lineWidth
          ? style.lineWidth * horizontalPixelRatio
          : 2 * horizontalPixelRatio
        context.strokeStyle = style?.color ?? '#2563eb'
        context.fillStyle = style?.color ?? '#2563eb'
        this.strategies
          .get(drawing.tool)
          ?.draw(drawing, { context, horizontalPixelRatio, verticalPixelRatio })
        if (drawing.id === this.selectedDrawingId)
          this.strategies
            .get(drawing.tool)
            ?.drawSelection?.(drawing, { context, horizontalPixelRatio, verticalPixelRatio })
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
    private readonly strategies: DrawingStrategyRegistry,
  ) {}

  update() {
    this.coordinates = this.drawings().flatMap((drawing) => {
      const startX = this.coordinateForTime(drawing.start.time)
      const endX = this.coordinateForTime(drawing.end.time)
      const startY = this.series.priceToCoordinate(drawing.start.price)
      const endY = this.series.priceToCoordinate(drawing.end.price)
      if (startX === null || endX === null || startY === null || endY === null) return []
      const positionLevels = drawing.positionLevels
      const upperY = positionLevels
        ? this.series.priceToCoordinate(positionLevels.upperPrice)
        : undefined
      const lowerY = positionLevels
        ? this.series.priceToCoordinate(positionLevels.lowerPrice)
        : undefined
      return [
        {
          ...drawing,
          endX,
          endY,
          startX,
          startY,
          ...(upperY !== null && lowerY !== null ? { upperY, lowerY } : {}),
        },
      ]
    })
  }

  renderer() {
    return this.coordinates.length
      ? new DrawingRenderer(this.coordinates, this.selectedDrawingId(), this.strategies)
      : null
  }

  getCoordinates() {
    return this.coordinates
  }

  private coordinateForTime(time: Time) {
    const coordinate = this.chart.timeScale().timeToCoordinate(time)
    if (coordinate !== null) return coordinate
    const target = Number(time)
    if (!Number.isFinite(target)) return null
    const nearestTime = this.series.data().reduce<Time | undefined>((nearest, bar) => {
      if (typeof bar.time !== 'number') return nearest
      if (
        nearest === undefined ||
        Math.abs(Number(bar.time) - target) < Math.abs(Number(nearest) - target)
      )
        return bar.time
      return nearest
    }, undefined)
    return nearestTime === undefined ? null : this.chart.timeScale().timeToCoordinate(nearestTime)
  }
}

export class DrawingPrimitive implements ISeriesPrimitive<Time> {
  private drawings: DrawingDocument[] = []
  private draft: TwoPointDrawing | undefined
  private paneView: DrawingPaneView | undefined
  private requestUpdate: (() => void) | undefined
  private selectedDrawingId: string | undefined
  private visible = true

  constructor(private readonly strategies: DrawingStrategyRegistry) {}

  attached(parameter: SeriesAttachedParameter<Time, SeriesType>) {
    this.requestUpdate = parameter.requestUpdate
    this.paneView = new DrawingPaneView(
      parameter.chart,
      parameter.series,
      () => this.allDrawings(),
      () => this.selectedDrawingId,
      this.strategies,
    )
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

  setVisible(visible: boolean) {
    this.visible = visible
    this.refresh()
  }

  clearDrawings() {
    this.drawings = []
    this.selectedDrawingId = undefined
    this.refresh()
  }

  hitTestDrawing(x: number, y: number) {
    if (!this.visible) return undefined
    const selectable = this.paneView?.getCoordinates() ?? []
    for (const drawing of [...selectable].reverse()) {
      const hit = this.strategies.get(drawing.tool)?.hitTest?.(drawing, x, y)
      if (hit) return { drawing, part: hit.part }
    }
    return undefined
  }

  updateDrawing(id: string, update: Partial<TwoPointDrawing>) {
    this.drawings = this.drawings.map((drawing) =>
      drawing.id === id ? { ...drawing, ...update, updatedAt: dayjs().toISOString() } : drawing,
    )
    this.refresh()
  }

  updateDocument(id: string, update: Partial<DrawingDocument>) {
    this.drawings = this.drawings.map((drawing) =>
      drawing.id === id ? { ...drawing, ...update, updatedAt: dayjs().toISOString() } : drawing,
    )
    this.refresh()
  }

  removeDrawing(id: string) {
    this.drawings = this.drawings.filter((drawing) => drawing.id !== id)
    this.selectedDrawingId = undefined
    this.refresh()
  }

  private allDrawings() {
    if (!this.visible) return []
    return this.draft ? [...this.drawings, this.draft] : this.drawings
  }

  private refresh() {
    this.paneView?.update()
    this.requestUpdate?.()
  }
}
