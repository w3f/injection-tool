import program from 'commander';

import { claimsDeploy, vesting, injectSaleAmount, assignIndices, increaseVesting, dotAllocations, bondAndValidate, forceTransfers, makeTransfers } from './actions';

import Package from '../package.json';

const errorCatcher = async (wrappedFunction: any) => {
  try {
     await wrappedFunction;
  } catch (error) { 
    console.error(error); 
    process.exit(1);
  } finally {
    console.log('done');
    process.exit(0);
  }
}

program
  .version(Package.version, '-v --version')

/** Polkadot and Kusama */
// program
//   .command('force-transfers')
//   .option('--csv <filepath>', 'A CSV file formatted <dest>,<amount> on each line.')
//   .option('--source <source>', 'The address from which funds will be force transferred from.')
//   .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
//   .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
//   .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
//   .option('--suri <suri>', 'Pass in the suri for the Sudo key.')
//   .option('--jsonPath <pathToKeystore>', 'Pass in the path to the JSON keystore for the Sudo key.')
//   .action((cmd) => errorCatcher(forceTransfers(cmd)));

// program
//   .command('transfer')
//   .option('--csv <file>', 'A CSV file formatted <destination>,<amount> on each line.')
//   .option('--cryptoType <type>', 'One of ed25519 or sr25519, depending on the crypto used to derive your keys.', 'sr25519')
//   .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect.', 'wss://cc3-4.kusama.network')
//   .option('--suri <suri>', 'The secret URI for the signer key.')
//   .action((cmd) => errorCatcher(makeTransfers(cmd)));

// program
//   .command('bond-and-validate')
//   .option('--csvController <filepath>')
//   .option('--csvStash <filepath>')
//   .option('--csvSessionKeys <filepath>')
//   .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
//   .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
//   .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
//   .action((cmd) => errorCatcher(bondAndValidate(cmd)));

/* Ethereum */
program
  .command('eth:dot-allocations')
  .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
  .option('--frozenToken <address>', 'The address of the Frozen Token', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '50000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(dotAllocations(cmd)));

program
  .command('eth:vesting')
  .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
  .option('--claims <address>', 'The address of the Claims contract.', '0x9a1B58399EdEBd0606420045fEa0347c24fB86c2')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(vesting(cmd)));

program
  .command('eth:inject-second-sale')
  .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
  .option('--claims <address>', 'The address of the Claims contract.', '0x9a1B58399EdEBd0606420045fEa0347c24fB86c2')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(injectSaleAmount(cmd)));

program
  .command('eth:increase-vesting')
  .option('--csv <filepath>', 'A CSV file formatted <address>,<amount> on each line.')
  .option('--claims <address>', 'The address of the Claims contract.', '0x9a1B58399EdEBd0606420045fEa0347c24fB86c2')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(increaseVesting(cmd)));

program
  .command('eth:claims-deploy')
  .option('--dotIndicator <address>', 'Address of the DOT indicator contract.', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
  .option('--owner <address>', 'Address of the owner of the Claims contract.')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per unit of gas.', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(claimsDeploy(cmd)));

program
  .command('eth:indices')
  .option('--csv <filepath>', 'A CSV file formatted <address> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '29500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('--start <number>', 'The index of the list to startt on.', 0)
  .action((cmd) => errorCatcher(assignIndices(cmd)));

program.parse(process.argv);
