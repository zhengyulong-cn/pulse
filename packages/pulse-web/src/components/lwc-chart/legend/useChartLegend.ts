import { computed, ref } from 'vue'
import type { ISeriesApi, MouseEventParams, Time } from 'lightweight-charts'

export type LegendBar = {
  close: number
  high: number
  low: number
  open: number
  time: Time
}

export const useChartLegend = (series: () => ISeriesApi<'Candlestick'> | undefined) => {
  const bar = ref<LegendBar>()
  const previousClose = ref<number>()
  const change = computed(() => {
    if (bar.value === undefined || previousClose.value === undefined || previousClose.value === 0) return undefined
    const amount = bar.value.close - previousClose.value
    return { amount, percent: amount / previousClose.value * 100 }
  })

  const setBar = (nextBar: LegendBar, bars: LegendBar[]) => {
    bar.value = nextBar
    const currentIndex = bars.findIndex((item) => item.time === nextBar.time)
    previousClose.value = currentIndex > 0 ? bars[currentIndex - 1].close : undefined
  }

  const updateFromCrosshair = (parameters: MouseEventParams<Time>) => {
    const candlestickSeries = series()
    const data = candlestickSeries && parameters.seriesData.get(candlestickSeries)
    if (!data || !('open' in data)) return
    setBar(data as LegendBar, candlestickSeries.data() as LegendBar[])
  }

  return { change, legendBar: bar, setLegendBar: setBar, updateFromCrosshair }
}
