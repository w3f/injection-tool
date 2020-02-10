// It is used for making sure those addresses in the dot-injection-data 
// are correct before calling the increaseVesting.

import { Command } from 'commander';
import * as fs from "fs";
import Web3 from 'web3';
// @ts-ignore
import Api from '@parity/api';

const utils = (new Web3()).utils;

const claims = require('../../../build/contracts/Claims.json');

export const initclaims = async (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/c5d80b09947b436eb315bea244f31ce3'));
  // const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return await new w3.eth.Contract(claims.abi, address);
}

export const validateAddress = async (cmd: Command) => {
  const { csv, claims, from, providerUrl } = cmd;
  
  if (!from) {
    throw new Error('A `from` address is required!');
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = await initclaims(claims, providerUrl);

  let destinations: any[] = [];
  let amounts: any[] = [];
  fs.readFileSync(csv, { encoding: 'utf-8' }).split('\n').forEach((entry: any) => {
    const [destination, amount] = entry.split(',');
    destinations.push(destination);
    amounts.push(amount);
  });

  const provider = new Api.Provider.Ws(providerUrl);
  let counter = 0;

  for (let i=0; i<destinations.length; i++) {
    const isDOTHolder: any = await claimsContract.methods.hasAllocation(destinations[i]).call();

    if (isDOTHolder) {
      try {
        const result = await claimsContract.methods.setVesting([destinations[i]], [amounts[i]])
          .estimateGas({from: from})
          console.log(`Address ${destinations[i]} has not called setVesting before`)

      } catch (err) {
        // console.log('Valid for calling increaseVesting:', destinations[i])
        // console.log(err)
        counter += 1;
      }
    } else {
      console.log(`Address ${destinations[i]} does not have DOT allocation.`);
    }

  }

  if (counter !== destinations.length) {
    console.log('Something is wrong. Please check the above error');
  } else {
    console.log('All good!');
  }

}