<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Database, RefreshCw } from '@lucide/vue'

import {
  listActiveFutureInstruments,
  listLatestKlines,
  syncKline,
  type KlineInterval,
  type LatestKline,
  type MarketInstrument,
} from '@/api/market-data'

const MIC_TO_TQSDK_EXCHANGE: Record<string, string> = {
  XSGE: 'SHFE',
  XDCE: 'DCE',
  XZCE: 'CZCE',
  CCFX: 'CFFEX',
  XINE: 'INE',
  XGFE: 'GFEX',
}

const queryClient = useQueryClient()
const openExchanges = ref<string[]>([])
const openProducts = ref<string[]>([])
const syncingKey = ref<string>()

const instrumentsQuery = useQuery({
  queryKey: ['market-instruments', 'FUTURE', true],
  queryFn: listActiveFutureInstruments,
})

const instrumentIds = computed(() =>
  instrumentsQuery.data.value?.flatMap((exchange) =>
    exchange.children.flatMap((product) => product.children.map((instrument) => instrument.id)),
  ) ?? [],
)

const latestKlinesQuery = useQuery({
  queryKey: computed(() => ['future-cn-latest-klines', instrumentIds.value]),
  queryFn: () => listLatestKlines(instrumentIds.value),
  enabled: computed(() => instrumentIds.value.length > 0),
})

const latestKlineByKey = computed(() => {
  const entries = (latestKlinesQuery.data.value ?? []).map((kline) => [`${kline.instrument_id}:${kline.interval}`, kline] as const)
  return new Map(entries)
})

const syncKlineMutation = useMutation({
  mutationFn: ({ symbol, interval }: { symbol: string; interval: KlineInterval }) => syncKline(symbol, interval),
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

const syncSingleKline = async (mic: string, instrument: MarketInstrument, interval: KlineInterval) => {
  const symbol = getProviderSymbol(mic, instrument)
  const key = `${instrument.id}:${interval}`
  syncingKey.value = key
  await syncKlineMutation.mutateAsync({ symbol, interval })
}

const refreshMarketData = async () => {
  await instrumentsQuery.refetch()
  await latestKlinesQuery.refetch()
}
</script>

<template>
  <section class="min-h-[calc(100vh-2.5rem)] bg-slate-100 px-3 py-5 text-slate-800 sm:px-5 lg:px-6">
    <div class="mx-auto max-w-[1800px]">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Database :size="20" /></span>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">行情数据管理</h1>
            <p class="mt-0.5 text-sm text-slate-500">按交易所、品种管理期货合约，并同步单个周期的 K线数据。</p>
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

      <section v-loading="instrumentsQuery.isLoading.value" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <el-empty v-if="!instrumentsQuery.isLoading.value && !instrumentsQuery.data.value?.length" description="暂无有效期货合约" />
        <el-collapse v-else v-model="openExchanges" class="market-collapse">
          <el-collapse-item v-for="exchange in instrumentsQuery.data.value" :key="exchange.id" :name="String(exchange.id)">
            <template #title>
              <div class="flex w-full items-center justify-between gap-3 pr-4">
                <div class="min-w-0"><strong class="mr-2 text-base text-slate-800">{{ exchange.name }}</strong><span class="text-xs text-slate-400">{{ exchange.mic }} · {{ exchange.city }}</span></div>
                <span class="shrink-0 text-xs text-slate-500">{{ exchange.product_count }} 个品种 / {{ exchange.instrument_count }} 个合约</span>
              </div>
            </template>

            <el-collapse v-model="openProducts" class="product-collapse">
              <el-collapse-item v-for="product in exchange.children" :key="product.id" :name="product.id">
                <template #title>
                  <div class="flex w-full items-center justify-between gap-3 pr-4">
                    <div><strong class="mr-2 text-sm text-slate-700">{{ product.name }}</strong><span class="text-xs font-mono text-slate-400">{{ product.product_code }}</span></div>
                    <span class="text-xs text-slate-500">{{ product.instrument_count }} 个合约</span>
                  </div>
                </template>

                <div class="overflow-x-auto px-4 pb-3">
                  <div v-for="instrument in product.children" :key="instrument.id" class="instrument-row grid min-w-[980px] grid-cols-[160px_110px_minmax(280px,1fr)_minmax(280px,1fr)] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
                    <div>
                      <p class="font-semibold text-slate-800">{{ instrument.name }}</p>
                      <p class="mt-0.5 font-mono text-xs text-slate-400">{{ instrument.symbol }}</p>
                    </div>
                    <div class="text-xs text-slate-500"><p>到期</p><p class="mt-1 text-slate-700">{{ instrument.expired_at ? dayjs(instrument.expired_at).format('YYYY-MM-DD') : '-' }}</p></div>
                    <div class="kline-cell">
                      <div class="mb-1 flex items-center justify-between gap-2"><strong class="text-xs text-slate-700">1m</strong><el-button size="small" type="primary" plain :loading="syncingKey === `${instrument.id}:1m`" @click.stop="syncSingleKline(exchange.mic, instrument, '1m')">更新</el-button></div>
                      <p class="kline-value">{{ formatKline(getLatestKline(instrument.id, '1m')) }}</p>
                    </div>
                    <div class="kline-cell">
                      <div class="mb-1 flex items-center justify-between gap-2"><strong class="text-xs text-slate-700">5m</strong><el-button size="small" type="primary" plain :loading="syncingKey === `${instrument.id}:5m`" @click.stop="syncSingleKline(exchange.mic, instrument, '5m')">更新</el-button></div>
                      <p class="kline-value">{{ formatKline(getLatestKline(instrument.id, '5m')) }}</p>
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
