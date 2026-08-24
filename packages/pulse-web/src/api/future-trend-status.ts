import { request } from './client'

export type FutureTrendDirection = 'UP' | 'DOWN'
export type FutureTrendSegmentType = 'TREND_IMPULSE' | 'TREND_PULLBACK' | 'RANGE_INTERNAL'
export type FutureTrendLifecycle = 'DECAY' | 'GROWTH' | 'STRONG'

export type FutureTrendStatusItem = {
  id: number
  snapshotKey: string
  snapshotAt: string
  contract: string
  trend3hDirection: FutureTrendDirection | null
  trend3hSegmentType: FutureTrendSegmentType | null
  trend3hLifecycle: FutureTrendLifecycle | null
  trend30fDirection: FutureTrendDirection | null
  trend30fSegmentType: FutureTrendSegmentType | null
  trend30fLifecycle: FutureTrendLifecycle | null
}

export type FutureTrendStatusSnapshot = {
  snapshotKey: string
  snapshotAt: string
  items: FutureTrendStatusItem[]
}

export type FutureTrendStatusInput = Omit<
  FutureTrendStatusItem,
  'id' | 'snapshotKey' | 'snapshotAt'
>

export const getLatestFutureTrendStatusSnapshot = () =>
  request<FutureTrendStatusSnapshot | null>('/future-trend-status/latest')

export const listFutureTrendStatusSnapshots = () =>
  request<FutureTrendStatusSnapshot[]>('/future-trend-status/snapshots')

export const getFutureTrendStatusSnapshot = (snapshotKey: string) =>
  request<FutureTrendStatusSnapshot>(`/future-trend-status/snapshots/${snapshotKey}`)

export const deleteFutureTrendStatusSnapshot = (snapshotKey: string) =>
  request<void>(`/future-trend-status/snapshots/${snapshotKey}`, { method: 'DELETE' })

export const createFutureTrendStatusSnapshot = (items: FutureTrendStatusInput[]) =>
  request<FutureTrendStatusSnapshot>('/future-trend-status/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
