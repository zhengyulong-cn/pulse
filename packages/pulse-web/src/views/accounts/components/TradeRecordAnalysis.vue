<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { CalendarDays, CircleDollarSign, Percent, Scale } from '@lucide/vue'

import type { TradeRecord } from '@/api/trading'

const props = defineProps<{
  records: TradeRecord[]
  loading?: boolean
}>()

type DailyAnalysis = {
  tradeDay: string
  total: number
  settled: number
  profitable: number
  losing: number
  breakeven: number
  unsettled: number
  totalPnl: number
  grossProfit: number
  grossLoss: number
  winRate: number | null
  profitLossRatio: number | null
}

const calcTradeDay = (value: string) => {
  const parsed = dayjs(value)
  let tradeDay = parsed.add(8 - parsed.utcOffset(), 'minute')
  const week = tradeDay.day()
  const minutes = tradeDay.hour() * 60 + tradeDay.minute()

  if (week === 6) tradeDay = tradeDay.add(2, 'day')
  else if (week === 0) tradeDay = tradeDay.add(1, 'day')
  else if (minutes >= 21 * 60) tradeDay = tradeDay.add(week === 5 ? 3 : 1, 'day')

  return tradeDay.startOf('day').format('YYYY-MM-DD')
}

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2, ...options }).format(value)

const formatPnl = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(value)}`

const dailyAnalyses = computed<DailyAnalysis[]>(() => {
  const grouped = new Map<string, DailyAnalysis>()

  for (const record of props.records) {
    const tradeDay = calcTradeDay(record.openTime)
    const current = grouped.get(tradeDay) ?? {
      tradeDay,
      total: 0,
      settled: 0,
      profitable: 0,
      losing: 0,
      breakeven: 0,
      unsettled: 0,
      totalPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      winRate: null,
      profitLossRatio: null,
    }

    current.total += 1
    if (record.realizedPnl === null) {
      current.unsettled += 1
    } else {
      const pnl = Number(record.realizedPnl)
      current.settled += 1
      current.totalPnl += Number.isFinite(pnl) ? pnl : 0
      if (pnl > 0) {
        current.profitable += 1
        current.grossProfit += pnl
      } else if (pnl < 0) {
        current.losing += 1
        current.grossLoss += Math.abs(pnl)
      } else {
        current.breakeven += 1
      }
    }
    grouped.set(tradeDay, current)
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      winRate: item.settled ? (item.profitable / item.settled) * 100 : null,
      profitLossRatio: item.grossLoss
        ? item.grossProfit / item.grossLoss
        : item.grossProfit
          ? null
          : 0,
    }))
    .sort((left, right) => right.tradeDay.localeCompare(left.tradeDay))
})

const summary = computed(() => {
  const settled = dailyAnalyses.value.reduce((total, item) => total + item.settled, 0)
  const profitable = dailyAnalyses.value.reduce((total, item) => total + item.profitable, 0)
  const totalPnl = dailyAnalyses.value.reduce((total, item) => total + item.totalPnl, 0)
  const grossProfit = dailyAnalyses.value.reduce((total, item) => total + item.grossProfit, 0)
  const grossLoss = dailyAnalyses.value.reduce((total, item) => total + item.grossLoss, 0)
  return {
    days: dailyAnalyses.value.length,
    totalPnl,
    winRate: settled ? (profitable / settled) * 100 : null,
    profitLossRatio: grossLoss ? grossProfit / grossLoss : grossProfit ? null : 0,
  }
})
</script>

<template>
  <div v-loading="loading" class="space-y-4">
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <article
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-400">交易日</p>
          <strong class="text-2xl font-bold text-slate-800">{{ summary.days }}</strong>
        </div>
        <CalendarDays class="text-blue-500" :size="21" />
      </article>
      <article
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-400">累计盈亏</p>
          <strong
            class="text-2xl font-bold"
            :class="summary.totalPnl >= 0 ? 'text-rose-500' : 'text-teal-500'"
            >{{ formatPnl(summary.totalPnl) }}</strong
          >
        </div>
        <CircleDollarSign class="text-amber-500" :size="21" />
      </article>
      <article
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-400">整体胜率</p>
          <strong class="text-2xl font-bold text-slate-800">{{
            summary.winRate === null
              ? '—'
              : `${formatNumber(summary.winRate, { maximumFractionDigits: 1 })}%`
          }}</strong>
        </div>
        <Percent class="text-violet-500" :size="21" />
      </article>
      <article
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <div>
          <p class="mb-1 text-xs font-semibold text-slate-400">整体盈亏比</p>
          <strong class="text-2xl font-bold text-slate-800">{{
            summary.profitLossRatio === null ? '∞' : formatNumber(summary.profitLossRatio)
          }}</strong>
        </div>
        <Scale class="text-emerald-500" :size="21" />
      </article>
    </div>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <el-table :data="dailyAnalyses" empty-text="暂无可分析的交易记录">
        <el-table-column prop="tradeDay" label="交易日" width="128" fixed="left" />
        <el-table-column prop="total" label="交易笔数" width="92" align="right" />
        <el-table-column prop="settled" label="已平仓" width="88" align="right" />
        <el-table-column label="盈利/亏损/持平" width="150" align="right"
          ><template #default="{ row }"
            ><span class="text-rose-500">{{ row.profitable }}</span
            ><span class="mx-1 text-slate-300">/</span
            ><span class="text-teal-500">{{ row.losing }}</span
            ><span class="mx-1 text-slate-300">/</span
            ><span class="text-slate-500">{{ row.breakeven }}</span></template
          ></el-table-column
        >
        <el-table-column prop="unsettled" label="未平仓" width="88" align="right" />
        <el-table-column label="当日盈亏" width="120" align="right"
          ><template #default="{ row }"
            ><span
              class="font-bold"
              :class="row.totalPnl >= 0 ? 'text-rose-500' : 'text-teal-500'"
              >{{ formatPnl(row.totalPnl) }}</span
            ></template
          ></el-table-column
        >
        <el-table-column label="胜率" width="100" align="right"
          ><template #default="{ row }">{{
            row.winRate === null
              ? '—'
              : `${formatNumber(row.winRate, { maximumFractionDigits: 1 })}%`
          }}</template></el-table-column
        >
        <el-table-column label="盈亏比" width="100" align="right"
          ><template #default="{ row }">{{
            row.profitLossRatio === null ? '∞' : formatNumber(row.profitLossRatio)
          }}</template></el-table-column
        >
        <el-table-column label="盈利总额" width="112" align="right"
          ><template #default="{ row }">{{
            formatNumber(row.grossProfit)
          }}</template></el-table-column
        >
        <el-table-column label="亏损总额" width="112" align="right"
          ><template #default="{ row }">{{
            formatNumber(row.grossLoss)
          }}</template></el-table-column
        >
      </el-table>
    </section>
  </div>
</template>
