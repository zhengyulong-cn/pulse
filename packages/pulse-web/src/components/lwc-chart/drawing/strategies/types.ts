import type { Time } from 'lightweight-charts'

export type DrawingPoint = {
  price: number
  time: Time
}

export type TwoPointDrawingTool = 'arrow_segment' | 'long_position' | 'rectangle' | 'segment' | 'short_position'

export type TwoPointDrawing = {
  end: DrawingPoint
  id: string
  start: DrawingPoint
  tool: TwoPointDrawingTool
}

export type DrawingCoordinates = TwoPointDrawing & {
  endX: number
  endY: number
  startX: number
  startY: number
}

export type DrawingRenderContext = {
  context: CanvasRenderingContext2D
  horizontalPixelRatio: number
  verticalPixelRatio: number
}

export type TwoPointDrawingStrategy = {
  create(id: string, start: DrawingPoint, end: DrawingPoint): TwoPointDrawing
  draw(drawing: DrawingCoordinates, context: DrawingRenderContext): void
  tool: TwoPointDrawingTool
}
