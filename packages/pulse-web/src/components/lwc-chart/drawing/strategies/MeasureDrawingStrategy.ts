import type { Time } from 'lightweight-charts'

import { DrawingStrategy } from './DrawingStrategy'
import type {
  DrawingCoordinates,
  DrawingDragContext,
  DrawingHitPart,
  DrawingRenderContext,
} from './types'

export type MeasureBar = {
  close: number
  high: number
  low: number
  open: number
  time: Time
  volume: number
}

const drawLabel = (
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  color: string,
  ratio: number,
) => {
  context.save()
  context.font = `${12 * ratio}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const lineHeight = 16 * ratio
  const padding = 4 * ratio
  const width = Math.max(...lines.map((line) => context.measureText(line).width)) + padding * 2
  const height = lines.length * lineHeight + padding * 2
  context.fillStyle = color
  context.beginPath()
  context.roundRect(x - width / 2, y - height / 2, width, height, 5 * ratio)
  context.fill()
  context.fillStyle = '#ffffff'
  lines.forEach((line, index) =>
    context.fillText(line, x, y - ((lines.length - 1) * lineHeight) / 2 + index * lineHeight),
  )
  context.restore()
}

export class MeasureDrawingStrategy extends DrawingStrategy {
  readonly tool = 'measure' as const

  constructor(private readonly getBars: () => MeasureBar[]) {
    super()
  }

  draw(
    drawing: DrawingCoordinates,
    { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext,
  ) {
    const { left, right, top, bottom } = this.bounds(drawing)
    const isUp = drawing.end.price >= drawing.start.price
    const color = isUp ? '#f43f5e' : '#0d9488'
    const stats = this.stats(drawing)
    const startX = drawing.startX * horizontalPixelRatio
    const startY = drawing.startY * verticalPixelRatio
    const endX = drawing.endX * horizontalPixelRatio
    const endY = drawing.endY * verticalPixelRatio
    const horizontalDirection = Math.sign(endX - startX) || 1
    const verticalDirection = Math.sign(endY - startY) || -1
    context.save()
    context.fillStyle = isUp ? 'rgba(220, 38, 38, 0.22)' : 'rgba(22, 163, 74, 0.22)'
    context.fillRect(
      left * horizontalPixelRatio,
      top * verticalPixelRatio,
      (right - left) * horizontalPixelRatio,
      (bottom - top) * verticalPixelRatio,
    )
    context.strokeStyle = color
    context.lineWidth = horizontalPixelRatio
    context.beginPath()
    context.moveTo(startX, startY)
    context.lineTo(endX, startY)
    context.moveTo(startX, startY)
    context.lineTo(startX, endY)
    context.stroke()
    const arrowSize = 8 * horizontalPixelRatio
    context.fillStyle = color
    context.beginPath()
    context.moveTo(endX, startY)
    context.lineTo(endX - horizontalDirection * arrowSize, startY - arrowSize / 2)
    context.lineTo(endX - horizontalDirection * arrowSize, startY + arrowSize / 2)
    context.closePath()
    context.fill()
    context.beginPath()
    context.moveTo(startX, endY)
    context.lineTo(startX - arrowSize / 2, endY - verticalDirection * arrowSize)
    context.lineTo(startX + arrowSize / 2, endY - verticalDirection * arrowSize)
    context.closePath()
    context.fill()
    context.restore()
    const change = drawing.end.price - drawing.start.price
    const percent = drawing.start.price === 0 ? 0 : (change / drawing.start.price) * 100
    const minutes =
      stats.first && stats.last
        ? Math.round((Number(stats.last.time) - Number(stats.first.time)) / 60)
        : 0
    const centerX = ((left + right) / 2) * horizontalPixelRatio
    const priceLabelY = (isUp ? top - 30 : bottom + 30) * verticalPixelRatio
    const detailLabelY = (isUp ? bottom + 30 : top - 30) * verticalPixelRatio
    drawLabel(
      context,
      [
        `${change.toFixed(2)} (${percent.toFixed(2)}%)`,
        `${stats.length} K线, ${minutes} 分钟`,
        `Vol ${(stats.volume / 10000).toFixed(2)}万`,
      ],
      centerX,
      priceLabelY,
      color,
      horizontalPixelRatio,
    )
    drawLabel(
      context,
      [
        `均价: ${stats.average.toFixed(2)}    阳根: ${stats.up}`,
        `最高: ${stats.high.toFixed(2)}    阴根: ${stats.down}`,
        `最低: ${stats.low.toFixed(2)}    平线: ${stats.flat}`,
      ],
      centerX,
      detailLabelY,
      color,
      horizontalPixelRatio,
    )
  }

  drawSelection(
    drawing: DrawingCoordinates,
    { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext,
  ) {
    context.fillStyle = '#ffffff'
    context.strokeStyle = '#2563eb'
    const points: Array<[number, number]> = [
      [drawing.startX, drawing.startY],
      [drawing.endX, drawing.endY],
    ]
    for (const [x, y] of points) {
      context.beginPath()
      context.rect(
        x * horizontalPixelRatio - 4 * horizontalPixelRatio,
        y * verticalPixelRatio - 4 * verticalPixelRatio,
        8 * horizontalPixelRatio,
        8 * verticalPixelRatio,
      )
      context.fill()
      context.stroke()
    }
  }

  hitTest(drawing: DrawingCoordinates, x: number, y: number) {
    if (Math.hypot(x - drawing.startX, y - drawing.startY) <= 10) return { part: 'start' as const }
    if (Math.hypot(x - drawing.endX, y - drawing.endY) <= 10) return { part: 'end' as const }
    const { left, right, top, bottom } = this.bounds(drawing)
    return x >= left && x <= right && y >= top && y <= bottom
      ? { part: 'body' as const }
      : undefined
  }

  cursor(part: DrawingHitPart) {
    return part === 'start' || part === 'end' ? 'nwse-resize' : 'move'
  }

  updateForDrag(context: DrawingDragContext) {
    if (context.part === 'start') return { start: context.current, end: context.original.end }
    if (context.part === 'end') return { start: context.original.start, end: context.current }
    return this.moveForDrag(context)
  }

  private bounds(drawing: DrawingCoordinates) {
    return {
      left: Math.min(drawing.startX, drawing.endX),
      right: Math.max(drawing.startX, drawing.endX),
      top: Math.min(drawing.startY, drawing.endY),
      bottom: Math.max(drawing.startY, drawing.endY),
    }
  }

  private stats(drawing: DrawingCoordinates) {
    const from = Math.min(Number(drawing.start.time), Number(drawing.end.time))
    const to = Math.max(Number(drawing.start.time), Number(drawing.end.time))
    const bars = this.getBars().filter((bar) => Number(bar.time) >= from && Number(bar.time) <= to)
    if (!bars.length)
      return {
        average: 0,
        down: 0,
        first: undefined,
        flat: 0,
        high: 0,
        last: undefined,
        length: 0,
        low: 0,
        up: 0,
        volume: 0,
      }
    return {
      average: bars.reduce((sum, bar) => sum + bar.close, 0) / bars.length,
      down: bars.filter((bar) => bar.close < bar.open).length,
      first: bars[0],
      flat: bars.filter((bar) => bar.close === bar.open).length,
      high: Math.max(...bars.map((bar) => bar.high)),
      last: bars.at(-1),
      length: bars.length,
      low: Math.min(...bars.map((bar) => bar.low)),
      up: bars.filter((bar) => bar.close > bar.open).length,
      volume: bars.reduce((sum, bar) => sum + bar.volume, 0),
    }
  }
}
