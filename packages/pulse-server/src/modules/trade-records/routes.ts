import type { FastifyPluginAsync } from 'fastify'
import dayjs from 'dayjs'
import type { FieldInputTypes } from '../../prisma/contract.js'

type TradeRecordParams = {
  id: number
}

type TradeRecordQuery = {
  accountId?: number
}

type DecimalInput = number | string

type CreateTradeRecordBody = {
  accountId: number
  underlyingName: string
  underlyingCode: string
  marketRegion: 'A_SHARE' | 'HONG_KONG' | 'MAINLAND_FUTURES' | 'INTERNATIONAL_FUTURES' | 'FOREX' | 'CRYPTO'
  direction: 'LONG' | 'SHORT'
  quantity: DecimalInput
  openTime: string
  openPrice: DecimalInput
  closeTime?: string | null
  closePrice?: DecimalInput | null
  realizedPnl?: DecimalInput | null
  fee: DecimalInput
  extraJson?: Record<string, unknown> | null
}

type UpdateTradeRecordBody = Partial<CreateTradeRecordBody>
type TradeRecordInput = FieldInputTypes['public']['TradeRecord']
type TradeRecordUpdateInput = { -readonly [Key in keyof TradeRecordInput]?: TradeRecordInput[Key] }

const decimalSchema = { anyOf: [{ type: 'number' }, { type: 'string', minLength: 1 }] } as const

const parseDateTime = (value: string) => dayjs(value).toDate()

const tradeRecordSchema = {
  type: 'object',
  required: ['id', 'accountId', 'underlyingName', 'underlyingCode', 'marketRegion', 'direction', 'quantity', 'openTime', 'openPrice', 'fee'],
  properties: {
    id: { type: 'integer' },
    accountId: { type: 'integer' },
    underlyingName: { type: 'string' },
    underlyingCode: { type: 'string' },
    marketRegion: {
      type: 'string',
      enum: ['A_SHARE', 'HONG_KONG', 'MAINLAND_FUTURES', 'INTERNATIONAL_FUTURES', 'FOREX', 'CRYPTO'],
      description: 'A_SHARE=A股, HONG_KONG=港股, MAINLAND_FUTURES=大陆期货, INTERNATIONAL_FUTURES=国际期货, FOREX=外汇, CRYPTO=加密货币',
    },
    direction: { type: 'string', enum: ['LONG', 'SHORT'] },
    quantity: decimalSchema,
    openTime: { type: 'string', format: 'date-time' },
    openPrice: decimalSchema,
    closeTime: { type: ['string', 'null'], format: 'date-time' },
    closePrice: { anyOf: [decimalSchema, { type: 'null' }] },
    realizedPnl: { anyOf: [decimalSchema, { type: 'null' }] },
    fee: decimalSchema,
    extraJson: {},
  },
} as const

const tradeRecordBodyProperties = {
  accountId: { type: 'integer', minimum: 1 },
  underlyingName: { type: 'string', minLength: 1 },
  underlyingCode: { type: 'string', minLength: 1 },
  marketRegion: {
    type: 'string',
    enum: ['A_SHARE', 'HONG_KONG', 'MAINLAND_FUTURES', 'INTERNATIONAL_FUTURES', 'FOREX', 'CRYPTO'],
  },
  direction: { type: 'string', enum: ['LONG', 'SHORT'] },
  quantity: decimalSchema,
  openTime: { type: 'string', format: 'date-time' },
  openPrice: decimalSchema,
  closeTime: { type: ['string', 'null'], format: 'date-time' },
  closePrice: { anyOf: [decimalSchema, { type: 'null' }] },
  realizedPnl: { anyOf: [decimalSchema, { type: 'null' }] },
  fee: decimalSchema,
  extraJson: {},
} as const

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const

const normalizeTradeRecordForCreate = (tradeRecord: CreateTradeRecordBody) => ({
  accountId: tradeRecord.accountId,
  underlyingName: tradeRecord.underlyingName,
  underlyingCode: tradeRecord.underlyingCode,
  marketRegion: tradeRecord.marketRegion,
  direction: tradeRecord.direction,
  quantity: String(tradeRecord.quantity),
  openTime: parseDateTime(tradeRecord.openTime),
  openPrice: String(tradeRecord.openPrice),
  fee: String(tradeRecord.fee),
  ...(tradeRecord.closeTime === undefined ? {} : { closeTime: tradeRecord.closeTime === null ? null : parseDateTime(tradeRecord.closeTime) }),
  ...(tradeRecord.closePrice === undefined ? {} : { closePrice: tradeRecord.closePrice === null ? null : String(tradeRecord.closePrice) }),
  ...(tradeRecord.realizedPnl === undefined ? {} : { realizedPnl: tradeRecord.realizedPnl === null ? null : String(tradeRecord.realizedPnl) }),
  ...(tradeRecord.extraJson === undefined ? {} : { extraJson: tradeRecord.extraJson as TradeRecordInput['extraJson'] }),
})

const normalizeTradeRecordForUpdate = (tradeRecord: UpdateTradeRecordBody): TradeRecordUpdateInput => {
  const normalized: TradeRecordUpdateInput = {}

  if (tradeRecord.accountId !== undefined) normalized.accountId = tradeRecord.accountId
  if (tradeRecord.underlyingName !== undefined) normalized.underlyingName = tradeRecord.underlyingName
  if (tradeRecord.underlyingCode !== undefined) normalized.underlyingCode = tradeRecord.underlyingCode
  if (tradeRecord.marketRegion !== undefined) normalized.marketRegion = tradeRecord.marketRegion
  if (tradeRecord.direction !== undefined) normalized.direction = tradeRecord.direction
  if (tradeRecord.quantity !== undefined) normalized.quantity = String(tradeRecord.quantity)
  if (tradeRecord.openTime !== undefined) normalized.openTime = parseDateTime(tradeRecord.openTime)
  if (tradeRecord.openPrice !== undefined) normalized.openPrice = String(tradeRecord.openPrice)
  if (tradeRecord.closeTime !== undefined) normalized.closeTime = tradeRecord.closeTime === null ? null : parseDateTime(tradeRecord.closeTime)
  if (tradeRecord.closePrice !== undefined) normalized.closePrice = tradeRecord.closePrice === null ? null : String(tradeRecord.closePrice)
  if (tradeRecord.realizedPnl !== undefined) normalized.realizedPnl = tradeRecord.realizedPnl === null ? null : String(tradeRecord.realizedPnl)
  if (tradeRecord.fee !== undefined) normalized.fee = String(tradeRecord.fee)
  if (tradeRecord.extraJson !== undefined) normalized.extraJson = tradeRecord.extraJson as TradeRecordInput['extraJson']

  return normalized
}

export const tradeRecordRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: TradeRecordQuery }>(
    '/trade-records',
    {
      schema: {
        tags: ['Trade Records'],
        summary: 'List trade records',
        querystring: {
          type: 'object',
          properties: { accountId: { type: 'integer', minimum: 1 } },
        },
        response: { 200: { type: 'array', items: tradeRecordSchema } },
      },
    },
    async (request) => {
      const tradeRecords = request.query.accountId === undefined
        ? app.db.orm.public.TradeRecord.orderBy((tradeRecord) => tradeRecord.openTime.desc())
        : app.db.orm.public.TradeRecord.where({ accountId: request.query.accountId }).orderBy((tradeRecord) => tradeRecord.openTime.desc())

      return tradeRecords.all()
    },
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
      const tradeRecord = await app.db.orm.public.TradeRecord.where({ id: request.params.id }).first()

      if (!tradeRecord) {
        return reply.code(404).send({ message: 'Trade record not found.' })
      }

      return tradeRecord
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
          required: ['accountId', 'underlyingName', 'underlyingCode', 'marketRegion', 'direction', 'quantity', 'openTime', 'openPrice', 'fee'],
          properties: tradeRecordBodyProperties,
        },
        response: { 201: tradeRecordSchema },
      },
    },
    async (request, reply) => {
      const account = await app.db.orm.public.TradingAccount.where({ id: request.body.accountId }).first()

      if (!account) {
        return reply.code(404).send({ message: 'Trading account not found.' })
      }

      const tradeRecord = await app.db.orm.public.TradeRecord.create(normalizeTradeRecordForCreate(request.body))
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
      if (request.body.accountId !== undefined) {
        const account = await app.db.orm.public.TradingAccount.where({ id: request.body.accountId }).first()

        if (!account) {
          return reply.code(404).send({ message: 'Trading account not found.' })
        }
      }

      const tradeRecord = await app.db.orm.public.TradeRecord.where({ id: request.params.id }).update(
        normalizeTradeRecordForUpdate(request.body),
      )

      if (!tradeRecord) {
        return reply.code(404).send({ message: 'Trade record not found.' })
      }

      return tradeRecord
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
      const tradeRecord = await app.db.orm.public.TradeRecord.where({ id: request.params.id }).delete()

      if (!tradeRecord) {
        return reply.code(404).send({ message: 'Trade record not found.' })
      }

      return reply.code(204).send()
    },
  )
}
