import Web3 from "web3";
import { win32 } from "path";

const Claims = require('../build/contracts/Claims.json');
const FrozenToken = require('../build/contracts/FrozenToken.json');

type Contract = any;

type TxParams = {
  from: string,
  to?: string,
  gas?: string,
  gasPrice?: string,
}

function sleep(ms: any) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

export const initClaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(Claims.abi, address);
}

export const initFrozenToken = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(FrozenToken.abi, address);
}

export const injectAllocations = async (
  frozenToken: Contract,
  addresses: string[],
  balances: string[],
  txParams: TxParams,
  w3: any,
  password: string,
  noisy: boolean = true,
) => {

  if (addresses.length != balances.length) {
    throw new Error('Attempted to supply arrays of non-equal lengths to `injectAllocations`!');
  }

  let i = 0;
  while (i < addresses.length) {
    if (noisy) {
      console.log(`Sending transfer of ${balances[i]} FrozenToken to ${addresses[i]}`);
    }

    const encoded = frozenToken.methods.transfer(addresses[i], balances[i]).encodeABI();
    let tx = Object.assign(txParams, { data: encoded, to: frozenToken.options.address });

    const txHash = await w3.eth.personal.sendTransaction(tx, password); 
    
    console.log(`Hash: ${txHash}`);

    await sleep(2000);

    i++;
  }
}

export const injectAmends = async (
  claims: Contract, 
  originals: string[], 
  amends: string[], 
  txParams: TxParams, 
  w3: any,
  password: string,
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {
  if (originals.length != amends.length) {
    throw new Error('Passed two arrays of different lengths.');
  }

  step = Math.min(step, amends.length);

  for (let i = 0, end = step; i <= amends.length; i += step, end = Math.min(end + step, amends.length)) {
    if (noisy) {
      console.log(`Amends | i: ${i} | end: ${end-1} | Sending...`);
    }

    const originalsArg = originals.slice(i, end);
    const amendsArg = amends.slice(i, end);

    const encoded = claims.methods.amend(originalsArg, amendsArg).encodeABI();
    let tx = Object.assign(txParams, { data: encoded, to: claims.options.address });

    const txHash = await w3.eth.personal.sendTransaction(tx, password);

    console.log(`Hash: ${txHash}`);

    await sleep(2000);
  }


  return true;
}

export const injectIndices = async (
  claims: Contract,
  addresses: string[],
  txParams: TxParams,
  w3: any,
  password: string,
  start: number = 0,
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, addresses.length);

  for (let i = start, end = step; i <= addresses.length; i += step, end = Math.min(end + step, addresses.length)) {
    if (noisy) {
      console.log(`Indices | i: ${i} | end: ${end-1} | Sending...`);
    }

    const indicesArg = addresses.slice(i, end);

    const encoded = claims.methods.assignIndices(indicesArg).encodeABI();
    let tx = Object.assign(txParams, { data: encoded, to: claims.options.address });

    const txHash = await w3.eth.personal.sendTransaction(tx, password);
    
    console.log(`Hash: ${txHash}`);

    await sleep(2000);
  }

  return true;
}

export const injectVesting = async (
  claims: Contract,
  addresses: string[],
  amounts: string[],
  txParams: TxParams,
  w3: any,
  password: string,
  start: number = 0,
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, addresses.length);

  for (let i = start, end = step; i <= addresses.length; i += step, step = Math.min(end + step, addresses.length)) {
    if (noisy) {
      console.log(`Vesting | i: ${i} | end: ${end-1} | Sending...`);
    }

    const vestingArg = addresses.slice(i, end);
    const amtArg = amounts.slice(i, end);

    const encoded = claims.methods.setVesting(vestingArg, amtArg).encodeABI();
    let tx = Object.assign(txParams, { data: encoded, to: claims.options.address });

    const txHash = await w3.eth.personal.sendTransaction(tx, password);
    
    console.log(`Hash: ${txHash}`);

    await sleep(2000);
  }

  return true;
}

/** Claim as an amendment */
export const injectClaims = async (
  claims: Contract,
  eths: string[],
  pubKeys: string[],
  txParams: TxParams,
  w3: any,
  password: string,
  start: number = 0,
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, eths.length);

  if (eths.length != pubKeys.length) {
    throw new Error('ERROR: provided args `eths` and `pubKeys` as arrays of different lengths.');
  }

  let i = 0;
  while (i < eths.length) {
    if (noisy) {
      console.log(`Sending claim for allocation at ${eths[i]}...`);
    }

    const encoded = claims.methods.claim(eths[i], pubKeys[i]).encodeABI();
    let tx = Object.assign(txParams, { data: encoded, to: claims.options.address });

    const txHash = await w3.eth.personal.sendTransaction(tx, password);

    console.log(`Hash: ${txHash}`);

    await sleep(2000);
    
    i++;
  }

  return true;
}
