// Not ready to use

import { Command } from 'commander';
import * as fs from "fs";
import Web3 from 'web3';

// @ts-ignore
import Api from '@parity/api';

const w3Util = (new Web3()).utils;

const claims = require('../../../build/contracts/Claims.json');

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
}

export const querySecondSaleBalance = async (cmd: Command) => {
  const { csv, claims, providerUrl } = cmd;

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  let pubKeys: any[] = [];
  fs.readFileSync(csv, { encoding: 'utf-8' }).split('\n').forEach((entry: any) => {
    pubKeys.push(entry);
  });

  const provider = new Api.Provider.Ws(providerUrl);

  for (let i = 0; i < pubKeys.length; i++) {
    const amount: any = await claimsContract.methods.balanceOfPubkey(pubKeys).call();
    console.log(`Address: ${pubKeys[i]}, Amount: ${amount}`);
  }

}