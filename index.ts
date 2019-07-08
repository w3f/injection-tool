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
import { getFullDataFromState, writeGenesis } from './src/scrape';

const Template = require('./template.json');

program
  .version('0.0.1', '-v --version')

/** Claim */

/** Scrape */
program
  .command('scrape')
  .option('--atBlock <number>', 'Scrape the state at block number')
  .option('--claims <address>', 'Supply the address of the Claims contract')
  .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract')
  .option('--output <file>', 'Supply a custom output filename', 'kusama.json')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .action(async (cmd: any) => {
    if (!cmd.claims && !cmd.frozenToken) {
      throw new Error('Must supply addresses for Claims and FrozenToken!');
    }

    process.stdout.write('Initializing contracts...')
    const claimsContract = initClaims(cmd.claims, cmd.provider);
    const frozenTokenContract = initFrozenToken(cmd.frozenToken, cmd.provider);
    console.log(' done');

    process.stdout.write('Scraping state from Ethereum...')
    const { memory, stillToClaim } = await getFullDataFromState(claimsContract, frozenTokenContract);
    console.log(' done');

    process.stdout.write('Writing genesis chain specification...')
    const genesis = writeGenesis(memory, Template, stillToClaim);
    fs.writeFileSync(
      cmd.output,
      JSON.stringify(
        genesis, null, 2
      )
    );
    console.log(' done');
    console.log('Chain specification written to ', cmd.output);
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
  .option('--from <sender>', 'Supply the sender of the transaction')
  .option('--gasPrice <number>', 'Supply the gasPrice in wei of the transaction (default: 200000000)', '2000000000')
  .option('--gas <amount>', 'Supply the amount of gas to send with the transaction (default: 500000)', '500000')
  .action(async (cmd: any) => {
    try {
      if (!cmd.from) {
        throw new Error('Must specify which address the transaction is sending from');
      }

      const claimsContract = initClaims(cmd.claims, cmd.provider);

      if (cmd.allocations) {
        if (!cmd.frozenToken) {
          throw new Error('Must supply the address of FrozenToken if injecting allocations!');
        }
        const frozenTokenContract = initFrozenToken(cmd.frozenToken, cmd.provider);

        const csv = fs.readFileSync(cmd.allocations, { encoding: 'utf-8' });
        const parsed = parse(csv);

        let addresses: any[] = [];
        let balances: any[] = [];
        parsed.forEach((entry: any) => {
          addresses.push(entry[0]);
          balances.push(entry[1]);
        });

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectAllocations(frozenTokenContract, addresses, balances, txParams);
      }

      if (cmd.amends) {
        const csv = fs.readFileSync(cmd.amends, { encoding: 'utf-8' });
        const parsed = parse(csv);
        
        let originals: any[] = [];
        let amends: any[] = [];
        parsed.forEach((entry: any) => {
          originals.push(entry[0]);
          amends.push(entry[1]);
        })

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectAmends(claimsContract, originals, amends, txParams);
      }

      if (cmd.indices) {
        const csv = fs.readFileSync(cmd.indices, { encoding: 'utf-8' });
        const parsed = parse(csv);

        const sanitize = (input: any) => {
          input = input[0]
          return input.filter(Boolean)
        }

        const input = sanitize(parsed);

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectIndices(claimsContract, input, txParams);
      }

      if (cmd.vesting) {
        const csv = fs.readFileSync(cmd.vesting, { encoding: 'utf-8' });
        const parsed = parse(csv);

        const sanitize = (input: any) => {
          input = input[0]
          return input.filter(Boolean)
        }

        const input = sanitize(parsed);

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectVesting(claimsContract, input, txParams);
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })

program.parse(process.argv);
