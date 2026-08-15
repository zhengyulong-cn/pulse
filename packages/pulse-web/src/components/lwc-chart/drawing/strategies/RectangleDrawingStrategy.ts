import { DrawingStrategy } from './DrawingStrategy'
import type { DrawingCoordinates, DrawingDragContext, DrawingHitPart, DrawingRenderContext } from './types'

export class RectangleDrawingStrategy extends DrawingStrategy {
  readonly tool = 'rectangle' as const

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
  }

  drawSelection(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const left = Math.min(drawing.startX, drawing.endX)
    const right = Math.max(drawing.startX, drawing.endX)
    const top = Math.min(drawing.startY, drawing.endY)
    const bottom = Math.max(drawing.startY, drawing.endY)
    context.fillStyle = '#ffffff'
    context.strokeStyle = '#2563eb'
    const handles: Array<[number, number]> = [[left, top], [(left + right) / 2, top], [right, top], [right, (top + bottom) / 2], [right, bottom], [(left + right) / 2, bottom], [left, bottom], [left, (top + bottom) / 2]]
    for (const [x, y] of handles) {
      context.beginPath()
      context.rect(x * horizontalPixelRatio - 4 * horizontalPixelRatio, y * verticalPixelRatio - 4 * verticalPixelRatio, 8 * horizontalPixelRatio, 8 * verticalPixelRatio)
      context.fill()
      context.stroke()
    }
  }

  hitTest(drawing: DrawingCoordinates, x: number, y: number) {
    const left = Math.min(drawing.startX, drawing.endX)
    const right = Math.max(drawing.startX, drawing.endX)
    const top = Math.min(drawing.startY, drawing.endY)
    const bottom = Math.max(drawing.startY, drawing.endY)
    const handles: Array<[DrawingHitPart, number, number]> = [
      ['top_left', left, top], ['top', (left + right) / 2, top], ['top_right', right, top], ['right', right, (top + bottom) / 2],
      ['bottom_right', right, bottom], ['bottom', (left + right) / 2, bottom], ['bottom_left', left, bottom], ['left', left, (top + bottom) / 2],
    ]
    const handle = handles.find(([, handleX, handleY]) => Math.hypot(x - handleX, y - handleY) <= 10)
    if (handle) return { part: handle[0] }
    return x >= left && x <= right && y >= top && y <= bottom ? { part: 'body' as const } : undefined
  }

  cursor(part: DrawingHitPart) {
    if (part === 'top_left' || part === 'bottom_right') return 'nwse-resize'
    if (part === 'top_right' || part === 'bottom_left') return 'nesw-resize'
    if (part === 'top' || part === 'bottom') return 'ns-resize'
    if (part === 'left' || part === 'right') return 'ew-resize'
    return 'move'
  }

  updateForDrag(context: DrawingDragContext) {
    const { current, original, originalCoordinates, part } = context
    if (part === 'body') return this.moveForDrag(context)
    const start = { ...original.start }
    const end = { ...original.end }
    const startIsLeft = originalCoordinates.startX <= originalCoordinates.endX
    const startIsTop = originalCoordinates.startY <= originalCoordinates.endY
    const setLeftTime = () => { if (startIsLeft) start.time = current.time; else end.time = current.time }
    const setRightTime = () => { if (startIsLeft) end.time = current.time; else start.time = current.time }
    const setTopPrice = () => { if (startIsTop) start.price = current.price; else end.price = current.price }
    const setBottomPrice = () => { if (startIsTop) end.price = current.price; else start.price = current.price }
    if (part === 'top_left' || part === 'bottom_left' || part === 'left') setLeftTime()
    if (part === 'top_right' || part === 'bottom_right' || part === 'right') setRightTime()
    if (part === 'top_left' || part === 'top_right' || part === 'top') setTopPrice()
    if (part === 'bottom_left' || part === 'bottom_right' || part === 'bottom') setBottomPrice()
    return { start, end }
  }
}

export const rectangleDrawingStrategy = new RectangleDrawingStrategy()
