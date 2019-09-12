import { ApiPromise, WsProvider, createSubmittable } from '@polkadot/api';
import pdKeyring from '@polkadot/keyring';
import { createType, GenericCall } from '@polkadot/types';
import * as util from '@polkadot/util';
import { Command } from 'commander';
import * as fs from 'fs';

const KusamaCanaryEndpoint = 'wss://canary-4.kusama.network';

const getApi = (endpoint: string = KusamaCanaryEndpoint): Promise<ApiPromise> => {
  const provider = new WsProvider(endpoint);
  return ApiPromise.create({
    provider,
  });
}

export const sudoAs = async (cmd: Command) => {
  const { endpoint, csv, cryptoType, mnemonic, suri, jsonPath } = cmd;

  const csvParsed = fs.readFileSync(csv, { encoding: 'utf-8' }).split('\n').map((line) => {
    const [whom, almostCompleteJson] = line.split(',{');
    return {
      whom,
      json: JSON.parse('{' + almostCompleteJson),
    }
  });

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
  // console.log(sudoKey.address)
  if (sudoKey.address !== (await api.query.sudo.key()).toString()) {
    console.log(sudoKey.address);
    console.log((await api.query.sudo.key()).toString())
    throw Error('This is not the secret for the Sudo key.');
  }

  let startingNonce = await api.query.system.accountNonce(sudoKey.address);
  csvParsed.map(async (entry: any, index: any) => {
    const { whom, json } = entry;
    const { callIndex, args } = json;
    const { method, section } = GenericCall.findFunction(util.hexToU8a(callIndex));
    // @ts-ignore
    const vals = Object.values(args);
    const proposal = api.tx[section][method](...vals);
    const nonce = Number(startingNonce) + index;
    const signedBlock = await api.rpc.chain.getBlock();
    const blockHash = signedBlock.block.header.hash;
    const currentHeight = signedBlock.block.header.number;

    const era = createType('ExtrinsicEra', { current: currentHeight, period: 10 });

    const logString = `Sending transaction ${section}::${method} from ${whom} with sudo key ${sudoKey.address} and nonce: ${nonce}.`;
    // @ts-ignore
    const hash = await api.tx.sudo.sudoAs(whom, proposal).signAndSend(sudoKey, { blockHash, era, nonce });
    console.log(`Hash: ${hash.toString()}`);
    fs.appendFileSync('sudoAs.hashes.log', logString + '\n' + hash.toString() + '\n');
  })
}
