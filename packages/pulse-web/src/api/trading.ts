import { request } from './client'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/server'

export type TradeScreenshot = {
  path: string
  size: number
  content_type: string
  original_name: string
}

export type UploadedFile = TradeScreenshot

export type TradeDirection = 'LONG' | 'SHORT'

export type TradingAccount = {
  id: number
  name: string
  account: string
  currency: string
}

export type TradingAccountInput = Omit<TradingAccount, 'id'>

export type TradeRecord = {
  id: number
  accountId: number
  underlyingName: string
  underlyingCode: string
  direction: TradeDirection
  quantity: string
  openTime: string
  openPrice: string
  openReason: string | null
  screenshots: TradeScreenshot[] | null
  closeTime: string | null
  closePrice: string | null
  closeReason: string | null
  realizedPnl: string | null
  fee: string
  extraJson: Record<string, unknown> | null
}

export type CreateTradeRecordInput = Omit<TradeRecord, 'id'>
export type BatchTradeRecordInput = Omit<CreateTradeRecordInput, 'accountId' | 'fee'> & {
  fee?: string | number
}

export type TradeRecordReq = {
  keyword?: string
  pnl?: 'PROFIT' | 'LOSS' | 'BREAKEVEN' | 'UNSETTLED'
  openDateStart?: string
  openDateEnd?: string
  sortBy?: 'openTime' | 'closeTime'
  sortOrder?: 'asc' | 'desc'
}

export const listTradingAccounts = () => request<TradingAccount[]>('/trading-accounts')

export const uploadFiles = (files: File[], storageScope: string) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('file', file))
  formData.append('storage-scope', storageScope)
  return request<UploadedFile[]>('/files', { method: 'POST', body: formData })
}

export const getUploadedFileUrl = (relativePath: string) =>
  `${apiBaseUrl}/storage/${relativePath.split('/').map(encodeURIComponent).join('/')}`

export const createTradingAccount = (payload: TradingAccountInput) =>
  request<TradingAccount>('/trading-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const updateTradingAccount = (id: number, payload: Partial<TradingAccountInput>) =>
  request<TradingAccount>(`/trading-accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const deleteTradingAccount = (id: number) =>
  request<void>(`/trading-accounts/${id}`, { method: 'DELETE' })

export const listTradeRecords = (accountId: number, query: TradeRecordReq = {}) => {
  const searchParams = new URLSearchParams({ accountId: String(accountId) })

  for (const [key, value] of Object.entries(query)) {
    if (value) searchParams.set(key, value)
  }

  return request<TradeRecord[]>(`/trade-records?${searchParams}`)
}

export const createTradeRecord = (payload: CreateTradeRecordInput) =>
  request<TradeRecord>('/trade-records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const createTradeRecordsBatch = (accountId: number, records: BatchTradeRecordInput[]) =>
  request<TradeRecord[]>('/trade-records/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, records }),
  })

export const updateTradeRecord = (id: number, payload: Partial<CreateTradeRecordInput>) =>
  request<TradeRecord>(`/trade-records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
