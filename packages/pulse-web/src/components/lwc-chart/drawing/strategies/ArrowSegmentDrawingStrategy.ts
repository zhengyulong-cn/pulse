import type { DrawingCoordinates, DrawingRenderContext, DrawingPoint, TwoPointDrawing, TwoPointDrawingStrategy } from './types'

export const arrowSegmentDrawingStrategy: TwoPointDrawingStrategy = {
  tool: 'arrow_segment',
  create: (id: string, start: DrawingPoint, end: DrawingPoint): TwoPointDrawing => ({ id, start, end, tool: 'arrow_segment' }),
  draw(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const startX = drawing.startX * horizontalPixelRatio
    const startY = drawing.startY * verticalPixelRatio
    const endX = drawing.endX * horizontalPixelRatio
    const endY = drawing.endY * verticalPixelRatio
    context.beginPath()
    context.moveTo(startX, startY)
    context.lineTo(endX, endY)
    context.stroke()

    const angle = Math.atan2(endY - startY, endX - startX)
    const size = 9 * horizontalPixelRatio
    context.beginPath()
    context.moveTo(endX, endY)
    context.lineTo(endX - size * Math.cos(angle - Math.PI / 6), endY - size * Math.sin(angle - Math.PI / 6))
    context.lineTo(endX - size * Math.cos(angle + Math.PI / 6), endY - size * Math.sin(angle + Math.PI / 6))
    context.closePath()
    context.fill()
  },
}
