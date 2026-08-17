import { computed, onBeforeUnmount, ref } from 'vue'

type ReplayPhase = 'inactive' | 'selecting' | 'paused' | 'playing'

export type ReplayBar = { time: number }

const findBarIndexAtOrBefore = (bars: ReplayBar[], time: number) => {
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    if (bars[index]!.time <= time) return index
  }
  return -1
}

export const useChartReplay = (
  getBars: () => ReplayBar[],
  renderBars: (endTime: number | undefined) => void,
  appendBar: (bar: ReplayBar) => void,
) => {
  const phase = ref<ReplayPhase>('inactive')
  const speed = ref(1)
  const replayIndex = ref<number>()
  const replayEndTime = ref<number>()
  const candidateTime = ref<number>()
  let playbackTimer: number | undefined

  const isSelecting = computed(() => phase.value === 'selecting')
  const isActive = computed(() => phase.value === 'paused' || phase.value === 'playing')
  const isPlaying = computed(() => phase.value === 'playing')

  const stopPlayback = () => {
    if (playbackTimer !== undefined) window.clearInterval(playbackTimer)
    playbackTimer = undefined
    if (phase.value === 'playing') phase.value = 'paused'
  }

  const applyIndex = (index: number, resetChart = false) => {
    const bar = getBars()[index]
    if (!bar) return

    replayIndex.value = index
    replayEndTime.value = bar.time
    if (resetChart) renderBars(bar.time)
    else appendBar(bar)
  }

  const next = () => {
    const bars = getBars()
    const index = replayIndex.value
    if (index === undefined || index >= bars.length - 1) {
      stopPlayback()
      return
    }
    applyIndex(index + 1)
  }

  const previous = () => {
    const index = replayIndex.value
    if (index === undefined || index <= 0) return
    stopPlayback()
    applyIndex(index - 1, true)
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

  const setCandidateTime = (time: number | undefined) => {
    if (!isSelecting.value || time === undefined) {
      candidateTime.value = undefined
      return
    }
    const index = findBarIndexAtOrBefore(getBars(), time)
    candidateTime.value = index < 0 ? undefined : getBars()[index]?.time
  }

  const selectStart = () => {
    const time = candidateTime.value
    if (!isSelecting.value || time === undefined) return

    const bars = getBars()
    const index = findBarIndexAtOrBefore(bars, time)
    if (index < 0 || index >= bars.length - 1) return

    phase.value = 'paused'
    applyIndex(index, true)
  }

  const exit = () => {
    stopPlayback()
    replayIndex.value = undefined
    replayEndTime.value = undefined
    candidateTime.value = undefined
    phase.value = 'inactive'
    renderBars(undefined)
  }

  const reset = () => {
    stopPlayback()
    replayIndex.value = undefined
    replayEndTime.value = undefined
    candidateTime.value = undefined
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
    previous,
    replayEndTime,
    reset,
    selectStart,
    setCandidateTime,
    setSpeed,
    speed,
    togglePlayback,
  }
}
