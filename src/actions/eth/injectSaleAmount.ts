import { Command } from 'commander';
import Web3 from 'web3';
import parse from 'csv-parse/lib/sync';
import * as fs from 'fs';

// @ts-ignore
import Api from '@parity/api';

const utils = (new Web3()).utils;

const claims = require('../../../build/contracts/Claims.json');

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
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

export const injectSaleAmount = async (cmd: Command) => {
    const { csv, claims, providerUrl, from, gas, gasPrice, password } = cmd;

    if (!from) {
        throw new Error('A `from` address is required!');
    }

    const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
    const claimsContract = initclaims(claims, providerUrl);

    const csvParsed = parse(fs.readFileSync(csv, { encoding: 'utf-8' }));
    const destinations = csvParsed.map((entry: any) => entry[0]);
    const amounts = csvParsed.map((entry: any) => convertFromDecimalString(entry[1]));

    const txParams: any = {
        from,
        gas,
        gasPrice,
      };

    const provider = new Api.Provider.Ws(providerUrl);
    const api = new Api(provider);

    if (destinations.length != amounts.length) {
        throw new Error('Attempted to supply arrays of non-equal lengths to `injectSaleAmount`!');
    }

    const startingNonce = await w3.eth.getTransactionCount(txParams.from);
    // const startingNonce = utils.hexToNumber(await api.parity.nextNonce(txParams.from));

    let processSize = Math.min(10, destinations.length);
    let numOfTimes = Math.ceil(destinations.length / processSize);
    let i = 0;
    let start = 0;
    let end = processSize;

    while (i < numOfTimes) {

        const vestingArg = destinations.slice(start, end);
        const amtArg = amounts.slice(start, end);

        console.log(vestingArg)
        console.log(amtArg)

        const encoded = claimsContract.methods.injectSaleAmount(vestingArg, amtArg).encodeABI();
        let tx = Object.assign(txParams, { data: encoded, to: claimsContract.options.address, nonce: startingNonce + i });

        const txHash = await w3.eth.personal.sendTransaction(tx, password); 

        console.log(`Hash: ${txHash}`);

        start = end;
        end = Math.min(end + processSize, destinations.length);

        console.log('Updated start : ', start);
        console.log('Updated end: ', end);

        i++;
    }

}