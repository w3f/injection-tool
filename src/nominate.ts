import { createType, GenericImmortalEra } from '@polkadot/types';
import { Command } from "commander";
import * as fs from 'fs';
import { getSigner, initApi } from "./helpers";

export const nominate = async (cmd: Command) => {
  const { csv, cryptoType, suri, wsEndpoint } = cmd;

  const api = await initApi(wsEndpoint);
  const mySigner = getSigner(cryptoType, suri);

  const startingNonce = await api.query.system.accountNonce(mySigner.address);
  const era = createType('ExtrinsicEra', new GenericImmortalEra());

  // Get validators
  const validators = fs.readFileSync(csv, { encoding: 'utf-8' }).split('\n');

  console.log(`Sending extrinsic Staking::nominate from ${mySigner.address}`);
  try {
    const unsub = await api.tx.staking.nominate(validators).signAndSend(
      mySigner,
      { blockHash: api.genesisHash, era, nonce: Number(startingNonce) },
      (result) => {
        const { status } = result;
        console.log(`Status now: ${status.type}`);

        if (status.isFinalized) {
          console.log(`Extrinsic included at block hash ${status.asFinalized}`);
          unsub();
          process.exit(0);
        }
      }
    );
  } catch (E) { console.log(E); }
}