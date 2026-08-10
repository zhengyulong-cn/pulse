import type { FastifyPluginAsync } from 'fastify'

import {
  watchlistService,
  type CreateWatchlistBody,
  type CreateWatchlistItemBody,
  type UpdateWatchlistBody,
  type UpdateWatchlistItemBody,
} from './service.js'

type WatchlistParams = { id: number }
type WatchlistItemParams = WatchlistParams & { itemId: number }

const watchlistItemSchema = {
  type: 'object',
  required: ['id', 'watchlistId', 'instrumentId', 'sortOrder'],
  properties: {
    id: { type: 'integer' },
    watchlistId: { type: 'integer' },
    instrumentId: { type: 'integer' },
    sortOrder: { type: 'integer' },
  },
} as const

const watchlistSchema = {
  type: 'object',
  required: ['id', 'name', 'sortOrder', 'items'],
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    sortOrder: { type: 'integer' },
    items: { type: 'array', items: watchlistItemSchema },
  },
} as const

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

const itemParamsSchema = {
  type: 'object',
  required: ['id', 'itemId'],
  properties: {
    id: { type: 'integer', minimum: 1 },
    itemId: { type: 'integer', minimum: 1 },
  },
} as const

const watchlistBodyProperties = {
  name: { type: 'string', minLength: 1 },
  sortOrder: { type: 'integer' },
} as const

const itemBodyProperties = {
  instrumentId: { type: 'integer', minimum: 1 },
  sortOrder: { type: 'integer' },
} as const

export const watchlistRoutes: FastifyPluginAsync = async (app) => {
  app.get('/watchlists', {
    schema: { tags: ['Watchlists'], summary: 'List watchlists with items', response: { 200: { type: 'array', items: watchlistSchema } } },
  }, async () => watchlistService.list(app.db))

  app.post<{ Body: CreateWatchlistBody }>('/watchlists', {
    schema: { tags: ['Watchlists'], summary: 'Create a watchlist', body: { type: 'object', required: ['name'], properties: watchlistBodyProperties }, response: { 201: watchlistSchema } },
  }, async (request, reply) => reply.code(201).send(await watchlistService.create(app.db, request.body)))

  app.patch<{ Params: WatchlistParams; Body: UpdateWatchlistBody }>('/watchlists/:id', {
    schema: { tags: ['Watchlists'], summary: 'Update a watchlist', params: idParamsSchema, body: { type: 'object', minProperties: 1, properties: watchlistBodyProperties }, response: { 200: watchlistSchema } },
  }, async (request, reply) => {
    const watchlist = await watchlistService.update(app.db, request.params.id, request.body)
    return watchlist ?? reply.code(404).send({ message: 'Watchlist not found.' })
  })

  app.delete<{ Params: WatchlistParams }>('/watchlists/:id', {
    schema: { tags: ['Watchlists'], summary: 'Delete a watchlist and its items', params: idParamsSchema, response: { 204: { type: 'null' } } },
  }, async (request, reply) => {
    const watchlist = await watchlistService.delete(app.db, request.params.id)
    if (!watchlist) return reply.code(404).send({ message: 'Watchlist not found.' })
    return reply.code(204).send()
  })

  app.post<{ Params: WatchlistParams; Body: CreateWatchlistItemBody }>('/watchlists/:id/items', {
    schema: { tags: ['Watchlists'], summary: 'Add an instrument to a watchlist', params: idParamsSchema, body: { type: 'object', required: ['instrumentId'], properties: itemBodyProperties }, response: { 201: watchlistItemSchema } },
  }, async (request, reply) => {
    const result = await watchlistService.createItem(app.db, request.params.id, request.body)
    if (result.status === 'watchlist-not-found') return reply.code(404).send({ message: 'Watchlist not found.' })
    if (result.status === 'duplicate') return reply.code(409).send({ message: 'Instrument already exists in this watchlist.' })
    return reply.code(201).send(result.item)
  })

  app.patch<{ Params: WatchlistItemParams; Body: UpdateWatchlistItemBody }>('/watchlists/:id/items/:itemId', {
    schema: { tags: ['Watchlists'], summary: 'Update a watchlist item', params: itemParamsSchema, body: { type: 'object', minProperties: 1, properties: itemBodyProperties }, response: { 200: watchlistItemSchema } },
  }, async (request, reply) => {
    const result = await watchlistService.updateItem(app.db, request.params.id, request.params.itemId, request.body)
    if (result.status === 'item-not-found') return reply.code(404).send({ message: 'Watchlist item not found.' })
    if (result.status === 'duplicate') return reply.code(409).send({ message: 'Instrument already exists in this watchlist.' })
    return result.item
  })

  app.delete<{ Params: WatchlistItemParams }>('/watchlists/:id/items/:itemId', {
    schema: { tags: ['Watchlists'], summary: 'Delete a watchlist item', params: itemParamsSchema, response: { 204: { type: 'null' } } },
  }, async (request, reply) => {
    const item = await watchlistService.deleteItem(app.db, request.params.id, request.params.itemId)
    if (!item) return reply.code(404).send({ message: 'Watchlist item not found.' })
    return reply.code(204).send()
  })
}
