#!/usr/bin/env ts-node

import program from 'commander';

import { bondAndValidate, forceTransfers, makeTransfers } from './actions';

import Package from '../package.json';

const errorCatcher = (wrappedFunction: any) => {
  try {
    wrappedFunction;
  } catch (error) { console.error(error); }
}

program
  .version(Package.version, '-v --version')

/** Polkadot and Kusama */
program
  .command('force-transfers')
  .option('--csv <filepath>', 'A CSV file formatted <dest>,<amount> on each line.')
  .option('--source <source>', 'The address from which funds will be force transferred from.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .option('--suri <suri>', 'Pass in the suri for the Sudo key.')
  .option('--jsonPath <pathToKeystore>', 'Pass in the path to the JSON keystore for the Sudo key.')
  .action((cmd) => errorCatcher(forceTransfers(cmd)));

program
  .command('transfer')
  .option('--csv <file>', 'A CSV file formatted <destination>,<amount> on each line.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519, depending on the crypto used to derive your keys.', 'sr25519')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect.', 'wss://cc3-4.kusama.network')
  .option('--suri <suri>', 'The secret URI for the signer key.')
  .action((cmd) => errorCatcher(makeTransfers(cmd)));

program
  .command('bond-and-validate')
  .option('--csvController <filepath>')
  .option('--csvStash <filepath>')
  .option('--csvSessionKeys <filepath>')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .action((cmd) => errorCatcher(bondAndValidate(cmd)));

/* Ethereum */
// program
//   .command('eth:dot-allocations')
//   .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
//   .option('--frozenToken <address>', 'The address of the Frozen Token', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
//   .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
//   .option('--from <address>', 'Sender of the transactions.')
//   .option('--gas <amount>', 'Amount of gas to send.', '50000')
//   .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
//   .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
//   .action(actions.dotAllocations);

// program
//   .command('eth:vesting')
//   .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
//   .option('--claims <address>', 'The address of the Claims contract.', '0x9a1B58399EdEBd0606420045fEa0347c24fB86c2')
//   .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
//   .option('--from <address>', 'Sender of the transactions.')
//   .option('--gas <amount>', 'Amount of gas to send.', '2000000')
//   .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
//   .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
//   .action(actions.vesting)

program.parse(process.argv);
