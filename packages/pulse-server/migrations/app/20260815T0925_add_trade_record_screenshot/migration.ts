#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/85fb6d566d342d4699e8c3b430bac6dee45256e59325066c86e471117c8db8f2/contract';
import startContract from '../../snapshots/85fb6d566d342d4699e8c3b430bac6dee45256e59325066c86e471117c8db8f2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cd4a4d519c29972c91c5c3e86f9c1a51758de97e134b99801cb922d77d811eb9/contract';
import endContract from '../../snapshots/cd4a4d519c29972c91c5c3e86f9c1a51758de97e134b99801cb922d77d811eb9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tradeRecord',
        column: col('screenshot', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
