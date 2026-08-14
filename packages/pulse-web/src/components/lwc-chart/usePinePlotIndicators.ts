import { computed, ref } from 'vue'
import type { ISeriesApi } from 'lightweight-charts'

import type { PineScript } from '@/api/pine-scripts'
import { PinePlotIndicator } from './indicators_renderer/PinePlotIndicator'

export const usePinePlotIndicators = (series: () => ISeriesApi<'Candlestick'> | undefined) => {
  const activeScripts = ref<PineScript[]>([])
  const indicators = new Map<number, PinePlotIndicator>()
  const activeScriptIds = computed(() => activeScripts.value.map((script) => script.id))

  const toggle = (script: PineScript) => {
    const currentSeries = series()
    const indicator = indicators.get(script.id)
    if (indicator) {
      currentSeries?.detachPrimitive(indicator)
      indicators.delete(script.id)
      activeScripts.value = activeScripts.value.filter((item) => item.id !== script.id)
      return
    }
    if (!currentSeries) return

    const nextIndicator = new PinePlotIndicator(script.content)
    indicators.set(script.id, nextIndicator)
    activeScripts.value = [...activeScripts.value, script]
    currentSeries.attachPrimitive(nextIndicator)
  }

  const dispose = () => {
    const currentSeries = series()
    indicators.forEach((indicator) => currentSeries?.detachPrimitive(indicator))
    indicators.clear()
    activeScripts.value = []
  }

  return { activeScriptIds, dispose, toggle }
}
