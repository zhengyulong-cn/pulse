<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ElMessage } from 'element-plus'
import { FileDown, Plus, RefreshCw, WalletCards } from '@lucide/vue'
import * as XLSX from 'xlsx'
import {
  listTradeRecords,
  listTradingAccounts,
  type TradeRecord,
  type TradeRecordReq,
} from '@/api/trading'
import AccountConfigDialog from './components/AccountConfigDialog.vue'
import BatchTradeRecordDialog from './components/BatchTradeRecordDialog.vue'
import TradeRecordAnalysis from './components/TradeRecordAnalysis.vue'
import TradeRecordFormDialog from './components/TradeRecordFormDialog.vue'
import TradeRecordList from './components/TradeRecordList.vue'

type PnlFilter = 'PROFIT' | 'LOSS' | 'BREAKEVEN' | 'UNSETTLED' | ''
const selectedAccountId = ref<number | undefined>(3)
const activeTab = ref<'records' | 'analysis'>('records')
const accountDialogVisible = ref(false)
const recordDialogVisible = ref(false)
const batchRecordDialogVisible = ref(false)
const editingRecord = ref<TradeRecord>()
const exporting = ref(false)
const debouncedKeyword = ref('')
const sort = reactive({
  by: 'openTime' as NonNullable<TradeRecordReq['sortBy']>,
  order: 'desc' as NonNullable<TradeRecordReq['sortOrder']>,
})
const filters = reactive({ keyword: '', pnl: '' as PnlFilter, openDateRange: [] as string[] })
let keywordDebounceTimer: ReturnType<typeof setTimeout> | undefined
const tradeRecordReq = computed<TradeRecordReq>(() => ({
  keyword: debouncedKeyword.value || undefined,
  pnl: filters.pnl || undefined,
  openDateStart: filters.openDateRange[0],
  openDateEnd: filters.openDateRange[1],
  sortBy: sort.by,
  sortOrder: sort.order,
}))
const accountsQuery = useQuery({ queryKey: ['trading-accounts'], queryFn: listTradingAccounts })
const tradeRecordsQuery = useQuery({
  queryKey: computed(() => ['trade-records', selectedAccountId.value, tradeRecordReq.value]),
  queryFn: () => listTradeRecords(selectedAccountId.value!, tradeRecordReq.value),
  enabled: computed(() => selectedAccountId.value !== undefined),
})
const analysisTradeRecordsQuery = useQuery({
  queryKey: computed(() => ['trade-records-analysis', selectedAccountId.value]),
  queryFn: () => listTradeRecords(selectedAccountId.value!),
  enabled: computed(() => selectedAccountId.value !== undefined),
})
const selectedAccount = computed(() =>
  accountsQuery.data.value?.find((account) => account.id === selectedAccountId.value),
)
const historicalTags = computed(() => [...new Set(
  (analysisTradeRecordsQuery.data.value ?? []).flatMap((record) => record.tags ?? []),
)].sort())
watch(
  () => filters.keyword,
  (keyword) => {
    if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
    keywordDebounceTimer = setTimeout(() => {
      debouncedKeyword.value = keyword.trim()
    }, 300)
  },
)
watch(
  () => accountsQuery.data.value,
  (accounts) => {
    if (
      selectedAccountId.value !== undefined &&
      !accounts?.some((account) => account.id === selectedAccountId.value)
    )
      selectedAccountId.value = undefined
  },
)
onBeforeUnmount(() => {
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
})
const resetFilters = () => {
  filters.keyword = ''
  filters.pnl = ''
  filters.openDateRange = []
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer)
  debouncedKeyword.value = ''
}
const updateFilter = (key: 'keyword' | 'pnl' | 'openDateRange', value: string | string[]) => {
  filters[key] = value as never
}
const handleSortChange = ({
  prop,
  order,
}: {
  prop: string | null
  order: 'ascending' | 'descending' | null
}) => {
  if ((prop === 'openTime' || prop === 'closeTime') && order) {
    sort.by = prop
    sort.order = order === 'ascending' ? 'asc' : 'desc'
  } else {
    sort.by = 'openTime'
    sort.order = 'desc'
  }
}
const openRecordDialog = () => {
  if (selectedAccountId.value === undefined) return ElMessage.warning('请先选择交易账户。')
  editingRecord.value = undefined
  recordDialogVisible.value = true
}
const openBatchRecordDialog = () => {
  if (selectedAccountId.value === undefined) return ElMessage.warning('请先选择交易账户。')
  batchRecordDialogVisible.value = true
}
const formatExportDate = (value: string | null) => (value ? value.replace('T', ' ').replace(/\.\d{3}Z$/, '') : '')
const exportTradeRecords = async () => {
  if (selectedAccountId.value === undefined || !selectedAccount.value) {
    ElMessage.warning('请先选择交易账户。')
    return
  }

  exporting.value = true
  try {
    const records = await listTradeRecords(selectedAccountId.value, {
      sortBy: 'openTime',
      sortOrder: 'asc',
    })
    const rows = records.map((record) => ({
      ID: record.id,
      标的名称: record.underlyingName,
      标的代码: record.underlyingCode,
      方向: record.direction === 'LONG' ? '做多' : '做空',
      手数: record.quantity,
      开仓时间: formatExportDate(record.openTime),
      开仓价: record.openPrice,
      开仓缘由: record.openReason ?? '',
      平仓时间: formatExportDate(record.closeTime),
      平仓价: record.closePrice ?? '',
      平仓缘由: record.closeReason ?? '',
      盈亏: record.realizedPnl ?? '',
      手续费: record.fee,
      交易反思: record.reflection ?? '',
      标签: record.tags.join('、'),
      截图: record.screenshots?.map((screenshot) => screenshot.path).join('\n') ?? '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 22 },
      { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 14 },
      { wch: 14 }, { wch: 30 }, { wch: 24 }, { wch: 36 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '交易记录')
    const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const accountName = selectedAccount.value.name.replace(/[\\/:*?"<>|]/g, '_')
    link.download = `${accountName}_交易记录_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${records.length} 条交易记录。`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '交易记录导出失败。')
  } finally {
    exporting.value = false
  }
}
const editRecord = (record: TradeRecord) => {
  editingRecord.value = record
  recordDialogVisible.value = true
}
const refreshAccounts = async () => {
  await accountsQuery.refetch()
}
const refreshTradeRecords = async () => {
  await Promise.all([tradeRecordsQuery.refetch(), analysisTradeRecordsQuery.refetch()])
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
          <el-select
            id="trading-account"
            v-model="selectedAccountId"
            class="!w-80"
            placeholder="请选择交易账户"
            :loading="accountsQuery.isLoading.value"
            clearable
            ><el-option
              v-for="account in accountsQuery.data.value"
              :key="account.id"
              :label="`${account.name} · ${account.account} (${account.currency})`"
              :value="account.id"
          /></el-select>
        </div>
        <div class="flex flex-wrap gap-2">
          <el-button
            class="!h-9 !rounded-lg !border-slate-200 !font-semibold !text-slate-600"
            @click="accountDialogVisible = true"
            ><WalletCards :size="16" />账户配置</el-button
          ><el-button
            class="!h-9 !rounded-lg !border-slate-200 !font-semibold !text-slate-600"
            :loading="accountsQuery.isFetching.value"
            @click="accountsQuery.refetch()"
            ><RefreshCw :size="16" />刷新</el-button
          ><el-button
            class="!h-9 !rounded-lg !border-slate-200 !font-semibold !text-slate-600"
            :disabled="selectedAccountId === undefined"
            :loading="exporting"
            @click="exportTradeRecords"
            ><FileDown :size="16" />导出记录</el-button
          ><el-button
            type="primary"
            class="!h-9 !rounded-lg !font-semibold"
            :disabled="selectedAccountId === undefined"
            @click="openRecordDialog"
            ><Plus :size="17" />新增记录</el-button
          ><el-button
            type="primary"
            plain
            class="!h-9 !rounded-lg !font-semibold"
            :disabled="selectedAccountId === undefined"
            @click="openBatchRecordDialog"
            ><Plus :size="17" />批量新增记录</el-button
          >
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
      <template v-if="selectedAccountId !== undefined"
        ><el-tabs v-model="activeTab" class="account-tabs"
          ><el-tab-pane label="交易记录" name="records"
            ><TradeRecordList
              :records="tradeRecordsQuery.data.value ?? []"
              :loading="tradeRecordsQuery.isFetching.value"
              :error="tradeRecordsQuery.error.value?.message"
              :filters="filters"
              @update-filter="updateFilter"
              @reset="resetFilters"
              @edit="editRecord"
              @sort="handleSortChange" /></el-tab-pane
          ><el-tab-pane label="交易记录分析" name="analysis"
            ><TradeRecordAnalysis
              :records="analysisTradeRecordsQuery.data.value ?? []"
              :loading="analysisTradeRecordsQuery.isFetching.value" /><el-alert
              v-if="analysisTradeRecordsQuery.isError.value"
              class="mt-4"
              type="error"
              :title="analysisTradeRecordsQuery.error.value?.message ?? '分析数据加载失败。'"
              :closable="false"
              show-icon /></el-tab-pane></el-tabs
      ></template>
      <section
        v-else
        class="flex min-h-78 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-9 text-center"
      >
        <div class="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <WalletCards :size="25" />
        </div>
        <h2 class="mt-3 text-base font-bold text-slate-700">选择一个交易账户</h2>
        <p class="mt-1 max-w-md text-sm leading-6 text-slate-400">
          账户是交易记录的前提。请先从上方选择账户，再开始查看和筛选交易明细。
        </p>
      </section>
    </div>
    <AccountConfigDialog
      v-model="accountDialogVisible"
      :accounts="accountsQuery.data.value ?? []"
      :loading="accountsQuery.isFetching.value"
      @changed="refreshAccounts"
      @deleted="handleAccountDeleted"
    /><TradeRecordFormDialog
      v-model="recordDialogVisible"
      :account="selectedAccount"
      :record="editingRecord"
      :historical-tags="historicalTags"
      @saved="refreshTradeRecords"
    /><BatchTradeRecordDialog
      v-model="batchRecordDialogVisible"
      :account="selectedAccount"
      @saved="refreshTradeRecords"
    />
  </section>
</template>
