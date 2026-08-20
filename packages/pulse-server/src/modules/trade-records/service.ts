import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import { or } from '@prisma/orm-postgres/orm-client'

import type { FieldInputTypes } from '../../prisma/contract.js'
import type { db } from '../../prisma/db.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export type DecimalInput = number | string

export type TradeRecordQuery = {
  accountId: number
  keyword?: string
  pnl?: 'PROFIT' | 'LOSS' | 'BREAKEVEN' | 'UNSETTLED'
  openDateStart?: string
  openDateEnd?: string
  sortBy?: 'openTime' | 'closeTime'
  sortOrder?: 'asc' | 'desc'
}

export type CreateTradeRecordBody = {
  accountId: number
  underlyingName: string
  underlyingCode: string
  direction: 'LONG' | 'SHORT'
  quantity: DecimalInput
  openTime: string
  openPrice: DecimalInput
  openReason?: string | null
  screenshots?: Record<string, unknown>[] | null
  closeTime?: string | null
  closePrice?: DecimalInput | null
  closeReason?: string | null
  reflection?: string | null
  tags?: string[]
  realizedPnl?: DecimalInput | null
  fee: DecimalInput
}

export type UpdateTradeRecordBody = Partial<CreateTradeRecordBody>
export type BatchTradeRecordInput = Omit<CreateTradeRecordBody, 'accountId' | 'fee'> & { fee?: DecimalInput }
export type CreateTradeRecordsBatchBody = {
  accountId: number
  records: BatchTradeRecordInput[]
}

type Database = typeof db
type TradeRecordInput = FieldInputTypes['public']['TradeRecord']
type TradeRecordUpdateInput = { -readonly [Key in keyof TradeRecordInput]?: TradeRecordInput[Key] }

const businessTimeZone = 'Asia/Shanghai'
const parseDateTime = (value: string) => dayjs(value).toDate()
const parseDateStart = (value: string) => dayjs.tz(value, businessTimeZone).startOf('day').toDate()
const parseDateEnd = (value: string) => dayjs.tz(value, businessTimeZone).endOf('day').toDate()

const normalizeTradeRecordForCreate = (tradeRecord: CreateTradeRecordBody) => ({
  accountId: tradeRecord.accountId,
  underlyingName: tradeRecord.underlyingName,
  underlyingCode: tradeRecord.underlyingCode,
  direction: tradeRecord.direction,
  quantity: String(tradeRecord.quantity),
  openTime: parseDateTime(tradeRecord.openTime),
  openPrice: String(tradeRecord.openPrice),
  ...(tradeRecord.openReason === undefined ? {} : { openReason: tradeRecord.openReason }),
  ...(tradeRecord.screenshots === undefined ? {} : { screenshots: tradeRecord.screenshots as TradeRecordInput['screenshots'] }),
  ...(tradeRecord.reflection === undefined ? {} : { reflection: tradeRecord.reflection }),
  ...(tradeRecord.tags === undefined ? {} : { tags: tradeRecord.tags }),
  fee: String(tradeRecord.fee),
  ...(tradeRecord.closeTime === undefined ? {} : { closeTime: tradeRecord.closeTime === null ? null : parseDateTime(tradeRecord.closeTime) }),
  ...(tradeRecord.closePrice === undefined ? {} : { closePrice: tradeRecord.closePrice === null ? null : String(tradeRecord.closePrice) }),
  ...(tradeRecord.closeReason === undefined ? {} : { closeReason: tradeRecord.closeReason }),
  ...(tradeRecord.realizedPnl === undefined ? {} : { realizedPnl: tradeRecord.realizedPnl === null ? null : String(tradeRecord.realizedPnl) }),
})

const normalizeTradeRecordForUpdate = (tradeRecord: UpdateTradeRecordBody): TradeRecordUpdateInput => {
  const normalized: TradeRecordUpdateInput = {}

  if (tradeRecord.accountId !== undefined) normalized.accountId = tradeRecord.accountId
  if (tradeRecord.underlyingName !== undefined) normalized.underlyingName = tradeRecord.underlyingName
  if (tradeRecord.underlyingCode !== undefined) normalized.underlyingCode = tradeRecord.underlyingCode
  if (tradeRecord.direction !== undefined) normalized.direction = tradeRecord.direction
  if (tradeRecord.quantity !== undefined) normalized.quantity = String(tradeRecord.quantity)
  if (tradeRecord.openTime !== undefined) normalized.openTime = parseDateTime(tradeRecord.openTime)
  if (tradeRecord.openPrice !== undefined) normalized.openPrice = String(tradeRecord.openPrice)
  if (tradeRecord.openReason !== undefined) normalized.openReason = tradeRecord.openReason
  if (tradeRecord.screenshots !== undefined) normalized.screenshots = tradeRecord.screenshots as TradeRecordInput['screenshots']
  if (tradeRecord.reflection !== undefined) normalized.reflection = tradeRecord.reflection
  if (tradeRecord.tags !== undefined) normalized.tags = tradeRecord.tags
  if (tradeRecord.closeTime !== undefined) normalized.closeTime = tradeRecord.closeTime === null ? null : parseDateTime(tradeRecord.closeTime)
  if (tradeRecord.closePrice !== undefined) normalized.closePrice = tradeRecord.closePrice === null ? null : String(tradeRecord.closePrice)
  if (tradeRecord.closeReason !== undefined) normalized.closeReason = tradeRecord.closeReason
  if (tradeRecord.realizedPnl !== undefined) normalized.realizedPnl = tradeRecord.realizedPnl === null ? null : String(tradeRecord.realizedPnl)
  if (tradeRecord.fee !== undefined) normalized.fee = String(tradeRecord.fee)

  return normalized
}

const accountExists = async (database: Database, accountId: number) =>
  Boolean(await database.orm.public.TradingAccount.where({ id: accountId }).first())

export const tradeRecordService = {
  async list(database: Database, query: TradeRecordQuery) {
    let tradeRecords = database.orm.public.TradeRecord.where({ accountId: query.accountId })

    if (query.keyword) {
      const keyword = query.keyword.trim()
      tradeRecords = tradeRecords.where((tradeRecord) => or(
        tradeRecord.underlyingName.like(`%${keyword}%`),
        tradeRecord.underlyingCode.like(`%${keyword}%`),
      ))
    }
    if (query.pnl === 'PROFIT') tradeRecords = tradeRecords.where((tradeRecord) => tradeRecord.realizedPnl.gt('0'))
    if (query.pnl === 'LOSS') tradeRecords = tradeRecords.where((tradeRecord) => tradeRecord.realizedPnl.lt('0'))
    if (query.pnl === 'BREAKEVEN') tradeRecords = tradeRecords.where((tradeRecord) => tradeRecord.realizedPnl.eq('0'))
    if (query.pnl === 'UNSETTLED') tradeRecords = tradeRecords.where((tradeRecord) => tradeRecord.realizedPnl.isNull())
    if (query.openDateStart) tradeRecords = tradeRecords.where((tradeRecord) => tradeRecord.openTime.gte(parseDateStart(query.openDateStart!)))
    if (query.openDateEnd) tradeRecords = tradeRecords.where((tradeRecord) => tradeRecord.openTime.lte(parseDateEnd(query.openDateEnd!)))

    const sortBy = query.sortBy ?? 'openTime'
    const sortOrder = query.sortOrder ?? 'desc'
    if (sortBy === 'closeTime') {
      return sortOrder === 'asc'
        ? tradeRecords.orderBy((tradeRecord) => tradeRecord.closeTime.asc()).all()
        : tradeRecords.orderBy((tradeRecord) => tradeRecord.closeTime.desc()).all()
    }

    return sortOrder === 'asc'
      ? tradeRecords.orderBy((tradeRecord) => tradeRecord.openTime.asc()).all()
      : tradeRecords.orderBy((tradeRecord) => tradeRecord.openTime.desc()).all()
  },

  findById: (database: Database, id: number) =>
    database.orm.public.TradeRecord.where({ id }).first(),

  async create(database: Database, input: CreateTradeRecordBody) {
    if (!await accountExists(database, input.accountId)) return null
    return database.orm.public.TradeRecord.create(normalizeTradeRecordForCreate(input))
  },

  async createBatch(database: Database, input: CreateTradeRecordsBatchBody) {
    if (!await accountExists(database, input.accountId)) return null

    return Promise.all(input.records.map((tradeRecord) => database.orm.public.TradeRecord.create(
      normalizeTradeRecordForCreate({ ...tradeRecord, accountId: input.accountId, fee: tradeRecord.fee ?? '0' }),
    )))
  },

  async update(database: Database, id: number, input: UpdateTradeRecordBody) {
    if (input.accountId !== undefined && !await accountExists(database, input.accountId)) {
      return { status: 'account-not-found' as const }
    }

    const tradeRecord = await database.orm.public.TradeRecord.where({ id }).update(normalizeTradeRecordForUpdate(input))
    return tradeRecord ? { status: 'success' as const, tradeRecord } : { status: 'record-not-found' as const }
  },

  delete: (database: Database, id: number) =>
    database.orm.public.TradeRecord.where({ id }).delete(),
}
