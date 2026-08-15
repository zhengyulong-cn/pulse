<script setup lang="ts">
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { candlestickOptions, chartOptions } from './config.ts'
import ChartSideBar from './side_bar/ChartSideBar.vue'
import ChartTopBar from './top_bar/ChartTopBar.vue'
import ChartTooltip from './tooltip/ChartTooltip.vue'
import { useChartTooltip } from './tooltip/useChartTooltip'
import { useKlineData } from './useKlineData'
import { usePinePlotIndicators } from './usePinePlotIndicators'
import { useRealtimeKline } from './useRealtimeKline'
import { useChartBars } from './useChartBars'
import { useDrawingTool } from './drawing/useDrawingTool'
import { useDrawingInteraction } from './drawing/useDrawingInteraction'
import { useChartWatermark } from './watermark/useChartWatermark'
import { useTradeAnnotations } from './side_bar/trade/useTradeAnnotations'
import { useTradeNavigation } from './side_bar/trade/useTradeNavigation'

const chartContainer = ref<HTMLElement>()
const chartHeight = ref(0)
let chart: IChartApi | undefined
let candlestickSeries: ISeriesApi<'Candlestick'> | undefined
let resizeObserver: ResizeObserver | undefined
const { attach: attachTradeAnnotations, dispose: disposeTradeAnnotations, pendingTrade, render: renderTradeAnnotations } = useTradeAnnotations(() => chart, () => candlestickSeries)
const { barsByTime, clear: clearChartBars, render: renderKlines, updateRealtime } = useChartBars(() => chart, () => candlestickSeries, renderTradeAnnotations)
const { tooltip, updateFromCrosshair } = useChartTooltip(() => candlestickSeries, barsByTime)
const { activeDrawingTool, clearDrawingTool, selectDrawingTool } = useDrawingTool()
const { attach: attachDrawingInteraction, cursor: drawingCursor, dispose: disposeDrawingInteraction, restore: restoreDrawings } = useDrawingInteraction(
  () => chart,
  () => candlestickSeries,
  activeDrawingTool,
  () => selectedInstrumentId.value === undefined ? undefined : { instrumentId: selectedInstrumentId.value, interval: selectedInterval.value },
  clearDrawingTool,
)
const { attach: attachWatermark, dispose: disposeWatermark, update: updateWatermark } = useChartWatermark()

const { loadDefaultInstrument, selectKline, selectedInstrumentId, selectedInterval, selectedSymbol } = useKlineData(renderKlines)
const { activeScriptIds, dispose: disposePineIndicators, toggle: togglePineIndicator } = usePinePlotIndicators(() => candlestickSeries)
const { selectInterval, selectSymbol, selectTrade } = useTradeNavigation(selectedInterval, selectKline, (trade) => { pendingTrade.value = trade })

watch([selectedSymbol, selectedInterval], () => updateWatermark(selectedSymbol.value, selectedInterval.value))
watch([selectedInstrumentId, selectedInterval], () => {
  clearChartBars()
  restoreDrawings()
})

useRealtimeKline(selectedInstrumentId, selectedInterval, updateRealtime)

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
  attachDrawingInteraction(candlestickSeries, chartContainer.value)
  attachTradeAnnotations(candlestickSeries)
  attachWatermark(chart, selectedSymbol.value, selectedInterval.value)
  chart.subscribeCrosshairMove(updateFromCrosshair)
  resizeObserver = new ResizeObserver(resizeChart)
  resizeObserver.observe(chartContainer.value)
  resizeChart()
  void loadDefaultInstrument()
})

onBeforeUnmount(() => {
  disposePineIndicators()
  disposeDrawingInteraction(chartContainer.value)
  disposeTradeAnnotations()
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
      :active-drawing-tool="activeDrawingTool"
      :selected-interval="selectedInterval"
      @select-drawing-tool="selectDrawingTool"
      @select-interval="selectInterval"
      @toggle-indicator="togglePineIndicator"
    />
    <div class="flex min-h-0 flex-1">
      <div class="relative min-w-0 flex-1">
        <ChartTooltip :chart-height="chartHeight" :tooltip="tooltip" />
        <div ref="chartContainer" class="size-full" :style="{ cursor: activeDrawingTool ? 'crosshair' : drawingCursor }" />
      </div>
      <ChartSideBar class="shrink-0" @select-symbol="selectSymbol" @select-trade="selectTrade" />
    </div>
  </div>
</template>
