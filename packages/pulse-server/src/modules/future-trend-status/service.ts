import { randomUUID } from 'node:crypto'

import type { db } from '../../prisma/db.js'
import type { FieldInputTypes, FieldOutputTypes } from '../../prisma/contract.js'

type Database = typeof db
type FutureTrendStatusSnapshot = FieldOutputTypes['public']['FutureTrendStatusSnapshot']

export type FutureTrendDirection = FieldInputTypes['public']['FutureTrendStatusSnapshot']['trend3hDirection']
export type FutureTrendSegmentType = FieldInputTypes['public']['FutureTrendStatusSnapshot']['trend3hSegmentType']
export type FutureTrendLifecycle = FieldInputTypes['public']['FutureTrendStatusSnapshot']['trend3hLifecycle']

export type FutureTrendStatusInput = {
  contract: string
  trend3hDirection?: FutureTrendDirection
  trend3hSegmentType?: FutureTrendSegmentType
  trend3hLifecycle?: FutureTrendLifecycle
  trend30fDirection?: FutureTrendDirection
  trend30fSegmentType?: FutureTrendSegmentType
  trend30fLifecycle?: FutureTrendLifecycle
}

export type FutureTrendStatusSnapshotGroup = {
  snapshotKey: string
  snapshotAt: Date
  items: FutureTrendStatusSnapshot[]
}

const toSnapshotGroup = (items: FutureTrendStatusSnapshot[]): FutureTrendStatusSnapshotGroup | null => {
  const firstItem = items[0]
  return firstItem ? {
    snapshotKey: firstItem.snapshotKey,
    snapshotAt: firstItem.snapshotAt,
    items,
  } : null
}

export const futureTrendStatusService = {
  async latest(database: Database): Promise<FutureTrendStatusSnapshotGroup | null> {
    const latestItem = await database.orm.public.FutureTrendStatusSnapshot
      .orderBy((item) => item.snapshotAt.desc())
      .orderBy((item) => item.id.desc())
      .first()
    if (!latestItem) return null

    const items = await database.orm.public.FutureTrendStatusSnapshot
      .where({ snapshotKey: latestItem.snapshotKey })
      .orderBy((item) => item.contract.asc())
      .all()
    return toSnapshotGroup(items)
  },

  async list(database: Database): Promise<FutureTrendStatusSnapshotGroup[]> {
    const items = await database.orm.public.FutureTrendStatusSnapshot
      .orderBy((item) => item.snapshotAt.desc())
      .orderBy((item) => item.id.desc())
      .all()
    const groups = new Map<string, FutureTrendStatusSnapshotGroup>()

    for (const item of items) {
      const group = groups.get(item.snapshotKey)
      if (group) group.items.push(item)
      else groups.set(item.snapshotKey, { snapshotKey: item.snapshotKey, snapshotAt: item.snapshotAt, items: [item] })
    }
    return [...groups.values()]
  },

  async get(database: Database, snapshotKey: string): Promise<FutureTrendStatusSnapshotGroup | null> {
    const items = await database.orm.public.FutureTrendStatusSnapshot
      .where({ snapshotKey })
      .orderBy((item) => item.contract.asc())
      .all()
    return toSnapshotGroup(items)
  },

  async create(database: Database, inputs: FutureTrendStatusInput[]): Promise<FutureTrendStatusSnapshotGroup> {
    const snapshotKey = randomUUID()
    const snapshotAt = new Date()
    const items = await Promise.all(inputs.map((input) => database.orm.public.FutureTrendStatusSnapshot.create({
      snapshotKey,
      snapshotAt,
      contract: input.contract.trim(),
      trend3hDirection: input.trend3hDirection ?? null,
      trend3hSegmentType: input.trend3hSegmentType ?? null,
      trend3hLifecycle: input.trend3hLifecycle ?? null,
      trend30fDirection: input.trend30fDirection ?? null,
      trend30fSegmentType: input.trend30fSegmentType ?? null,
      trend30fLifecycle: input.trend30fLifecycle ?? null,
    })))
    return { snapshotKey, snapshotAt, items }
  },
}
