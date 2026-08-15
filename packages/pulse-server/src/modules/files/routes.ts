import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { FastifyPluginAsync } from 'fastify'

const storageRoot = path.resolve(process.env.FILE_STORAGE_DIR ?? path.join(process.cwd(), 'storage'))
const scopeSegmentPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const extensionPattern = /^\.[A-Za-z0-9]{1,16}$/
const configuredMaxFiles = Number(process.env.UPLOAD_MAX_FILES ?? 20)
const maxFiles = Number.isInteger(configuredMaxFiles) && configuredMaxFiles > 0 ? configuredMaxFiles : 20
const mimeTypeByExtension: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const isStorageScope = (value: string) => value
  .split('/')
  .every((segment) => scopeSegmentPattern.test(segment))

const getStoredFilePath = (relativePath: string) => {
  const segments = relativePath.split('/')
  if (segments.length < 2 || !isStorageScope(segments.slice(0, -1).join('/'))) return undefined

  const fileName = segments.at(-1)
  // New uploads use UUIDs without hyphens; accept the hyphenated form as well.
  if (!fileName || !/^(?:[0-9a-f]{32}|[0-9a-f-]{36})(?:\.[A-Za-z0-9]{1,16})?$/i.test(fileName)) return undefined

  return path.join(storageRoot, ...segments)
}

const uploadFileSchema = {
  type: 'object',
  required: ['path', 'size', 'content_type', 'original_name'],
  properties: {
    path: { type: 'string' },
    size: { type: 'integer', minimum: 0 },
    content_type: { type: 'string' },
    original_name: { type: 'string' },
  },
} as const

const errorResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: { message: { type: 'string' } },
} as const

export const fileRoutes: FastifyPluginAsync = async (app) => {
  const readUploadedFile = async (request: { params: { '*': string } }, reply: any) => {
    const filePath = getStoredFilePath(request.params['*'])
    if (!filePath) return reply.code(404).send({ message: 'File not found.' })

    try {
      const file = await readFile(filePath)
      return reply
        .type(mimeTypeByExtension[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream')
        .header('Cache-Control', 'private, max-age=86400')
        .send(file)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return reply.code(404).send({ message: 'File not found.' })
      throw error
    }
  }

  app.get<{ Params: { '*': string } }>('/storage/*', {
    schema: { tags: ['Files'], summary: 'Read an uploaded file' },
  }, readUploadedFile)

  app.post('/files', {
    schema: {
      tags: ['Files'],
      summary: 'Upload a file',
      consumes: ['multipart/form-data'],
      response: { 201: { type: 'array', items: uploadFileSchema }, 400: errorResponseSchema },
    },
  }, async (request, reply) => {
    let storageScope: string | undefined
    const uploadedFiles: Array<{ buffer: Buffer; mimeType: string; originalName: string }> = []

    for await (const part of request.parts()) {
      if (part.type === 'field') {
        if (part.fieldname === 'storage-scope') storageScope = String(part.value)
        continue
      }

      if (part.fieldname !== 'file') {
        await part.toBuffer()
        continue
      }
      if (uploadedFiles.length >= maxFiles) {
        await part.toBuffer()
        return reply.code(400).send({ message: `At most ${maxFiles} files are allowed.` })
      }

      uploadedFiles.push({
        buffer: await part.toBuffer(),
        mimeType: part.mimetype || 'application/octet-stream',
        originalName: path.basename(part.filename || 'file'),
      })
    }

    if (!storageScope || !isStorageScope(storageScope)) {
      return reply.code(400).send({ message: 'storage-scope must contain only letters, numbers, underscores, hyphens, and forward slashes.' })
    }
    if (uploadedFiles.length === 0) return reply.code(400).send({ message: 'At least one file field is required.' })

    const scopeSegments = storageScope.split('/')
    const destinationDirectory = path.join(storageRoot, ...scopeSegments)
    await mkdir(destinationDirectory, { recursive: true })

    const result = []
    for (const uploadedFile of uploadedFiles) {
      const id = crypto.randomUUID().replaceAll('-', '')
      const extension = path.extname(uploadedFile.originalName)
      const fileName = `${id}${extensionPattern.test(extension) ? extension.toLowerCase() : ''}`
      const destinationPath = path.join(destinationDirectory, fileName)
      const relativePath = path.posix.join(...scopeSegments, fileName)
      await writeFile(destinationPath, uploadedFile.buffer, { flag: 'wx' })
      result.push({ path: relativePath, size: uploadedFile.buffer.byteLength, content_type: uploadedFile.mimeType, original_name: uploadedFile.originalName })
    }
    return reply.code(201).send(result)
  })
}
