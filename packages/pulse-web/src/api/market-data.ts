import { dataCenterRequest } from './client'

export type MarketInstrument = {
  id: number
  exchange_id: number
  symbol: string
  name: string
  english_name: string | null
  instrument_type: 'FUTURE' | 'STOCK' | 'ETF' | 'INDEX' | 'OPTION'
  product_code: string | null
  listed_at: string | null
  expired_at: string | null
  price_tick: string | null
  volume_multiple: string | null
  trading_time: Record<string, string[][]> | null
  is_active: boolean
  extra_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type MarketInstrumentProductNode = {
  id: string
  exchange_id: number
  product_code: string
  name: string
  instrument_type: MarketInstrument['instrument_type']
  is_active: boolean
  instrument_count: number
  children: MarketInstrument[]
}

export type MarketInstrumentSearchResult = {
  id: number
  symbol: string
  name: string
  english_name: string | null
  instrument_type: MarketInstrument['instrument_type']
  exchange_mic: string
  exchange_name: string
  is_active: boolean
}

export type MarketInstrumentExchangeNode = {
  id: number
  name: string
  english_name: string
  mic: string
  country_code: string
  city: string
  timezone: string
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
  product_count: number
  instrument_count: number
  children: MarketInstrumentProductNode[]
}

export type KlineInterval = '1m' | '5m'
export type KlineQueryInterval = KlineInterval | '15m' | '30m' | '1h'

export type LatestKline = {
  instrument_id: number
  interval: KlineInterval
  date_time: string
  open: string
  close: string
  high: string
  low: string
  volume: string
  hold: string
}

export type KlineSyncResult = {
  instrument_id: number
  symbol: string
  interval: KlineInterval
  received_count: number
  persisted_count: number
}

export type KlineBatchSyncJob = {
  id: string
  status: 'running' | 'succeeded' | 'failed'
  stage: 'syncing' | 'completed' | 'failed'
  interval: KlineInterval
  total: number
  processed: number
  success_count: number
  failed_count: number
  error: string | null
}

export type FutureCnKlineBar = {
  time: number
  open: number
  close: number
  high: number
  low: number
  volume: number
  hold: number
}

export const listActiveFutureInstruments = () =>
  dataCenterRequest<MarketInstrumentExchangeNode[]>('/api/v1/market-instruments/tree?instrument_type=FUTURE&is_active=true')

export const searchMarketInstruments = (query: string, limit = 20) =>
  dataCenterRequest<MarketInstrumentSearchResult[]>(`/api/v1/market-instruments/search?${new URLSearchParams({ query, limit: String(limit) })}`)

export const getMarketInstruments = (instrumentIds: number[]) =>
  dataCenterRequest<MarketInstrument[]>(`/api/v1/market-instruments?${new URLSearchParams({ instrumentIds: instrumentIds.join(',') })}`)

export const listLatestKlines = (instrumentIds: number[]) =>
  dataCenterRequest<LatestKline[]>(`/market_data/kline/latest?instrument_ids=${instrumentIds.join(',')}`)

export const listFutureCnKlineBars = (
  instrumentId: number,
  interval: KlineQueryInterval,
  fromTimestamp: number,
  toTimestamp: number,
  countBack?: number,
) => {
  const parameters = new URLSearchParams({
    instrument_id: String(instrumentId),
    interval,
    from: String(fromTimestamp),
    to: String(toTimestamp),
  })
  if (countBack !== undefined) parameters.set('count_back', String(countBack))
  return dataCenterRequest<FutureCnKlineBar[]>(`/market_data/kline/bars?${parameters}`)
}

export const syncKline = (symbol: string, interval: KlineInterval) =>
  dataCenterRequest<KlineSyncResult>('/market_data/kline/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, interval }),
  })

export const syncKlinesBatch = (symbols: string[], interval: KlineInterval) =>
  dataCenterRequest<KlineBatchSyncJob>('/market_data/kline/sync/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols, interval }),
  })

export const getKlineBatchSyncJob = (jobId: string) =>
  dataCenterRequest<KlineBatchSyncJob>(`/market_data/kline/sync/batch/${jobId}`)
