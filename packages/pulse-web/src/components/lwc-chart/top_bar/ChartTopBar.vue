<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { ChartNoAxesColumn } from '@lucide/vue'

import { listPineScripts, type PineScript } from '@/api/pine-scripts'
import type { KlineQueryInterval } from '@/api/market-data'

defineProps<{
  activeScriptIds: number[]
  selectedInterval: KlineQueryInterval
}>()

const emit = defineEmits<{
  selectInterval: [interval: KlineQueryInterval]
  toggleIndicator: [script: PineScript]
}>()

const intervals: Array<{ label: string, value: KlineQueryInterval }> = [
  { label: '1分钟', value: '1m' },
  { label: '5分钟', value: '5m' },
  { label: '15分钟', value: '15m' },
  { label: '30分钟', value: '30m' },
  { label: '1小时', value: '1h' },
]

const indicatorsQuery = useQuery({
  queryKey: ['pine-scripts', 'INDICATOR'],
  queryFn: () => listPineScripts('INDICATOR'),
})

const getScriptName = (script: PineScript) => (
  script.content.match(/indicator\s*\(\s*["']([^"']+)["']/)?.[1] ?? script.description
)
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
    <el-popover placement="bottom-start" trigger="click" :width="240">
      <template #reference>
        <button type="button" class="ml-3 flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
          <ChartNoAxesColumn :size="16" /> 指标
        </button>
      </template>
      <div class="space-y-1">
        <p v-if="indicatorsQuery.isPending.value" class="px-2 py-1 text-sm text-slate-500">加载中…</p>
        <p v-else-if="indicatorsQuery.isError.value" class="px-2 py-1 text-sm text-red-600">指标加载失败</p>
        <p v-else-if="!indicatorsQuery.data.value?.length" class="px-2 py-1 text-sm text-slate-500">暂无指标</p>
        <button
          v-for="script in indicatorsQuery.data.value"
          :key="script.id"
          type="button"
          class="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
          :class="activeScriptIds.includes(script.id) ? 'bg-blue-50 text-blue-600' : 'text-slate-700'"
          @click="emit('toggleIndicator', script)"
        >
          <span class="mr-2 w-4">{{ activeScriptIds.includes(script.id) ? '✓' : '' }}</span>
          {{ getScriptName(script) }}
        </button>
      </div>
    </el-popover>
  </header>
</template>
