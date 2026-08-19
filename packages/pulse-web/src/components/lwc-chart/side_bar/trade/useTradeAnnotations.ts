import dayjs from 'dayjs'
import { createSeriesMarkers, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { ref } from 'vue'

import type { FutureCnKlineBar } from '@/api/market-data'
import type { TradeRecord } from '@/api/trading'
import { PineLinePrimitive } from '../../indicators_renderer/PineLinePrimitive'

export const useTradeAnnotations = (
  getChart: () => IChartApi | undefined,
  getSeries: () => ISeriesApi<'Candlestick'> | undefined,
) => {
  const pendingTrade = ref<TradeRecord>()
  const tradeLine = new PineLinePrimitive()
  let tradeMarkers: ReturnType<typeof createSeriesMarkers<Time>> | undefined

  const clear = () => {
    tradeMarkers?.setMarkers([])
    tradeLine.setLines([])
  }

  const render = (bars: FutureCnKlineBar[]) => {
    const trade = pendingTrade.value
    const chart = getChart()
    const series = getSeries()
    if (!trade || !trade.closeTime || !trade.closePrice || !chart || !series) return

    const openTimestamp = dayjs(trade.openTime).unix()
    const closeTimestamp = dayjs(trade.closeTime).unix()
    const rangeBars = bars.filter(
      (bar) => bar.time >= openTimestamp * 1000 && bar.time <= closeTimestamp * 1000,
    )
    if (!rangeBars.length) {
      pendingTrade.value = undefined
      clear()
      return
    }

    const sortedBars = [...bars].sort((first, second) => first.time - second.time)
    const nearest = (timestamp: number) =>
      rangeBars.reduce((closest, bar) =>
        Math.abs(dayjs(bar.time).unix() - timestamp) <
        Math.abs(dayjs(closest.time).unix() - timestamp)
          ? bar
          : closest,
      )
    const openBar = nearest(openTimestamp)
    const closeBar = nearest(closeTimestamp)
    const openTime = dayjs(openBar.time).unix() as Time
    const closeTime = dayjs(closeBar.time).unix() as Time
    const isLong = trade.direction === 'LONG'
    tradeMarkers?.setMarkers([
      {
        time: openTime,
        position: isLong ? 'belowBar' : 'aboveBar',
        color: isLong ? '#ef5350' : '#26a69a',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `开仓 ${trade.openPrice}`,
      },
      {
        time: closeTime,
        position: isLong ? 'aboveBar' : 'belowBar',
        color: isLong ? '#26a69a' : '#ef5350',
        shape: isLong ? 'arrowDown' : 'arrowUp',
        text: `平仓 ${trade.closePrice}`,
      },
    ])
    tradeLine.setLines([
      {
        startTime: openTime,
        startValue: Number(trade.openPrice),
        endTime: closeTime,
        endValue: Number(trade.closePrice),
        color: '#000000',
        width: 2,
      },
    ])
    const openIndex = sortedBars.findIndex((bar) => bar.time === openBar.time)
    const closeIndex = sortedBars.findIndex((bar) => bar.time === closeBar.time)
    const tradeBarCount = Math.max(1, closeIndex - openIndex + 1)
    const contextBefore = Math.max(15, Math.ceil(tradeBarCount * 0.5))
    const contextAfter = Math.max(10, Math.ceil(tradeBarCount * 0.25))
    const fromIndex = Math.max(0, openIndex - contextBefore)
    const toIndex = Math.min(sortedBars.length - 1, closeIndex + contextAfter)
    const fromBar = sortedBars[fromIndex]
    const toBar = sortedBars[toIndex]
    if (!fromBar || !toBar) return
    chart.timeScale().setVisibleRange({
      from: dayjs(fromBar.time).unix() as Time,
      to: dayjs(toBar.time).unix() as Time,
    })
  }

  const attach = (series: ISeriesApi<'Candlestick'>) => {
    series.attachPrimitive(tradeLine)
    tradeMarkers = createSeriesMarkers(series, [])
  }

  const dispose = () => {
    tradeMarkers?.detach()
    clear()
  }

  return { attach, clear, dispose, pendingTrade, render, tradeLine }
}
