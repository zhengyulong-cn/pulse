<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { listTradeRecords, listTradingAccounts, type TradeRecord } from '@/api/trading'

const emit = defineEmits<{ selectTrade: [record: TradeRecord] }>()
const accountsQuery = useQuery({ queryKey: ['trading-accounts'], queryFn: listTradingAccounts })
const accountIds = computed(() => (accountsQuery.data.value ?? []).map((account) => account.id))
const recordsQuery = useQuery({
  queryKey: computed(() => ['sidebar-trade-records', accountIds.value]),
  enabled: computed(() => accountIds.value.length > 0),
  queryFn: async () => (await Promise.all(accountIds.value.map((accountId) => listTradeRecords(accountId)))).flat(),
})
const records = computed(() => [...(recordsQuery.data.value ?? [])].sort((first, second) => second.openTime.localeCompare(first.openTime)))
const formatTime = (value: string | null) => value ? value.replace('T', ' ').slice(0, 16) : '--'
const formatNumber = (value: string | null) => value === null ? '--' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
</script>

<template>
  <div class="flex h-full flex-col bg-white text-slate-800">
    <header class="flex h-10 items-center border-b border-slate-100 px-3 text-sm font-semibold">交易记录</header>
    <div v-if="recordsQuery.isPending.value" class="p-4 text-center text-xs text-slate-400">加载中...</div>
    <div v-else-if="recordsQuery.isError.value" class="p-4 text-center text-xs text-red-500">交易记录加载失败</div>
    <div v-else-if="!records.length" class="p-4 text-center text-xs text-slate-400">暂无交易记录</div>
    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <button v-for="record in records" :key="record.id" type="button" class="w-full border-b border-slate-100 px-3 py-2 text-left transition-colors hover:bg-blue-50/60" @click="emit('selectTrade', record)">
        <div class="flex items-center justify-between gap-2"><span class="truncate text-xs font-semibold">{{ record.underlyingCode }}</span><span class="text-[10px]" :class="record.direction === 'LONG' ? 'text-rose-500' : 'text-emerald-500'">{{ record.direction === 'LONG' ? '多' : '空' }} · {{ record.quantity }}</span></div>
        <div class="mt-1 grid grid-cols-2 gap-x-2 text-[10px] text-slate-500"><span>开 {{ formatTime(record.openTime) }}</span><span>{{ formatNumber(record.openPrice) }}</span><span>平 {{ formatTime(record.closeTime) }}</span><span>{{ formatNumber(record.closePrice) }}</span></div>
        <div class="mt-1 text-[10px]" :class="Number(record.realizedPnl ?? 0) >= 0 ? 'text-rose-500' : 'text-emerald-500'">盈亏 {{ formatNumber(record.realizedPnl) }}</div>
      </button>
    </div>
  </div>
</template>
