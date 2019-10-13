import { assert, CallIndices, initApi, sleep } from './helpers';
import Keyring from '@polkadot/keyring';
import { createType, GenericCall, GenericImmortalEra } from '@polkadot/types';
import * as util from '@polkadot/util';
import { Command } from 'commander';

import * as fs from 'fs';

export const injectKusamaState = async (cmd: Command) => {
  const { csv, cryptoType, mnemonic, wsEndpoint } = cmd;

  const api = await initApi(wsEndpoint);
  const keyring = new Keyring({ type: cryptoType });

  const input = fs.readFileSync(csv, { encoding: 'utf-8' }).split('\n').reverse().map((line) => {
    const [whomWithExtra, jsonWithExtra] = line.split(',{');
    const whom = whomWithExtra.split(',')[0];
    const json = (() => {
      try {
        return JSON.parse('{' + jsonWithExtra);
      } catch {
        return JSON.parse('{' + jsonWithExtra.split('},')[0] + '}');
      }
    })();

    return {
      whom,
      json,
    }
  });

  const sudoSigner = keyring.addFromMnemonic(mnemonic);
  assert(
    sudoSigner.address === (await api.query.sudo.key()).toString(),
     `Signer secret does not unlock the Sudo key for this chain!`,
  );
  
  const startingNonce = await api.query.system.accountNonce(sudoSigner.address);

  let index = 0;
  for (const entry of input) {
    const { whom, json } = entry;
    const { callIndex, args } = json;

    if (callIndex === CallIndices.Claim) {
      //@ts-ignore
      const hash = await api.tx.claims.claim(args.dest, args.ethereum_signature).send();
      console.log(`Claims sent: ${hash}!`);
      await sleep(3000);
    } else {
      const { method, section } = GenericCall.findFunction(util.hexToU8a(callIndex));

      //@ts-ignore
      const vals = Object.values(args);
      const proposal = api.tx[section][method](...vals);
      const nonce = Number(startingNonce) + index;

      const era = createType('ExtrinsicEra', new GenericImmortalEra());

      const logString = `Sending extrinsic ${section}::${method} as ${whom} with sudo key ${sudoSigner.address} and nonce ${nonce}.`;
      console.log(logString);

      try {
        const unsub = await api.tx.sudo.sudoAs(whom, proposal).signAndSend(
          sudoSigner,
          { blockHash: api.genesisHash, era, nonce },
          (result) => {
            const { events, status } = result;
            console.log(`Status now: ${status.type}`);

            if (status.isFinalized) {
              console.log(`Extrinsic included at block hash ${status.asFinalized}.`);
              events.forEach(({ phase, event: { data, method, section } }) => {
                console.log(`\t${phase}: ${section}::${method} | ${data}\n`)
              });
              unsub();
            }
          },
        );
      } catch (e) { console.error(e); }

      index++;
      await sleep(1000);
    }
  }
}
