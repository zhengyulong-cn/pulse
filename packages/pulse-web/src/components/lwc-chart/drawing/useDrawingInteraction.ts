import type { IChartApi, ISeriesApi, MouseEventParams, Time } from 'lightweight-charts'
import { ref, type Ref } from 'vue'

import type { DrawingHitPart, DrawingPoint } from './DrawingPrimitive'
import { DrawingPrimitive } from './DrawingPrimitive'
import type { DrawingToolId } from './drawingTools'
import { createDrawingDocument, loadDrawingDocuments, saveDrawingDocuments, type DrawingDocumentScope } from './drawingDocument'
import { getTwoPointDrawingStrategy, isTwoPointDrawingTool } from './strategies/drawingStrategyRegistry'
import type { TwoPointDrawingTool } from './strategies/types'

export const useDrawingInteraction = (
  getChart: () => IChartApi | undefined,
  getSeries: () => ISeriesApi<'Candlestick'> | undefined,
  activeTool: Ref<DrawingToolId | undefined>,
  getScope: () => DrawingDocumentScope | undefined,
  clearActiveTool: () => void,
) => {
  const primitive = new DrawingPrimitive()
  const cursor = ref('default')
  let start: DrawingPoint | undefined
  let drag: {
    drawingId: string
    origin: DrawingPoint
    originCoordinate: { x: number, y: number }
    original: { end: DrawingPoint, start: DrawingPoint }
    originalCoordinates: { endX: number, endY: number, startX: number, startY: number }
    part: DrawingHitPart
    tool: TwoPointDrawingTool
  } | undefined

  const cursorForHit = (tool: TwoPointDrawingTool | undefined, part: DrawingHitPart | undefined) => (
    tool && part ? getTwoPointDrawingStrategy(tool)?.cursor?.(part) ?? 'default' : 'default'
  )

  const getPoint = (parameters: MouseEventParams<Time>): DrawingPoint | undefined => {
    const series = getSeries()
    if (!series || parameters.time === undefined || !parameters.point) return undefined
    const price = series.coordinateToPrice(parameters.point.y)
    if (price === null) return undefined
    return { time: parameters.time, price }
  }

  const handleClick = (parameters: MouseEventParams<Time>) => {
    if (!isTwoPointDrawingTool(activeTool.value)) return
    const point = getPoint(parameters)
    if (!point) return
    if (!start) {
      start = point
      return
    }
    const strategy = getTwoPointDrawingStrategy(activeTool.value)
    if (!strategy) return
    const scope = getScope()
    if (!scope) return
    primitive.addDrawing(createDrawingDocument(scope, strategy.create(crypto.randomUUID(), start, point)))
    saveDrawingDocuments(scope, primitive.getDrawings())
    start = undefined
    primitive.setDraft(undefined)
    clearActiveTool()
  }

  const handleCrosshairMove = (parameters: MouseEventParams<Time>) => {
    if (!start || !isTwoPointDrawingTool(activeTool.value)) return
    const end = getPoint(parameters)
    if (!end) return
    const strategy = getTwoPointDrawingStrategy(activeTool.value)
    if (!strategy) return
    primitive.setDraft(strategy.create('draft', start, end))
  }

  const getPointAtCoordinate = (x: number, y: number): DrawingPoint | undefined => {
    const chart = getChart()
    const series = getSeries()
    const time = chart?.timeScale().coordinateToTime(x)
    const price = series?.coordinateToPrice(y)
    if (time === null || time === undefined || price === null || price === undefined || typeof time !== 'number') return undefined
    return { time, price }
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || activeTool.value) return
    const container = event.currentTarget as HTMLElement
    const bounds = container.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    const hit = primitive.hitTestDrawing(x, y)
    primitive.setSelectedDrawing(hit?.drawing.id)
    cursor.value = cursorForHit(hit?.drawing.tool, hit?.part)
    if (!hit) return
    const origin = getPointAtCoordinate(x, y)
    if (!origin) return
    drag = {
      drawingId: hit.drawing.id,
      origin,
      originCoordinate: { x, y },
      original: { start: hit.drawing.start, end: hit.drawing.end },
      originalCoordinates: {
        startX: hit.drawing.startX,
        startY: hit.drawing.startY,
        endX: hit.drawing.endX,
        endY: hit.drawing.endY,
      },
      part: hit.part,
      tool: hit.drawing.tool,
    }
    container.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePointerMove = (event: PointerEvent) => {
    const container = event.currentTarget as HTMLElement
    const bounds = container.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    if (!drag) {
      if (activeTool.value) {
        cursor.value = 'crosshair'
        return
      }
      const hit = primitive.hitTestDrawing(x, y)
      cursor.value = cursorForHit(hit?.drawing.tool, hit?.part)
      return
    }
    const point = getPointAtCoordinate(x, y)
    if (!point) return
    const update = getTwoPointDrawingStrategy(drag.tool)?.updateForDrag?.({
      current: point,
      currentCoordinate: { x, y },
      originCoordinate: drag.originCoordinate,
      original: { ...drag.original, id: drag.drawingId, tool: drag.tool },
      originalCoordinates: { ...drag.originalCoordinates, id: drag.drawingId, tool: drag.tool, start: drag.original.start, end: drag.original.end },
      part: drag.part,
      pointAtCoordinate: getPointAtCoordinate,
    })
    if (update) primitive.updateDrawing(drag.drawingId, update)
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (!drag) return
    const container = event.currentTarget as HTMLElement
    if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId)
    drag = undefined
    saveDrawingDocuments(getScope(), primitive.getDrawings())
  }

  const handlePointerLeave = () => {
    if (!drag) cursor.value = activeTool.value ? 'crosshair' : 'default'
  }

  const attach = (series: ISeriesApi<'Candlestick'>, container: HTMLElement) => {
    const chart = getChart()
    series.attachPrimitive(primitive)
    chart?.subscribeClick(handleClick)
    chart?.subscribeCrosshairMove(handleCrosshairMove)
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('pointerleave', handlePointerLeave)
  }

  const restore = () => {
    primitive.setDraft(undefined)
    start = undefined
    primitive.setDrawings(loadDrawingDocuments(getScope()))
  }

  const dispose = (container: HTMLElement | undefined) => {
    getChart()?.unsubscribeClick(handleClick)
    getChart()?.unsubscribeCrosshairMove(handleCrosshairMove)
    getSeries()?.detachPrimitive(primitive)
    container?.removeEventListener('pointerdown', handlePointerDown)
    container?.removeEventListener('pointermove', handlePointerMove)
    container?.removeEventListener('pointerup', handlePointerUp)
    container?.removeEventListener('pointerleave', handlePointerLeave)
  }

  return { attach, cursor, dispose, restore }
}
