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

export const listActiveFutureInstruments = () =>
  dataCenterRequest<MarketInstrumentExchangeNode[]>('/api/v1/market-instruments?instrument_type=FUTURE&is_active=true')

export const listLatestKlines = (instrumentIds: number[]) =>
  dataCenterRequest<LatestKline[]>(`/market_data/kline/latest?instrument_ids=${instrumentIds.join(',')}`)

export const syncKline = (symbol: string, interval: KlineInterval) =>
  dataCenterRequest<KlineSyncResult>('/market_data/kline/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, interval }),
  })
