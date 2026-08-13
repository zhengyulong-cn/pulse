import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { computed, ref, watch, type Ref } from 'vue'

import {
  listFutureCnKlineBars,
  searchMarketInstruments,
  type FutureCnKlineBar,
  type KlineQueryInterval,
} from '@/api/market-data'

type KlineInstrument = {
  id: number
  symbol: string
}

type SelectKlineOptions = {
  instrument?: KlineInstrument
  interval?: KlineQueryInterval
}

export const useKlineData = (onData: (bars: FutureCnKlineBar[]) => void) => {
  const selectedSymbol = ref('jm2701')
  const selectedInstrumentId = ref<number>()
  const selectedInterval = ref<KlineQueryInterval>('5m')
  const klineQueryKey = computed(() => ['future-cn-kline-bars', selectedInstrumentId.value, selectedInterval.value])
  const isKlineQueryEnabled = computed(() => selectedInstrumentId.value !== undefined)

  const klineQuery = useQuery({
    queryKey: klineQueryKey,
    enabled: isKlineQueryEnabled,
    queryFn: () => {
      const instrumentId = selectedInstrumentId.value
      if (instrumentId === undefined) throw new Error('未选择合约')
      const now = dayjs().unix()
      return listFutureCnKlineBars(instrumentId, selectedInterval.value, now - 365 * 24 * 60 * 60, now, 800)
    },
  })

  watch(() => klineQuery.data.value, (bars) => {
    if (bars) onData(bars)
  })

  const selectKline = ({ instrument, interval }: SelectKlineOptions) => {
    if (instrument) {
      selectedInstrumentId.value = instrument.id
      selectedSymbol.value = instrument.symbol
    }
    if (interval) selectedInterval.value = interval
  }

  const loadDefaultInstrument = async () => {
    const instruments = await searchMarketInstruments(selectedSymbol.value)
    const instrument = instruments.find((item) => item.symbol.toLowerCase() === selectedSymbol.value.toLowerCase())
    if (instrument) selectKline({ instrument })
  }

  return {
    klineQuery,
    loadDefaultInstrument,
    selectKline,
    selectedInstrumentId,
    selectedInterval: selectedInterval as Ref<KlineQueryInterval>,
  }
}
