import { DrawingStrategy } from './DrawingStrategy'
import type { DrawingCoordinates, DrawingDragContext, DrawingHitPart, DrawingPoint, DrawingRenderContext, TwoPointDrawing } from './types'

export class PointArrowDrawingStrategy extends DrawingStrategy {
  constructor(readonly tool: 'arrow_up' | 'arrow_down') { super() }

  create(id: string, start: DrawingPoint, _end: DrawingPoint): TwoPointDrawing {
    return { id, start, end: start, tool: this.tool }
  }

  draw(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const x = drawing.startX * horizontalPixelRatio
    const y = drawing.startY * verticalPixelRatio
    const size = 11 * horizontalPixelRatio
    const direction = this.tool === 'arrow_up' ? 1 : -1
    context.save()
    context.fillStyle = '#00aaff'
    context.beginPath()
    context.moveTo(x, y + direction * -size)
    context.lineTo(x - size / 2, y + direction * -size / 3)
    context.lineTo(x - size / 5, y + direction * -size / 3)
    context.lineTo(x - size / 5, y + direction * size)
    context.lineTo(x + size / 5, y + direction * size)
    context.lineTo(x + size / 5, y + direction * -size / 3)
    context.lineTo(x + size / 2, y + direction * -size / 3)
    context.closePath()
    context.fill()
    context.restore()
  }

  hitTest(drawing: DrawingCoordinates, x: number, y: number) {
    return Math.hypot(x - drawing.startX, y - drawing.startY) <= 16 ? { part: 'body' as const } : undefined
  }

  cursor(_part: DrawingHitPart) { return 'move' }

  updateForDrag(context: DrawingDragContext) {
    const moved = this.moveForDrag(context)
    return moved
  }
}

export const arrowUpDrawingStrategy = new PointArrowDrawingStrategy('arrow_up')
export const arrowDownDrawingStrategy = new PointArrowDrawingStrategy('arrow_down')
