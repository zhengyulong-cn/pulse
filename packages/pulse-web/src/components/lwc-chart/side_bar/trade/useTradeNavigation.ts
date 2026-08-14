import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue'

import { listFutureCnKlineBars, searchMarketInstruments, type KlineQueryInterval } from '@/api/market-data'
import type { TradeRecord } from '@/api/trading'

type Instrument = { id: number, symbol: string }

export const useTradeNavigation = (
  selectedInterval: Ref<KlineQueryInterval>,
  selectKline: (options: { instrument?: Instrument, interval?: KlineQueryInterval }) => void,
  setPendingTrade: (trade: TradeRecord | undefined) => void,
) => {
  const selectTrade = async (trade: TradeRecord) => {
    if (!trade.closeTime || !trade.closePrice) {
      ElMessage.warning('未平仓交易暂不支持图表定位')
      return
    }
    const instruments = await searchMarketInstruments(trade.underlyingCode)
    const instrument = instruments.find((item) => item.symbol.toLowerCase() === trade.underlyingCode.toLowerCase())
    if (!instrument) {
      ElMessage.warning(`未找到合约 ${trade.underlyingCode}`)
      return
    }
    const bars = await listFutureCnKlineBars(instrument.id, selectedInterval.value, dayjs(trade.openTime).unix(), dayjs(trade.closeTime).unix(), 1)
    if (!bars.length) {
      ElMessage.warning('交易区间内没有对应的 K 线')
      return
    }
    setPendingTrade(undefined)
    selectKline({ instrument })
    setPendingTrade(trade)
  }

  const selectSymbol = (instrument: Instrument) => {
    setPendingTrade(undefined)
    selectKline({ instrument })
  }

  const selectInterval = (interval: KlineQueryInterval) => {
    setPendingTrade(undefined)
    selectKline({ interval })
  }

  return { selectInterval, selectSymbol, selectTrade }
}
