import Keyring from '@polkadot/keyring';
import { createType, GenericImmortalEra } from '@polkadot/types';
import { Command } from 'commander';
import { initApi, sleep } from '../helpers';
import parse from 'csv-parse/lib/sync';
import * as fs from 'fs';

const parseCSV = (filepath: string) => {
  // The CSV file be formatted <dest>,<amount>
  const csvRead = fs.readFileSync(filepath, { encoding: 'utf-8' });
  return parse(csvRead);
}

export const makeTransfers = async (cmd: Command) => {
  const { csv, cryptoType, mnemonic, suri, jsonPath, wsEndpoint } = cmd;

  const csvParsed = parseCSV(csv);

  const api = await initApi(wsEndpoint);
  const keyring = new Keyring({ type: cryptoType });

  let signer: any;
  if (suri) {
    signer = keyring.addFromUri(suri);
  } else if (mnemonic) {
    signer = keyring.addFromMnemonic(mnemonic);
  } else if (jsonPath) {
    signer = keyring.addFromJson(JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf-8' })));
  } else {
    throw Error('Failed to pass in a method to get the address.');
  }

  console.log(`Sending from ${signer.address}`);

  let startingNonce = await api.query.system.accountNonce(signer.address);
  let counter = 0;
  for (const entry of csvParsed) {
    //@ts-ignore
    const [ dest, amount ] = entry;
    const nonce = Number(startingNonce) + counter;
    const trace = `Nonce ${nonce} | `;

    const era = createType(api.registry, 'ExtrinsicEra', new GenericImmortalEra(api.registry));

    console.log(`${trace}Sending transaction Balances::transfer from ${signer.address} to ${dest} for amount ${amount}.`);
    //@ts-ignore
    const unsub = await api.tx.balances.transfer(dest, amount).signAndSend(
      signer,
      { blockHash: api.genesisHash, era, nonce },
      (result: any) => {
        const { status } = result;

        console.log(`${trace}Current status is ${status.type}.`);
        if (status.isFinalized) {
          console.log(`${trace}Transaction included at block hash ${status.asFinalized}.`);
          unsub();
        }
      }
    );
    counter++;
    await sleep(1000);
  }
}
