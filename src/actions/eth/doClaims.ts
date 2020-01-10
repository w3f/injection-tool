import { Command } from 'commander';
import * as fs from "fs";
import Web3 from 'web3';

// @ts-ignore
import Api from '@parity/api';

const utils = (new Web3()).utils;

const claims = require('../../build/contracts/Claims.json');

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
}

export const doClaims = async (cmd: Command) => {
  const { csv, claims, providerUrl, from, gas, gasPrice, password } = cmd;
  if (!from) {
    throw new Error('A `from` address is required!');
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  let destinations: any[] = [];
  let pubKeys: any[] = [];
  fs.readFileSync(csv, { encoding: 'utf-8' }).split('\n').forEach((entry: any) => {
    const [destination, pubKey] = entry.split(',');
    destinations.push(destination);
    pubKeys.push(pubKeys);
  });

  const txParams: any = {
    from,
    gas,
    gasPrice,
  };


  const provider = new Api.Provider.Ws(providerUrl);
  const api = new Api(provider);

  if (destinations.length != pubKeys.length) {
    throw new Error('Attempted to supply arrays of non-equal lengths to `injectAllocations`!');
  }

  const startingNonce = utils.hexToNumber(await api.parity.nextNonce(txParams.from));
  let nonceCounter = 0;


}