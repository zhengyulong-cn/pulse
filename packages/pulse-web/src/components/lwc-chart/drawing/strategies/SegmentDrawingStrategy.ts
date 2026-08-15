import type { DrawingCoordinates, DrawingRenderContext, DrawingPoint, TwoPointDrawing, TwoPointDrawingStrategy } from './types'

export const segmentDrawingStrategy: TwoPointDrawingStrategy = {
  tool: 'segment',
  create: (id: string, start: DrawingPoint, end: DrawingPoint): TwoPointDrawing => ({ id, start, end, tool: 'segment' }),
  draw(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    context.beginPath()
    context.moveTo(drawing.startX * horizontalPixelRatio, drawing.startY * verticalPixelRatio)
    context.lineTo(drawing.endX * horizontalPixelRatio, drawing.endY * verticalPixelRatio)
    context.stroke()
  },
}
