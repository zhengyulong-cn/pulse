import type { FastifyPluginAsync } from 'fastify'

import {
  futureTrendStatusService,
  type FutureTrendStatusInput,
} from './service.js'

type SnapshotParams = { snapshotKey: string }
type CreateSnapshotBody = { items: FutureTrendStatusInput[] }

const directions = ['UP', 'DOWN'] as const
const segmentTypes = ['TREND_IMPULSE', 'TREND_PULLBACK', 'RANGE_INTERNAL'] as const
const lifecycles = ['DECAY', 'GROWTH', 'STRONG'] as const

const statusItemSchema = {
  type: 'object',
  required: ['id', 'snapshotKey', 'snapshotAt', 'contract'],
  properties: {
    id: { type: 'integer' },
    snapshotKey: { type: 'string' },
    snapshotAt: { type: 'string', format: 'date-time' },
    contract: { type: 'string' },
    trend3hDirection: { type: ['string', 'null'], enum: [...directions, null] },
    trend3hSegmentType: { type: ['string', 'null'], enum: [...segmentTypes, null] },
    trend3hLifecycle: { type: ['string', 'null'], enum: [...lifecycles, null] },
    trend30fDirection: { type: ['string', 'null'], enum: [...directions, null] },
    trend30fSegmentType: { type: ['string', 'null'], enum: [...segmentTypes, null] },
    trend30fLifecycle: { type: ['string', 'null'], enum: [...lifecycles, null] },
  },
} as const

const snapshotSchema = {
  type: 'object',
  required: ['snapshotKey', 'snapshotAt', 'items'],
  properties: {
    snapshotKey: { type: 'string' },
    snapshotAt: { type: 'string', format: 'date-time' },
    items: { type: 'array', items: statusItemSchema },
  },
} as const

const statusItemBodyProperties = {
  contract: { type: 'string', minLength: 1 },
  trend3hDirection: { type: ['string', 'null'], enum: [...directions, null] },
  trend3hSegmentType: { type: ['string', 'null'], enum: [...segmentTypes, null] },
  trend3hLifecycle: { type: ['string', 'null'], enum: [...lifecycles, null] },
  trend30fDirection: { type: ['string', 'null'], enum: [...directions, null] },
  trend30fSegmentType: { type: ['string', 'null'], enum: [...segmentTypes, null] },
  trend30fLifecycle: { type: ['string', 'null'], enum: [...lifecycles, null] },
} as const

export const futureTrendStatusRoutes: FastifyPluginAsync = async (app) => {
  app.get('/future-trend-status/latest', {
    schema: { tags: ['Future Trend Status'], summary: 'Get the latest future trend status snapshot', response: { 200: { anyOf: [snapshotSchema, { type: 'null' }] } } },
  }, async () => futureTrendStatusService.latest(app.db))

  app.get('/future-trend-status/snapshots', {
    schema: { tags: ['Future Trend Status'], summary: 'List future trend status snapshots', response: { 200: { type: 'array', items: snapshotSchema } } },
  }, async () => futureTrendStatusService.list(app.db))

  app.get<{ Params: SnapshotParams }>('/future-trend-status/snapshots/:snapshotKey', {
    schema: { tags: ['Future Trend Status'], summary: 'Get a future trend status snapshot', params: { type: 'object', required: ['snapshotKey'], properties: { snapshotKey: { type: 'string', minLength: 1 } } }, response: { 200: snapshotSchema } },
  }, async (request, reply) => {
    const snapshot = await futureTrendStatusService.get(app.db, request.params.snapshotKey)
    return snapshot ?? reply.code(404).send({ message: 'Future trend status snapshot not found.' })
  })

  app.post<{ Body: CreateSnapshotBody }>('/future-trend-status/snapshots', {
    schema: { tags: ['Future Trend Status'], summary: 'Create a future trend status snapshot', body: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: 1, items: { type: 'object', required: ['contract'], properties: statusItemBodyProperties } } } }, response: { 201: snapshotSchema } },
  }, async (request, reply) => reply.code(201).send(await futureTrendStatusService.create(app.db, request.body.items)))
}
