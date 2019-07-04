import program from 'commander';
import parse from 'csv-parse/lib/sync';
import fs from 'fs';

import {
  initClaims,
  injectAmends,
  injectIndices,
  injectVesting,
  initFrozenToken,
  injectAllocations,
} from './src/injection';

program
  .version('0.0.1', '-v --version')

/** Claim */

/** Scrape */
program
  .command('scrape')
  .option('--atBlock <number>', 'Scrape the state at block number')
  .option('--claims <address>', 'Supply the address of the Claims contract')
  .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .action((cmd: any) => {
    if (!cmd.claims && !cmd.frozenToken) {
      throw new Error('Must supply addresses for Claims and FrozenToken!');
    }

    const claimsContract = initClaims(cmd.claims, cmd.provider);
    const frozenTokenContract = initFrozenToken(cmd.frozenToken, cmd.provider);



  });

/** Injection */
program
  .command('inject')
  .option('--allocations <file>', 'CSV file of allocations')
  .option('--amends <file>', 'CSV file of amendments')
  .option('--indices <file>', 'CSV file of indices')
  .option('--vesting <file>', 'CSV file of vestings')
  .option('--claims <address>', 'Supply the address of the Claims contract')
  .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .action((cmd: any) => {
    const claimsContract = initClaims(cmd.claims, cmd.provider);

    if (cmd.allocations) {
      if (!cmd.frozenToken) {
        throw new Error('Must supply the address of FrozenToken if injecting allocations!');
      }
      const frozenTokenContract = initFrozenToken(cmd.frozenToken, cmd.provider);

      const csv = fs.readFileSync(cmd.allocations, { encoding: 'utf-8' });
      const parsed = parse(csv);

      let txParams: any;

      // injectAllocations(frozenTokenContract, addresses, balances, txParams);
    }

    if (cmd.amends) {
      const csv = fs.readFileSync(cmd.amends, { encoding: 'utf-8' });
      const parsed = parse(csv);
      const { originals, amends } = parsed.map((entry: any) => {
        return {
          originals: entry[0],
          amends: entry[1],
        };
      });

      let txParams: any;

      injectAmends(claimsContract, originals, amends, txParams);
    }

    if (cmd.indices) {
      const csv = fs.readFileSync(cmd.indices, { encoding: 'utf-8' });
      const parsed = parse(csv);

      let txParams: any;

      injectIndices(claimsContract, parsed, txParams);
    }

    if (cmd.vesting) {
      const csv = fs.readFileSync(cmd.vesting, { encoding: 'utf-8' });
      const parsed = parse(csv);

      let txParams: any;

      injectVesting(claimsContract, parsed, txParams);
    }
  })

program.parse(process.argv);
