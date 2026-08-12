#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3a760638918b848462a7ef705dfee53d5a46f76d5501033d24312511e4d9c11e/contract';
import endContract from '../../snapshots/3a760638918b848462a7ef705dfee53d5a46f76d5501033d24312511e4d9c11e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c76b6f6869c30fce0cd60d4b2022b943ebd5a2209dbe9393b63359fe0515930b/contract';
import startContract from '../../snapshots/c76b6f6869c30fce0cd60d4b2022b943ebd5a2209dbe9393b63359fe0515930b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'pineScript',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'pineScript',
        constraint: 'pineScript_type_check',
        column: 'type',
        values: ['INDICATOR', 'STRATEGY'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pineScript',
        index: 'pineScript_type_idx_b6b604ea',
        columns: ['type'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
