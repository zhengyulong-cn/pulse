import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { FastifyPluginAsync } from 'fastify'

const storageRoot = path.resolve(process.env.FILE_STORAGE_DIR ?? path.join(process.cwd(), 'storage'))
const scopeSegmentPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const extensionPattern = /^\.[A-Za-z0-9]{1,16}$/

const isStorageScope = (value: string) => value
  .split('/')
  .every((segment) => scopeSegmentPattern.test(segment))

const uploadResponseSchema = {
  type: 'object',
  required: ['id', 'storageScope', 'originalName', 'fileName', 'mimeType', 'size', 'relativePath', 'uploadedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    storageScope: { type: 'string' },
    originalName: { type: 'string' },
    fileName: { type: 'string' },
    mimeType: { type: 'string' },
    size: { type: 'integer', minimum: 0 },
    relativePath: { type: 'string' },
    uploadedAt: { type: 'string', format: 'date-time' },
  },
} as const

const errorResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: { message: { type: 'string' } },
} as const

export const fileRoutes: FastifyPluginAsync = async (app) => {
  app.post('/files', {
    schema: {
      tags: ['Files'],
      summary: 'Upload a file',
      consumes: ['multipart/form-data'],
      response: { 201: uploadResponseSchema, 400: errorResponseSchema },
    },
  }, async (request, reply) => {
    let storageScope: string | undefined
    let uploadedFile: { buffer: Buffer; mimeType: string; originalName: string } | undefined

    for await (const part of request.parts()) {
      if (part.type === 'field') {
        if (part.fieldname === 'storage-scope') storageScope = String(part.value)
        continue
      }

      if (part.fieldname !== 'file') {
        await part.toBuffer()
        continue
      }
      if (uploadedFile) {
        await part.toBuffer()
        return reply.code(400).send({ message: 'Only one file is allowed.' })
      }

      uploadedFile = {
        buffer: await part.toBuffer(),
        mimeType: part.mimetype || 'application/octet-stream',
        originalName: path.basename(part.filename || 'file'),
      }
    }

    if (!storageScope || !isStorageScope(storageScope)) {
      return reply.code(400).send({ message: 'storage-scope must contain only letters, numbers, underscores, hyphens, and forward slashes.' })
    }
    if (!uploadedFile) return reply.code(400).send({ message: 'A file field is required.' })

    const id = crypto.randomUUID()
    const extension = path.extname(uploadedFile.originalName)
    const fileName = `${id}${extensionPattern.test(extension) ? extension.toLowerCase() : ''}`
    const scopeSegments = storageScope.split('/')
    const destinationDirectory = path.join(storageRoot, ...scopeSegments)
    const destinationPath = path.join(destinationDirectory, fileName)
    const relativePath = path.posix.join(...scopeSegments, fileName)

    await mkdir(destinationDirectory, { recursive: true })
    await writeFile(destinationPath, uploadedFile.buffer, { flag: 'wx' })

    return reply.code(201).send({
      id,
      storageScope,
      originalName: uploadedFile.originalName,
      fileName,
      mimeType: uploadedFile.mimeType,
      size: uploadedFile.buffer.byteLength,
      relativePath,
      uploadedAt: new Date().toISOString(),
    })
  })
}
