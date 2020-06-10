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
}

const IgnoreMethods = [
  "timestamp.set",
];

export const migrate = async (opts: Options) => {
  const { dbPath, ensureComplete } = opts;

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

    }
  }

}