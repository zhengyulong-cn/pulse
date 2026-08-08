#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/44eba808f40796b1125fccaf8ab16e72564e6f9944b4f2ba86a3fcb4e05773cc/contract';
import endContract from '../../snapshots/44eba808f40796b1125fccaf8ab16e72564e6f9944b4f2ba86a3fcb4e05773cc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c49396a99b32a72a6eaa24363828af5a5c7af8686c527a26182cfe4e045373be/contract';
import startContract from '../../snapshots/c49396a99b32a72a6eaa24363828af5a5c7af8686c527a26182cfe4e045373be/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'tradeRecord', column: 'marketRegion' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'tradeRecord',
        constraint: 'tradeRecord_marketRegion_check',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
