import { DrawingStrategy } from './DrawingStrategy'
import type { DrawingCoordinates, DrawingDragContext, DrawingHitPart, DrawingRenderContext, TwoPointDrawing } from './types'

const formatPrice = (value: number) => value.toFixed(2)
const formatPercent = (value: number) => `${value.toFixed(2)}%`

const drawLabel = (context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) => {
  context.save()
  context.font = '12px sans-serif'
  const width = context.measureText(text).width + 10
  context.fillStyle = color
  context.beginPath()
  context.roundRect(x - width / 2, y - 10, width, 20, 3)
  context.fill()
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, x, y)
  context.restore()
}

export class PositionMeasurementDrawingStrategy extends DrawingStrategy {
  constructor(readonly tool: 'long_position' | 'short_position') { super() }

  create(id: string, start: DrawingCoordinates['start'], end: DrawingCoordinates['end']) {
    const distance = Math.abs(end.price - start.price)
    return { id, start, end, positionLevels: { lowerPrice: start.price - distance, upperPrice: start.price + distance }, tool: this.tool }
  }

  draw(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const { lowerPrice, upperPrice } = this.getLevels(drawing)
    const isLong = this.tool === 'long_position'
    const entryPrice = drawing.start.price
    const targetPrice = isLong ? upperPrice : lowerPrice
    const stopPrice = isLong ? lowerPrice : upperPrice
    if (upperPrice === lowerPrice) return
    const left = Math.min(drawing.startX, drawing.endX) * horizontalPixelRatio
    const width = Math.abs(drawing.endX - drawing.startX) * horizontalPixelRatio
    const entryY = drawing.startY * verticalPixelRatio
    const upperY = this.priceToCoordinate(drawing, upperPrice) * verticalPixelRatio
    const lowerY = this.priceToCoordinate(drawing, lowerPrice) * verticalPixelRatio
    const targetY = isLong ? upperY : lowerY
    const stopY = isLong ? lowerY : upperY
    context.save()
    context.fillStyle = 'rgba(220, 38, 38, 0.22)'
    context.fillRect(left, Math.min(entryY, targetY), width, Math.abs(targetY - entryY))
    context.fillStyle = 'rgba(22, 163, 74, 0.22)'
    context.fillRect(left, Math.min(entryY, stopY), width, Math.abs(stopY - entryY))
    context.lineWidth = horizontalPixelRatio
    context.strokeStyle = '#eab308'
    for (const y of [targetY, entryY, stopY]) {
      context.beginPath()
      context.moveTo(left, y)
      context.lineTo(left + width, y)
      context.stroke()
    }
    context.restore()
    const ratio = Math.abs(targetPrice - entryPrice) / Math.abs(entryPrice - stopPrice)
    const labelX = left + width / 2
    drawLabel(context, `止盈价 ${formatPrice(targetPrice)} (${formatPercent(Math.abs(targetPrice - entryPrice) / entryPrice * 100)})`, labelX, targetY - 14 * verticalPixelRatio, '#16a34a')
    drawLabel(context, `开仓价 ${formatPrice(entryPrice)} 风险回报比 ${ratio.toFixed(2)}`, labelX, entryY, '#ca8a04')
    drawLabel(context, `止损价 ${formatPrice(stopPrice)} (${formatPercent(Math.abs(stopPrice - entryPrice) / entryPrice * 100)})`, labelX, stopY + 14 * verticalPixelRatio, '#dc2626')
  }

  drawSelection(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const { lowerPrice, upperPrice } = this.getLevels(drawing)
    const left = Math.min(drawing.startX, drawing.endX)
    const right = Math.max(drawing.startX, drawing.endX)
    const handles: Array<[number, number]> = [[left, this.priceToCoordinate(drawing, upperPrice)], [left, this.priceToCoordinate(drawing, lowerPrice)], [left, drawing.startY], [right, drawing.startY]]
    context.fillStyle = '#ffffff'
    context.strokeStyle = '#2563eb'
    for (const [x, y] of handles) {
      context.beginPath()
      context.rect(x * horizontalPixelRatio - 4 * horizontalPixelRatio, y * verticalPixelRatio - 4 * verticalPixelRatio, 8 * horizontalPixelRatio, 8 * verticalPixelRatio)
      context.fill()
      context.stroke()
    }
  }

  hitTest(drawing: DrawingCoordinates, x: number, y: number) {
    const { lowerPrice, upperPrice } = this.getLevels(drawing)
    const upperY = this.priceToCoordinate(drawing, upperPrice)
    const lowerY = this.priceToCoordinate(drawing, lowerPrice)
    const left = Math.min(drawing.startX, drawing.endX)
    const right = Math.max(drawing.startX, drawing.endX)
    const isLong = this.tool === 'long_position'
    const handles: Array<[DrawingHitPart, number, number]> = [
      ['position_target', left, isLong ? upperY : lowerY], ['position_stop', left, isLong ? lowerY : upperY],
      ['position_entry_left', left, drawing.startY], ['position_entry_right', right, drawing.startY],
    ]
    const handle = handles.find(([, handleX, handleY]) => Math.hypot(x - handleX, y - handleY) <= 10)
    if (handle) return { part: handle[0] }
    return x >= left && x <= right && y >= Math.min(upperY, lowerY) && y <= Math.max(upperY, lowerY) ? { part: 'body' as const } : undefined
  }

  cursor(part: DrawingHitPart) {
    if (part === 'position_target' || part === 'position_stop') return 'ns-resize'
    if (part === 'position_entry_left') return 'nwse-resize'
    if (part === 'position_entry_right') return 'ew-resize'
    return 'move'
  }

  updateForDrag(context: DrawingDragContext) {
    const { current, original, part } = context
    const levels = this.getLevels(original)
    const isLong = this.tool === 'long_position'
    if (part === 'body') {
      const moved = this.moveForDrag(context)
      if (!moved) return undefined
      const delta = moved.start.price - original.start.price
      return { ...moved, positionLevels: { lowerPrice: levels.lowerPrice + delta, upperPrice: levels.upperPrice + delta } }
    }
    if (part === 'position_target') {
      if (isLong ? current.price <= original.start.price : current.price >= original.start.price) return undefined
      return { start: original.start, end: original.end, positionLevels: isLong ? { ...levels, upperPrice: current.price } : { ...levels, lowerPrice: current.price } }
    }
    if (part === 'position_stop') {
      if (isLong ? current.price >= original.start.price : current.price <= original.start.price) return undefined
      return { start: original.start, end: original.end, positionLevels: isLong ? { ...levels, lowerPrice: current.price } : { ...levels, upperPrice: current.price } }
    }
    if (part === 'position_entry_left') {
      if (current.price < levels.lowerPrice || current.price > levels.upperPrice) return undefined
      return { start: current, end: original.end, positionLevels: levels }
    }
    if (part === 'position_entry_right') return { start: original.start, end: { ...original.end, time: current.time }, positionLevels: levels }
    return undefined
  }

  private getLevels(drawing: TwoPointDrawing) {
    if (drawing.positionLevels) return drawing.positionLevels
    const distance = Math.abs(drawing.end.price - drawing.start.price)
    return { lowerPrice: drawing.start.price - distance, upperPrice: drawing.start.price + distance }
  }

  private priceToCoordinate(drawing: DrawingCoordinates, price: number) {
    const { lowerPrice, upperPrice } = this.getLevels(drawing)
    if (price === upperPrice && drawing.upperY !== undefined) return drawing.upperY
    if (price === lowerPrice && drawing.lowerY !== undefined) return drawing.lowerY
    const priceDelta = drawing.end.price - drawing.start.price
    return priceDelta === 0 ? drawing.startY : drawing.startY + (price - drawing.start.price) / priceDelta * (drawing.endY - drawing.startY)
  }
}

export const longPositionDrawingStrategy = new PositionMeasurementDrawingStrategy('long_position')
export const shortPositionDrawingStrategy = new PositionMeasurementDrawingStrategy('short_position')
