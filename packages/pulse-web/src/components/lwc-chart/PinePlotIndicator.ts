import { PineTS } from 'pinets'
import {
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type SeriesType,
  type Time,
} from 'lightweight-charts'
import { getPlotItems } from './pinePlotItems'

type PinePlotPoint = {
  time?: number
  timestamp?: number
  value?: number
  options?: Record<string, any>
}

type PinePlot = {
  data?: unknown[]
  options?: { color?: string, style?: string }
}

const toTimestamp = (time: unknown): Time | undefined => {
  if (typeof time !== 'number' || !Number.isFinite(time)) return undefined
  return (time > 10_000_000_000 ? Math.trunc(time / 1_000) : Math.trunc(time)) as Time
}

const toPlotPoints = (plot: PinePlot) => (plot.data ?? []).flatMap((item, index) => {
  const points = Array.isArray((item as { value?: unknown }).value)
    ? (item as { value: unknown[] }).value
    : [item]
  return points.flatMap((pointValue) => {
    const point = pointValue as PinePlotPoint
    const time = toTimestamp(point.timestamp ?? point.time)
    const value = point.value
    const options = point.options
    if (time === undefined || typeof value !== 'number' || !Number.isFinite(value)) return []
    return [{ time, value, index, options }]
  })
})

const isHistogram = (plot: PinePlot) => plot.options?.style === 'histogram' || plot.options?.style === 'columns'

export class PinePlotIndicator implements ISeriesPrimitive<Time> {
  private baseSeries: ISeriesApi<SeriesType> | undefined
  private chart: IChartApi | undefined
  private plotSeries = new Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>()
  private renderVersion = 0

  constructor(private readonly source: string) {}

  attached({ chart, series }: SeriesAttachedParameter<Time, SeriesType>) {
    this.chart = chart
    this.baseSeries = series
    series.subscribeDataChanged(this.update)
    void this.update()
  }

  detached() {
    this.renderVersion += 1
    this.baseSeries?.unsubscribeDataChanged(this.update)
    this.plotSeries.forEach((series) => this.chart?.removeSeries(series))
    this.plotSeries.clear()
    this.baseSeries = undefined
    this.chart = undefined
  }

  private drawPlots = (plots: unknown) => {
    const activePlotNames = new Set(getPlotItems(plots, 'plot').map((item) => item.key))
    this.plotSeries.forEach((series, name) => {
      if (!activePlotNames.has(name)) {
        this.chart?.removeSeries(series)
        this.plotSeries.delete(name)
      }
    })

    getPlotItems(plots, 'plot').forEach(({ key, value }) => {
      const plot = value as PinePlot
      const points = toPlotPoints(plot)
      const existingSeries = this.plotSeries.get(key)
      const histogram = isHistogram(plot)
      const series = existingSeries ?? (histogram
        ? this.chart!.addSeries(HistogramSeries, { color: plot.options?.color })
        : this.chart!.addSeries(LineSeries, { color: plot.options?.color, lineWidth: 2 }))
      this.plotSeries.set(key, series)
      series.setData(points.map(({ index: _index, ...point }) => point))
    })
  }

  private update = async () => {
    const baseSeries = this.baseSeries
    if (!baseSeries) return

    const candles = baseSeries.data().flatMap((item) => {
      if (!('open' in item) || typeof item.open !== 'number') return []
      const time = toTimestamp(item.time)
      if (time === undefined) return []
      return [{
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: 'volume' in item && typeof item.volume === 'number' ? item.volume : 0,
        openTime: time,
      }]
    })
    if (candles.length === 0) return

    const version = ++this.renderVersion
    const context = await new PineTS(candles).run(this.source)
    if (version !== this.renderVersion || !this.chart) return

    this.drawPlots(context.plots)
  }
}
