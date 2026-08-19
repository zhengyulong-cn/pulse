<script setup lang="ts">
import dayjs from 'dayjs'
import { CalendarDays } from '@lucide/vue'

import { getUploadedFileUrl, type TradeRecord, type TradeScreenshot } from '@/api/trading'

type PnlFilter = 'PROFIT' | 'LOSS' | 'BREAKEVEN' | 'UNSETTLED' | ''
type ListFilters = { keyword: string; pnl: PnlFilter; openDateRange: string[] }

const props = defineProps<{
  records: TradeRecord[]
  loading?: boolean
  error?: string
  filters: ListFilters
}>()

const emit = defineEmits<{
  'update-filter': [key: keyof ListFilters, value: string | string[]]
  reset: []
  edit: [record: TradeRecord]
  sort: [payload: { prop: string | null; order: 'ascending' | 'descending' | null }]
}>()

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
const formatJson = (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : '—')
const getScreenshotUrls = (screenshots: TradeScreenshot[]) =>
  screenshots.map((screenshot) => getUploadedFileUrl(screenshot.path))
const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2, ...options }).format(value)
const pnlClass = (value: string | null) => {
  if (value === null) return 'text-slate-400'
  const pnl = Number(value)
  if (pnl < 0) return 'text-emerald-600'
  if (pnl > 0) return 'text-rose-600'
  return 'text-slate-600'
}

const updateFilter = (key: keyof ListFilters, value: string | string[]) =>
  emit('update-filter', key, value)
</script>

<template>
  <div>
    <div
      class="mb-5 flex flex-row flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <el-input
        :model-value="filters.keyword"
        class="!w-52"
        clearable
        placeholder="搜索标的名称或代码"
        @update:model-value="updateFilter('keyword', String($event))"
      />
      <el-select
        :model-value="filters.pnl"
        class="!w-32"
        clearable
        placeholder="全部结果"
        @update:model-value="updateFilter('pnl', $event ?? '')"
      >
        <el-option label="盈利" value="PROFIT" /><el-option label="亏损" value="LOSS" /><el-option
          label="持平"
          value="BREAKEVEN"
        /><el-option label="未平仓" value="UNSETTLED" />
      </el-select>
      <el-date-picker
        :model-value="filters.openDateRange"
        class="!w-64 !grow-0 !shrink-0 !basis-auto"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开仓开始日期"
        end-placeholder="开仓结束日期"
        :prefix-icon="CalendarDays"
        @update:model-value="updateFilter('openDateRange', $event ?? [])"
      />
      <el-button class="ml-auto" @click="emit('reset')">清空</el-button>
    </div>
    <el-alert v-if="error" class="mb-4" type="error" :title="error" :closable="false" show-icon />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <el-table
        v-loading="loading"
        :data="records"
        class="w-full"
        empty-text="当前条件下暂无交易记录"
        :default-sort="{ prop: 'openTime', order: 'descending' }"
        @sort-change="emit('sort', $event)"
      >
        <el-table-column prop="id" label="ID" width="64" fixed="left" /><el-table-column
          prop="underlyingName"
          label="标的名称"
          min-width="120"
        /><el-table-column prop="underlyingCode" label="代码" width="110" />
        <el-table-column label="方向" width="92"
          ><template #default="{ row }"
            ><span
              class="inline-flex min-w-14 justify-center rounded-md px-1.5 py-1 text-xs font-bold"
              :class="
                row.direction === 'LONG' ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'
              "
              >{{ row.direction === 'LONG' ? '↑ 做多' : '↓ 做空' }}</span
            ></template
          ></el-table-column
        >
        <el-table-column prop="quantity" label="手数" width="84" align="right" /><el-table-column
          prop="openTime"
          label="开仓时间"
          width="158"
          sortable="custom"
          ><template #default="{ row }">{{
            formatDateTime(row.openTime)
          }}</template></el-table-column
        ><el-table-column
          prop="openPrice"
          label="开仓价"
          width="100"
          align="right"
        /><el-table-column prop="closeTime" label="平仓时间" width="158" sortable="custom"
          ><template #default="{ row }">{{
            formatDateTime(row.closeTime)
          }}</template></el-table-column
        >
        <el-table-column label="平仓价" width="100" align="right"
          ><template #default="{ row }">{{ row.closePrice ?? '—' }}</template></el-table-column
        ><el-table-column label="盈亏" width="112" align="right"
          ><template #default="{ row }"
            ><span class="font-bold" :class="pnlClass(row.realizedPnl)">{{
              row.realizedPnl === null
                ? '未平仓'
                : `${Number(row.realizedPnl) > 0 ? '+' : ''}${row.realizedPnl}`
            }}</span></template
          ></el-table-column
        ><el-table-column prop="fee" label="手续费" width="95" align="right" />
        <el-table-column prop="openReason" label="开仓缘由" min-width="320"
          ><template #default="{ row }"
            ><span class="whitespace-pre-wrap">{{ row.openReason || '—' }}</span></template
          ></el-table-column
        ><el-table-column prop="closeReason" label="平仓缘由" min-width="200"
          ><template #default="{ row }"
            ><span class="whitespace-pre-wrap">{{ row.closeReason || '—' }}</span></template
          ></el-table-column
        >
        <el-table-column label="截图" min-width="96" align="center"
          ><template #default="{ row }"
            ><div v-if="row.screenshots?.length" class="flex items-center justify-center gap-1">
              <el-image
                v-for="screenshot in row.screenshots"
                :key="screenshot.path"
                :src="getUploadedFileUrl(screenshot.path)"
                :preview-src-list="getScreenshotUrls(row.screenshots)"
                preview-teleported
                fit="cover"
                class="size-8 rounded border border-slate-200"
              /><span class="text-xs text-slate-400">{{ row.screenshots.length }}</span>
            </div>
            <span v-else class="text-slate-400">—</span></template
          ></el-table-column
        >
        <el-table-column label="操作" width="76" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="primary" @click="emit('edit', row)">修改</el-button></template
          ></el-table-column
        ><el-table-column label="extra_json" min-width="170" show-overflow-tooltip
          ><template #default="{ row }">{{ formatJson(row.extraJson) }}</template></el-table-column
        >
      </el-table>
    </section>
  </div>
</template>
