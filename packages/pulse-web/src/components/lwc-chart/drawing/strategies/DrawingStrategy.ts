import type { DrawingCoordinates, DrawingDragContext, DrawingHitPart, DrawingHitTestResult, DrawingPoint, DrawingRenderContext, TwoPointDrawing, TwoPointDrawingStrategy, TwoPointDrawingTool } from './types'

export abstract class DrawingStrategy implements TwoPointDrawingStrategy {
  abstract readonly tool: TwoPointDrawingTool

  create(id: string, start: DrawingPoint, end: DrawingPoint): TwoPointDrawing {
    return { id, start, end, tool: this.tool }
  }

  abstract draw(drawing: DrawingCoordinates, context: DrawingRenderContext): void

  drawSelection(_drawing: DrawingCoordinates, _context: DrawingRenderContext): void {}

  hitTest(_drawing: DrawingCoordinates, _x: number, _y: number): DrawingHitTestResult | undefined { return undefined }

  cursor(_part: DrawingHitPart) { return 'default' }

  updateForDrag(_context: DrawingDragContext): Pick<TwoPointDrawing, 'start' | 'end'> | undefined { return undefined }

  protected moveForDrag({ currentCoordinate, originCoordinate, originalCoordinates, pointAtCoordinate }: DrawingDragContext) {
    const deltaX = currentCoordinate.x - originCoordinate.x
    const deltaY = currentCoordinate.y - originCoordinate.y
    const start = pointAtCoordinate(originalCoordinates.startX + deltaX, originalCoordinates.startY + deltaY)
    const end = pointAtCoordinate(originalCoordinates.endX + deltaX, originalCoordinates.endY + deltaY)
    return start && end ? { start, end } : undefined
  }
}

export abstract class LineDrawingStrategy extends DrawingStrategy {
  drawSelection(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    context.fillStyle = '#ffffff'
    context.strokeStyle = '#2563eb'
    const handles: Array<[number, number]> = [[drawing.startX, drawing.startY], [drawing.endX, drawing.endY]]
    for (const [x, y] of handles) {
      context.beginPath()
      context.arc(x * horizontalPixelRatio, y * verticalPixelRatio, 5 * horizontalPixelRatio, 0, Math.PI * 2)
      context.fill()
      context.stroke()
    }
  }

  hitTest(drawing: DrawingCoordinates, x: number, y: number) {
    if (Math.hypot(x - drawing.startX, y - drawing.startY) <= 10) return { part: 'start' as const }
    if (Math.hypot(x - drawing.endX, y - drawing.endY) <= 10) return { part: 'end' as const }
    return this.distanceToSegment(x, y, drawing) <= 7 ? { part: 'body' as const } : undefined
  }

  cursor(part: DrawingHitPart) { return part === 'start' || part === 'end' ? 'nwse-resize' : 'move' }

  updateForDrag(context: DrawingDragContext) {
    if (context.part === 'start') return { start: context.current, end: context.original.end }
    if (context.part === 'end') return { start: context.original.start, end: context.current }
    return this.moveForDrag(context)
  }

  private distanceToSegment(x: number, y: number, drawing: DrawingCoordinates) {
    const deltaX = drawing.endX - drawing.startX
    const deltaY = drawing.endY - drawing.startY
    const lengthSquared = deltaX ** 2 + deltaY ** 2
    if (lengthSquared === 0) return Math.hypot(x - drawing.startX, y - drawing.startY)
    const position = Math.max(0, Math.min(1, ((x - drawing.startX) * deltaX + (y - drawing.startY) * deltaY) / lengthSquared))
    return Math.hypot(x - (drawing.startX + position * deltaX), y - (drawing.startY + position * deltaY))
  }
}
