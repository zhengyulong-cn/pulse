#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6715453c65fca093a7b6fe92175e61dcc214a3fc140df5f44edd5291c135849a/contract';
import startContract from '../../snapshots/6715453c65fca093a7b6fe92175e61dcc214a3fc140df5f44edd5291c135849a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c76b6f6869c30fce0cd60d4b2022b943ebd5a2209dbe9393b63359fe0515930b/contract';
import endContract from '../../snapshots/c76b6f6869c30fce0cd60d4b2022b943ebd5a2209dbe9393b63359fe0515930b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'watchlist',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'watchlistItem',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('instrumentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('watchlistId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'watchlistItem',
        constraint: 'watchlistItem_watchlistId_instrumentId_key',
        columns: ['watchlistId', 'instrumentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'watchlist',
        index: 'watchlist_sortOrder_idx_ebf2eac2',
        columns: ['sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'watchlistItem',
        index: 'watchlistItem_watchlistId_idx_bfe7654a',
        columns: ['watchlistId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'watchlistItem',
        index: 'watchlistItem_watchlistId_sortOrder_idx_04bb0458',
        columns: ['watchlistId', 'sortOrder'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'watchlistItem',
        foreignKey: {
          name: 'watchlistItem_watchlistId_fkey',
          columns: ['watchlistId'],
          references: { schema: 'public', table: 'watchlist', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
