<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import ChartSideBar from './side_bar/ChartSideBar.vue'

type ChartWidget = {
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

const props = withDefaults(defineProps<{
  symbol?: string
  interval?: '1' | '5'
}>(), {
  symbol: 'DCE.jm2609',
  interval: '1',
})

const chartContainer = ref<HTMLElement>()
const chartWidget = shallowRef<ChartWidget>()
const loadError = ref<string>()
let renderVersion = 0

const chartingLibraryPath = `${import.meta.env.BASE_URL}charting_library/`

const emptyDatafeed = {
  onReady: (callback: (configuration: Record<string, unknown>) => void) => {
    window.setTimeout(() => callback({ supported_resolutions: ['1', '5'] }), 0)
  },
  resolveSymbol: (
    symbol: string,
    onResolve: (symbolInfo: Record<string, unknown>) => void,
  ) => {
    window.setTimeout(() => onResolve({
      name: symbol,
      ticker: symbol,
      description: symbol,
      type: 'futures',
      session: '24x7',
      timezone: 'Asia/Shanghai',
      exchange: '',
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      supported_resolutions: ['1', '5'],
    }), 0)
  },
  getBars: (
    _symbolInfo: unknown,
    _resolution: string,
    _periodParams: unknown,
    onHistory: (bars: unknown[], metadata: { noData: boolean }) => void,
  ) => {
    window.setTimeout(() => onHistory([], { noData: true }), 0)
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
      datafeed: emptyDatafeed,
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
