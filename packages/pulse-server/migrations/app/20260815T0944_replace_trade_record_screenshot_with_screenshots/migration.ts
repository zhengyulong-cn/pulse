#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5fa7a6c2ccde4b9de27861143901b1531785a04426eceac726f786dc9d5846c3/contract';
import endContract from '../../snapshots/5fa7a6c2ccde4b9de27861143901b1531785a04426eceac726f786dc9d5846c3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cd4a4d519c29972c91c5c3e86f9c1a51758de97e134b99801cb922d77d811eb9/contract';
import startContract from '../../snapshots/cd4a4d519c29972c91c5c3e86f9c1a51758de97e134b99801cb922d77d811eb9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'tradeRecord', column: 'screenshot' }),
      this.addColumn({
        schema: 'public',
        table: 'tradeRecord',
        column: col('screenshots', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
