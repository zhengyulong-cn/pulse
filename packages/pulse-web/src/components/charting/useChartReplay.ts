import { computed, onBeforeUnmount, ref } from 'vue'

import type { PineChartBar } from '@/indicators/PinePlotRenderer'

type ReplayPhase = 'inactive' | 'selecting' | 'paused' | 'playing'

const toMilliseconds = (time: number) => time < 10_000_000_000 ? time * 1_000 : time

const findBarIndexAtOrBefore = (bars: PineChartBar[], time: number) => {
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    if (bars[index]!.time <= time) return index
  }
  return -1
}

export const useChartReplay = (
  getBars: () => PineChartBar[],
  setPineReplayEndTime: (time: number | undefined) => void,
  reloadChartData: () => void,
  publishBar: (bar: PineChartBar) => void,
) => {
  const phase = ref<ReplayPhase>('inactive')
  const speed = ref(1)
  const replayIndex = ref<number>()
  const replayEndTime = ref<number>()
  const candidateTime = ref<number>()
  let crosshairTime: number | undefined
  let playbackTimer: number | undefined

  const isSelecting = computed(() => phase.value === 'selecting')
  const isActive = computed(() => phase.value === 'paused' || phase.value === 'playing')
  const isPlaying = computed(() => phase.value === 'playing')

  const stopPlayback = () => {
    if (playbackTimer !== undefined) window.clearInterval(playbackTimer)
    playbackTimer = undefined
    if (phase.value === 'playing') phase.value = 'paused'
  }

  const applyIndex = (index: number, reloadChart = false) => {
    const bars = getBars()
    const bar = bars[index]
    if (!bar) return

    replayIndex.value = index
    replayEndTime.value = bar.time
    setPineReplayEndTime(bar.time)
    if (reloadChart) reloadChartData()
    else publishBar(bar)
  }

  const next = () => {
    const index = replayIndex.value
    const bars = getBars()
    if (index === undefined || index >= bars.length - 1) {
      stopPlayback()
      return
    }
    applyIndex(index + 1)
  }

  const play = () => {
    if (!isActive.value || isPlaying.value) return

    phase.value = 'playing'
    playbackTimer = window.setInterval(next, Math.max(120, 900 / speed.value))
  }

  const togglePlayback = () => {
    if (isPlaying.value) stopPlayback()
    else play()
  }

  const setSpeed = (nextSpeed: number) => {
    speed.value = nextSpeed
    if (isPlaying.value) {
      stopPlayback()
      play()
    }
  }

  const beginSelection = () => {
    stopPlayback()
    candidateTime.value = undefined
    phase.value = 'selecting'
  }

  const setCrosshairTime = (time: number | undefined) => {
    crosshairTime = time === undefined ? undefined : toMilliseconds(time)
    const index = crosshairTime === undefined ? -1 : findBarIndexAtOrBefore(getBars(), crosshairTime)
    candidateTime.value = index < 0 ? undefined : getBars()[index]?.time
  }

  const selectStart = () => {
    if (!isSelecting.value || crosshairTime === undefined) return

    const bars = getBars()
    const index = findBarIndexAtOrBefore(bars, crosshairTime)
    if (index < 0 || index >= bars.length - 1) return

    phase.value = 'paused'
    applyIndex(index, true)
  }

  const exit = () => {
    stopPlayback()
    replayIndex.value = undefined
    replayEndTime.value = undefined
    candidateTime.value = undefined
    setPineReplayEndTime(undefined)
    phase.value = 'inactive'
    reloadChartData()
  }

  const reset = () => {
    stopPlayback()
    replayIndex.value = undefined
    replayEndTime.value = undefined
    candidateTime.value = undefined
    setPineReplayEndTime(undefined)
    phase.value = 'inactive'
  }

  onBeforeUnmount(stopPlayback)

  return {
    beginSelection,
    candidateTime,
    exit,
    isActive,
    isPlaying,
    isSelecting,
    next,
    replayEndTime,
    reset,
    selectStart,
    setCrosshairTime,
    setSpeed,
    speed,
    togglePlayback,
  }
}
