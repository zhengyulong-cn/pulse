import { LineDrawingStrategy } from './DrawingStrategy'
import type { DrawingCoordinates, DrawingRenderContext } from './types'

export class SegmentDrawingStrategy extends LineDrawingStrategy {
  readonly tool = 'segment' as const

  draw(
    drawing: DrawingCoordinates,
    { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext,
  ) {
    context.beginPath()
    context.moveTo(drawing.startX * horizontalPixelRatio, drawing.startY * verticalPixelRatio)
    context.lineTo(drawing.endX * horizontalPixelRatio, drawing.endY * verticalPixelRatio)
    context.stroke()
  }
}

export const segmentDrawingStrategy = new SegmentDrawingStrategy()
