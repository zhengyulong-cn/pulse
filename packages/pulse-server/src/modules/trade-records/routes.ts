import type { FastifyPluginAsync } from 'fastify'
import {
  tradeRecordService,
  type CreateTradeRecordBody,
  type CreateTradeRecordsBatchBody,
  type TradeRecordQuery,
  type UpdateTradeRecordBody,
} from './service.js'

type TradeRecordParams = {
  id: number
}

const decimalSchema = { anyOf: [{ type: 'number' }, { type: 'string', minLength: 1 }] } as const

const tradeRecordSchema = {
  type: 'object',
  required: ['id', 'accountId', 'underlyingName', 'underlyingCode', 'direction', 'quantity', 'openTime', 'openPrice', 'fee'],
  properties: {
    id: { type: 'integer' },
    accountId: { type: 'integer' },
    underlyingName: { type: 'string' },
    underlyingCode: { type: 'string' },
    direction: { type: 'string', enum: ['LONG', 'SHORT'] },
    quantity: decimalSchema,
    openTime: { type: 'string', format: 'date-time' },
    openPrice: decimalSchema,
    openReason: { type: ['string', 'null'] },
    closeTime: { type: ['string', 'null'], format: 'date-time' },
    closePrice: { anyOf: [decimalSchema, { type: 'null' }] },
    closeReason: { type: ['string', 'null'] },
    realizedPnl: { anyOf: [decimalSchema, { type: 'null' }] },
    fee: decimalSchema,
    extraJson: {},
  },
} as const

const tradeRecordBodyProperties = {
  accountId: { type: 'integer', minimum: 1 },
  underlyingName: { type: 'string', minLength: 1 },
  underlyingCode: { type: 'string', minLength: 1 },
  direction: { type: 'string', enum: ['LONG', 'SHORT'] },
  quantity: decimalSchema,
  openTime: { type: 'string', format: 'date-time' },
  openPrice: decimalSchema,
  openReason: { type: ['string', 'null'] },
  closeTime: { type: ['string', 'null'], format: 'date-time' },
  closePrice: { anyOf: [decimalSchema, { type: 'null' }] },
  closeReason: { type: ['string', 'null'] },
  realizedPnl: { anyOf: [decimalSchema, { type: 'null' }] },
  fee: decimalSchema,
  extraJson: {},
} as const

const batchTradeRecordProperties = {
  underlyingName: tradeRecordBodyProperties.underlyingName,
  underlyingCode: tradeRecordBodyProperties.underlyingCode,
  direction: tradeRecordBodyProperties.direction,
  quantity: tradeRecordBodyProperties.quantity,
  openTime: tradeRecordBodyProperties.openTime,
  openPrice: tradeRecordBodyProperties.openPrice,
  openReason: tradeRecordBodyProperties.openReason,
  closeTime: tradeRecordBodyProperties.closeTime,
  closePrice: tradeRecordBodyProperties.closePrice,
  closeReason: tradeRecordBodyProperties.closeReason,
  realizedPnl: tradeRecordBodyProperties.realizedPnl,
  fee: tradeRecordBodyProperties.fee,
  extraJson: tradeRecordBodyProperties.extraJson,
} as const

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const

export const tradeRecordRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: TradeRecordQuery }>(
    '/trade-records',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'List trade records',
        querystring: {
          type: 'object',
          required: ['accountId'],
          properties: {
            accountId: { type: 'integer', minimum: 1 },
            keyword: { type: 'string', minLength: 1 },
            pnl: { type: 'string', enum: ['PROFIT', 'LOSS', 'BREAKEVEN', 'UNSETTLED'] },
            openDateStart: { type: 'string', format: 'date' },
            openDateEnd: { type: 'string', format: 'date' },
            sortBy: { type: 'string', enum: ['openTime', 'closeTime'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
        response: { 200: { type: 'array', items: tradeRecordSchema } },
      },
    },
    async (request) => tradeRecordService.list(app.db, request.query),
  )

  app.get<{ Params: TradeRecordParams }>(
    '/trade-records/:id',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'Get a trade record',
        params: idParamsSchema,
        response: { 200: tradeRecordSchema },
      },
    },
    async (request, reply) => {
      const tradeRecord = await tradeRecordService.findById(app.db, request.params.id)

      if (!tradeRecord) {
        return reply.code(404).send({ message: 'Trade record not found.' })
      }

      return tradeRecord
    },
  )

  app.post<{ Body: CreateTradeRecordsBatchBody }>(
    '/trade-records/batch',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'Create multiple trade records for an account',
        body: {
          type: 'object',
          required: ['accountId', 'records'],
          properties: {
            accountId: { type: 'integer', minimum: 1 },
            records: {
              type: 'array',
              minItems: 1,
              maxItems: 500,
              items: {
                type: 'object',
                required: ['underlyingName', 'underlyingCode', 'direction', 'quantity', 'openTime', 'openPrice'],
                properties: batchTradeRecordProperties,
              },
            },
          },
        },
        response: { 201: { type: 'array', items: tradeRecordSchema } },
      },
    },
    async (request, reply) => {
      const tradeRecords = await tradeRecordService.createBatch(app.db, request.body)

      if (!tradeRecords) return reply.code(404).send({ message: 'Trading account not found.' })

      return reply.code(201).send(tradeRecords)
    },
  )

  app.post<{ Body: CreateTradeRecordBody }>(
    '/trade-records',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'Create a trade record',
        body: {
          type: 'object',
          required: ['accountId', 'underlyingName', 'underlyingCode', 'direction', 'quantity', 'openTime', 'openPrice', 'fee'],
          properties: tradeRecordBodyProperties,
        },
        response: { 201: tradeRecordSchema },
      },
    },
    async (request, reply) => {
      const tradeRecord = await tradeRecordService.create(app.db, request.body)

      if (!tradeRecord) return reply.code(404).send({ message: 'Trading account not found.' })
      return reply.code(201).send(tradeRecord)
    },
  )

  app.patch<{ Params: TradeRecordParams; Body: UpdateTradeRecordBody }>(
    '/trade-records/:id',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'Update a trade record',
        params: idParamsSchema,
        body: { type: 'object', minProperties: 1, properties: tradeRecordBodyProperties },
        response: { 200: tradeRecordSchema },
      },
    },
    async (request, reply) => {
      const result = await tradeRecordService.update(app.db, request.params.id, request.body)

      if (result.status === 'account-not-found') return reply.code(404).send({ message: 'Trading account not found.' })
      if (result.status === 'record-not-found') return reply.code(404).send({ message: 'Trade record not found.' })

      return result.tradeRecord
    },
  )

  app.delete<{ Params: TradeRecordParams }>(
    '/trade-records/:id',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'Delete a trade record',
        params: idParamsSchema,
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const tradeRecord = await tradeRecordService.delete(app.db, request.params.id)

      if (!tradeRecord) {
        return reply.code(404).send({ message: 'Trade record not found.' })
      }

      return reply.code(204).send()
    },
  )
}
