import { arrowSegmentDrawingStrategy } from './ArrowSegmentDrawingStrategy'
import { rectangleDrawingStrategy } from './RectangleDrawingStrategy'
import { segmentDrawingStrategy } from './SegmentDrawingStrategy'
import { longPositionDrawingStrategy, shortPositionDrawingStrategy } from './PositionMeasurementDrawingStrategy'
import type { TwoPointDrawingStrategy, TwoPointDrawingTool } from './types'

const strategies: TwoPointDrawingStrategy[] = [
  segmentDrawingStrategy,
  arrowSegmentDrawingStrategy,
  rectangleDrawingStrategy,
  longPositionDrawingStrategy,
  shortPositionDrawingStrategy,
]

const strategyByTool = new Map(strategies.map((strategy) => [strategy.tool, strategy]))

export const getTwoPointDrawingStrategy = (tool: TwoPointDrawingTool) => strategyByTool.get(tool)

export const isTwoPointDrawingTool = (tool: string | undefined): tool is TwoPointDrawingTool => (
  tool !== undefined && strategyByTool.has(tool as TwoPointDrawingTool)
)
