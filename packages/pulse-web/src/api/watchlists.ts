import { request } from './client'

export type WatchlistItem = {
  id: number
  watchlistId: number
  instrumentId: number
  sortOrder: number
}

export type Watchlist = {
  id: number
  name: string
  sortOrder: number
  items: WatchlistItem[]
}

export type WatchlistInput = {
  name: string
  sortOrder?: number
}

export type WatchlistItemInput = {
  instrumentId: number
  sortOrder?: number
}

export const listWatchlists = () => request<Watchlist[]>('/watchlists')

export const createWatchlist = (payload: WatchlistInput) =>
  request<Watchlist>('/watchlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const updateWatchlist = (watchlistId: number, payload: Partial<WatchlistInput>) =>
  request<Watchlist>(`/watchlists/${watchlistId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const deleteWatchlist = (watchlistId: number) =>
  request<void>(`/watchlists/${watchlistId}`, { method: 'DELETE' })

export const createWatchlistItem = (watchlistId: number, payload: WatchlistItemInput) =>
  request<WatchlistItem>(`/watchlists/${watchlistId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const updateWatchlistItem = (
  watchlistId: number,
  itemId: number,
  payload: Partial<WatchlistItemInput>,
) =>
  request<WatchlistItem>(`/watchlists/${watchlistId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const deleteWatchlistItem = (watchlistId: number, itemId: number) =>
  request<void>(`/watchlists/${watchlistId}/items/${itemId}`, { method: 'DELETE' })
