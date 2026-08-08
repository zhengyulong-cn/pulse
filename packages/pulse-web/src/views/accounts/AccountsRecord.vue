<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { CalendarDays, CircleDollarSign, ListChecks, Plus, RefreshCw, TrendingDown, TrendingUp, Trophy, WalletCards } from '@lucide/vue'

import {
  listTradeRecords,
  listTradingAccounts,
  type TradeRecord,
  type TradeRecordReq,
} from '@/api/trading'
import AccountConfigDialog from './components/AccountConfigDialog.vue'
import BatchTradeRecordDialog from './components/BatchTradeRecordDialog.vue'
import TradeRecordFormDialog from './components/TradeRecordFormDialog.vue'

type PnlFilter = 'PROFIT' | 'LOSS' | 'BREAKEVEN' | 'UNSETTLED' | ''

const selectedAccountId = ref<number>()
const accountDialogVisible = ref(false)
const recordDialogVisible = ref(false)
const batchRecordDialogVisible = ref(false)
const editingRecord = ref<TradeRecord>()
const debouncedKeyword = ref('')
const sort = reactive({
  by: 'openTime' as NonNullable<TradeRecordReq['sortBy']>,
  order: 'desc' as NonNullable<TradeRecordReq['sortOrder']>,
})
const filters = reactive({
  keyword: '',
  pnl: '' as PnlFilter,
  openDateRange: [] as string[],
})
let keywordDebounceTimer: ReturnType<typeof setTimeout> | undefined

const tradeRecordReq = computed<TradeRecordReq>(() => ({
  keyword: debouncedKeyword.value || undefined,
  pnl: filters.pnl || undefined,
  openDateStart: filters.openDateRange[0],
  openDateEnd: filters.openDateRange[1],
  sortBy: sort.by,
  sortOrder: sort.order,
}))

const accountsQuery = useQuery({
  queryKey: ['trading-accounts'],
  queryFn: listTradingAccounts,
})

const tradeRecordsQuery = useQuery({
  queryKey: computed(() => ['trade-records', selectedAccountId.value, tradeRecordReq.value]),
  queryFn: () => listTradeRecords(selectedAccountId.value!, tradeRecordReq.value),
  enabled: computed(() => selectedAccountId.value !== undefined),
})

watch(
  () => filters.keyword,
  (keyword) => {
    if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
    keywordDebounceTimer = setTimeout(() => {
      debouncedKeyword.value = keyword.trim()
    }, 300)
  },
)

onBeforeUnmount(() => {
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
})

watch(
  () => accountsQuery.data.value,
  (accounts) => {
    if (selectedAccountId.value !== undefined && !accounts?.some((account) => account.id === selectedAccountId.value)) {
      selectedAccountId.value = undefined
    }
  },
)

const selectedAccount = computed(() =>
  accountsQuery.data.value?.find((account) => account.id === selectedAccountId.value),
)

const tradeRecords = computed(() => tradeRecordsQuery.data.value ?? [])

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'

const formatJson = (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : '—')

const pnlClass = (value: string | null) => {
  if (value === null) return 'text-slate-400'
  const pnl = Number(value)
  if (pnl > 0) return 'text-emerald-600'
  if (pnl < 0) return 'text-rose-600'
  return 'text-slate-600'
}

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2, ...options }).format(value)

const summary = computed(() => {
  const settledRecords = tradeRecords.value.filter((record) => record.realizedPnl !== null)
  const profitableRecords = settledRecords.filter((record) => Number(record.realizedPnl) > 0)
  const losingRecords = settledRecords.filter((record) => Number(record.realizedPnl) < 0)
  const totalPnl = settledRecords.reduce((total, record) => total + Number(record.realizedPnl), 0)

  return {
    total: tradeRecords.value.length,
    profitable: profitableRecords.length,
    losing: losingRecords.length,
    winRate: settledRecords.length === 0 ? null : (profitableRecords.length / settledRecords.length) * 100,
    totalPnl,
  }
})

const resetFilters = () => {
  filters.keyword = ''
  filters.pnl = ''
  filters.openDateRange = []
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
  debouncedKeyword.value = ''
}

const handleSortChange = ({ prop, order }: { prop: string | null, order: 'ascending' | 'descending' | null }) => {
  if ((prop === 'openTime' || prop === 'closeTime') && order) {
    sort.by = prop
    sort.order = order === 'ascending' ? 'asc' : 'desc'
    return
  }

  sort.by = 'openTime'
  sort.order = 'desc'
}

const openRecordDialog = () => {
  if (selectedAccountId.value === undefined) {
    ElMessage.warning('请先选择交易账户。')
    return
  }

  editingRecord.value = undefined
  recordDialogVisible.value = true
}

const openBatchRecordDialog = () => {
  if (selectedAccountId.value === undefined) {
    ElMessage.warning('请先选择交易账户。')
    return
  }

  batchRecordDialogVisible.value = true
}

const refreshAccounts = async () => {
  await accountsQuery.refetch()
}

const editRecord = (row: unknown) => {
  const record = row as TradeRecord
  editingRecord.value = record
  recordDialogVisible.value = true
}

const refreshTradeRecords = async () => {
  await tradeRecordsQuery.refetch()
}

const handleAccountDeleted = (accountId: number) => {
  if (selectedAccountId.value === accountId) selectedAccountId.value = undefined
}
</script>

<template>
  <section class="min-h-[calc(100vh-2.5rem)] bg-slate-100 px-3 py-5 text-slate-800 sm:px-5 lg:px-6">
    <div class="mx-auto max-w-[1800px]">
      <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">交易记录</h1>
          <div class="flex items-center gap-2">
            <el-select
              id="trading-account"
              v-model="selectedAccountId"
              class="!w-80"
              placeholder="请选择交易账户"
              :loading="accountsQuery.isLoading.value"
              clearable
            >
              <el-option
                v-for="account in accountsQuery.data.value"
                :key="account.id"
                :label="`${account.name} · ${account.account} (${account.currency})`"
                :value="account.id"
              />
            </el-select>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <el-button class="!h-9 !rounded-lg !border-slate-200 !font-semibold !text-slate-600" @click="accountDialogVisible = true"><WalletCards :size="16" />账户配置</el-button>
          <el-button class="!h-9 !rounded-lg !border-slate-200 !font-semibold !text-slate-600" :loading="accountsQuery.isFetching.value" @click="accountsQuery.refetch()"><RefreshCw :size="16" />刷新</el-button>
          <el-button type="primary" class="!h-9 !rounded-lg !font-semibold" :disabled="selectedAccountId === undefined" @click="openRecordDialog"><Plus :size="17" />新增记录</el-button>
          <el-button type="primary" plain class="!h-9 !rounded-lg !font-semibold" :disabled="selectedAccountId === undefined" @click="openBatchRecordDialog"><Plus :size="17" />批量新增记录</el-button>
        </div>
      </header>

      <el-alert
        v-if="accountsQuery.isError.value"
        class="mb-4"
        type="error"
        :title="accountsQuery.error.value?.message ?? '账户加载失败。'"
        :closable="false"
        show-icon
      />

      <template v-if="selectedAccountId !== undefined">
        <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <article class="flex min-h-26 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"><div><p class="mb-1.5 text-xs font-semibold text-slate-400">总交易笔数</p><strong class="text-3xl font-bold tracking-tight text-slate-800">{{ summary.total }}</strong></div><span class="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ListChecks :size="20" /></span></article>
          <article class="flex min-h-26 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"><div><p class="mb-1.5 text-xs font-semibold text-slate-400">盈利笔数</p><strong class="text-3xl font-bold tracking-tight text-rose-500">{{ summary.profitable }}</strong></div><span class="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500"><TrendingUp :size="20" /></span></article>
          <article class="flex min-h-26 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"><div><p class="mb-1.5 text-xs font-semibold text-slate-400">亏损笔数</p><strong class="text-3xl font-bold tracking-tight text-teal-500">{{ summary.losing }}</strong></div><span class="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500"><TrendingDown :size="20" /></span></article>
          <article class="flex min-h-26 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"><div><p class="mb-1.5 text-xs font-semibold text-slate-400">胜率</p><strong class="text-3xl font-bold tracking-tight text-slate-800">{{ summary.winRate === null ? '—' : `${formatNumber(summary.winRate, { maximumFractionDigits: 1 })}%` }}</strong></div><span class="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500"><Trophy :size="20" /></span></article>
          <article class="flex min-h-26 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"><div><p class="mb-1.5 text-xs font-semibold text-slate-400">总盈亏</p><strong class="text-3xl font-bold tracking-tight" :class="summary.totalPnl > 0 ? 'text-rose-500' : summary.totalPnl < 0 ? 'text-teal-500' : 'text-slate-800'">{{ `${summary.totalPnl > 0 ? '+' : ''}${formatNumber(summary.totalPnl)}` }}</strong></div><span class="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><CircleDollarSign :size="20" /></span></article>
        </div>
        <div class="flex flex-row flex-wrap items-center gap-2 mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <el-input v-model="filters.keyword" class="!w-52" clearable placeholder="搜索标的名称或代码" />
          <el-select v-model="filters.pnl" class="!w-32" clearable placeholder="全部结果">
            <el-option label="盈利" value="PROFIT" /><el-option label="亏损" value="LOSS" /><el-option label="持平" value="BREAKEVEN" /><el-option label="未平仓" value="UNSETTLED" />
          </el-select>
          <el-date-picker class="!w-64 !grow-0 !shrink-0 !basis-auto" v-model="filters.openDateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开仓开始日期" end-placeholder="开仓结束日期" :prefix-icon="CalendarDays" />
          <el-button class="ml-auto" @click="resetFilters">清空</el-button>
        </div>
        <el-alert v-if="tradeRecordsQuery.isError.value" class="mb-4" type="error" :title="tradeRecordsQuery.error.value?.message ?? '交易记录加载失败。'" :closable="false" show-icon />
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <el-table v-loading="tradeRecordsQuery.isFetching.value" :data="tradeRecords" class="w-full" empty-text="当前条件下暂无交易记录" :default-sort="{ prop: 'openTime', order: 'descending' }" @sort-change="handleSortChange">
            <el-table-column prop="id" label="ID" width="64" fixed="left" />
            <el-table-column prop="underlyingName" label="标的名称" min-width="120" />
            <el-table-column prop="underlyingCode" label="代码" width="110" />
            <el-table-column label="方向" width="92"><template #default="{ row }"><span class="inline-flex min-w-14 justify-center rounded-md px-1.5 py-1 text-xs font-bold" :class="row.direction === 'LONG' ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'">{{ row.direction === 'LONG' ? '↑ 做多' : '↓ 做空' }}</span></template></el-table-column>
            <el-table-column prop="quantity" label="手数" width="84" align="right" />
            <el-table-column prop="openTime" label="开仓时间" width="158" sortable="custom"><template #default="{ row }">{{ formatDateTime(row.openTime) }}</template></el-table-column>
            <el-table-column prop="openPrice" label="开仓价" width="100" align="right" />
            <el-table-column prop="closeTime" label="平仓时间" width="158" sortable="custom"><template #default="{ row }">{{ formatDateTime(row.closeTime) }}</template></el-table-column>
            <el-table-column label="平仓价" width="100" align="right"><template #default="{ row }">{{ row.closePrice ?? '—' }}</template></el-table-column>
            <el-table-column label="盈亏" width="112" align="right"><template #default="{ row }"><span class="font-bold" :class="pnlClass(row.realizedPnl)">{{ row.realizedPnl === null ? '未平仓' : `${Number(row.realizedPnl) > 0 ? '+' : ''}${row.realizedPnl}` }}</span></template></el-table-column>
            <el-table-column prop="fee" label="手续费" width="95" align="right" />
            <el-table-column label="extra_json" min-width="170" show-overflow-tooltip><template #default="{ row }">{{ formatJson(row.extraJson) }}</template></el-table-column>
            <el-table-column label="操作" width="76" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="editRecord(row)">修改</el-button></template></el-table-column>
          </el-table>
        </section>
      </template>

      <section v-else class="flex min-h-78 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-9 text-center"><div class="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><WalletCards :size="25" /></div><h2 class="mt-3 text-base font-bold text-slate-700">选择一个交易账户</h2><p class="mt-1 max-w-md text-sm leading-6 text-slate-400">账户是交易记录的前提。请先从上方选择账户，再开始查看和筛选交易明细。</p></section>
    </div>

    <AccountConfigDialog
      v-model="accountDialogVisible"
      :accounts="accountsQuery.data.value ?? []"
      :loading="accountsQuery.isFetching.value"
      @changed="refreshAccounts"
      @deleted="handleAccountDeleted"
    />
    <TradeRecordFormDialog
      v-model="recordDialogVisible"
      :account="selectedAccount"
      :record="editingRecord"
      @saved="refreshTradeRecords"
    />
    <BatchTradeRecordDialog
      v-model="batchRecordDialogVisible"
      :account="selectedAccount"
      @saved="refreshTradeRecords"
    />
  </section>
</template>
