<script setup lang="ts">
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import dayjs from 'dayjs'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import type { FutureCnKlineBar } from '@/api/market-data'
import { chartOptions } from './config.ts'
import ChartSideBar from './side_bar/ChartSideBar.vue'
import ChartTopBar from './top_bar/ChartTopBar.vue'
import { useKlineData } from './useKlineData'
import { usePinePlotIndicators } from './usePinePlotIndicators'

const chartContainer = ref<HTMLElement>()
let chart: IChartApi | undefined
let candlestickSeries: ISeriesApi<'Candlestick'> | undefined
let resizeObserver: ResizeObserver | undefined
const DEFAULT_VISIBLE_BAR_COUNT = 200

const renderKlines = (bars: FutureCnKlineBar[]) => {
  candlestickSeries?.setData(bars.map((bar) => ({
    time: dayjs(bar.time).unix() as Time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  })))
  chart?.timeScale().setVisibleLogicalRange({
    from: Math.max(0, bars.length - DEFAULT_VISIBLE_BAR_COUNT),
    to: bars.length - 1,
  })
}

const { loadDefaultInstrument, selectKline, selectedInterval } = useKlineData(renderKlines)
const { activeScriptIds, dispose: disposePineIndicators, toggle: togglePineIndicator } = usePinePlotIndicators(() => candlestickSeries)

const resizeChart = () => {
  if (!chart || !chartContainer.value) return
  const { clientHeight, clientWidth } = chartContainer.value
  chart.resize(clientWidth, clientHeight)
}

onMounted(() => {
  if (!chartContainer.value) return

  chart = createChart(chartContainer.value, chartOptions)
  candlestickSeries = chart.addSeries(CandlestickSeries)
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
