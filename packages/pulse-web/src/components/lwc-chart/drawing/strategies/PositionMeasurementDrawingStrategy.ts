import { DrawingStrategy } from './DrawingStrategy'
import type { DrawingCoordinates, DrawingRenderContext } from './types'

const RISK_REWARD_RATIO = 1

const formatPrice = (value: number) => value.toFixed(2)
const formatPercent = (value: number) => `${value.toFixed(2)}%`

const drawLabel = (context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) => {
  context.save()
  context.font = '12px sans-serif'
  const paddingX = 5
  const height = 20
  const width = context.measureText(text).width + paddingX * 2
  context.fillStyle = color
  context.beginPath()
  context.roundRect(x - width / 2, y - height / 2, width, height, 3)
  context.fill()
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, x, y)
  context.restore()
}

export class PositionMeasurementDrawingStrategy extends DrawingStrategy {
  constructor(readonly tool: 'long_position' | 'short_position') {
    super()
  }

  draw(drawing: DrawingCoordinates, { context, horizontalPixelRatio, verticalPixelRatio }: DrawingRenderContext) {
    const isLong = this.tool === 'long_position'
    const entryPrice = drawing.start.price
    const distance = Math.abs(drawing.end.price - entryPrice)
    if (distance === 0) return
    const isProfitSide = isLong ? drawing.end.price > entryPrice : drawing.end.price < entryPrice
    const targetPrice = isProfitSide
      ? drawing.end.price
      : isLong
        ? entryPrice + distance * RISK_REWARD_RATIO
        : entryPrice - distance * RISK_REWARD_RATIO
    const stopPrice = isProfitSide
      ? isLong
        ? entryPrice - distance / RISK_REWARD_RATIO
        : entryPrice + distance / RISK_REWARD_RATIO
      : drawing.end.price
    const entryX = drawing.startX * horizontalPixelRatio
    const endX = drawing.endX * horizontalPixelRatio
    const left = Math.min(entryX, endX)
    const width = Math.abs(endX - entryX)
    const entryY = drawing.startY * verticalPixelRatio
    const targetY = isProfitSide
      ? drawing.endY * verticalPixelRatio
      : entryY - (drawing.endY * verticalPixelRatio - entryY) * RISK_REWARD_RATIO
    const stopY = isProfitSide
      ? entryY - (targetY - entryY) / RISK_REWARD_RATIO
      : drawing.endY * verticalPixelRatio
    const profitTop = Math.min(entryY, targetY)
    const profitBottom = Math.max(entryY, targetY)
    const riskTop = Math.min(entryY, stopY)
    const riskBottom = Math.max(entryY, stopY)

    context.save()
    context.fillStyle = 'rgba(22, 163, 74, 0.22)'
    context.fillRect(left, profitTop, width, profitBottom - profitTop)
    context.fillStyle = 'rgba(220, 38, 38, 0.22)'
    context.fillRect(left, riskTop, width, riskBottom - riskTop)
    context.lineWidth = horizontalPixelRatio
    context.strokeStyle = '#eab308'
    for (const y of [targetY, entryY, stopY]) {
      context.beginPath()
      context.moveTo(left, y)
      context.lineTo(left + width, y)
      context.stroke()
    }
    context.restore()

    const targetChange = Math.abs(targetPrice - entryPrice) / entryPrice * 100
    const stopChange = Math.abs(stopPrice - entryPrice) / entryPrice * 100
    const labelX = left + width / 2
    drawLabel(context, `止盈价: ${formatPrice(targetPrice)} (${formatPercent(targetChange)})`, labelX, targetY - 14 * verticalPixelRatio, '#16a34a')
    drawLabel(context, `开仓: ${formatPrice(entryPrice)} 风险回报比: ${RISK_REWARD_RATIO.toFixed(2)}`, labelX, entryY, '#ca8a04')
    drawLabel(context, `止损价: ${formatPrice(stopPrice)} (${formatPercent(stopChange)})`, labelX, stopY + 14 * verticalPixelRatio, '#dc2626')
  }
}

export const longPositionDrawingStrategy = new PositionMeasurementDrawingStrategy('long_position')
export const shortPositionDrawingStrategy = new PositionMeasurementDrawingStrategy('short_position')
