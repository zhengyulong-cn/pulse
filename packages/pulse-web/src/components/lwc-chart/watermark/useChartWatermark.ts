import {
  createTextWatermark,
  type IChartApi,
  type ITextWatermarkPluginApi,
  type Time,
} from 'lightweight-charts'

import type { KlineQueryInterval } from '@/api/market-data'

const intervalLabels: Record<KlineQueryInterval, string> = {
  '1m': '1分钟',
  '5m': '5分钟',
  '15m': '15分钟',
  '30m': '30分钟',
  '1h': '1小时',
  '3h': '3小时',
}

export const useChartWatermark = () => {
  let watermark: ITextWatermarkPluginApi<Time> | undefined

  const update = (symbol: string, interval: KlineQueryInterval) => {
    watermark?.applyOptions({
      lines: [
        {
          text: `${symbol.toUpperCase()} · ${intervalLabels[interval]}`,
          color: 'rgba(148, 163, 184, 0.32)',
          fontSize: 64,
        },
      ],
    })
  }

  const attach = (chart: IChartApi, symbol: string, interval: KlineQueryInterval) => {
    watermark = createTextWatermark(chart.panes()[0], {
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [],
    })
    update(symbol, interval)
  }

  const dispose = () => {
    watermark?.detach()
    watermark = undefined
  }

  return { attach, dispose, update }
}
