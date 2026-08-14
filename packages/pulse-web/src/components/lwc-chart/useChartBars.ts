import dayjs from 'dayjs'
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'

import type { FutureCnKlineBar } from '@/api/market-data'

type CompleteBar = FutureCnKlineBar & { time: Time }

export const useChartBars = (
  getChart: () => IChartApi | undefined,
  getSeries: () => ISeriesApi<'Candlestick'> | undefined,
  onBarsRendered: (bars: FutureCnKlineBar[]) => void,
) => {
  const realtimeBars = new Map<number, CompleteBar>()
  const barsByTime = new Map<number, CompleteBar>()

  const getChartBars = () => [...barsByTime.values()]
    .sort((first, second) => Number(first.time) - Number(second.time))
    .map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))

  const render = (bars: FutureCnKlineBar[]) => {
    barsByTime.clear()
    bars.forEach((bar) => {
      const time = dayjs(bar.time).unix()
      barsByTime.set(time, { ...bar, time: time as Time })
    })
    realtimeBars.forEach((bar, time) => barsByTime.set(time, bar))
    const chartBars = getChartBars()
    getSeries()?.setData(chartBars)
    getChart()?.timeScale().setVisibleLogicalRange({
      from: Math.max(0, chartBars.length - 200),
      to: chartBars.length + 10,
    })
    onBarsRendered(bars)
  }

  const updateRealtime = (bar: Omit<CompleteBar, 'time'> & { time: number }) => {
    const completeBar = { ...bar, time: bar.time as Time }
    realtimeBars.set(bar.time, completeBar)
    barsByTime.set(bar.time, completeBar)
    const series = getSeries()
    const lastBar = series?.data().at(-1)
    if (!lastBar || bar.time >= Number(lastBar.time)) {
      series?.update(completeBar as never)
      return
    }
    series?.setData(getChartBars() as never)
  }

  const clear = () => {
    realtimeBars.clear()
    barsByTime.clear()
  }

  return { barsByTime, clear, getChartBars, render, updateRealtime }
}
