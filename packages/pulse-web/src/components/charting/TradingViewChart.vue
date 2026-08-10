<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import {
  listFutureCnKlineBars,
  searchMarketInstruments,
  type MarketInstrumentSearchResult,
} from '@/api/market-data'

import ChartSideBar from './side_bar/ChartSideBar.vue'

type ChartWidget = {
  remove: () => void
}

type ChartBar = {
  time: number
  open: number
  close: number
  high: number
  low: number
  volume: number
}

type TradingViewGlobal = {
  widget: new (options: Record<string, unknown>) => ChartWidget
}

declare global {
  interface Window {
    TradingView?: TradingViewGlobal
  }
}

const props = withDefaults(defineProps<{
  symbol?: string
  interval?: '1' | '5'
}>(), {
  symbol: 'jm701',
  interval: '5',
})

const chartContainer = ref<HTMLElement>()
const chartWidget = shallowRef<ChartWidget>()
const loadError = ref<string>()
let renderVersion = 0

const chartingLibraryPath = `${import.meta.env.BASE_URL}charting_library/`
const searchResultsBySymbol = new Map<string, MarketInstrumentSearchResult>()

const getSymbolCode = (symbol: string) => symbol.split(/[.:]/).at(-1) ?? symbol

const resolveChartSymbol = (
  instrument: MarketInstrumentSearchResult,
  onResolve: (symbolInfo: Record<string, unknown>) => void,
) => {
  searchResultsBySymbol.set(instrument.symbol, instrument)
  window.setTimeout(() => onResolve({
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
    supported_resolutions: ['1', '5'],
  }), 0)
}

const datafeed = {
  onReady: (callback: (configuration: Record<string, unknown>) => void) => {
    window.setTimeout(() => callback({
      supported_resolutions: ['1', '5'],
      supports_search: true,
      supports_group_request: false,
    }), 0)
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
        const matchedInstrument = instruments.find((candidate) => candidate.symbol.toLowerCase() === symbolCode.toLowerCase())
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
        instruments.forEach((instrument) => searchResultsBySymbol.set(instrument.symbol, instrument))
        onResult(instruments.map((instrument) => ({
          symbol: instrument.symbol,
          full_name: `${instrument.exchange_mic}:${instrument.symbol}`,
          description: instrument.name,
          exchange: instrument.exchange_name,
          ticker: instrument.symbol,
          type: instrument.instrument_type.toLowerCase(),
        })))
      },
      () => onResult([]),
    )
  },
  getBars: (
    symbolInfo: { ticker?: string },
    resolution: string,
    periodParams: { from: number, to: number, countBack?: number },
    onHistory: (bars: ChartBar[], metadata: { noData: boolean }) => void,
    onError: (reason: string) => void,
  ) => {
    const instrumentId = searchResultsBySymbol.get(symbolInfo.ticker ?? '')?.id
    const interval = resolution === '1' ? '1m' : resolution === '5' ? '5m' : undefined
    if (!instrumentId || !interval) {
      onHistory([], { noData: true })
      return
    }

    void listFutureCnKlineBars(instrumentId, interval, periodParams.from, periodParams.to, periodParams.countBack).then(
      (bars) => onHistory(bars, { noData: bars.length === 0 }),
      (error) => onError(error instanceof Error ? error.message : 'K-line data request failed'),
    )
  },
  subscribeBars: () => undefined,
  unsubscribeBars: () => undefined,
}

const loadChartingLibrary = () => new Promise<TradingViewGlobal>((resolve, reject) => {
  if (window.TradingView?.widget) {
    resolve(window.TradingView)
    return
  }

  const existingScript = document.getElementById('tradingview-charting-library') as HTMLScriptElement | null
  if (existingScript) {
    existingScript.addEventListener('load', () => window.TradingView ? resolve(window.TradingView) : reject(new Error('Charting Library failed to initialize')), { once: true })
    existingScript.addEventListener('error', () => reject(new Error('Charting Library failed to load')), { once: true })
    return
  }

  const script = document.createElement('script')
  script.id = 'tradingview-charting-library'
  script.src = `${chartingLibraryPath}charting_library.standalone.js`
  script.async = true
  script.addEventListener('load', () => window.TradingView ? resolve(window.TradingView) : reject(new Error('Charting Library failed to initialize')), { once: true })
  script.addEventListener('error', () => reject(new Error('Charting Library failed to load')), { once: true })
  document.head.appendChild(script)
})

const destroyChart = () => {
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

    chartWidget.value = new TradingView.widget({
      container: chartContainer.value,
      library_path: chartingLibraryPath,
      datafeed,
      symbol: props.symbol,
      interval: props.interval,
      locale: 'zh',
      timezone: 'Asia/Shanghai',
      autosize: true,
      theme: 'light',
    })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Charting Library failed to load'
  }
}

onMounted(() => void renderChart())

watch(() => [props.symbol, props.interval], () => void renderChart())

onBeforeUnmount(() => {
  renderVersion += 1
  destroyChart()
})
</script>

<template>
  <div class="relative size-full bg-white flex flex-row">
    <div ref="chartContainer" class="size-full" />
    <div v-if="loadError" class="absolute inset-0 flex items-center justify-center bg-white text-sm text-red-600">
      {{ loadError }}
    </div>
    <ChartSideBar />
  </div>
</template>
