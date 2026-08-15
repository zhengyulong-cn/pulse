import type { DrawingCoordinates, DrawingRenderContext, DrawingPoint, TwoPointDrawing, TwoPointDrawingStrategy } from './types'

export const rectangleDrawingStrategy: TwoPointDrawingStrategy = {
  tool: 'rectangle',
  create: (id: string, start: DrawingPoint, end: DrawingPoint): TwoPointDrawing => ({ id, start, end, tool: 'rectangle' }),
  draw(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const startX = drawing.startX * horizontalPixelRatio
    const startY = drawing.startY * verticalPixelRatio
    const endX = drawing.endX * horizontalPixelRatio
    const endY = drawing.endY * verticalPixelRatio
    const left = Math.min(startX, endX)
    const top = Math.min(startY, endY)
    const width = Math.abs(endX - startX)
    const height = Math.abs(endY - startY)
    context.save()
    context.fillStyle = 'rgba(37, 99, 235, 0.10)'
    context.fillRect(left, top, width, height)
    context.restore()
    context.strokeRect(left, top, width, height)
  },
}
