import dayjs from 'dayjs'
import { computed, onBeforeUnmount, watch, type Ref } from 'vue'

import type { KlineQueryInterval } from '@/api/market-data'

type RealtimeBar = {
  close: number
  high: number
  hold: number
  instrument_id: number
  interval: KlineQueryInterval
  low: number
  open: number
  time: number
  volume: number
}

const getWebSocketUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_DATA_CENTER_API_BASE_URL ?? '/api/market-data'
  const baseUrl = new URL(apiBaseUrl, window.location.href)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/ws/market`
  return baseUrl.toString()
}

export const useRealtimeKline = (
  instrumentId: Ref<number | undefined>,
  interval: Ref<KlineQueryInterval>,
  onBar: (bar: Omit<RealtimeBar, 'instrument_id' | 'interval'> & { time: number }) => void,
) => {
  let socket: WebSocket | undefined
  const isSubscribed = computed(() => instrumentId.value !== undefined)

  const connect = () => {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
    socket = new WebSocket(getWebSocketUrl())
    socket.addEventListener('open', sendSubscription)
    socket.addEventListener('message', ({ data }) => {
      const event = JSON.parse(data) as { type?: string, data?: RealtimeBar }
      const bar = event.data
      if (event.type !== 'bar' || !bar || bar.instrument_id !== instrumentId.value || bar.interval !== interval.value) return
      onBar({ ...bar, time: dayjs(bar.time).unix() })
    })
    socket.addEventListener('close', () => {
      socket = undefined
      if (isSubscribed.value) window.setTimeout(connect, 1_000)
    })
  }

  const sendSubscription = () => {
    if (socket?.readyState !== WebSocket.OPEN || instrumentId.value === undefined) return
    socket.send(JSON.stringify({ action: 'subscribe', instrument_ids: [instrumentId.value] }))
  }

  watch([instrumentId, interval], () => {
    if (isSubscribed.value) {
      connect()
      sendSubscription()
    }
  }, { immediate: true })

  onBeforeUnmount(() => socket?.close())
}
