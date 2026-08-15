<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { ArrowDown, ArrowUp, ChartNoAxesColumn, MousePointer2, MoveUpRight, PencilLine, Ruler, Square, Type } from '@lucide/vue'

import { listPineScripts, type PineScript } from '@/api/pine-scripts'
import type { KlineQueryInterval } from '@/api/market-data'
import { drawingTools, type DrawingToolId } from '../drawing/drawingTools'

defineProps<{
  activeScriptIds: number[]
  activeDrawingTool?: DrawingToolId
  selectedInterval: KlineQueryInterval
}>()

const emit = defineEmits<{
  selectInterval: [interval: KlineQueryInterval]
  selectDrawingTool: [tool: DrawingToolId]
  toggleIndicator: [script: PineScript]
}>()

const drawingToolIcons = {
  segment: PencilLine,
  arrow_segment: MoveUpRight,
  rectangle: Square,
  text: Type,
  arrow_up: ArrowUp,
  arrow_down: ArrowDown,
  long_position: ArrowUp,
  short_position: ArrowDown,
  measure: Ruler,
} satisfies Record<DrawingToolId, typeof PencilLine>

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
    <el-popover placement="bottom-start" trigger="click" :width="280">
      <template #reference>
        <button type="button" class="ml-2 flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100" :class="{ 'bg-blue-50 text-blue-600 hover:bg-blue-50': activeDrawingTool }">
          <MousePointer2 :size="16" /> 绘图
        </button>
      </template>
      <div class="grid grid-cols-3 gap-1">
        <button
          v-for="tool in drawingTools"
          :key="tool.id"
          type="button"
          class="flex min-h-17 flex-col items-center justify-center gap-1 rounded px-1 py-2 text-xs text-slate-600 hover:bg-slate-100"
          :class="{ 'bg-blue-50 text-blue-600 hover:bg-blue-50': activeDrawingTool === tool.id }"
          @click="emit('selectDrawingTool', tool.id)"
        >
          <component :is="drawingToolIcons[tool.id]" :size="18" />
          <span>{{ tool.label }}</span>
        </button>
      </div>
    </el-popover>
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
          <span class="w-4">{{ activeScriptIds.includes(script.id) ? '✓' : '' }}</span>
          {{ getScriptName(script) }}
        </button>
      </div>
    </el-popover>
  </header>
</template>
