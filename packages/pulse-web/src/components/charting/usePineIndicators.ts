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
  let replayEndTime: number | undefined

  const renderBars = () => {
    const visibleBars = replayEndTime === undefined
      ? bars
      : bars.filter((bar) => bar.time <= replayEndTime!)
    renderers.forEach((renderer) => renderer.setBars(visibleBars))
  }

  const activate = (script: PineScript) => {
    if (renderers.has(script.id)) return

    const renderer = new PinePlotRenderer(script.content)
    renderers.set(script.id, renderer)
    activeScripts.value = [...activeScripts.value, script]
    if (chart) renderer.setChart(chart)
    if (bars.length > 0) renderBars()
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
    renderBars()
  }

  const setReplayEndTime = (time: number | undefined) => {
    replayEndTime = time
    renderBars()
  }

  const getBars = () => bars

  const resetChart = () => {
    renderers.forEach((renderer) => renderer.dispose())
    chart = undefined
    bars = []
    replayEndTime = undefined
  }

  const dispose = () => {
    resetChart()
    renderers.clear()
    activeScripts.value = []
  }

  return {
    activeScriptIds,
    dispose,
    getBars,
    resetChart,
    setBars,
    setChart,
    setReplayEndTime,
    toggle,
  }
}
