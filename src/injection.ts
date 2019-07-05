import Web3 from "web3";

const Claims = require('../build/contracts/Claims.json');
const FrozenToken = require('../build/contracts/FrozenToken.json');

type Contract = any;

type TxParams = {
  from: string,
  to?: string,
  gas?: string,
  gasPrice?: string,
}

export const initClaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.HttpProvider(provider));
  return new w3.eth.Contract(Claims.abi, address);
}

export const initFrozenToken = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.HttpProvider(provider));
  return new w3.eth.Contract(FrozenToken.abi, address);
}

export const injectAllocations = async (
  frozenToken: Contract,
  addresses: string[],
  balances: string[],
  txParams: TxParams,
) => {

  if (addresses.length != balances.length) {
    throw new Error('Attempted to supply arrays of non-equal lengths to `injectAllocations`!');
  }

  let i = 0;
  while (i < addresses.length) {
    frozenToken.methods.transfer(addresses[i], balances[i]).send(txParams);
    i++;
  }
}

export const injectAmends = async (
  claims: Contract, 
  originals: string[], 
  amends: string[], 
  txParams: TxParams, 
  step: number = 50,
): Promise<boolean> => {
  if (originals.length != amends.length) {
    throw new Error('Passed two arrays of different lengths.');
  }

  step = Math.min(step, amends.length);

  let promises = [];
  for (let i = 0; i <= amends.length; i += step) {
    const originalsArg = originals.slice(i, step);
    const amendsArg = amends.slice(i, step);

    const txPromise = claims.methods.amend(originalsArg, amendsArg).send(txParams);
    promises.push(txPromise);

    step = Math.min(step * 2, amends.length-1);
  }

  
  await Promise.all(promises);

  return true;
}

export const injectIndices = async (
  claims: Contract,
  addresses: string[],
  txParams: TxParams,
  start: number = 0,
  step: number = 50,
): Promise<boolean> => {

  step = Math.min(step, addresses.length-1);

  let promises = [];
  for (let i = start; i < addresses.length-1; i += step) {
    const indicesArg = addresses.slice(i, step);

    const txPromise = claims.methods.assignIndices(indicesArg).send(txParams);
    promises.push(txPromise);

    step = Math.min(step * 2, addresses.length-1);
  }

  console.log(await Promise.all(promises));

  return true;
}

export const injectVesting = async (
  claims: Contract,
  addresses: string[],
  txParams: TxParams,
  start: number = 0,
  step: number = 50,
): Promise<boolean> => {

  step = Math.min(step, addresses.length-1);

  let promises = [];
  for (let i = start; i < addresses.length-1; i += step) {
    const vestingArg = addresses.slice(i, step);

    const txPromise = claims.methods.setVesting(vestingArg).send(txParams);
    promises.push(txPromise);

    step = Math.min(step * 2, addresses.length-1);
  }

  await Promise.all(promises);

  return true;
}
