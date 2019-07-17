import program from 'commander';
import parse from 'csv-parse/lib/sync';
import fs from 'fs';

import {
  convertFromDecimalString,
  initClaims,
  injectAmends,
  injectIndices,
  injectVesting,
  initFrozenToken,
  injectAllocations,
  injectClaims,
} from './src/injection';
import { getAllTokenHolders, getFullDataFromState, writeGenesis } from './src/scrape';
import Web3 from 'web3';

const Template = require('./template.json');

program
  .version('0.0.1', '-v --version')

/** Claim */

/** Get all Frozen Token hodlers */
program
  .command('hodlers')
  .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract')
  .option('--output <file>', 'Supply a custom output filename', 'holders.csv')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .action(async (cmd: any) => {
    if (!cmd.frozenToken) { throw new Error('Must supply the address of the FrozenToken contract!'); }

    const frozenTokenContract = initFrozenToken(cmd.frozenToken, cmd.provider);

    process.stdout.write('Getting all hodlers of FrozenToken...');
    const hodlers = await getAllTokenHolders(frozenTokenContract);
    console.log('done');

    process.stdout.write(`Writing to ${cmd.output}...`);
    fs.writeFileSync(cmd.output, Array.from(hodlers).join('\n'));
    console.log('done');
  });

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
  .option('--claimFile <file>', 'CSV file for claims')
  .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
  .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
  .option('--from <string>', 'Supply the sender of the transaction')
  .option('--gasPrice <number>', 'Supply the gasPrice in wei of the transaction (default: 29500000000)', '29500000000')
  .option('--gas <amount>', 'Supply the amount of gas to send with the transaction (default: 500000)', '3000000')
  .option('--password <string>', 'Supply your password for personal rpc methods')
  .action(async (cmd: any) => {
    try {
      if (!cmd.from) {
        throw new Error('Must specify which address the transaction is sending from');
      }

      const claimsContract = initClaims(cmd.claims, cmd.provider);

      const w3 = new Web3(new Web3.providers.WebsocketProvider(cmd.provider));

      if (cmd.claimFile) {
        const csv = fs.readFileSync(cmd.claimFile, { encoding: 'utf-8' });
        const parsed = parse(csv);

        let eths: any[] = [];
        let pubKeys: any[] = [];
        parsed.forEach((entry: any) => {
          eths.push(entry[0]);
          pubKeys.push(entry[1]);
        })

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectClaims(claimsContract, eths, pubKeys, txParams, w3, cmd.password);
      }


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
          balances.push(convertFromDecimalString(entry[1]));
        });

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectAllocations(frozenTokenContract, addresses, balances, txParams, w3, cmd.password);
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

        await injectAmends(claimsContract, originals, amends, txParams, w3, cmd.password);
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

        await injectIndices(claimsContract, input, txParams, w3, cmd.password);
      }

      if (cmd.vesting) {
        const csv = fs.readFileSync(cmd.vesting, { encoding: 'utf-8' });
        const parsed = parse(csv);

        let addresses: any[] = [];
        let amounts: any[] = [];
        parsed.forEach((entry: any) => {
          addresses.push(entry[0]);
          amounts.push(convertFromDecimalString(entry[1]));
        })

        let txParams: any = {
          from: cmd.from,
          gasPrice: cmd.gasPrice,
          gas: cmd.gas,
        };

        await injectVesting(claimsContract, addresses, amounts, txParams, w3, cmd.password);
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })

program.parse(process.argv);
