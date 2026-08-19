<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import {
  listFutureCnKlineBars,
  searchMarketInstruments,
  type MarketInstrumentSearchResult,
} from '@/api/market-data'
import type { PineChartApi, PineChartBar } from '@/indicators/PinePlotRenderer'

import ChartSideBar from './side_bar/ChartSideBar.vue'
import {
  createAdvancedIndicatorsDropdown,
  type AdvancedIndicatorsDropdownApi,
} from './tool_bar/advancedIndicatorsDropdown'
import ReplayControls from './tool_bar/ReplayControls.vue'
import { useChartReplay } from './useChartReplay'
import { usePineIndicators } from './usePineIndicators'

type ChartWidget = {
  activeChart: () => PineChartApi
  createButton: () => HTMLElement
  createDropdown: (options: {
    align: 'left' | 'right'
    items: Array<{ onSelect: () => void; title: string }>
    title: string
    tooltip?: string
  }) => Promise<AdvancedIndicatorsDropdownApi>
  headerReady: () => Promise<void>
  onChartReady: (callback: () => void) => void
  removeButton: (button: HTMLElement) => void
  resetCache: () => void
  remove: () => void
}

type TradingViewGlobal = {
  widget: new (options: Record<string, unknown>) => ChartWidget
}

declare global {
  interface Window {
    TradingView?: TradingViewGlobal
  }
}

const chartContainer = ref<HTMLElement>()
const chartWidget = shallowRef<ChartWidget>()
const loadError = ref<string>()
const selectedSymbol = ref('jm2701')
const selectedInterval = ref('5')
const {
  activeScriptIds: activePineScriptIds,
  dispose: disposePineIndicators,
  getBars: getPineIndicatorBars,
  resetChart: resetPineIndicatorsChart,
  setBars: setPineIndicatorBars,
  setChart: setPineIndicatorChart,
  setReplayEndTime: setPineReplayEndTime,
  toggle: togglePineScript,
} = usePineIndicators()
let advancedIndicatorsDropdown: AdvancedIndicatorsDropdownApi | undefined
let replayButton: HTMLElement | undefined
let activeReplayChart:
  | (PineChartApi & {
      crossHairMoved: () => {
        subscribe: (context: unknown, callback: (params: { time?: number }) => void) => void
        unsubscribe: (context: unknown, callback: (params: { time?: number }) => void) => void
      }
      resetData: () => void
    })
  | undefined
let replayCrosshairListener: ((params: { time?: number }) => void) | undefined
let replayBarSubscriber: ((bar: PineChartBar) => void) | undefined
let replayPreviewMarkerId: string | undefined
let replayPreviewMarkerVersion = 0
let chartIframe: HTMLIFrameElement | undefined
let replayClickListener: ((event: MouseEvent) => void) | undefined
let renderVersion = 0

const chartingLibraryPath = `${import.meta.env.BASE_URL}charting_library/`
const searchResultsBySymbol = new Map<string, MarketInstrumentSearchResult>()

const refreshReplayChartData = () => {
  if (!chartWidget.value || !activeReplayChart) return
  chartWidget.value.resetCache()
  activeReplayChart.resetData()
}

const publishReplayBar = (bar: PineChartBar) => replayBarSubscriber?.(bar)

const {
  beginSelection: beginReplaySelection,
  candidateTime: replayCandidateTime,
  exit: exitReplay,
  isActive: isReplayActive,
  isPlaying: isReplayPlaying,
  isSelecting: isReplaySelecting,
  next: replayNext,
  selectStart: selectReplayStart,
  setCrosshairTime: setReplayCrosshairTime,
  setSpeed: setReplaySpeed,
  speed: replaySpeed,
  replayEndTime,
  reset: resetReplay,
  togglePlayback: toggleReplayPlayback,
} = useChartReplay(
  getPineIndicatorBars,
  setPineReplayEndTime,
  refreshReplayChartData,
  publishReplayBar,
)

const replayCandidateLabel = computed(() =>
  replayCandidateTime.value === undefined
    ? '移动鼠标选择起始 K 线'
    : new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        month: '2-digit',
        day: '2-digit',
      }).format(replayCandidateTime.value),
)

const clearReplayPreviewMarker = () => {
  replayPreviewMarkerVersion += 1
  if (replayPreviewMarkerId) activeReplayChart?.removeEntity(replayPreviewMarkerId)
  replayPreviewMarkerId = undefined
}

const removeReplaySelectionListener = () => {
  if (chartIframe?.contentDocument && replayClickListener) {
    chartIframe.contentDocument.removeEventListener('click', replayClickListener, true)
  }
  chartIframe = undefined
  replayClickListener = undefined
}

const registerReplaySelectionListener = () => {
  removeReplaySelectionListener()
  const iframe = chartContainer.value?.querySelector('iframe')
  const document = iframe?.contentDocument
  if (!iframe || !document) return

  replayClickListener = (event) => {
    if (!isReplaySelecting.value || event.button !== 0) return
    selectReplayStart()
  }
  document.addEventListener('click', replayClickListener, true)
  chartIframe = iframe
}

const updateReplayPreviewMarker = async () => {
  const time = replayCandidateTime.value
  if (!isReplaySelecting.value || time === undefined || !activeReplayChart) {
    clearReplayPreviewMarker()
    return
  }

  const version = ++replayPreviewMarkerVersion
  if (replayPreviewMarkerId) activeReplayChart.removeEntity(replayPreviewMarkerId)
  replayPreviewMarkerId = undefined
  const markerId = await activeReplayChart.createShape(
    { time: Math.trunc(time / 1_000) },
    {
      shape: 'vertical_line',
      lock: true,
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      overrides: {
        linecolor: '#2962ff',
        linewidth: 2,
      },
    },
  )
  if (version === replayPreviewMarkerVersion) replayPreviewMarkerId = markerId
  else activeReplayChart.removeEntity(markerId)
}

watch([isReplaySelecting, replayCandidateTime], () => void updateReplayPreviewMarker())

const getSymbolCode = (symbol: string) => symbol.split(/[.:]/).at(-1) ?? symbol

const resolveChartSymbol = (
  instrument: MarketInstrumentSearchResult,
  onResolve: (symbolInfo: Record<string, unknown>) => void,
) => {
  searchResultsBySymbol.set(instrument.symbol, instrument)
  window.setTimeout(
    () =>
      onResolve({
        name: instrument.symbol,
        ticker: instrument.symbol,
        description: instrument.name,
        type: 'futures',
        session: '24x7',
        timezone: 'Asia/Shanghai',
        exchange: instrument.exchange_name,
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        supported_resolutions: ['1', '5', '15', '30', '60'],
      }),
    0,
  )
}

const datafeed = {
  onReady: (callback: (configuration: Record<string, unknown>) => void) => {
    window.setTimeout(
      () =>
        callback({
          supported_resolutions: ['1', '5', '15', '30', '60'],
          supports_search: true,
          supports_group_request: false,
        }),
      0,
    )
  },
  resolveSymbol: (
    symbol: string,
    onResolve: (symbolInfo: Record<string, unknown>) => void,
    onError: (reason: string) => void,
  ) => {
    const instrument = searchResultsBySymbol.get(symbol)
    if (instrument) {
      resolveChartSymbol(instrument, onResolve)
      return
    }

    const symbolCode = getSymbolCode(symbol)
    void searchMarketInstruments(symbolCode).then(
      (instruments) => {
        const matchedInstrument = instruments.find(
          (candidate) => candidate.symbol.toLowerCase() === symbolCode.toLowerCase(),
        )
        if (matchedInstrument) {
          resolveChartSymbol(matchedInstrument, onResolve)
          return
        }
        onError(`Symbol not found: ${symbol}`)
      },
      () => onError(`Failed to resolve symbol: ${symbol}`),
    )
  },
  searchSymbols: (
    userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: (items: Array<Record<string, string>>) => void,
  ) => {
    const query = userInput.trim()
    if (!query) {
      onResult([])
      return
    }

    void searchMarketInstruments(query).then(
      (instruments) => {
        instruments.forEach((instrument) =>
          searchResultsBySymbol.set(instrument.symbol, instrument),
        )
        onResult(
          instruments.map((instrument) => ({
            symbol: instrument.symbol,
            full_name: `${instrument.exchange_mic}:${instrument.symbol}`,
            description: instrument.name,
            exchange: instrument.exchange_name,
            ticker: instrument.symbol,
            type: instrument.instrument_type.toLowerCase(),
          })),
        )
      },
      () => onResult([]),
    )
  },
  getBars: (
    symbolInfo: { ticker?: string },
    resolution: string,
    periodParams: { from: number; to: number; countBack?: number },
    onHistory: (bars: PineChartBar[], metadata: { noData: boolean }) => void,
    onError: (reason: string) => void,
  ) => {
    const instrumentId = searchResultsBySymbol.get(symbolInfo.ticker ?? '')?.id
    const intervalByResolution: Record<string, '1m' | '5m' | '15m' | '30m' | '1h'> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
    }
    const interval = intervalByResolution[resolution]
    if (!instrumentId || !interval) {
      onHistory([], { noData: true })
      return
    }

    const pineRequiredBars = 1_000
    const countBack = Math.max(periodParams.countBack ?? 0, pineRequiredBars)
    void listFutureCnKlineBars(
      instrumentId,
      interval,
      periodParams.from,
      periodParams.to,
      countBack,
    ).then(
      (bars) => {
        const visibleBars = isReplayActive.value
          ? bars.filter((bar) => bar.time <= replayEndTime.value!)
          : bars
        onHistory(visibleBars, { noData: visibleBars.length === 0 })
        window.requestAnimationFrame(() => {
          setPineIndicatorBars(bars)
        })
      },
      (error) => onError(error instanceof Error ? error.message : 'K-line data request failed'),
    )
  },
  subscribeBars: (
    _symbolInfo: unknown,
    _resolution: string,
    onRealtimeCallback: (bar: PineChartBar) => void,
  ) => {
    replayBarSubscriber = onRealtimeCallback
  },
  unsubscribeBars: () => {
    replayBarSubscriber = undefined
  },
}

const loadChartingLibrary = () =>
  new Promise<TradingViewGlobal>((resolve, reject) => {
    if (window.TradingView?.widget) {
      resolve(window.TradingView)
      return
    }

    const existingScript = document.getElementById(
      'tradingview-charting-library',
    ) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () =>
          window.TradingView
            ? resolve(window.TradingView)
            : reject(new Error('Charting Library failed to initialize')),
        { once: true },
      )
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Charting Library failed to load')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = 'tradingview-charting-library'
    script.src = `${chartingLibraryPath}charting_library.standalone.js`
    script.async = true
    script.addEventListener(
      'load',
      () =>
        window.TradingView
          ? resolve(window.TradingView)
          : reject(new Error('Charting Library failed to initialize')),
      { once: true },
    )
    script.addEventListener('error', () => reject(new Error('Charting Library failed to load')), {
      once: true,
    })
    document.head.appendChild(script)
  })

const destroyChart = () => {
  resetReplay()
  clearReplayPreviewMarker()
  removeReplaySelectionListener()
  if (activeReplayChart && replayCrosshairListener)
    activeReplayChart.crossHairMoved().unsubscribe(null, replayCrosshairListener)
  activeReplayChart = undefined
  replayCrosshairListener = undefined
  replayBarSubscriber = undefined
  resetPineIndicatorsChart()
  advancedIndicatorsDropdown?.remove()
  advancedIndicatorsDropdown = undefined
  if (replayButton && chartWidget.value) chartWidget.value.removeButton(replayButton)
  replayButton = undefined
  chartWidget.value?.remove()
  chartWidget.value = undefined
}

const renderChart = async () => {
  const version = ++renderVersion
  destroyChart()
  loadError.value = undefined

  try {
    const TradingView = await loadChartingLibrary()
    if (version !== renderVersion || !chartContainer.value) return

    const widget = new TradingView.widget({
      container: chartContainer.value,
      library_path: chartingLibraryPath,
      datafeed,
      symbol: selectedSymbol.value,
      interval: selectedInterval.value,
      locale: 'zh',
      timezone: 'Asia/Shanghai',
      autosize: true,
      theme: 'light',
    })
    chartWidget.value = widget
    void widget.headerReady().then(() => {
      if (version !== renderVersion || chartWidget.value !== widget) return

      void createAdvancedIndicatorsDropdown(
        widget,
        () => activePineScriptIds.value,
        togglePineScript,
      ).then((dropdown) => {
        if (version !== renderVersion || chartWidget.value !== widget) {
          dropdown.remove()
          return
        }
        advancedIndicatorsDropdown = dropdown
      })

      const button = widget.createButton()
      button.textContent = '回放'
      button.title = 'K线回放'
      button.className = 'apply-common-tooltip'
      button.addEventListener('click', () => {
        if (isReplaySelecting.value || isReplayActive.value) exitReplay()
        else beginReplaySelection()
      })
      replayButton = button
    })
    widget.onChartReady(() => {
      if (version !== renderVersion || chartWidget.value !== widget) return
      const chart = widget.activeChart() as typeof activeReplayChart
      if (!chart) return
      activeReplayChart = chart
      setPineIndicatorChart(chart)
      replayCrosshairListener = (params) => setReplayCrosshairTime(params.time)
      chart.crossHairMoved().subscribe(null, replayCrosshairListener)
      window.setTimeout(registerReplaySelectionListener, 0)
    })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Charting Library failed to load'
  }
}

onMounted(() => void renderChart())

watch(
  () => [selectedSymbol.value],
  () => void renderChart(),
)

const selectWatchlistSymbol = (symbol: string) => {
  selectedSymbol.value = symbol
}

onBeforeUnmount(() => {
  renderVersion += 1
  destroyChart()
  disposePineIndicators()
})
</script>

<template>
  <div class="relative size-full bg-white flex flex-row">
    <div ref="chartContainer" class="size-full" />
    <ReplayControls
      v-if="isReplayActive"
      :is-playing="isReplayPlaying"
      :speed="replaySpeed"
      @exit="exitReplay"
      @next="replayNext"
      @set-speed="setReplaySpeed"
      @toggle-playback="toggleReplayPlayback"
    />
    <div v-if="isReplaySelecting" class="absolute inset-x-0 top-12 z-10 flex justify-center">
      <div
        class="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 shadow-sm"
      >
        {{ replayCandidateLabel }}，单击左键确认
        <button
          type="button"
          class="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
          @click="exitReplay"
        >
          取消
        </button>
      </div>
    </div>
    <div
      v-if="loadError"
      class="absolute inset-0 flex items-center justify-center bg-white text-sm text-red-600"
    >
      {{ loadError }}
    </div>
    <ChartSideBar @select-symbol="selectWatchlistSymbol" />
  </div>
</template>
