#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5f510f2fa410902b2952d65c5676f270fcc52f8116ec94225380034335744d7b/contract';
import endContract from '../../snapshots/5f510f2fa410902b2952d65c5676f270fcc52f8116ec94225380034335744d7b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5fa7a6c2ccde4b9de27861143901b1531785a04426eceac726f786dc9d5846c3/contract';
import startContract from '../../snapshots/5fa7a6c2ccde4b9de27861143901b1531785a04426eceac726f786dc9d5846c3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        columns: [
          col('contract', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('snapshotAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('snapshotKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('trend30fDirection', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trend30fLifecycle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trend30fSegmentType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trend3hDirection', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trend3hLifecycle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trend3hSegmentType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_snapshotKey_contract_key',
        columns: ['snapshotKey', 'contract'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_trend3hDirection_check',
        column: 'trend3hDirection',
        values: ['UP', 'DOWN'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_trend3hSegmentType_check',
        column: 'trend3hSegmentType',
        values: ['TREND_IMPULSE', 'TREND_PULLBACK', 'RANGE_INTERNAL'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_trend3hLifecycle_check',
        column: 'trend3hLifecycle',
        values: ['DECAY', 'GROWTH', 'STRONG'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_trend30fDirection_check',
        column: 'trend30fDirection',
        values: ['UP', 'DOWN'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_trend30fSegmentType_check',
        column: 'trend30fSegmentType',
        values: ['TREND_IMPULSE', 'TREND_PULLBACK', 'RANGE_INTERNAL'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        constraint: 'futureTrendStatusSnapshot_trend30fLifecycle_check',
        column: 'trend30fLifecycle',
        values: ['DECAY', 'GROWTH', 'STRONG'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        index: 'futureTrendStatusSnapshot_contract_snapshotAt_idx_daec0ce8',
        columns: ['contract', 'snapshotAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        index: 'futureTrendStatusSnapshot_snapshotAt_idx_571a79cd',
        columns: ['snapshotAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'futureTrendStatusSnapshot',
        index: 'futureTrendStatusSnapshot_snapshotKey_idx_906430fe',
        columns: ['snapshotKey'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
