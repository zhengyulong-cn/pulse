#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3a760638918b848462a7ef705dfee53d5a46f76d5501033d24312511e4d9c11e/contract';
import startContract from '../../snapshots/3a760638918b848462a7ef705dfee53d5a46f76d5501033d24312511e4d9c11e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/85fb6d566d342d4699e8c3b430bac6dee45256e59325066c86e471117c8db8f2/contract';
import endContract from '../../snapshots/85fb6d566d342d4699e8c3b430bac6dee45256e59325066c86e471117c8db8f2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tradeRecord',
        column: col('closeReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tradeRecord',
        column: col('openReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
