import { arrowSegmentDrawingStrategy } from './ArrowSegmentDrawingStrategy'
import { arrowDownDrawingStrategy, arrowUpDrawingStrategy } from './PointArrowDrawingStrategy'
import { MeasureDrawingStrategy, type MeasureBar } from './MeasureDrawingStrategy'
import {
  longPositionDrawingStrategy,
  shortPositionDrawingStrategy,
} from './PositionMeasurementDrawingStrategy'
import { rectangleDrawingStrategy } from './RectangleDrawingStrategy'
import { segmentDrawingStrategy } from './SegmentDrawingStrategy'
import type { TwoPointDrawingStrategy, TwoPointDrawingTool } from './types'

export class DrawingStrategyRegistry {
  private readonly strategyByTool: Map<TwoPointDrawingTool, TwoPointDrawingStrategy>

  constructor(getMeasureBars: () => MeasureBar[]) {
    const strategies: TwoPointDrawingStrategy[] = [
      segmentDrawingStrategy,
      arrowSegmentDrawingStrategy,
      arrowUpDrawingStrategy,
      arrowDownDrawingStrategy,
      rectangleDrawingStrategy,
      longPositionDrawingStrategy,
      shortPositionDrawingStrategy,
      new MeasureDrawingStrategy(getMeasureBars),
    ]
    this.strategyByTool = new Map(strategies.map((strategy) => [strategy.tool, strategy]))
  }

  get(tool: TwoPointDrawingTool) {
    return this.strategyByTool.get(tool)
  }

  has(tool: string | undefined): tool is TwoPointDrawingTool {
    return tool !== undefined && this.strategyByTool.has(tool as TwoPointDrawingTool)
  }
}
