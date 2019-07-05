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

    const txResult = frozenToken.methods.transfer(addresses[i], balances[i]).send(txParams);
    
    if (!txResult.status) {
      console.error(`Transaction to ${addresses[i]} FAILED! Hash:
      ${txResult.transactionHash}`);
    } else {
      if (noisy) {
        console.log(`Transfer to ${addresses[i]} succeeded. Hash:
        ${txResult.transactionHash}`);
      }
    }

    i++;
  }
}

export const injectAmends = async (
  claims: Contract, 
  originals: string[], 
  amends: string[], 
  txParams: TxParams, 
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {
  if (originals.length != amends.length) {
    throw new Error('Passed two arrays of different lengths.');
  }

  step = Math.min(step, amends.length);

  let promises = [];
  for (let i = 0; i <= amends.length; i += step) {
    if (noisy) {
      console.log(`Amends | i: ${i} | step: ${step} | Sending...`);
    }

    const originalsArg = originals.slice(i, step);
    const amendsArg = amends.slice(i, step);

    const txPromise = claims.methods.amend(originalsArg, amendsArg).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Amends | i: ${i} | step: ${step} | FAILED`);
      } else {
        if (noisy) {
          console.log(`Amends | i: ${i} | step: ${step} | Succeeded
  Hash: ${receipt.transactionHash}`);
        }
      }
    });

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
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, addresses.length-1);

  let promises = [];
  for (let i = start; i < addresses.length-1; i += step) {
    if (noisy) {
      console.log(`Indices | i: ${i} | step: ${step} | Sending...`);
    }

    const indicesArg = addresses.slice(i, step);

    const txPromise = claims.methods.assignIndices(indicesArg).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Indices | i: ${i} | step: ${step} | FAILED`);
      } else {
        if (noisy) {
          console.log(`Indices | i: ${i} | step: ${step} | Succeeded
  Hash: ${receipt.transactionHash}`);
        }
      }
    });
    
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
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, addresses.length-1);

  let promises = [];
  for (let i = start; i < addresses.length-1; i += step) {
    if (noisy) {
      console.log(`Vesting | i: ${i} | step: ${step} | Sending...`);
    }

    const vestingArg = addresses.slice(i, step);

    const txPromise = claims.methods.setVesting(vestingArg).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Vesting | i: ${i} | step: ${step} | FAILED`);
      } else {
        if (noisy) {
          console.log(`Vesting | i: ${i} | step: ${step} | Succeeded
  Hash: ${receipt.transactionHash}`);
        }
      }
    });
    
    promises.push(txPromise);

    step = Math.min(step * 2, addresses.length-1);
  }

  await Promise.all(promises);

  return true;
}
