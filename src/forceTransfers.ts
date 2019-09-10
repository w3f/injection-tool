import { ApiPromise, WsProvider } from '@polkadot/api';
import pdKeyring from '@polkadot/keyring';
import { createType } from '@polkadot/types';
import { Command } from 'commander';
import parse from 'csv-parse/lib/sync';
import * as fs from 'fs';

const KusamaCanaryEndpoint = 'wss://canary-4.kusama.network';

const getApi = (endpoint: string = KusamaCanaryEndpoint): Promise<ApiPromise> => {
  const provider = new WsProvider(endpoint);
  return ApiPromise.create({
    provider,
  });
}

const parseCSV = (filepath: string) => {
  // The CSV file be formatted <dest>,<amount>
  const csvRead = fs.readFileSync(filepath, { encoding: 'utf-8' });
  return parse(csvRead);
}

export const forceTransfers = async (cmd: Command) => {
  const { endpoint, csv, cryptoType, mnemonic, suri, jsonPath, source } = cmd;
  if (!source) { throw Error('Source address is required!')}

  const csvParsed = parseCSV(csv);

  const api = await getApi(endpoint);
  const keyring = new pdKeyring({ type: cryptoType });

  let sudoKey: any;
  if (suri) {
    sudoKey = keyring.addFromUri(suri);
  } else if (mnemonic) {
    sudoKey = keyring.addFromMnemonic(mnemonic);
  } else if (jsonPath) {
    sudoKey = keyring.addFromJson(JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf-8' })));
  } else {
    throw Error('Failed to pass in a method to get the address.');
  }

  if (sudoKey.address !== (await api.query.sudo.key()).toString()) {
    console.log(sudoKey.address);
    console.log((await api.query.sudo.key()).toString())
    throw Error('This is not the secret for the Sudo key.');
  }

  let startingNonce = await api.query.system.accountNonce(sudoKey.address);
  csvParsed.map(async (entry: any, index: any) => {
    const [ dest, amount ] = entry;
    const proposal = api.tx.balances.forceTransfer(source,dest,amount);
    const nonce = Number(startingNonce) + index;
    const signedBlock = await api.rpc.chain.getBlock();
    const blockHash = signedBlock.block.header.hash;
    const currentHeight = signedBlock.block.header.number;

    const era = createType('ExtrinsicEra', { current: currentHeight, period: 10 });

    console.log(`Sending transaction to force_transfer from ${source} to ${dest} for amount ${amount} with account nonce: ${nonce}.`);
    const hash = await api.tx.sudo.sudo(proposal).signAndSend(sudoKey, { blockHash, era, nonce });
    console.log(`Hash: ${hash.toString()}`);
    fs.appendFileSync('hashes.log', hash.toString() + '\n');
  })
}
