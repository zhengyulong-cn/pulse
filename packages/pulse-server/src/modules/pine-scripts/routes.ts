import type { FastifyPluginAsync } from 'fastify'

import {
  pineScriptService,
  type CreatePineScriptBody,
  type PineScriptType,
  type UpdatePineScriptBody,
} from './service.js'

type PineScriptParams = { id: number }
type PineScriptQuery = { type?: PineScriptType }

const pineScriptTypes = ['INDICATOR', 'STRATEGY'] as const

const pineScriptSchema = {
  type: 'object',
  required: ['id', 'content', 'description', 'type', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'integer' },
    content: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string', enum: pineScriptTypes },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

const typeQuerySchema = {
  type: 'object',
  properties: { type: { type: 'string', enum: pineScriptTypes } },
} as const

const pineScriptBodyProperties = {
  content: { type: 'string', minLength: 1 },
  description: { type: 'string', minLength: 1 },
  type: { type: 'string', enum: pineScriptTypes },
} as const

export const pineScriptRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: PineScriptQuery }>('/pine-scripts', {
    schema: { tags: ['Pine Scripts'], summary: 'List Pine scripts', querystring: typeQuerySchema, response: { 200: { type: 'array', items: pineScriptSchema } } },
  }, async (request) => pineScriptService.list(app.db, request.query.type))

  app.get<{ Params: PineScriptParams }>('/pine-scripts/:id', {
    schema: { tags: ['Pine Scripts'], summary: 'Get a Pine script', params: idParamsSchema, response: { 200: pineScriptSchema } },
  }, async (request, reply) => {
    const script = await pineScriptService.get(app.db, request.params.id)
    return script ?? reply.code(404).send({ message: 'Pine script not found.' })
  })

  app.post<{ Body: CreatePineScriptBody }>('/pine-scripts', {
    schema: { tags: ['Pine Scripts'], summary: 'Create a Pine script', body: { type: 'object', required: ['content', 'description', 'type'], properties: pineScriptBodyProperties }, response: { 201: pineScriptSchema } },
  }, async (request, reply) => reply.code(201).send(await pineScriptService.create(app.db, request.body)))

  app.patch<{ Params: PineScriptParams; Body: UpdatePineScriptBody }>('/pine-scripts/:id', {
    schema: { tags: ['Pine Scripts'], summary: 'Update a Pine script', params: idParamsSchema, body: { type: 'object', minProperties: 1, properties: pineScriptBodyProperties }, response: { 200: pineScriptSchema } },
  }, async (request, reply) => {
    const script = await pineScriptService.update(app.db, request.params.id, request.body)
    return script ?? reply.code(404).send({ message: 'Pine script not found.' })
  })

  app.delete<{ Params: PineScriptParams }>('/pine-scripts/:id', {
    schema: { tags: ['Pine Scripts'], summary: 'Delete a Pine script', params: idParamsSchema, response: { 204: { type: 'null' } } },
  }, async (request, reply) => {
    const script = await pineScriptService.delete(app.db, request.params.id)
    if (!script) return reply.code(404).send({ message: 'Pine script not found.' })
    return reply.code(204).send()
  })
}
