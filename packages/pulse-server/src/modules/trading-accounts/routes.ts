import type { FastifyPluginAsync } from 'fastify'

type AccountParams = {
  id: number
}

type CreateAccountBody = {
  name: string
  account: string
  currency: string
}

type UpdateAccountBody = Partial<CreateAccountBody>

const accountSchema = {
  type: 'object',
  required: ['id', 'name', 'account', 'currency'],
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    account: { type: 'string' },
    currency: { type: 'string', examples: ['CNY', 'USD', 'EUR'] },
  },
} as const

const accountBodyProperties = {
  name: { type: 'string', minLength: 1 },
  account: { type: 'string', minLength: 1 },
  currency: { type: 'string', minLength: 1 },
} as const

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const

export const tradingAccountRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/trading-accounts',
    {
      schema: {
        tags: ['Trading Accounts'],
        summary: 'List trading accounts',
        response: { 200: { type: 'array', items: accountSchema } },
      },
    },
    async () => app.db.orm.public.TradingAccount.orderBy((account) => account.id.asc()).all(),
  )

  app.get<{ Params: AccountParams }>(
    '/trading-accounts/:id',
    {
      schema: {
        tags: ['Trading Accounts'],
        summary: 'Get a trading account',
        params: idParamsSchema,
        response: { 200: accountSchema },
      },
    },
    async (request, reply) => {
      const account = await app.db.orm.public.TradingAccount.where({ id: request.params.id }).first()

      if (!account) {
        return reply.code(404).send({ message: 'Trading account not found.' })
      }

      return account
    },
  )

  app.post<{ Body: CreateAccountBody }>(
    '/trading-accounts',
    {
      schema: {
        tags: ['Trading Accounts'],
        summary: 'Create a trading account',
        body: { type: 'object', required: ['name', 'account', 'currency'], properties: accountBodyProperties },
        response: { 201: accountSchema },
      },
    },
    async (request, reply) => {
      const account = await app.db.orm.public.TradingAccount.create(request.body)
      return reply.code(201).send(account)
    },
  )

  app.patch<{ Params: AccountParams; Body: UpdateAccountBody }>(
    '/trading-accounts/:id',
    {
      schema: {
        tags: ['Trading Accounts'],
        summary: 'Update a trading account',
        params: idParamsSchema,
        body: { type: 'object', minProperties: 1, properties: accountBodyProperties },
        response: { 200: accountSchema },
      },
    },
    async (request, reply) => {
      const account = await app.db.orm.public.TradingAccount.where({ id: request.params.id }).update(request.body)

      if (!account) {
        return reply.code(404).send({ message: 'Trading account not found.' })
      }

      return account
    },
  )

  app.delete<{ Params: AccountParams }>(
    '/trading-accounts/:id',
    {
      schema: {
        tags: ['Trading Accounts'],
        summary: 'Delete a trading account without trade records',
        params: idParamsSchema,
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const tradeRecord = await app.db.orm.public.TradeRecord.where({ accountId: request.params.id }).first()

      if (tradeRecord) {
        return reply.code(409).send({ message: 'Delete the trading account trade records first.' })
      }

      const account = await app.db.orm.public.TradingAccount.where({ id: request.params.id }).delete()

      if (!account) {
        return reply.code(404).send({ message: 'Trading account not found.' })
      }

      return reply.code(204).send()
    },
  )
}
