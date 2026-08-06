import type { FastifyInstance } from 'fastify'

import { db } from '../prisma/db.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db
  }
}

export const registerDatabase = (app: FastifyInstance) => {
  app.decorate('db', db)
  app.addHook('onClose', async () => {
    await app.db.close()
  })
}
