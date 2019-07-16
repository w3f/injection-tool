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
  let promises = [];
  while (i < addresses.length) {
    if (noisy) {
      console.log(`Sending transfer of ${balances[i]} FrozenToken to ${addresses[i]}`);
    }

    const txPromise = frozenToken.methods.transfer(addresses[i], balances[i]).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Transaction to ${receipt.to} FAILED! Hash:
        ${receipt.transactionHash}`);
      } else {
        if (noisy) {
          console.log(`Transfer to ${receipt.to} succeeded. Hash:
          ${receipt.transactionHash}`);
        }
      }
    });

    promises.push(txPromise);

    i++;
  }

  await Promise.all(promises);
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
  for (let i = 0, end = step; i <= amends.length; i += step, end = Math.min(end + step, amends.length)) {
    if (noisy) {
      console.log(`Amends | i: ${i} | end: ${end-1} | Sending...`);
    }

    const originalsArg = originals.slice(i, end-1);
    const amendsArg = amends.slice(i, end-1);

    const txPromise = claims.methods.amend(originalsArg, amendsArg).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Amends | i: ${i} | end: ${end-1} | FAILED`);
      } else {
        if (noisy) {
          console.log(`Amends | i: ${i} | end: ${end-1} | Succeeded
  Hash: ${receipt.transactionHash}`);
        }
      }
    });

    promises.push(txPromise);
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

  step = Math.min(step, addresses.length);

  for (let i = start, end = step; i <= addresses.length; i += step, end = Math.min(end + step, addresses.length)) {
    if (noisy) {
      console.log(`Indices | i: ${i} | end: ${end-1} | Sending...`);
    }

    const indicesArg = addresses.slice(i, end-1);

    const txPromise = claims.methods.assignIndices(indicesArg).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Indices | i: ${i} | end: ${end-1} | FAILED`);
      } else {
        if (noisy) {
          console.log(`Indices | i: ${i} | end: ${end-1} | Succeeded
  Hash: ${receipt.transactionHash}`);
        }
      }
    });
    
    await txPromise;
  }

  return true;
}

export const injectVesting = async (
  claims: Contract,
  addresses: string[],
  amounts: string[],
  txParams: TxParams,
  start: number = 0,
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, addresses.length);

  let promises = [];
  for (let i = start, end = step; i <= addresses.length; i += step, step = Math.min(end + step, addresses.length)) {
    if (noisy) {
      console.log(`Vesting | i: ${i} | end: ${end-1} | Sending...`);
    }

    const vestingArg = addresses.slice(i, end-1);
    const amtArg = amounts.slice(i, end-1);

    const txPromise = claims.methods.setVesting(vestingArg, amtArg).send(txParams)
    .on('receipt', (receipt: any) => {
      if (!receipt.status) {
        console.error(`Vesting | i: ${i} | end: ${end-1} | FAILED`);
      } else {
        if (noisy) {
          console.log(`Vesting | i: ${i} | end: ${end-1} | Succeeded
  Hash: ${receipt.transactionHash}`);
        }
      }
    });
    
    promises.push(txPromise);
  }

  await Promise.all(promises);

  return true;
}

/** Claim as an amendment */
export const injectClaims = async (
  claims: Contract,
  eths: string[],
  pubKeys: string[],
  txParams: TxParams,
  start: number = 0,
  step: number = 50,
  noisy: boolean = true,
): Promise<boolean> => {

  step = Math.min(step, eths.length-1);

  if (eths.length != pubKeys.length) {
    throw new Error('ERROR: provided args `eths` and `pubKeys` as arrays of different lengths.');
  }

  let i = 0;
  let promises = [];
  while (i < eths.length) {
    if (noisy) {
      console.log(`Sending claim for allocation at ${eths[i]}...`);
    }

    const txPromise = claims.methods.claim(eths[i], pubKeys[i]).send(txParams)
      .on('receipt', (receipt: any) => {
        if (!receipt.status) {
          console.error(`Claim for ${eths[i]} FAILED! Hash:
          ${receipt.transactionHash}`);
        } else {
          if (noisy) {
            console.log(`Claim to ${eths[i]} succeeded. Hash:
            ${receipt.transactionHash}`);
          }
        }
      });

      promises.push(txPromise);
      
      i++;
  }

  await Promise.all(promises);

  return true;
}
