import type { FutureCnKlineBar } from '@/api/market-data'
import type { ISeriesApi, MouseEventParams, Time } from 'lightweight-charts'
import { ref } from 'vue'

type TooltipBar = FutureCnKlineBar & { time: Time }

export type ChartTooltipData = {
  amplitude: number
  bar: TooltipBar
  change: number
  x: number
  y: number
}

export const useChartTooltip = (
  getCandlestickSeries: () => ISeriesApi<'Candlestick'> | undefined,
  barsByTime: Map<number, TooltipBar>,
) => {
  const tooltip = ref<ChartTooltipData>()

  const updateFromCrosshair = (parameters: MouseEventParams<Time>) => {
    const series = getCandlestickSeries()
    const time = parameters.time
    const point = parameters.point
    if (!series || time === undefined || !point || !parameters.seriesData.get(series)) {
      tooltip.value = undefined
      return
    }

    const bar = barsByTime.get(Number(time))
    if (!bar) {
      tooltip.value = undefined
      return
    }

    const previousBar = [...barsByTime.values()].reduce<TooltipBar | undefined>(
      (previous, item) => {
        if (Number(item.time) >= Number(time)) return previous
        if (!previous || Number(item.time) > Number(previous.time)) return item
        return previous
      },
      undefined,
    )
    const comparisonPrice = previousBar?.close ?? bar.open
    const change =
      comparisonPrice === 0 ? 0 : ((bar.close - comparisonPrice) / comparisonPrice) * 100
    const amplitude = comparisonPrice === 0 ? 0 : ((bar.high - bar.low) / comparisonPrice) * 100
    tooltip.value = { amplitude, bar, change, x: point.x, y: point.y }
  }

  return { tooltip, updateFromCrosshair }
}
