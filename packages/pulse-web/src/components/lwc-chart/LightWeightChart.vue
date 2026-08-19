<script setup lang="ts">
import dayjs from 'dayjs'
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FutureCnKlineBar } from '@/api/market-data'

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
import DrawingMenu from './drawing/DrawingMenu.vue'
import { DrawingStrategyRegistry } from './drawing/strategies/drawingStrategyRegistry'
import { useChartWatermark } from './watermark/useChartWatermark'
import { useTradeAnnotations } from './side_bar/trade/useTradeAnnotations'
import { useTradeNavigation } from './side_bar/trade/useTradeNavigation'
import ReplayControls from './replay/ReplayControls.vue'
import { ReplaySelectionPrimitive } from './replay/ReplaySelectionPrimitive'
import { useChartReplay } from './replay/useChartReplay'

const chartContainer = ref<HTMLElement>()
const chartHeight = ref(0)
let chart: IChartApi | undefined
let candlestickSeries: ISeriesApi<'Candlestick'> | undefined
let resizeObserver: ResizeObserver | undefined
const replaySelectionPrimitive = new ReplaySelectionPrimitive()
const {
  attach: attachTradeAnnotations,
  dispose: disposeTradeAnnotations,
  pendingTrade,
  render: renderTradeAnnotations,
} = useTradeAnnotations(
  () => chart,
  () => candlestickSeries,
)
const {
  barsByTime,
  clear: clearChartBars,
  render: renderChartKlines,
  updateRealtime,
} = useChartBars(
  () => chart,
  () => candlestickSeries,
  renderTradeAnnotations,
)
const allKlineBars = ref<FutureCnKlineBar[]>([])

const toChartTime = (time: number) =>
  time > 10_000_000_000 ? Math.trunc(time / 1_000) : Math.trunc(time)
const getReplayBars = () => allKlineBars.value.map((bar) => ({ time: toChartTime(bar.time) }))

const renderVisibleBars = (endTime?: number) => {
  const bars =
    endTime === undefined
      ? allKlineBars.value
      : allKlineBars.value.filter((bar) => toChartTime(bar.time) <= endTime)
  renderChartKlines(bars)
}

const appendReplayBar = ({ time }: { time: number }) => {
  const bar = allKlineBars.value.find((candidate) => toChartTime(candidate.time) === time)
  if (!bar) return
  updateRealtime({ ...bar, time })
}

const {
  beginSelection: beginReplaySelection,
  candidateTime: replayCandidateTime,
  exit: exitReplay,
  isActive: isReplayActive,
  isPlaying: isReplayPlaying,
  isSelecting: isReplaySelecting,
  next: replayNext,
  previous: replayPrevious,
  replayEndTime,
  reset: resetReplay,
  selectStart: selectReplayStart,
  setCandidateTime: setReplayCandidateTime,
  setSpeed: setReplaySpeed,
  speed: replaySpeed,
  togglePlayback: toggleReplayPlayback,
} = useChartReplay(getReplayBars, renderVisibleBars, appendReplayBar)
const replayEnabled = computed(() => isReplaySelecting.value || isReplayActive.value)

const renderKlines = (bars: FutureCnKlineBar[]) => {
  allKlineBars.value = bars
  renderVisibleBars(replayEndTime.value)
}

const handleRealtimeBar = (bar: Omit<FutureCnKlineBar, 'time'> & { time: number }) => {
  const time = toChartTime(bar.time)
  const nextBar = { ...bar, time: time * 1_000 }
  const index = allKlineBars.value.findIndex((candidate) => toChartTime(candidate.time) === time)
  if (index < 0)
    allKlineBars.value = [...allKlineBars.value, nextBar].sort(
      (first, second) => first.time - second.time,
    )
  else allKlineBars.value.splice(index, 1, nextBar)

  if (!isReplayActive.value) updateRealtime({ ...bar, time })
}
const drawingStrategies = new DrawingStrategyRegistry(() => [...barsByTime.values()])
const { tooltip, updateFromCrosshair } = useChartTooltip(() => candlestickSeries, barsByTime)
const { activeDrawingTool, clearDrawingTool, selectDrawingTool } = useDrawingTool()
const {
  attach: attachDrawingInteraction,
  clearDrawings,
  cursor: drawingCursor,
  dispose: disposeDrawingInteraction,
  isCrossInterval: crossIntervalDrawing,
  isVisible: drawingsVisible,
  removeSelectedDrawing,
  restore: restoreDrawings,
  selectedDrawing,
  toggleCrossInterval: toggleCrossIntervalDrawing,
  toggleSelectedDrawingLock,
  toggleVisibility: toggleDrawingsVisibility,
  updateSelectedDrawingStyle,
} = useDrawingInteraction(
  () => chart,
  () => candlestickSeries,
  activeDrawingTool,
  drawingStrategies,
  () =>
    selectedInstrumentId.value === undefined
      ? undefined
      : { instrumentId: selectedInstrumentId.value, interval: selectedInterval.value },
  clearDrawingTool,
)
const {
  attach: attachWatermark,
  dispose: disposeWatermark,
  update: updateWatermark,
} = useChartWatermark()

const {
  loadDefaultInstrument,
  selectKline,
  selectedInstrumentId,
  selectedInterval,
  selectedSymbol,
} = useKlineData(renderKlines)
const {
  activeScriptIds,
  dispose: disposePineIndicators,
  toggle: togglePineIndicator,
} = usePinePlotIndicators(() => candlestickSeries)
const { selectInterval, selectSymbol, selectTrade } = useTradeNavigation(
  selectedInterval,
  selectKline,
  (trade) => {
    pendingTrade.value = trade
  },
)

watch([selectedSymbol, selectedInterval], () =>
  updateWatermark(selectedSymbol.value, selectedInterval.value),
)
watch([selectedInstrumentId, selectedInterval], () => {
  if (replayEnabled.value) exitReplay()
  clearChartBars()
  restoreDrawings()
})

useRealtimeKline(selectedInstrumentId, selectedInterval, handleRealtimeBar)

const replayCandidateLabel = computed(() =>
  replayCandidateTime.value === undefined
    ? '移动鼠标选择起始 K 线'
    : `${dayjs.unix(replayCandidateTime.value).format('YYYY-MM-DD HH:mm')}，单击确认`,
)

const updateReplayCandidate = (parameters: MouseEventParams<Time>) => {
  setReplayCandidateTime(typeof parameters.time === 'number' ? parameters.time : undefined)
}

const startReplaySelection = () => {
  clearDrawingTool()
  beginReplaySelection()
}

const toggleReplay = () => {
  if (replayEnabled.value) exitReplay()
  else startReplaySelection()
}

watch([isReplaySelecting, replayCandidateTime], () => {
  replaySelectionPrimitive.setTime(
    isReplaySelecting.value ? (replayCandidateTime.value as Time | undefined) : undefined,
  )
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
  candlestickSeries.attachPrimitive(replaySelectionPrimitive)
  attachDrawingInteraction(candlestickSeries, chartContainer.value)
  attachTradeAnnotations(candlestickSeries)
  attachWatermark(chart, selectedSymbol.value, selectedInterval.value)
  chart.subscribeCrosshairMove(updateFromCrosshair)
  chart.subscribeCrosshairMove(updateReplayCandidate)
  chart.subscribeClick(selectReplayStart)
  resizeObserver = new ResizeObserver(resizeChart)
  resizeObserver.observe(chartContainer.value)
  resizeChart()
  void loadDefaultInstrument()
})

onBeforeUnmount(() => {
  disposePineIndicators()
  resetReplay()
  disposeDrawingInteraction(chartContainer.value)
  disposeTradeAnnotations()
  disposeWatermark()
  resizeObserver?.disconnect()
  chart?.unsubscribeCrosshairMove(updateFromCrosshair)
  chart?.unsubscribeCrosshairMove(updateReplayCandidate)
  chart?.unsubscribeClick(selectReplayStart)
  candlestickSeries?.detachPrimitive(replaySelectionPrimitive)
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
      :cross-interval-drawing="crossIntervalDrawing"
      :drawings-visible="drawingsVisible"
      :replay-active="replayEnabled"
      :selected-interval="selectedInterval"
      @select-drawing-tool="selectDrawingTool"
      @clear-drawings="clearDrawings"
      @toggle-cross-interval-drawing="toggleCrossIntervalDrawing"
      @toggle-drawings-visibility="toggleDrawingsVisibility"
      @select-interval="selectInterval"
      @toggle-indicator="togglePineIndicator"
      @toggle-replay="toggleReplay"
    />
    <div class="flex min-h-0 flex-1">
      <div class="relative min-w-0 flex-1">
        <ChartTooltip :chart-height="chartHeight" :tooltip="tooltip" />
        <div
          v-if="isReplaySelecting"
          class="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"
        >
          <div
            class="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm"
          >
            {{ replayCandidateLabel }}
          </div>
        </div>
        <ReplayControls
          v-if="isReplayActive"
          :is-playing="isReplayPlaying"
          :speed="replaySpeed"
          @exit="exitReplay"
          @next="replayNext"
          @previous="replayPrevious"
          @set-speed="setReplaySpeed"
          @toggle-playback="toggleReplayPlayback"
        />
        <DrawingMenu
          v-if="selectedDrawing"
          :drawing="selectedDrawing"
          @remove="removeSelectedDrawing"
          @toggle-lock="toggleSelectedDrawingLock"
          @update-style="updateSelectedDrawingStyle"
        />
        <div
          ref="chartContainer"
          class="size-full"
          :style="{ cursor: activeDrawingTool ? 'crosshair' : drawingCursor }"
        />
      </div>
      <ChartSideBar class="shrink-0" @select-symbol="selectSymbol" @select-trade="selectTrade" />
    </div>
  </div>
</template>
