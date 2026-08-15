import type { Time } from 'lightweight-charts'

export type DrawingPoint = {
  price: number
  time: Time
}

export type TwoPointDrawingTool = 'arrow_segment' | 'long_position' | 'rectangle' | 'segment' | 'short_position'

export type TwoPointDrawing = {
  end: DrawingPoint
  id: string
  positionLevels?: {
    lowerPrice: number
    upperPrice: number
  }
  start: DrawingPoint
  tool: TwoPointDrawingTool
}

export type DrawingCoordinates = TwoPointDrawing & {
  endX: number
  endY: number
  lowerY?: number
  startX: number
  startY: number
  upperY?: number
}

export type DrawingRenderContext = {
  context: CanvasRenderingContext2D
  horizontalPixelRatio: number
  verticalPixelRatio: number
}

export type DrawingHitPart =
  | 'body'
  | 'bottom'
  | 'bottom_left'
  | 'bottom_right'
  | 'end'
  | 'left'
  | 'position_entry_left'
  | 'position_entry_right'
  | 'position_stop'
  | 'position_target'
  | 'right'
  | 'start'
  | 'top'
  | 'top_left'
  | 'top_right'

export type DrawingHitTestResult = {
  part: DrawingHitPart
}

export type DrawingDragContext = {
  current: DrawingPoint
  currentCoordinate: { x: number, y: number }
  originCoordinate: { x: number, y: number }
  original: TwoPointDrawing
  originalCoordinates: DrawingCoordinates
  part: DrawingHitPart
  pointAtCoordinate: (x: number, y: number) => DrawingPoint | undefined
}

export type TwoPointDrawingStrategy = {
  create(id: string, start: DrawingPoint, end: DrawingPoint): TwoPointDrawing
  draw(drawing: DrawingCoordinates, context: DrawingRenderContext): void
  drawSelection?(drawing: DrawingCoordinates, context: DrawingRenderContext): void
  hitTest?(drawing: DrawingCoordinates, x: number, y: number): DrawingHitTestResult | undefined
  cursor?(part: DrawingHitPart): string
  updateForDrag?(context: DrawingDragContext): Partial<TwoPointDrawing> | undefined
  tool: TwoPointDrawingTool
}
