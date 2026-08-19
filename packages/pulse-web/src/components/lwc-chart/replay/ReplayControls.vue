<script setup lang="ts">
import { Pause, Play, SkipBack, SkipForward, X } from '@lucide/vue'

defineProps<{
  isPlaying: boolean
  speed: number
}>()

const emit = defineEmits<{
  exit: []
  next: []
  previous: []
  setSpeed: [speed: number]
  togglePlayback: []
}>()
</script>

<template>
  <div
    class="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg"
  >
    <el-tooltip content="退出回放" placement="top">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
        @click="emit('exit')"
      >
        <X :size="17" />
      </button>
    </el-tooltip>
    <span class="h-5 w-px bg-slate-200" />
    <el-tooltip content="上一根 K 线" placement="top">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
        @click="emit('previous')"
      >
        <SkipBack :size="17" />
      </button>
    </el-tooltip>
    <el-tooltip :content="isPlaying ? '暂停播放' : '自动播放'" placement="top">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
        @click="emit('togglePlayback')"
      >
        <Pause v-if="isPlaying" :size="17" /><Play v-else :size="17" />
      </button>
    </el-tooltip>
    <el-tooltip content="下一根 K 线" placement="top">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
        @click="emit('next')"
      >
        <SkipForward :size="17" />
      </button>
    </el-tooltip>
    <select
      :value="speed"
      class="h-8 rounded border-0 bg-slate-50 px-2 text-xs text-slate-600 outline-none"
      aria-label="回放速度"
      @change="emit('setSpeed', Number(($event.target as HTMLSelectElement).value))"
    >
      <option :value="1">1x</option>
      <option :value="2">2x</option>
      <option :value="5">5x</option>
      <option :value="10">10x</option>
    </select>
  </div>
</template>
