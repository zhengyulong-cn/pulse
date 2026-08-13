<script setup lang="ts">
import type { KlineQueryInterval } from '@/api/market-data'
import type { LegendBar } from './useChartLegend'

const props = defineProps<{
  bar?: LegendBar
  change: { amount: number, percent: number }
  interval: KlineQueryInterval
  symbol: string
}>()

const priceColorClass = () => {
  if (props.change.amount === 0) return 'text-slate-700'
  return props.change.amount > 0 ? 'text-red-500' : 'text-teal-500'
}
</script>

<template>
  <div class="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-3 rounded bg-white/85 px-2 py-1 text-xs shadow-sm backdrop-blur">
    <span class="font-semibold text-slate-700">{{ symbol }} · {{ interval }}</span>
    <template v-if="bar">
      <span :class="priceColorClass()">开 <strong class="font-medium">{{ bar.open }}</strong></span>
      <span :class="priceColorClass()">高 <strong class="font-medium">{{ bar.high }}</strong></span>
      <span :class="priceColorClass()">低 <strong class="font-medium">{{ bar.low }}</strong></span>
      <span :class="priceColorClass()">收 <strong class="font-medium">{{ bar.close }}</strong></span>
      <span :class="priceColorClass()">
        涨跌 {{ change.amount >= 0 ? '+' : '' }}{{ change.amount.toFixed(2) }}
        ({{ change.amount >= 0 ? '+' : '' }}{{ change.percent.toFixed(2) }}%)
      </span>
    </template>
  </div>
</template>
