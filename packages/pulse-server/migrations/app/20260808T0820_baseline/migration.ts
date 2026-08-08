#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c49396a99b32a72a6eaa24363828af5a5c7af8686c527a26182cfe4e045373be/contract';
import endContract from '../../snapshots/c49396a99b32a72a6eaa24363828af5a5c7af8686c527a26182cfe4e045373be/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'tradeRecord',
        columns: [
          col('accountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('closePrice', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('closeTime', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('extraJson', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('fee', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('marketRegion', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openPrice', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('openTime', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('realizedPnl', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('underlyingCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('underlyingName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tradingAccount',
        columns: [
          col('account', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('currency', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tradingExchange',
        columns: [
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('countryCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('currency', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('englishName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('mic', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tradingAccount',
        constraint: 'tradingAccount_account_key',
        columns: ['account'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tradingExchange',
        constraint: 'tradingExchange_mic_key',
        columns: ['mic'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tradeRecord',
        constraint: 'tradeRecord_marketRegion_check',
        column: 'marketRegion',
        values: [
          'A_SHARE',
          'HONG_KONG',
          'MAINLAND_FUTURES',
          'INTERNATIONAL_FUTURES',
          'FOREX',
          'CRYPTO',
        ],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'tradeRecord',
        constraint: 'tradeRecord_direction_check',
        column: 'direction',
        values: ['LONG', 'SHORT'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tradeRecord',
        index: 'tradeRecord_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tradeRecord',
        index: 'tradeRecord_openTime_idx_459da85f',
        columns: ['openTime'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tradeRecord',
        foreignKey: {
          name: 'tradeRecord_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'tradingAccount', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
