import program, { Command } from 'commander';

import {
  broadcast,
  claimsDeploy,
  vesting,
  injectSaleAmount,
  assignIndices,
  increaseVesting, 
  dotAllocations,
  bondAndValidate,
  forceTransfers,
  makeTransfers,
  frozenTokenDeploy,
  makeAmendments,
  doClaims,
  validateAddress,
  checkAmount,
  querySecondSaleBalance,
  sudoAs,
} from './actions';

import Package from '../package.json';

const prompt = (question: string) => {
  var stdin = process.stdin,
      stdout = process.stdout;

  stdin.resume();
  stdout.write(question);

  return new Promise(resolve => {
    stdin.once('data', function (data) {
      const confirm = data.toString('utf-8').toLowerCase().trim();
      if (confirm == 'y' || confirm == 'yes') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

const confirmation = async (cmd: Command) => {
  const confirmed = await prompt(`Inject ${cmd.csv}? (y/N)\n`);
  if (!confirmed) {
    console.log('Did not confirm! Exiting...');
    process.exit(1);
  }
}

const errorCatcher = async (cmd: any, wrappedFunction: any) => {
  console.log(`Executing ${cmd.name().toUpperCase()}\n`);
  try {
    if (cmd.csv && cmd.csv.indexOf(',')) {
      const files = cmd.csv.split(',');
      for (const file of files) {
        cmd.csv = file;
        if (!cmd.noConfirm) {
          await confirmation(cmd);
        }
        await wrappedFunction(cmd);
      }
    } else {
      await wrappedFunction(cmd);
    }
  } catch (error) { 
    console.error(error); 
    process.exit(1);
  } finally {
    console.log('Finished without error. Exiting...');
    process.exit(0);
  }
}

program
  .version(Package.version, '-v --version')

/** Polkadot and Kusama */
program
  .command('force-transfers')
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <dest>,<amount> on each line.')
  .option('--source <source>', 'The address from which funds will be force transferred from.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .option('--suri <suri>', 'Pass in the suri for the Sudo key.')
  .option('--jsonPath <pathToKeystore>', 'Pass in the path to the JSON keystore for the Sudo key.')
  .action((cmd) => errorCatcher(cmd, forceTransfers));

program
  .command('transfer')
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <destination>,<amount> on each line.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519, depending on the crypto used to derive your keys.', 'sr25519')
  .option('--dry', 'Runs in dry run mode.')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect.', 'wss://kusama-rpc.polkadot.io/')
  .option('--suri <suri>', 'The secret URI for the signer key.')
  .option('--types <json>', 'A JSON configuration of types for the node.', '{}')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, makeTransfers));

program
  .command('bond-and-validate')
  .option('--csvController <filepath>')
  .option('--csvStash <filepath>')
  .option('--csvSessionKeys <filepath>')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .action((cmd) => errorCatcher(cmd, bondAndValidate));

program
  .command('sudo-as')
  .option('--csv <filepath>')
  .option('--prevHashes <filepath>', 'A file of previous hashes of the extrinsics.')
  .option('--cryptoType <type>', 'One of ed25519 or sr25519.', 'sr25519')
  .option('--wsEndpoint <url>', 'The endpoint of the WebSockets to connect with.', 'wss://canary-4.kusama.network')
  .option('--mnemonic <string>', 'Pass in the mnemonic for the Sudo key.')
  .option('--suri <suri>', 'The secret URI for the signer key.')
  .option('--types <json>', 'A JSON configuration of types for the node.', '{}')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, sudoAs));

/* Ethereum */
program
  .command('eth:amend')
  .description('Make amendments on the Claims contract.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <original>,<amended> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('--start <number>', 'The index of the list to startt on.', '0')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, makeAmendments));

program
  .command('eth:indices')
  .description('Assign a batch of indices to frozen token holders.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <address> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '3000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '5000000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('--start <number>', 'The index of the list to startt on.', '0')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, assignIndices));

program
  .command("eth:broadcast")
  .description("Broadcast raw and signed transactions to the network.")
  .option("--csv <filepath[,filepath,...]>", "One or more CSV files formatted with a single raw and signed transaction in hex on each line.", "")
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', "https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159")
  .action((opts: { csv: string }) => errorCatcher(opts, broadcast));

program
  .command('eth:claims-deploy')
  .description('Deploy the Claims smart contract.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--dotIndicator <address>', 'Address of the DOT indicator contract.', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
  .option('--owner <address>', 'Address of the owner of the Claims contract.')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per unit of gas.', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(cmd, claimsDeploy));

program
  .command('eth:make-claims')
  .description('Make claims from the sending address. Useful mostly in combination with eth:amend.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <dotHolder>,<pubKey> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '5000000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('--start <number>', 'The index of the list to startt on.', '0')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, doClaims));

program
  .command('eth:dot-allocations')
  .description('Make transfers of Frozen Token (must send from a liquid account).')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <address>,<amount> on each line.')
  .option('--frozenToken <address>', 'The address of the Frozen Token', '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '80000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, dotAllocations));

program
  .command('eth:frozenToken-deploy')
  .description('Deploy the Frozen Token contract.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--owner <address>', 'Address of the owner of the Claims contract.')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per unit of gas.', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .action((cmd) => errorCatcher(cmd, frozenTokenDeploy));

program
  .command('eth:increase-vesting')
  .description('Increase the vested amount of token holders on the Claims contract.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <address>,<amount> on each line.')
  .option('--claims <address>', 'The address of the Claims contract.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, increaseVesting));

program
  .command('eth:inject-sale') // allocation + vesting amount
  .description('Inject the sale data to the Claims contract.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV file formatted <address>,<amount> on each line.')
  .option('--claims <address>', 'The address of the Claims contract.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, injectSaleAmount));

program
  .command('eth:set-vesting')
  .description('Set the vested amount of token holders on the Claims contract (can only be called once on an address, otherwise use eth:increase-vesting).')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <address>,<amount> on each line.')
  .option('--claims <address>', 'The address of the Claims contract.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--gas <amount>', 'Amount of gas to send.', '2000000')
  .option('--gasPrice <price_in_wei>', 'Amount to pay in wei per each unit of gas', '8500000000')
  .option('--password <string>', 'The password to unlock personal_* RPC methods on the node.')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, vesting));

program
  .command('eth:validation')
  .description('Validate a list of frozen token holders.')
  .option("--nonce <starting_nonce>", "The starting nonce for transactions. Use 'auto' to read from chain state.", "0")
  .option("--output <filepath>", "The file to write the raw transactions.", "raw_tx.csv")
  .option('--csv <filepath[,filepath,...]>', 'One or more CSV files formatted <dotHolder> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--from <address>', 'Sender of the transactions.')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, validateAddress));


program
  .command('eth:check-amount')
  .option('--csv <filepath>', 'A CSV file formatted <dotHolder> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('--startBlock <startBlock>', 'The start of the block number you would like to scan.', '9430800')
  .option('--endBlock <endBlock>', 'The end of the block number you would like to scan.', '9431000')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, checkAmount));

program
  .command('eth:query-second-sale-amount')
  .option('--csv <filepath>', 'A CSV file formatted <dotHolder> on each line.')
  .option('--claims <address>', 'The address of DOT Claims.', '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907')
  .option('--providerUrl <url>', 'A WebSockets provider for an Ethereum node.', 'ws://localhost:8546')
  .option('-y --noConfirm', 'Skips the confirmation prompt.')
  .action((cmd) => errorCatcher(cmd, querySecondSaleBalance));

program.parse(process.argv);
