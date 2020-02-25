// It is used for making sure those addresses in the dot-injection-data 
// are correct before calling the increaseVesting.

import { Command } from 'commander';
import * as fs from "fs";
import Web3 from 'web3';
import parse from 'csv-parse/lib/sync';

// @ts-ignore
import Api from '@parity/api';

const utils = (new Web3()).utils;

const claims = require('../../../build/contracts/Claims.json');

export const initclaims = async (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return await new w3.eth.Contract(claims.abi, address);
}

export const convertFromDecimalString = (decimalString: any) => {
  if (decimalString.indexOf('.') == -1) {
    return decimalString.concat('000');
  }
  
  let [ units, decimals ] = decimalString.split('.');
  if (decimals.length > 3) {
    throw new Error('Incorrect input ' + decimalString + ' given to convertFromDecimalString');
  }
  if (decimals.length < 3) {
    decimals = decimals.padEnd(3, '0');
  }
  return units.concat(decimals).replace(/^0+/, '');
}

export const validateAddress = async (cmd: Command) => {
  const { csv, claims, from, providerUrl } = cmd;
  
  if (!from) {
    throw new Error('A `from` address is required!');
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = await initclaims(claims, providerUrl);

  const csvParsed = parse(fs.readFileSync(csv, { encoding: 'utf-8' }));
  const destinations = csvParsed.map((entry: any) => entry[0]);
  const amounts = csvParsed.map((entry: any) => convertFromDecimalString(entry[1]));

  if (destinations.length != amounts.length) {
    throw new Error('Attempted to supply arrays of non-equal lengths to `validateAddress`!');
  }

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

  return counter;

}
