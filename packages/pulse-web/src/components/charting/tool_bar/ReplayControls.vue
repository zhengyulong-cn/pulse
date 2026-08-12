<script setup lang="ts">
defineProps<{
  isPlaying: boolean
  speed: number
}>()

const emit = defineEmits<{
  exit: []
  next: []
  setSpeed: [speed: number]
  togglePlayback: []
}>()
</script>

<template>
  <div class="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
    <button type="button" class="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" @click="emit('exit')">退出回放</button>
    <span class="h-4 w-px bg-slate-200" />
    <button type="button" class="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100" :title="isPlaying ? '暂停' : '播放'" @click="emit('togglePlayback')">{{ isPlaying ? 'Ⅱ' : '▶' }}</button>
    <button type="button" class="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100" title="下一根 K 线" @click="emit('next')">▸|</button>
    <select :value="speed" class="rounded border-0 bg-slate-50 px-2 py-1 text-xs text-slate-600 outline-none" @change="emit('setSpeed', Number(($event.target as HTMLSelectElement).value))">
      <option :value="1">1x</option>
      <option :value="2">2x</option>
      <option :value="5">5x</option>
      <option :value="10">10x</option>
    </select>
  </div>
</template>
