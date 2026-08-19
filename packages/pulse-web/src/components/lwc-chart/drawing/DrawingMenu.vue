<script setup lang="ts">
import { Lock, Trash2, Unlock } from '@lucide/vue'

import type { DrawingDocument } from './drawingDocument'

defineProps<{ drawing: DrawingDocument }>()

const emit = defineEmits<{
  remove: []
  toggleLock: []
  updateStyle: [style: Partial<DrawingDocument['style']>]
}>()

const colors = ['#2563eb', '#f43f5e', '#0d9488', '#eab308', '#1e293b']
const fillColors = [
  'rgba(37, 99, 235, 0.10)',
  'rgba(244, 63, 94, 0.12)',
  'rgba(13, 148, 136, 0.12)',
  'rgba(234, 179, 8, 0.12)',
  'rgba(30, 41, 59, 0.12)',
]
</script>

<template>
  <div
    class="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button
      v-for="color in colors"
      :key="color"
      type="button"
      class="size-6 rounded-full border-2"
      :class="drawing.style.color === color ? 'border-slate-800' : 'border-transparent'"
      :style="{ backgroundColor: color }"
      @click="emit('updateStyle', { color })"
    />
    <span class="mx-1 h-5 w-px bg-slate-200" />
    <button
      v-for="fillColor in fillColors"
      :key="fillColor"
      type="button"
      class="size-6 rounded border-2"
      :class="drawing.style.fillColor === fillColor ? 'border-slate-800' : 'border-slate-200'"
      :style="{ backgroundColor: fillColor }"
      @click="emit('updateStyle', { fillColor })"
    />
    <span class="mx-1 h-5 w-px bg-slate-200" />
    <button
      v-for="lineWidth in [1, 2, 3, 4]"
      :key="lineWidth"
      type="button"
      class="flex size-7 items-center justify-center rounded hover:bg-slate-100"
      :class="{ 'bg-blue-50': drawing.style.lineWidth === lineWidth }"
      @click="emit('updateStyle', { lineWidth })"
    >
      <span class="w-4 rounded bg-slate-700" :style="{ height: `${lineWidth}px` }" />
    </button>
    <span class="mx-1 h-5 w-px bg-slate-200" />
    <button
      type="button"
      class="flex size-8 items-center justify-center rounded hover:bg-slate-100"
      @click="emit('toggleLock')"
    >
      <Lock v-if="drawing.locked" :size="16" />
      <Unlock v-else :size="16" />
    </button>
    <button
      type="button"
      class="flex size-8 items-center justify-center rounded text-rose-600 hover:bg-rose-50"
      @click="emit('remove')"
    >
      <Trash2 :size="16" />
    </button>
  </div>
</template>
