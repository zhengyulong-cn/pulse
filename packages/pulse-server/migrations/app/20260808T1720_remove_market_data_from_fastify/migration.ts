#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/44eba808f40796b1125fccaf8ab16e72564e6f9944b4f2ba86a3fcb4e05773cc/contract';
import startContract from '../../snapshots/44eba808f40796b1125fccaf8ab16e72564e6f9944b4f2ba86a3fcb4e05773cc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6715453c65fca093a7b6fe92175e61dcc214a3fc140df5f44edd5291c135849a/contract';
import endContract from '../../snapshots/6715453c65fca093a7b6fe92175e61dcc214a3fc140df5f44edd5291c135849a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropTable({ schema: 'public', table: 'tradingExchange' })];
  }
}

MigrationCLI.run(import.meta.url, M);
