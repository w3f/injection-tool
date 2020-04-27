// Not ready to use

import { Command } from "commander";
import * as fs from "fs";
import Web3 from "web3";
import parse from "csv-parse/lib/sync";

// @ts-ignore
import Api from "@parity/api";

const w3Util = new Web3().utils;

const claims = require("../../../build/contracts/Claims.json");

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
};

export const checkIfDuplicateExists = (w: Array<any>) => {
  return new Set(w).size !== w.length;
};

export const querySecondSaleBalance = async (cmd: Command) => {
  const { csv, claims, providerUrl } = cmd;

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  let pubKeys: any[] = [];

  const csvParsed = parse(fs.readFileSync(csv, { encoding: "utf-8" }));
  pubKeys = csvParsed.map((entry: any) => entry[0]);
  // const amounts = csvParsed.map((entry: any) => convertFromDecimalString(entry[1]));
  const provider = new Api.Provider.Ws(providerUrl);
  const resultList: Array<any> = [];

  for (let i = 0; i < pubKeys.length; i++) {
    const amount: any = await claimsContract.methods
      .balanceOfPubkey(pubKeys[i])
      .call();
    console.log(`Address: ${pubKeys[i]}, Amount: ${amount}`);
    resultList.push({ address: pubKeys[i], amount: amount });
  }

  return resultList;
};
