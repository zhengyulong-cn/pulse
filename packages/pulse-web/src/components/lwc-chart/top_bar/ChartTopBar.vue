<script setup lang="ts">
import type { KlineQueryInterval } from '@/api/market-data'

defineProps<{ selectedInterval: KlineQueryInterval }>()

const emit = defineEmits<{ selectInterval: [interval: KlineQueryInterval] }>()

const intervals: Array<{ label: string, value: KlineQueryInterval }> = [
  { label: '1分钟', value: '1m' },
  { label: '5分钟', value: '5m' },
  { label: '15分钟', value: '15m' },
  { label: '30分钟', value: '30m' },
  { label: '1小时', value: '1h' },
]
</script>

<template>
  <header class="flex h-10 shrink-0 items-center border-b border-slate-200 bg-white px-3">
    <div class="flex items-center gap-1" aria-label="K线周期">
      <button
        v-for="interval in intervals"
        :key="interval.value"
        type="button"
        class="rounded px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        :class="{ 'bg-blue-50 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-600': selectedInterval === interval.value }"
        :aria-pressed="selectedInterval === interval.value"
        @click="emit('selectInterval', interval.value)"
      >
        {{ interval.label }}
      </button>
    </div>
  </header>
</template>
