import { LineDrawingStrategy } from './DrawingStrategy'
import type { DrawingCoordinates, DrawingRenderContext } from './types'

export class ArrowSegmentDrawingStrategy extends LineDrawingStrategy {
  readonly tool = 'arrow_segment' as const

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
  }
}

export const arrowSegmentDrawingStrategy = new ArrowSegmentDrawingStrategy()
