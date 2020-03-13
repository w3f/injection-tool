import Keyring from '@polkadot/keyring';
import { createType, GenericImmortalEra } from '@polkadot/types';
import { Command } from 'commander';
import { initApi, sleep } from '../../helpers';
import parse from 'csv-parse/lib/sync';
import * as fs from 'fs';
import { decodeAddress } from '@polkadot/keyring'; 

const parseCSV = (filepath: string) => {
  // The CSV file be formatted <dest>,<amount>
  const csvRead = fs.readFileSync(filepath, { encoding: 'utf-8' });
  return parse(csvRead);
}

export const makeTransfers = async (cmd: Command) => {
  const { csv, cryptoType, dry, suri, wsEndpoint } = cmd;

  const csvParsed = parseCSV(csv);

  const api = await initApi(wsEndpoint);
  const keyring = new Keyring({ type: cryptoType });

  const signer = keyring.addFromUri(suri);
  console.log(`Sending from ${signer.address}\n`);

  let accountData = await api.query.system.account(signer.address)
  let startingNonce = accountData.nonce.toNumber();
  let counter = 0;
  for (const entry of csvParsed) {
    //@ts-ignore
    const [ dest, amount ] = entry;
    const nonce = Number(startingNonce) + counter;
    const trace = `Line ${counter+1} | Nonce ${nonce} | `;

    const era = createType(api.registry, 'ExtrinsicEra', new GenericImmortalEra(api.registry));

    console.log(`${trace}Sending transaction Balances::transfer from ${signer.address} to ${dest} for amount ${amount}.`);
    if (dry) {
      console.log(`${trace} dry run turned on - transaction stubbed.`);
    } else {
      const unsub = await api.tx.balances.transfer(dest, amount).signAndSend(
        signer,
        { blockHash: api.genesisHash, era, nonce },
        (result: any) => {
          const { status } = result;

          console.log(`${trace}Current status is ${status.type}.`);
          if (status.isFinalized) {
            console.log(`${trace}Transaction included at block hash ${status.asFinalized}.`);
            unsub();
            if (nonce == csvParsed.length + Number(startingNonce)-1) {
              console.log('\nDONE! Closing...');
              process.exit(0);
            }
          }
        }
      );
    }
    counter++;
    await sleep(1000);
  }
}
