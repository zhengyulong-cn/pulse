import type { FastifyPluginAsync } from 'fastify'

type TradingExchangeParams = {
  id: number
}

type CreateTradingExchangeBody = {
  name: string
  englishName: string
  mic: string
  countryCode: string
  city: string
  timezone: string
  currency: string
  isActive?: boolean
}

type UpdateTradingExchangeBody = Partial<CreateTradingExchangeBody>

const tradingExchangeSchema = {
  type: 'object',
  required: ['id', 'name', 'englishName', 'mic', 'countryCode', 'city', 'timezone', 'currency', 'isActive', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    englishName: { type: 'string' },
    mic: { type: 'string', examples: ['XSHG', 'XNYS', 'XHKG'] },
    countryCode: { type: 'string', examples: ['CN', 'US', 'JP', 'SG', 'GB'] },
    city: { type: 'string' },
    timezone: { type: 'string', examples: ['Asia/Shanghai', 'America/New_York'] },
    currency: { type: 'string', examples: ['CNY', 'USD', 'JPY', 'SGD', 'GBP'] },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const

const tradingExchangeBodyProperties = {
  name: { type: 'string', minLength: 1 },
  englishName: { type: 'string', minLength: 1 },
  mic: { type: 'string', minLength: 1 },
  countryCode: { type: 'string', minLength: 2, maxLength: 2 },
  city: { type: 'string', minLength: 1 },
  timezone: { type: 'string', minLength: 1 },
  currency: { type: 'string', minLength: 1 },
  isActive: { type: 'boolean' },
} as const

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const

const normalizeTradingExchange = (exchange: CreateTradingExchangeBody) => ({
  ...exchange,
  name: exchange.name.trim(),
  englishName: exchange.englishName.trim(),
  mic: exchange.mic.trim().toUpperCase(),
  countryCode: exchange.countryCode.trim().toUpperCase(),
  city: exchange.city.trim(),
  timezone: exchange.timezone.trim(),
  currency: exchange.currency.trim().toUpperCase(),
})

const normalizeTradingExchangeUpdate = (exchange: UpdateTradingExchangeBody) => ({
  ...(exchange.name === undefined ? {} : { name: exchange.name.trim() }),
  ...(exchange.englishName === undefined ? {} : { englishName: exchange.englishName.trim() }),
  ...(exchange.mic === undefined ? {} : { mic: exchange.mic.trim().toUpperCase() }),
  ...(exchange.countryCode === undefined ? {} : { countryCode: exchange.countryCode.trim().toUpperCase() }),
  ...(exchange.city === undefined ? {} : { city: exchange.city.trim() }),
  ...(exchange.timezone === undefined ? {} : { timezone: exchange.timezone.trim() }),
  ...(exchange.currency === undefined ? {} : { currency: exchange.currency.trim().toUpperCase() }),
  ...(exchange.isActive === undefined ? {} : { isActive: exchange.isActive }),
  updatedAt: new Date(),
})

export const tradingExchangeRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/trading-exchanges',
    {
      schema: {
        tags: ['Trading Exchanges'],
        summary: 'List trading exchanges',
        response: { 200: { type: 'array', items: tradingExchangeSchema } },
      },
    },
    async () => app.db.orm.public.TradingExchange.orderBy((exchange) => exchange.name.asc()).all(),
  )

  app.get<{ Params: TradingExchangeParams }>(
    '/trading-exchanges/:id',
    {
      schema: {
        tags: ['Trading Exchanges'],
        summary: 'Get a trading exchange',
        params: idParamsSchema,
        response: { 200: tradingExchangeSchema },
      },
    },
    async (request, reply) => {
      const exchange = await app.db.orm.public.TradingExchange.where({ id: request.params.id }).first()

      if (!exchange) return reply.code(404).send({ message: 'Trading exchange not found.' })
      return exchange
    },
  )

  app.post<{ Body: CreateTradingExchangeBody }>(
    '/trading-exchanges',
    {
      schema: {
        tags: ['Trading Exchanges'],
        summary: 'Create a trading exchange',
        body: {
          type: 'object',
          required: ['name', 'englishName', 'mic', 'countryCode', 'city', 'timezone', 'currency'],
          properties: tradingExchangeBodyProperties,
        },
        response: { 201: tradingExchangeSchema },
      },
    },
    async (request, reply) => {
      const input = normalizeTradingExchange(request.body)
      const existingExchange = await app.db.orm.public.TradingExchange.where({ mic: input.mic }).first()

      if (existingExchange) return reply.code(409).send({ message: 'Trading exchange MIC already exists.' })

      const exchange = await app.db.orm.public.TradingExchange.create(input)
      return reply.code(201).send(exchange)
    },
  )

  app.patch<{ Params: TradingExchangeParams; Body: UpdateTradingExchangeBody }>(
    '/trading-exchanges/:id',
    {
      schema: {
        tags: ['Trading Exchanges'],
        summary: 'Update a trading exchange',
        params: idParamsSchema,
        body: { type: 'object', minProperties: 1, properties: tradingExchangeBodyProperties },
        response: { 200: tradingExchangeSchema },
      },
    },
    async (request, reply) => {
      const input = normalizeTradingExchangeUpdate(request.body)

      if (input.mic) {
        const existingExchange = await app.db.orm.public.TradingExchange.where({ mic: input.mic }).first()
        if (existingExchange && existingExchange.id !== request.params.id) {
          return reply.code(409).send({ message: 'Trading exchange MIC already exists.' })
        }
      }

      const exchange = await app.db.orm.public.TradingExchange.where({ id: request.params.id }).update(input)

      if (!exchange) return reply.code(404).send({ message: 'Trading exchange not found.' })
      return exchange
    },
  )

  app.delete<{ Params: TradingExchangeParams }>(
    '/trading-exchanges/:id',
    {
      schema: {
        tags: ['Trading Exchanges'],
        summary: 'Delete a trading exchange',
        params: idParamsSchema,
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const exchange = await app.db.orm.public.TradingExchange.where({ id: request.params.id }).delete()

      if (!exchange) return reply.code(404).send({ message: 'Trading exchange not found.' })
      return reply.code(204).send()
    },
  )
}
