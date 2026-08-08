import type { FastifyPluginAsync } from 'fastify'

import { tradingAccountRoutes } from '../modules/trading-accounts/routes.js'
import { tradeRecordRoutes } from '../modules/trade-records/routes.js'
import { healthRoutes } from './health.js'

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes)
  await app.register(tradingAccountRoutes)
  await app.register(tradeRecordRoutes)
}
