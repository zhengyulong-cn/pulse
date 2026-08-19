<script setup lang="ts">
import { computed } from 'vue'

import type { ChartTooltipData } from './useChartTooltip'

const props = defineProps<{
  chartHeight: number
  tooltip?: ChartTooltipData
}>()

const isAboveCrosshair = computed(() =>
  Boolean(props.tooltip && props.tooltip.y > props.chartHeight / 2),
)
const position = computed(() => {
  if (!props.tooltip) return undefined
  return {
    left: `${props.tooltip.x + 12}px`,
    top: `${props.tooltip.y + (isAboveCrosshair.value ? -12 : 12)}px`,
    transform: isAboveCrosshair.value ? 'translateY(-100%)' : undefined,
  }
})
const formatNumber = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
const changeColorClass = computed(() =>
  props.tooltip && props.tooltip.change !== 0 ? 'text-teal-500' : '',
)
</script>

<template>
  <div
    v-if="tooltip"
    class="pointer-events-none absolute z-10 grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow"
    :style="position"
  >
    <span>开盘</span><span>{{ formatNumber(tooltip.bar.open) }}</span> <span>最高</span
    ><span>{{ formatNumber(tooltip.bar.high) }}</span> <span>最低</span
    ><span>{{ formatNumber(tooltip.bar.low) }}</span> <span>收盘</span
    ><span>{{ formatNumber(tooltip.bar.close) }}</span> <span>成交量</span
    ><span>{{ formatNumber(tooltip.bar.volume) }}</span> <span>持仓量</span
    ><span>{{ formatNumber(tooltip.bar.hold) }}</span> <span>涨幅</span
    ><span :class="changeColorClass">{{ formatPercent(tooltip.change) }}</span> <span>振幅</span
    ><span>{{ formatPercent(tooltip.amplitude) }}</span>
  </div>
</template>
