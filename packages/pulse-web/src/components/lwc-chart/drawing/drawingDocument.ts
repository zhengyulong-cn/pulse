import type { KlineQueryInterval } from '@/api/market-data'
import type { TwoPointDrawing } from './strategies/types'

export type DrawingDocument = TwoPointDrawing & {
  anchor: {
    instrumentId: number
    interval: KlineQueryInterval
  }
  createdAt: string
  style: {
    color: string
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

const storageKey = ({ instrumentId, interval }: DrawingDocumentScope) => `${STORAGE_PREFIX}:${instrumentId}:${interval}`

export const loadDrawingDocuments = (scope: DrawingDocumentScope | undefined): DrawingDocument[] => {
  if (!scope) return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey(scope)) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is DrawingDocument => (
      typeof item === 'object' && item !== null
      && (item as DrawingDocument).version === 1
      && (item as DrawingDocument).anchor?.instrumentId === scope.instrumentId
      && (item as DrawingDocument).anchor?.interval === scope.interval
    ))
  } catch {
    return []
  }
}

export const saveDrawingDocuments = (scope: DrawingDocumentScope | undefined, drawings: DrawingDocument[]) => {
  if (!scope) return
  window.localStorage.setItem(storageKey(scope), JSON.stringify(drawings))
}

export const createDrawingDocument = (
  scope: DrawingDocumentScope,
  drawing: TwoPointDrawing,
): DrawingDocument => {
  const timestamp = dayjs().toISOString()
  return {
    ...drawing,
    version: 1,
    anchor: scope,
    createdAt: timestamp,
    updatedAt: timestamp,
    style: {
      color: '#2563eb',
      lineWidth: 2,
      ...(drawing.tool === 'long_position' || drawing.tool === 'short_position' ? { riskRewardRatio: 1 } : {}),
    },
  }
}

import dayjs from 'dayjs'
