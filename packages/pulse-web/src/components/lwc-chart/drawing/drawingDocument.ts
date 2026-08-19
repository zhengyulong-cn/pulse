import type { KlineQueryInterval } from '@/api/market-data'
import type { TwoPointDrawing } from './strategies/types'

export type DrawingDocument = TwoPointDrawing & {
  anchor: {
    instrumentId: number
    interval: KlineQueryInterval
  }
  createdAt: string
  crossInterval?: boolean
  locked?: boolean
  style: {
    color: string
    fillColor?: string
    lineWidth: number
    riskRewardRatio?: number
  }
  updatedAt: string
  version: 1
}

export type DrawingDocumentScope = {
  instrumentId: number
  interval: KlineQueryInterval
}

const STORAGE_PREFIX = 'pulse.chart.drawings.v1'
const intervalOrder: Record<KlineQueryInterval, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
}

const storageKey = ({ instrumentId, interval }: DrawingDocumentScope) =>
  `${STORAGE_PREFIX}:${instrumentId}:${interval}`

export const loadDrawingDocuments = (
  scope: DrawingDocumentScope | undefined,
): DrawingDocument[] => {
  if (!scope) return []
  try {
    const documents = Object.keys(window.localStorage)
      .filter(
        (key) =>
          key === storageKey(scope) || key.startsWith(`${STORAGE_PREFIX}:${scope.instrumentId}:`),
      )
      .flatMap((key) => {
        const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
        return Array.isArray(value) ? value : []
      })
    return documents.filter(
      (item): item is DrawingDocument =>
        typeof item === 'object' &&
        item !== null &&
        (item as DrawingDocument).version === 1 &&
        (item as DrawingDocument).anchor?.instrumentId === scope.instrumentId &&
        ((item as DrawingDocument).anchor?.interval === scope.interval ||
          ((item as DrawingDocument).crossInterval === true &&
            intervalOrder[scope.interval] <=
              intervalOrder[(item as DrawingDocument).anchor.interval])),
    )
  } catch {
    return []
  }
}

export const saveDrawingDocuments = (
  scope: DrawingDocumentScope | undefined,
  drawings: DrawingDocument[],
) => {
  if (!scope) return
  window.localStorage.setItem(
    storageKey(scope),
    JSON.stringify(
      drawings.filter(
        (drawing) =>
          drawing.anchor.instrumentId === scope.instrumentId &&
          drawing.anchor.interval === scope.interval,
      ),
    ),
  )
}

export const createDrawingDocument = (
  scope: DrawingDocumentScope,
  drawing: TwoPointDrawing,
  crossInterval = false,
): DrawingDocument => {
  const timestamp = dayjs().toISOString()
  return {
    ...drawing,
    crossInterval,
    version: 1,
    anchor: scope,
    createdAt: timestamp,
    updatedAt: timestamp,
    style: {
      color: '#2563eb',
      fillColor: 'rgba(37, 99, 235, 0.10)',
      lineWidth: 2,
      ...(drawing.tool === 'long_position' || drawing.tool === 'short_position'
        ? { riskRewardRatio: 1 }
        : {}),
    },
  }
}

import dayjs from 'dayjs'
