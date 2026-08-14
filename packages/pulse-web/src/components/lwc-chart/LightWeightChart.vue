<script setup lang="ts">
import dayjs from 'dayjs'
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FutureCnKlineBar } from '@/api/market-data'
import { candlestickOptions, chartOptions } from './config.ts'
import ChartSideBar from './side_bar/ChartSideBar.vue'
import ChartTopBar from './top_bar/ChartTopBar.vue'
import ChartTooltip from './tooltip/ChartTooltip.vue'
import { useChartTooltip } from './tooltip/useChartTooltip'
import { useKlineData } from './useKlineData'
import { usePinePlotIndicators } from './usePinePlotIndicators'
import { useRealtimeKline } from './useRealtimeKline'
import { useChartWatermark } from './watermark/useChartWatermark'

type CompleteBar = FutureCnKlineBar & { time: Time }

const chartContainer = ref<HTMLElement>()
const chartHeight = ref(0)
let chart: IChartApi | undefined
let candlestickSeries: ISeriesApi<'Candlestick'> | undefined
let resizeObserver: ResizeObserver | undefined
const DEFAULT_VISIBLE_BAR_COUNT = 200
const realtimeBars = new Map<number, CompleteBar>()
const barsByTime = new Map<number, CompleteBar>()
const { tooltip, updateFromCrosshair } = useChartTooltip(() => candlestickSeries, barsByTime)
const { attach: attachWatermark, dispose: disposeWatermark, update: updateWatermark } = useChartWatermark()

const getChartBars = () => [...barsByTime.values()]
  .sort((first, second) => Number(first.time) - Number(second.time))
  .map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))

const renderKlines = (bars: FutureCnKlineBar[]) => {
  barsByTime.clear()
  bars.forEach((bar) => {
    const time = dayjs(bar.time).unix()
    barsByTime.set(time, { ...bar, time: time as Time })
  })
  realtimeBars.forEach((bar, time) => barsByTime.set(time, bar))
  const chartBars = getChartBars()
  candlestickSeries?.setData(chartBars)
  chart?.timeScale().setVisibleLogicalRange({
    from: Math.max(0, chartBars.length - DEFAULT_VISIBLE_BAR_COUNT),
    to: chartBars.length + 10,
  })
}

const { loadDefaultInstrument, selectKline, selectedInstrumentId, selectedInterval, selectedSymbol } = useKlineData(renderKlines)
const { activeScriptIds, dispose: disposePineIndicators, toggle: togglePineIndicator } = usePinePlotIndicators(() => candlestickSeries)
watch([selectedSymbol, selectedInterval], () => {
  updateWatermark(selectedSymbol.value, selectedInterval.value)
})
watch([selectedInstrumentId, selectedInterval], () => {
  realtimeBars.clear()
  barsByTime.clear()
})

useRealtimeKline(selectedInstrumentId, selectedInterval, (bar) => {
  const completeBar = { ...bar, time: bar.time as Time }
  realtimeBars.set(bar.time, completeBar)
  barsByTime.set(bar.time, completeBar)
  const lastBar = candlestickSeries?.data().at(-1)
  if (!lastBar || bar.time >= Number(lastBar.time)) {
    candlestickSeries?.update(completeBar as never)
    return
  }
  candlestickSeries?.setData(getChartBars() as never)
})

const resizeChart = () => {
  if (!chart || !chartContainer.value) return
  const { clientHeight, clientWidth } = chartContainer.value
  chartHeight.value = clientHeight
  chart.resize(clientWidth, clientHeight)
}

onMounted(() => {
  if (!chartContainer.value) return
  chart = createChart(chartContainer.value, chartOptions)
  candlestickSeries = chart.addSeries(CandlestickSeries, candlestickOptions)
  attachWatermark(chart, selectedSymbol.value, selectedInterval.value)
  chart.subscribeCrosshairMove(updateFromCrosshair)
  resizeObserver = new ResizeObserver(resizeChart)
  resizeObserver.observe(chartContainer.value)
  resizeChart()
  void loadDefaultInstrument()
})

onBeforeUnmount(() => {
  disposePineIndicators()
  disposeWatermark()
  resizeObserver?.disconnect()
  chart?.unsubscribeCrosshairMove(updateFromCrosshair)
  chart?.remove()
  chart = undefined
  candlestickSeries = undefined
})
</script>

<template>
  <div class="relative flex size-full flex-col bg-white">
    <ChartTopBar
      :active-script-ids="activeScriptIds"
      :selected-interval="selectedInterval"
      @select-interval="selectKline({ interval: $event })"
      @toggle-indicator="togglePineIndicator"
    />
    <div class="flex min-h-0 flex-1">
      <div class="relative min-w-0 flex-1">
        <ChartTooltip :chart-height="chartHeight" :tooltip="tooltip" />
        <div ref="chartContainer" class="size-full" />
      </div>
      <ChartSideBar class="shrink-0" @select-symbol="selectKline({ instrument: $event })" />
    </div>
  </div>
</template>
