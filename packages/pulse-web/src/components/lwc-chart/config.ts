import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { ColorType, type Time } from 'lightweight-charts'

dayjs.extend(utc)
dayjs.extend(timezone)

const formatShanghaiTime = (time: Time) => {
  if (typeof time === 'number') return dayjs.unix(time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm')
  if (typeof time === 'string') return time
  return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`
}

export const chartOptions = {
  autoSize: true,
  layout: {
    background: { color: '#ffffff', type: ColorType.Solid },
    textColor: '#334155',
  },
  grid: {
    horzLines: { color: '#e2e8f0' },
    vertLines: { color: '#e2e8f0' },
  },
  crosshair: {
    vertLine: { color: '#94a3b8', labelBackgroundColor: '#334155' },
    horzLine: { color: '#94a3b8', labelBackgroundColor: '#334155' },
  },
  rightPriceScale: {
    borderColor: '#cbd5e1',
  },
  timeScale: {
    borderColor: '#cbd5e1',
    timeVisible: true,
  },
  localization: {
    locale: 'zh-CN',
    timeFormatter: formatShanghaiTime,
  },
}
