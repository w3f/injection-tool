import program from 'commander';
import parse from 'csv-parse/lib/sync';
import fs from 'fs';

import {
  initClaims,
  injectAmends,
  injectIndices,
  injectVesting,
} from './src/injection';

program
  .version('0.0.1', '-v --version')

/** Scrape */
program
  .command('scrape')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .action((cmd: any) => {
    console.log(cmd.provider);
  });

/** Injection */
program
  .command('inject')
  .option('--amends <file>', 'CSV file of amendments')
  .option('--indices <file>', 'CSV file of indices')
  .option('--vesting <file>', 'CSV file of vestings')
  .option('--claims <address>', 'Supply the address of the Claims contract')
  .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .action((cmd: any) => {
    const claimsContract = initClaims(cmd.claims, cmd.provider);

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

    }


  })

program.parse(process.argv);
