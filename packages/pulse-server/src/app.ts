import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { registerDatabase } from './plugins/database.js'
import { routes } from './routes/index.js'

const configuredUploadFileSize = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES ?? 50 * 1024 * 1024)
const uploadFileSize = Number.isFinite(configuredUploadFileSize) && configuredUploadFileSize > 0
  ? configuredUploadFileSize
  : 50 * 1024 * 1024
const configuredUploadFileCount = Number(process.env.UPLOAD_MAX_FILES ?? 20)
const uploadFileCount = Number.isInteger(configuredUploadFileCount) && configuredUploadFileCount > 0
  ? configuredUploadFileCount
  : 20

export const buildApp = () => {
  const app = Fastify({
    bodyLimit: Number(process.env.BODY_LIMIT_BYTES ?? 16 * 1024 * 1024),
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  })

  registerDatabase(app)
  app.register(multipart, {
    limits: {
      files: uploadFileCount,
      fileSize: uploadFileSize,
    },
  })

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Pulse Server API',
        description: 'Pulse Fastify Server API',
        version: '1.0.0',
      },
    },
  })
  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
    },
  })
  app.register(routes)

  return app
}
