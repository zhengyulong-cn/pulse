<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import {
  ChartNoAxesColumn,
  Eye,
  EyeOff,
  History,
  MousePointer2,
  Trash2,
  Workflow,
} from '@lucide/vue'
import { ref } from 'vue'

import { listPineScripts, type PineScript } from '@/api/pine-scripts'
import type { KlineQueryInterval } from '@/api/market-data'
import { drawingTools, type DrawingToolId } from '../drawing/drawingTools'

defineProps<{
  activeScriptIds: number[]
  activeDrawingTool?: DrawingToolId
  crossIntervalDrawing: boolean
  drawingsVisible: boolean
  replayActive: boolean
  selectedInterval: KlineQueryInterval
}>()

const emit = defineEmits<{
  selectInterval: [interval: KlineQueryInterval]
  selectDrawingTool: [tool: DrawingToolId]
  clearDrawings: []
  toggleCrossIntervalDrawing: []
  toggleDrawingsVisibility: []
  toggleIndicator: [script: PineScript]
  toggleReplay: []
}>()

const isDrawingPanelVisible = ref(false)

const intervals: Array<{ label: string; value: KlineQueryInterval }> = [
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

const getScriptName = (script: PineScript) =>
  script.content.match(/indicator\s*\(\s*["']([^"']+)["']/)?.[1] ?? script.description
</script>

<template>
  <header class="relative flex h-10 shrink-0 items-center border-b border-slate-200 bg-white px-3">
    <div class="flex items-center gap-1" aria-label="K线周期">
      <button
        v-for="interval in intervals"
        :key="interval.value"
        type="button"
        class="rounded px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        :class="{
          'bg-blue-50 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-600':
            selectedInterval === interval.value,
        }"
        :aria-pressed="selectedInterval === interval.value"
        @click="emit('selectInterval', interval.value)"
      >
        {{ interval.label }}
      </button>
    </div>
    <el-popover placement="bottom-start" trigger="click" :width="240">
      <template #reference>
        <button
          type="button"
          class="flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          <ChartNoAxesColumn :size="16" /> 指标
        </button>
      </template>
      <div class="space-y-1">
        <p v-if="indicatorsQuery.isPending.value" class="px-2 py-1 text-sm text-slate-500">
          加载中…
        </p>
        <p v-else-if="indicatorsQuery.isError.value" class="px-2 py-1 text-sm text-red-600">
          指标加载失败
        </p>
        <p v-else-if="!indicatorsQuery.data.value?.length" class="px-2 py-1 text-sm text-slate-500">
          暂无指标
        </p>
        <button
          v-for="script in indicatorsQuery.data.value"
          :key="script.id"
          type="button"
          class="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
          :class="
            activeScriptIds.includes(script.id) ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
          "
          @click="emit('toggleIndicator', script)"
        >
          <span class="w-4">{{ activeScriptIds.includes(script.id) ? '✓' : '' }}</span>
          {{ getScriptName(script) }}
        </button>
      </div>
    </el-popover>
    <el-tooltip :content="replayActive ? '退出回放' : 'K 线回放'" placement="bottom">
      <button
        type="button"
        class="flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        :class="{ 'bg-blue-50 text-blue-600 hover:bg-blue-50': replayActive }"
        @click="emit('toggleReplay')"
      >
        <History :size="16" /> 回放
      </button>
    </el-tooltip>
    <button
      type="button"
      class="flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
      :class="{
        'bg-blue-50 text-blue-600 hover:bg-blue-50': activeDrawingTool || isDrawingPanelVisible,
      }"
      :aria-expanded="isDrawingPanelVisible"
      @click="isDrawingPanelVisible = !isDrawingPanelVisible"
    >
      <MousePointer2 :size="16" /> 绘图
    </button>
    <div
      v-show="isDrawingPanelVisible"
      class="absolute left-2 top-full z-30 mt-2 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
    >
      <el-tooltip
        v-for="tool in drawingTools"
        :key="tool.id"
        :content="tool.label"
        placement="bottom"
      >
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          :class="{ 'bg-blue-50 text-blue-600 hover:bg-blue-50': activeDrawingTool === tool.id }"
          :aria-label="tool.label"
          @click="emit('selectDrawingTool', tool.id)"
        >
          <component :is="tool.icon" :size="16" />
        </button>
      </el-tooltip>
      <span class="mx-0.5 h-5 w-px bg-slate-200" />
      <el-tooltip :content="drawingsVisible ? '隐藏绘图' : '显示绘图'" placement="bottom">
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          @click="emit('toggleDrawingsVisibility')"
        >
          <EyeOff v-if="drawingsVisible" :size="16" />
          <Eye v-else :size="16" />
        </button>
      </el-tooltip>
      <el-tooltip
        :content="crossIntervalDrawing ? '关闭跨周期绘图' : '开启跨周期绘图'"
        placement="bottom"
      >
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          :class="{ 'bg-blue-50 text-blue-600 hover:bg-blue-50': crossIntervalDrawing }"
          @click="emit('toggleCrossIntervalDrawing')"
        >
          <Workflow :size="16" />
        </button>
      </el-tooltip>
      <el-tooltip content="删除当前周期全部绘图" placement="bottom">
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded text-slate-600 hover:bg-rose-50 hover:text-rose-600"
          @click="emit('clearDrawings')"
        >
          <Trash2 :size="16" />
        </button>
      </el-tooltip>
    </div>
  </header>
</template>
