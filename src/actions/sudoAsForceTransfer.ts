import { ApiPromise, WsProvider } from '@polkadot/api';
import pdKeyring from '@polkadot/keyring';
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

export const sudoAsForceTransfer = async (cmd: Command) => {
  const { endpoint, source, amount, cryptoType, mnemonic, suri, jsonPath } = cmd;

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

  try {
    let startingNonce = await api.query.system.accountNonce(sudoKey.address);
    // 5319651000000000
    // const source = '5EtRyVhTrvqCsrB8vp7gxxGzt5ch8QSZB7eE8zNMtaQLRwYD';
    // const amount = '5319651000000000';
    // console.log(amount)
    console.log(source)
    console.log(sudoKey.address);
    const proposal = api.tx.balances.forceTransfer(source, sudoKey.address, amount);

    // @ts-ignore
    const unsub = await api.tx.sudo.sudo(proposal).signAndSend(sudoKey, { nonce: startingNonce } , result => {
      const { status } = result;

      console.log('Current status is', status.type);
      if (status.isFinalized) {
        console.log(`Transaction included at blockHash ${status.asFinalized}`);
        unsub();
      }
    });
  } catch (e) { 
    console.log(e);
    process.exit(1);
  }
}
