import pdKeyring from "@polkadot/keyring";
import { createType, GenericImmortalEra, bool } from "@polkadot/types";
import { Command } from "commander";
import * as fs from "fs";
import { initApi, sleep } from "../../helpers";

import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex, hexToU8a } from "@polkadot/util";

type Extrinsic = {
  method: string;
  signature: any | null;
  nonce: number;
  args: any[];
  tip: number;
  hash: string;
  events: any[];
  success: bool;
}

type Log = {
  type: string;
  index: number;
  value: any[];
}

type Block = {
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  logs: Log[];
  extrinsics: Extrinsic[];
}

type Options = {
  dbPath: string;
  ensureComplete: bool;
  suri: string;
  wsEndpoint: string;
}

type CryptoType = "sr25519" | "ed25519" | "ecdsa" | undefined;

const IgnoreMethods = [
  "timestamp.set",
];

const initializeSigner = (suri: string, cryptoType: CryptoType = "sr25519") => {
  const keyring = new pdKeyring({ type: cryptoType })
  return keyring.addFromUri(suri);
}

const sendHandler = (result: any, unsub: any) => {
  const { status } = result;

  console.log(`Current status is ${status.type}`);
  if (status.isFinalized) {
    console.log(`Included in block hash ${status.asFinalized}`);
    unsub();
  }
}

export const migrate = async (opts: Options) => {
  const { dbPath, ensureComplete, suri, wsEndpoint } = opts;

  // const signer = initializeSigner(suri);
  // console.log(`Signer address: ${signer.address}`)
  const api = await initApi(wsEndpoint);

  // Get the database contents, sort it by block number and filter the transactions
  // we don't want.
  const blocks: Block[] = fs.readFileSync(dbPath, { encoding: "utf-8" })
    .split("\n")                    // Split by newlines
    .filter(line => line !== "")    // filter empty lines
    .map(line => JSON.parse(line))  // make 'em JSON
    .sort((a: any, b: any) => {     // sort them in ascending
      return a.number - b.number;
    });

  // Now cycle through blocks ascending and inject new transactions.
  for (const block of blocks) {
    const { extrinsics, number } = block;
    console.log(`Checking block ${number}`);

    for (const extrinsic of extrinsics) {
      const { args, hash, method, signature } = extrinsic;
      if (IgnoreMethods.includes(method)) {
        console.log(`Skipping ignore method: ${method}`)
        continue;
      }

      const [module, txType] = method.split('.');
      if (txType == "claimAttest") {
        try {
          const unsub = await api.tx[module][txType](...args).send((result) => {
            sendHandler(result, unsub);
          });
        } catch (err) {
          throw new Error(`Failed submitting transfaction: ${err}`);
        }
      }
    }
  }

}