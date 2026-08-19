<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Database, RefreshCw } from '@lucide/vue'

import {
  getMarketInstruments,
  getKlineBatchSyncJob,
  listActiveFutureInstruments,
  listLatestKlines,
  syncKline,
  syncKlinesBatch,
  type KlineBatchSyncJob,
  type KlineInterval,
  type LatestKline,
  type MarketInstrument,
} from '@/api/market-data'
import { listWatchlists } from '@/api/watchlists'

const MIC_TO_TQSDK_EXCHANGE: Record<string, string> = {
  XSGE: 'SHFE',
  XDCE: 'DCE',
  XZCE: 'CZCE',
  CCFX: 'CFFEX',
  XINE: 'INE',
  XGFE: 'GFEX',
}
const BATCH_SYNC_JOB_STORAGE_KEY = 'pulse-market-data-kline-batch-sync-job-id'

const queryClient = useQueryClient()
const openExchanges = ref<string[]>([])
const openProducts = ref<string[]>([])
const syncingKey = ref<string>()
const selectedWatchlistInstrumentIds = ref<number[]>([])
const batchSyncJob = ref<KlineBatchSyncJob>()
let batchSyncJobPollingTimer: number | undefined

const instrumentsQuery = useQuery({
  queryKey: ['market-instruments', 'FUTURE', true],
  queryFn: listActiveFutureInstruments,
})

const instrumentIds = computed(
  () =>
    instrumentsQuery.data.value?.flatMap((exchange) =>
      exchange.children.flatMap((product) => product.children.map((instrument) => instrument.id)),
    ) ?? [],
)

const instrumentExchangeMicById = computed(
  () =>
    new Map(
      instrumentsQuery.data.value?.flatMap((exchange) =>
        exchange.children.flatMap((product) =>
          product.children.map((instrument) => [instrument.id, exchange.mic] as const),
        ),
      ) ?? [],
    ),
)

const watchlistsQuery = useQuery({
  queryKey: ['watchlists'],
  queryFn: listWatchlists,
})

const watchlistInstrumentIds = computed(() => [
  ...new Set(
    watchlistsQuery.data.value?.flatMap((watchlist) =>
      watchlist.items.map((item) => item.instrumentId),
    ) ?? [],
  ),
])

const watchlistInstrumentsQuery = useQuery({
  queryKey: computed(() => ['watchlist-market-instruments', watchlistInstrumentIds.value]),
  queryFn: () => getMarketInstruments(watchlistInstrumentIds.value),
  enabled: computed(() => watchlistInstrumentIds.value.length > 0),
})

const watchlistInstrumentsById = computed(
  () =>
    new Map(
      (watchlistInstrumentsQuery.data.value ?? []).map((instrument) => [instrument.id, instrument]),
    ),
)

const watchlistsWithInstruments = computed(() =>
  (watchlistsQuery.data.value ?? [])
    .map((watchlist) => ({
      ...watchlist,
      instruments: watchlist.items
        .map((item) => watchlistInstrumentsById.value.get(item.instrumentId))
        .filter(
          (instrument): instrument is MarketInstrument => instrument?.instrument_type === 'FUTURE',
        ),
    }))
    .filter((watchlist) => watchlist.instruments.length > 0),
)

const selectableWatchlistInstrumentIds = computed(() => [
  ...new Set(
    watchlistsWithInstruments.value
      .flatMap((watchlist) => watchlist.instruments.map((instrument) => instrument.id))
      .filter((instrumentId) => instrumentExchangeMicById.value.has(instrumentId)),
  ),
])

const areAllWatchlistInstrumentsSelected = computed(
  () =>
    selectableWatchlistInstrumentIds.value.length > 0 &&
    selectableWatchlistInstrumentIds.value.every((instrumentId) =>
      selectedWatchlistInstrumentIds.value.includes(instrumentId),
    ),
)

const latestKlinesQuery = useQuery({
  queryKey: computed(() => ['future-cn-latest-klines', instrumentIds.value]),
  queryFn: () => listLatestKlines(instrumentIds.value),
  enabled: computed(() => instrumentIds.value.length > 0),
})

const latestKlineByKey = computed(() => {
  const entries = (latestKlinesQuery.data.value ?? []).map(
    (kline) => [`${kline.instrument_id}:${kline.interval}`, kline] as const,
  )
  return new Map(entries)
})

const isBatchSyncRunning = computed(() => batchSyncJob.value?.status === 'running')
const batchSyncProgress = computed(() => {
  const job = batchSyncJob.value
  return job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0
})
const batchSyncStatusText = computed(() => {
  if (!batchSyncJob.value) return ''
  if (batchSyncJob.value.status === 'running') return '后台更新中'
  return batchSyncJob.value.status === 'succeeded' ? '更新完成' : '更新失败'
})

const clearBatchSyncJobPolling = () => {
  if (batchSyncJobPollingTimer !== undefined) window.clearTimeout(batchSyncJobPollingTimer)
  batchSyncJobPollingTimer = undefined
}

const scheduleBatchSyncJobPolling = (jobId: string) => {
  clearBatchSyncJobPolling()
  batchSyncJobPollingTimer = window.setTimeout(() => void pollBatchSyncJob(jobId), 1000)
}

const updateBatchSyncJob = async (job: KlineBatchSyncJob) => {
  batchSyncJob.value = job
  if (job.status === 'running') {
    localStorage.setItem(BATCH_SYNC_JOB_STORAGE_KEY, job.id)
    scheduleBatchSyncJobPolling(job.id)
    return
  }

  clearBatchSyncJobPolling()
  localStorage.removeItem(BATCH_SYNC_JOB_STORAGE_KEY)
  await queryClient.invalidateQueries({ queryKey: ['future-cn-latest-klines'] })
  if (job.status === 'succeeded') {
    ElMessage.success(`批量更新完成：成功 ${job.success_count} 个，失败 ${job.failed_count} 个`)
  } else {
    ElMessage.error(job.error ?? '批量更新任务失败')
  }
}

const pollBatchSyncJob = async (jobId: string) => {
  try {
    await updateBatchSyncJob(await getKlineBatchSyncJob(jobId))
  } catch (error) {
    clearBatchSyncJobPolling()
    localStorage.removeItem(BATCH_SYNC_JOB_STORAGE_KEY)
    batchSyncJob.value = undefined
    ElMessage.warning(
      error instanceof Error ? `无法获取批量任务状态：${error.message}` : '无法获取批量任务状态',
    )
  }
}

const syncKlineMutation = useMutation({
  mutationFn: ({ symbol, interval }: { symbol: string; interval: KlineInterval }) =>
    syncKline(symbol, interval),
  onSuccess: async (result) => {
    ElMessage.success(`${result.symbol} ${result.interval} 已同步 ${result.persisted_count} 根 K线`)
    await queryClient.invalidateQueries({ queryKey: ['future-cn-latest-klines'] })
  },
  onError: (error) => {
    ElMessage.error(error.message)
  },
  onSettled: () => {
    syncingKey.value = undefined
  },
})

const syncKlinesBatchMutation = useMutation({
  mutationFn: ({ symbols, interval }: { symbols: string[]; interval: KlineInterval }) =>
    syncKlinesBatch(symbols, interval),
  onSuccess: (job) => {
    ElMessage.info(`任务已提交：${job.interval} K 线将于后台更新，共 ${job.total} 个合约`)
    void updateBatchSyncJob(job)
  },
  onError: (error) => {
    ElMessage.error(error.message)
  },
})

const getProviderSymbol = (mic: string, instrument: MarketInstrument) => {
  const exchangeCode = MIC_TO_TQSDK_EXCHANGE[mic]
  return exchangeCode ? `${exchangeCode}.${instrument.symbol}` : instrument.symbol
}

const getLatestKline = (instrumentId: number, interval: KlineInterval) =>
  latestKlineByKey.value.get(`${instrumentId}:${interval}`)

const formatKline = (kline: LatestKline | undefined) => {
  if (!kline) return '未同步'
  return `${dayjs(kline.date_time).format('MM-DD HH:mm')}  O ${kline.open}  H ${kline.high}  L ${kline.low}  C ${kline.close}  V ${kline.volume}  持仓 ${kline.hold}`
}

const syncSingleKline = async (
  mic: string,
  instrument: MarketInstrument,
  interval: KlineInterval,
) => {
  const symbol = getProviderSymbol(mic, instrument)
  const key = `${instrument.id}:${interval}`
  syncingKey.value = key
  await syncKlineMutation.mutateAsync({ symbol, interval })
}

const syncSelectedWatchlistKlines = async (interval: KlineInterval) => {
  const symbols = selectedWatchlistInstrumentIds.value.flatMap((instrumentId) => {
    const instrument = watchlistInstrumentsById.value.get(instrumentId)
    const mic = instrumentExchangeMicById.value.get(instrumentId)
    return instrument && mic ? [getProviderSymbol(mic, instrument)] : []
  })
  if (!symbols.length) {
    ElMessage.warning('请先选择可同步的期货合约')
    return
  }

  await syncKlinesBatchMutation.mutateAsync({ symbols, interval })
}

const toggleWatchlistInstrumentSelection = () => {
  selectedWatchlistInstrumentIds.value = areAllWatchlistInstrumentsSelected.value
    ? []
    : [...selectableWatchlistInstrumentIds.value]
}

const refreshMarketData = async () => {
  await Promise.all([
    instrumentsQuery.refetch(),
    latestKlinesQuery.refetch(),
    watchlistsQuery.refetch(),
    watchlistInstrumentsQuery.refetch(),
  ])
}

onMounted(() => {
  const jobId = localStorage.getItem(BATCH_SYNC_JOB_STORAGE_KEY)
  if (jobId) void pollBatchSyncJob(jobId)
})

onBeforeUnmount(() => {
  clearBatchSyncJobPolling()
})
</script>

<template>
  <section class="min-h-[calc(100vh-2.5rem)] bg-slate-100 px-3 py-5 text-slate-800 sm:px-5 lg:px-6">
    <div class="mx-auto max-w-[1800px]">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
            ><Database :size="20"
          /></span>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">行情数据管理</h1>
            <p class="mt-0.5 text-sm text-slate-500">
              按交易所、品种管理期货合约，并同步单个周期的 K线数据。
            </p>
          </div>
        </div>
        <el-button
          class="!h-9 !rounded-lg !border-slate-200 !font-semibold !text-slate-600"
          :loading="instrumentsQuery.isFetching.value || latestKlinesQuery.isFetching.value"
          @click="refreshMarketData"
        >
          <RefreshCw :size="16" />刷新
        </el-button>
      </header>

      <el-alert
        v-if="instrumentsQuery.isError.value"
        class="mb-4"
        type="error"
        :title="instrumentsQuery.error.value?.message ?? '合约列表加载失败'"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="latestKlinesQuery.isError.value"
        class="mb-4"
        type="warning"
        :title="latestKlinesQuery.error.value?.message ?? '最新 K线加载失败'"
        :closable="false"
        show-icon
      />

      <section
        v-if="batchSyncJob"
        class="mb-4 rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-800">
              期货 K 线批量更新 · {{ batchSyncJob.interval }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ batchSyncStatusText }}。任务在服务端执行，可切换页面后再回来查看。
            </p>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            :class="
              isBatchSyncRunning
                ? 'bg-blue-50 text-blue-600'
                : batchSyncJob.status === 'succeeded'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
            "
            >{{ batchSyncStatusText }}</span
          >
        </div>
        <el-progress
          class="mt-3"
          :percentage="batchSyncProgress"
          :status="
            batchSyncJob.status === 'failed'
              ? 'exception'
              : batchSyncJob.status === 'succeeded'
                ? 'success'
                : undefined
          "
        />
        <p class="mt-2 text-xs text-slate-500">
          已处理 {{ batchSyncJob.processed }} / {{ batchSyncJob.total }} · 成功
          {{ batchSyncJob.success_count }} · 失败 {{ batchSyncJob.failed_count }}
        </p>
      </section>

      <section
        v-if="watchlistsWithInstruments.length"
        class="mb-5 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3"
        >
          <div>
            <h2 class="text-base font-semibold text-slate-800">自选列表</h2>
            <p class="mt-0.5 text-xs text-slate-500">勾选标的后批量更新 K 线数据。</p>
          </div>
          <div class="flex items-center">
            <span class="text-xs text-slate-500 mr-2"
              >已选 {{ selectedWatchlistInstrumentIds.length }} 个</span
            >
            <el-button size="small" @click="toggleWatchlistInstrumentSelection">{{
              areAllWatchlistInstrumentsSelected ? '一键取消全选' : '一键全选'
            }}</el-button>
            <el-button
              size="small"
              type="primary"
              :loading="syncKlinesBatchMutation.isPending.value"
              :disabled="isBatchSyncRunning"
              @click="syncSelectedWatchlistKlines('1m')"
              >更新 1m</el-button
            >
            <el-button
              size="small"
              type="primary"
              :loading="syncKlinesBatchMutation.isPending.value"
              :disabled="isBatchSyncRunning"
              @click="syncSelectedWatchlistKlines('5m')"
              >更新 5m</el-button
            >
          </div>
        </div>
        <el-checkbox-group v-model="selectedWatchlistInstrumentIds" class="block">
          <div
            v-for="watchlist in watchlistsWithInstruments"
            :key="watchlist.id"
            class="border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <h3 class="mb-2 text-sm font-semibold text-slate-700">{{ watchlist.name }}</h3>
            <div class="flex flex-wrap gap-2">
              <el-checkbox
                v-for="instrument in watchlist.instruments"
                :key="`${watchlist.id}:${instrument.id}`"
                :value="instrument.id"
                class="!mr-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 hover:border-blue-300 hover:bg-blue-50"
              >
                <span class="text-sm font-medium text-slate-700">{{ instrument.name }}</span>
                <span class="ml-1.5 font-mono text-xs text-slate-400">{{ instrument.symbol }}</span>
              </el-checkbox>
            </div>
          </div>
        </el-checkbox-group>
      </section>

      <section
        v-loading="instrumentsQuery.isLoading.value"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <el-empty
          v-if="!instrumentsQuery.isLoading.value && !instrumentsQuery.data.value?.length"
          description="暂无有效期货合约"
        />
        <el-collapse v-else v-model="openExchanges" class="market-collapse">
          <el-collapse-item
            v-for="exchange in instrumentsQuery.data.value"
            :key="exchange.id"
            :name="String(exchange.id)"
          >
            <template #title>
              <div class="flex w-full items-center justify-between gap-3 pr-4">
                <div class="min-w-0">
                  <strong class="mr-2 text-base text-slate-800">{{ exchange.name }}</strong
                  ><span class="text-xs text-slate-400"
                    >{{ exchange.mic }} · {{ exchange.city }}</span
                  >
                </div>
                <span class="shrink-0 text-xs text-slate-500"
                  >{{ exchange.product_count }} 个品种 /
                  {{ exchange.instrument_count }} 个合约</span
                >
              </div>
            </template>

            <el-collapse v-model="openProducts" class="product-collapse">
              <el-collapse-item
                v-for="product in exchange.children"
                :key="product.id"
                :name="product.id"
              >
                <template #title>
                  <div class="flex w-full items-center justify-between gap-3 pr-4">
                    <div>
                      <strong class="mr-2 text-sm text-slate-700">{{ product.name }}</strong
                      ><span class="text-xs font-mono text-slate-400">{{
                        product.product_code
                      }}</span>
                    </div>
                    <span class="text-xs text-slate-500"
                      >{{ product.instrument_count }} 个合约</span
                    >
                  </div>
                </template>

                <div class="overflow-x-auto px-4 pb-3">
                  <div
                    v-for="instrument in product.children"
                    :key="instrument.id"
                    class="instrument-row grid min-w-[980px] grid-cols-[160px_110px_minmax(280px,1fr)_minmax(280px,1fr)] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div>
                      <p class="font-semibold text-slate-800">{{ instrument.name }}</p>
                      <p class="mt-0.5 font-mono text-xs text-slate-400">{{ instrument.symbol }}</p>
                    </div>
                    <div class="text-xs text-slate-500">
                      <p>到期</p>
                      <p class="mt-1 text-slate-700">
                        {{
                          instrument.expired_at
                            ? dayjs(instrument.expired_at).format('YYYY-MM-DD')
                            : '-'
                        }}
                      </p>
                    </div>
                    <div class="kline-cell">
                      <div class="mb-1 flex items-center justify-between gap-2">
                        <strong class="text-xs text-slate-700">1m</strong
                        ><el-button
                          size="small"
                          type="primary"
                          plain
                          :loading="syncingKey === `${instrument.id}:1m`"
                          @click.stop="syncSingleKline(exchange.mic, instrument, '1m')"
                          >更新</el-button
                        >
                      </div>
                      <p class="kline-value">
                        {{ formatKline(getLatestKline(instrument.id, '1m')) }}
                      </p>
                    </div>
                    <div class="kline-cell">
                      <div class="mb-1 flex items-center justify-between gap-2">
                        <strong class="text-xs text-slate-700">5m</strong
                        ><el-button
                          size="small"
                          type="primary"
                          plain
                          :loading="syncingKey === `${instrument.id}:5m`"
                          @click.stop="syncSingleKline(exchange.mic, instrument, '5m')"
                          >更新</el-button
                        >
                      </div>
                      <p class="kline-value">
                        {{ formatKline(getLatestKline(instrument.id, '5m')) }}
                      </p>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-collapse-item>
        </el-collapse>
      </section>
    </div>
  </section>
</template>

<style scoped>
.market-collapse,
.product-collapse {
  --el-collapse-border-color: #e2e8f0;
  border-top: 0;
  border-bottom: 0;
}

.market-collapse :deep(.el-collapse-item__header) {
  min-height: 58px;
  padding: 0 1rem;
  background: #fff;
  font-weight: 400;
}

.market-collapse :deep(.el-collapse-item__wrap) {
  background: #f8fafc;
}

.product-collapse :deep(.el-collapse-item__header) {
  min-height: 46px;
  padding: 0 1rem 0 1.5rem;
  background: #f8fafc;
  font-weight: 400;
}

.product-collapse :deep(.el-collapse-item__wrap) {
  background: #fff;
}

.kline-cell {
  min-width: 0;
}

.kline-value {
  overflow: hidden;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
