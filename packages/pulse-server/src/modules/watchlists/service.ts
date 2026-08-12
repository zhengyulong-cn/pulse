import type { db } from '../../prisma/db.js'

type Database = typeof db

export type CreateWatchlistBody = {
  name: string
  sortOrder?: number
}

export type UpdateWatchlistBody = Partial<CreateWatchlistBody>

export type CreateWatchlistItemBody = {
  instrumentId: number
  sortOrder?: number
}

export type UpdateWatchlistItemBody = Partial<CreateWatchlistItemBody>

const listItems = (database: Database, watchlistId: number) =>
  database.orm.public.WatchlistItem.where({ watchlistId })
    .orderBy((item) => item.sortOrder.asc())
    .orderBy((item) => item.id.asc())
    .all()

const getWatchlist = (database: Database, watchlistId: number) =>
  database.orm.public.Watchlist.where({ id: watchlistId }).first()

export const watchlistService = {
  async list(database: Database) {
    const watchlists = await database.orm.public.Watchlist.orderBy((watchlist) => watchlist.sortOrder.asc())
      .orderBy((watchlist) => watchlist.id.asc())
      .all()
    return Promise.all(watchlists.map(async (watchlist) => ({
      ...watchlist,
      items: await listItems(database, watchlist.id),
    })))
  },

  async create(database: Database, input: CreateWatchlistBody) {
    const watchlist = await database.orm.public.Watchlist.create({
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? 0,
    })
    return { ...watchlist, items: [] }
  },

  async update(database: Database, watchlistId: number, input: UpdateWatchlistBody) {
    const watchlist = await database.orm.public.Watchlist.where({ id: watchlistId }).update({
      ...(input.name === undefined ? {} : { name: input.name.trim() }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    })
    return watchlist ? { ...watchlist, items: await listItems(database, watchlist.id) } : null
  },

  async delete(database: Database, watchlistId: number) {
    const watchlist = await getWatchlist(database, watchlistId)
    if (!watchlist) return null

    const items = await listItems(database, watchlistId)
    await Promise.all(items.map((item) => database.orm.public.WatchlistItem.where({ id: item.id }).delete()))
    return database.orm.public.Watchlist.where({ id: watchlistId }).delete()
  },

  async createItem(database: Database, watchlistId: number, input: CreateWatchlistItemBody) {
    if (!await getWatchlist(database, watchlistId)) return { status: 'watchlist-not-found' as const }
    const duplicate = await database.orm.public.WatchlistItem.where({ watchlistId, instrumentId: input.instrumentId }).first()
    if (duplicate) return { status: 'duplicate' as const }

    const item = await database.orm.public.WatchlistItem.create({
      watchlistId,
      instrumentId: input.instrumentId,
      sortOrder: input.sortOrder ?? 0,
    })
    return { status: 'success' as const, item }
  },

  async updateItem(database: Database, watchlistId: number, itemId: number, input: UpdateWatchlistItemBody) {
    const item = await database.orm.public.WatchlistItem.where({ id: itemId, watchlistId }).first()
    if (!item) return { status: 'item-not-found' as const }

    if (input.instrumentId !== undefined && input.instrumentId !== item.instrumentId) {
      const duplicate = await database.orm.public.WatchlistItem.where({ watchlistId, instrumentId: input.instrumentId }).first()
      if (duplicate) return { status: 'duplicate' as const }
    }

    const updatedItem = await database.orm.public.WatchlistItem.where({ id: itemId, watchlistId }).update({
      ...(input.instrumentId === undefined ? {} : { instrumentId: input.instrumentId }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    })
    return { status: 'success' as const, item: updatedItem! }
  },

  async deleteItem(database: Database, watchlistId: number, itemId: number) {
    const item = await database.orm.public.WatchlistItem.where({ id: itemId, watchlistId }).first()
    if (!item) return null
    return database.orm.public.WatchlistItem.where({ id: itemId, watchlistId }).delete()
  },
}
