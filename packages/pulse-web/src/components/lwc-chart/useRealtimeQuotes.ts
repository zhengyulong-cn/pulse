import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

type RealtimeTick = {
  hold: number
  instrument_id: number
  price: number
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

export const useRealtimeQuotes = (instrumentIds: Ref<number[]>) => {
  const quotes = ref(new Map<number, RealtimeTick>())
  let socket: WebSocket | undefined

  const sendSubscription = () => {
    if (socket?.readyState !== WebSocket.OPEN || instrumentIds.value.length === 0) return
    socket.send(JSON.stringify({ action: 'subscribe', instrument_ids: instrumentIds.value }))
  }

  const connect = () => {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
    socket = new WebSocket(getWebSocketUrl())
    socket.addEventListener('open', sendSubscription)
    socket.addEventListener('message', ({ data }) => {
      const event = JSON.parse(data) as { type?: string, data?: RealtimeTick }
      if (event.type !== 'tick' || !event.data) return
      quotes.value = new Map(quotes.value).set(event.data.instrument_id, event.data)
    })
    socket.addEventListener('close', () => {
      socket = undefined
      if (instrumentIds.value.length > 0) window.setTimeout(connect, 1_000)
    })
  }

  watch(instrumentIds, () => {
    if (instrumentIds.value.length === 0) return
    connect()
    sendSubscription()
  }, { immediate: true })

  onBeforeUnmount(() => socket?.close())

  return { quotes }
}
