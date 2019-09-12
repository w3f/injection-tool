import program from 'commander';

import { forceTransfers } from './src/forceTransfers';
import { injectClaims } from './src/injectClaims';
import { sudoAs } from './src/sudoAs';
import { dotAllocations } from './src/dotAllocations';

program
  .version('0.0.1', '-v --version')

/* Polkadot / Kusama */
program
  .command('force-transfers')
  .option('--csv <filepath>', 'A CSV file formatted <dest>,<amount> on each line.')
  .option('--source <source>', 'The address from which funds will be force transferred from.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--endpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .option('--suri <suri>', 'Pass in the suri for the Sudo key.')
  .option('--jsonPath <pathToKeystore>', 'Pass in the path to the JSON keystore for the Sudo key.')
  .action(forceTransfers);

program
  .command('inject-claims')
  .option('--csv <filepath>', 'A CSV file formatted <dest>,<signature> on each line.')
  .option('--endpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .action(injectClaims);

program
  .command('sudo-as')
  .option('--csv <filepath>', 'A CSV file formatted <whom>,<methodObject> on each line.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--endpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .option('--suri <suri>', 'Pass in the suri for the Sudo key.')
  .option('--jsonPath <pathToKeystore>', 'Pass in the path to the JSON keystore for the Sudo key.')
  .action(sudoAs)

/* Ethereum */
program
  .command('eth:dot-allocations')
  .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
  .option('--frozenToken <address>', 'The address of the Frozen Token', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8545')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '50000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action(dotAllocations);

  // program
//   .command('inject')
//   .option('--allocations <file>', 'CSV file of allocations')
//   .option('--amends <file>', 'CSV file of amendments')
//   .option('--indices <file>', 'CSV file of indices')
//   .option('--vesting <file>', 'CSV file of vestings')
//   .option('--claims <address>', 'Supply the address of the Claims contract')
//   .option('--claimFile <file>', 'CSV file for claims')
//   .option('--frozenToken <address>', 'Supply the address of the FrozenToken contract', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
//   .option('--provider <value>', 'Supply a custom http provider', 'http://localhost:8545')
//   .option('--from <string>', 'Supply the sender of the transaction')
//   .option('--gasPrice <number>', 'Supply the gasPrice in wei of the transaction (default: 29500000000)', '29500000000')
//   .option('--gas <amount>', 'Supply the amount of gas to send with the transaction (default: 500000)', '3000000')
//   .option('--password <string>', 'Supply your password for personal rpc methods')
//   .action(async (cmd: any) => {
//     try {
//       if (!cmd.from) {
//         throw new Error('Must specify which address the transaction is sending from');
//       }

//       const claimsContract = initClaims(cmd.claims, cmd.provider);

//       const w3 = new Web3(new Web3.providers.WebsocketProvider(cmd.provider));

//       if (cmd.claimFile) {
//         const csv = fs.readFileSync(cmd.claimFile, { encoding: 'utf-8' });
//         const parsed = parse(csv);

//         let eths: any[] = [];
//         let pubKeys: any[] = [];
//         parsed.forEach((entry: any) => {
//           eths.push(entry[0]);
//           pubKeys.push(entry[1]);
//         })

//         let txParams: any = {
//           from: cmd.from,
//           gasPrice: cmd.gasPrice,
//           gas: cmd.gas,
//         };

//         await injectClaims(claimsContract, eths, pubKeys, txParams, w3, cmd.password);
//       }


//       if (cmd.allocations) {
//         if (!cmd.frozenToken) {
//           throw new Error('Must supply the address of FrozenToken if injecting allocations!');
//         }
//         const frozenTokenContract = initFrozenToken(cmd.frozenToken, cmd.provider);

//         const csv = fs.readFileSync(cmd.allocations, { encoding: 'utf-8' });
//         const parsed = parse(csv);

//         let addresses: any[] = [];
//         let balances: any[] = [];
//         parsed.forEach((entry: any) => {
//           addresses.push(entry[0]);
//           balances.push(convertFromDecimalString(entry[1]));
//         });

//         let txParams: any = {
//           from: cmd.from,
//           gasPrice: cmd.gasPrice,
//           gas: cmd.gas,
//         };

//         await injectAllocations(frozenTokenContract, addresses, balances, txParams, w3, cmd.password);
//       }

//       if (cmd.amends) {
//         const csv = fs.readFileSync(cmd.amends, { encoding: 'utf-8' });
//         const parsed = parse(csv);
        
//         let originals: any[] = [];
//         let amends: any[] = [];
//         parsed.forEach((entry: any) => {
//           originals.push(entry[0]);
//           amends.push(entry[1]);
//         })

//         let txParams: any = {
//           from: cmd.from,
//           gasPrice: cmd.gasPrice,
//           gas: cmd.gas,
//         };

//         await injectAmends(claimsContract, originals, amends, txParams, w3, cmd.password);
//       }

//       if (cmd.indices) {
//         const csv = fs.readFileSync(cmd.indices, { encoding: 'utf-8' });
//         const parsed = parse(csv);

//         const sanitize = (input: any) => {
//           input = input[0]
//           return input.filter(Boolean)
//         }

//         const input = sanitize(parsed);

//         let txParams: any = {
//           from: cmd.from,
//           gasPrice: cmd.gasPrice,
//           gas: cmd.gas,
//         };

//         await injectIndices(claimsContract, input, txParams, w3, cmd.password);
//       }

//       if (cmd.vesting) {
//         const csv = fs.readFileSync(cmd.vesting, { encoding: 'utf-8' });
//         const parsed = parse(csv);

//         let addresses: any[] = [];
//         let amounts: any[] = [];
//         parsed.forEach((entry: any) => {
//           addresses.push(entry[0]);
//           amounts.push(convertFromDecimalString(entry[1]));
//         })

//         let txParams: any = {
//           from: cmd.from,
//           gasPrice: cmd.gasPrice,
//           gas: cmd.gas,
//         };

//         await injectVesting(claimsContract, addresses, amounts, txParams, w3, cmd.password);
//       }
      
//       process.exit(0);
//     } catch (err) {
//       console.error(err);
//       process.exit(1);
//     }
//   })

program.parse(process.argv);
