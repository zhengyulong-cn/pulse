import { computed, ref } from 'vue'

import type { PineScript } from '@/api/pine-scripts'
import {
  PinePlotRenderer,
  type PineChartApi,
  type PineChartBar,
} from '@/indicators/PinePlotRenderer'

export const usePineIndicators = () => {
  const activeScripts = ref<PineScript[]>([])
  const activeScriptIds = computed(() => activeScripts.value.map((script) => script.id))
  const renderers = new Map<number, PinePlotRenderer>()
  let chart: PineChartApi | undefined
  let bars: PineChartBar[] = []

  const activate = (script: PineScript) => {
    if (renderers.has(script.id)) return

    const renderer = new PinePlotRenderer(script.content)
    renderers.set(script.id, renderer)
    activeScripts.value = [...activeScripts.value, script]
    if (chart) renderer.setChart(chart)
    if (bars.length > 0) renderer.setBars(bars)
  }

  const deactivate = (scriptId: number) => {
    renderers.get(scriptId)?.dispose()
    renderers.delete(scriptId)
    activeScripts.value = activeScripts.value.filter((script) => script.id !== scriptId)
  }

  const toggle = (script: PineScript) => {
    if (renderers.has(script.id)) deactivate(script.id)
    else activate(script)
  }

  const setChart = (nextChart: PineChartApi) => {
    chart = nextChart
    renderers.forEach((renderer) => renderer.setChart(nextChart))
  }

  const setBars = (nextBars: PineChartBar[]) => {
    const barsByTime = new Map(bars.map((bar) => [bar.time, bar]))
    nextBars.forEach((bar) => barsByTime.set(bar.time, bar))
    bars = [...barsByTime.values()].sort((first, second) => first.time - second.time)
    renderers.forEach((renderer) => renderer.setBars(bars))
  }

  const resetChart = () => {
    renderers.forEach((renderer) => renderer.dispose())
    chart = undefined
    bars = []
  }

  const dispose = () => {
    resetChart()
    renderers.clear()
    activeScripts.value = []
  }

  return {
    activeScriptIds,
    dispose,
    resetChart,
    setBars,
    setChart,
    toggle,
  }
}
