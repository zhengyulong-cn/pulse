<script setup lang="ts">
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import dayjs from 'dayjs'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FutureCnKlineBar } from '@/api/market-data'
import { candlestickOptions, chartOptions } from './config.ts'
import ChartSideBar from './side_bar/ChartSideBar.vue'
import ChartTopBar from './top_bar/ChartTopBar.vue'
import { useKlineData } from './useKlineData'
import { usePinePlotIndicators } from './usePinePlotIndicators'
import { useRealtimeKline } from './useRealtimeKline'

const chartContainer = ref<HTMLElement>()
let chart: IChartApi | undefined
let candlestickSeries: ISeriesApi<'Candlestick'> | undefined
let resizeObserver: ResizeObserver | undefined
const DEFAULT_VISIBLE_BAR_COUNT = 200
const realtimeBars = new Map<number, { close: number, high: number, low: number, open: number, time: number }>()

const renderKlines = (bars: FutureCnKlineBar[]) => {
  const barsByTime = new Map(bars.map((bar) => [dayjs(bar.time).unix(), {
    time: dayjs(bar.time).unix() as Time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }]))
  realtimeBars.forEach((bar, time) => barsByTime.set(time, { ...bar, time: time as Time }))
  const chartBars = [...barsByTime.values()].sort((first, second) => Number(first.time) - Number(second.time))
  candlestickSeries?.setData(chartBars)
  chart?.timeScale().setVisibleLogicalRange({
    from: Math.max(0, chartBars.length - DEFAULT_VISIBLE_BAR_COUNT),
    to: chartBars.length - 1,
  })
}

const { loadDefaultInstrument, selectKline, selectedInstrumentId, selectedInterval } = useKlineData(renderKlines)
const { activeScriptIds, dispose: disposePineIndicators, toggle: togglePineIndicator } = usePinePlotIndicators(() => candlestickSeries)
watch([selectedInstrumentId, selectedInterval], () => realtimeBars.clear())
useRealtimeKline(selectedInstrumentId, selectedInterval, (bar) => {
  realtimeBars.set(bar.time, bar)
  const lastBar = candlestickSeries?.data().at(-1)
  if (!lastBar || bar.time >= Number(lastBar.time)) {
    candlestickSeries?.update(bar as never)
    return
  }
  const chartBars = [...candlestickSeries.data(), ...realtimeBars.values()]
    .reduce((barsByTime, item) => barsByTime.set(Number(item.time), item), new Map<number, unknown>())
  candlestickSeries?.setData([...chartBars.values()].sort((first, second) => Number((first as { time: Time }).time) - Number((second as { time: Time }).time)) as never)
})

const resizeChart = () => {
  if (!chart || !chartContainer.value) return
  const { clientHeight, clientWidth } = chartContainer.value
  chart.resize(clientWidth, clientHeight)
}

onMounted(() => {
  if (!chartContainer.value) return

  chart = createChart(chartContainer.value, chartOptions)
  candlestickSeries = chart.addSeries(CandlestickSeries, candlestickOptions)
  resizeObserver = new ResizeObserver(resizeChart)
  resizeObserver.observe(chartContainer.value)
  resizeChart()
  void loadDefaultInstrument()
})

onBeforeUnmount(() => {
  disposePineIndicators()
  resizeObserver?.disconnect()
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
      <div ref="chartContainer" class="min-w-0 flex-1" />
      <ChartSideBar class="shrink-0" @select-symbol="selectKline({ instrument: $event })" />
    </div>
  </div>
</template>
