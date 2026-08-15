import type { IChartApi, ISeriesApi, MouseEventParams, Time } from 'lightweight-charts'
import type { Ref } from 'vue'

import type { DrawingPoint } from './DrawingPrimitive'
import { DrawingPrimitive } from './DrawingPrimitive'
import type { DrawingToolId } from './drawingTools'
import { getTwoPointDrawingStrategy, isTwoPointDrawingTool } from './strategies/drawingStrategyRegistry'

export const useDrawingInteraction = (
  getChart: () => IChartApi | undefined,
  getSeries: () => ISeriesApi<'Candlestick'> | undefined,
  activeTool: Ref<DrawingToolId | undefined>,
) => {
  const primitive = new DrawingPrimitive()
  let start: DrawingPoint | undefined

  const getPoint = (parameters: MouseEventParams<Time>): DrawingPoint | undefined => {
    const series = getSeries()
    if (!series || parameters.time === undefined || !parameters.point) return undefined
    const price = series.coordinateToPrice(parameters.point.y)
    if (price === null) return undefined
    return { time: parameters.time, price }
  }

  const handleClick = (parameters: MouseEventParams<Time>) => {
    if (!isTwoPointDrawingTool(activeTool.value)) return
    const point = getPoint(parameters)
    if (!point) return
    if (!start) {
      start = point
      return
    }
    const strategy = getTwoPointDrawingStrategy(activeTool.value)
    if (!strategy) return
    primitive.addDrawing(strategy.create(crypto.randomUUID(), start, point))
    start = undefined
    primitive.setDraft(undefined)
  }

  const handleCrosshairMove = (parameters: MouseEventParams<Time>) => {
    if (!start || !isTwoPointDrawingTool(activeTool.value)) return
    const end = getPoint(parameters)
    if (!end) return
    const strategy = getTwoPointDrawingStrategy(activeTool.value)
    if (!strategy) return
    primitive.setDraft(strategy.create('draft', start, end))
  }

  const attach = (series: ISeriesApi<'Candlestick'>) => {
    const chart = getChart()
    series.attachPrimitive(primitive)
    chart?.subscribeClick(handleClick)
    chart?.subscribeCrosshairMove(handleCrosshairMove)
  }

  const dispose = () => {
    getChart()?.unsubscribeClick(handleClick)
    getChart()?.unsubscribeCrosshairMove(handleCrosshairMove)
    getSeries()?.detachPrimitive(primitive)
  }

  return { attach, dispose }
}
