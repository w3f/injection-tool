import BN from 'bn.js';
import fs from 'fs';
import * as pUtil from '@polkadot/util';
// import * as keyring from '@polkadot/keyring';
import Web3 from 'web3';

const w3Util = (new Web3()).utils;

// Contract Artifacts
const { abi: ClaimsAbi } = require('../build/contracts/Claims.json');
const { abi: FrozenTokenAbi } = require('../build/contracts/FrozenToken.json');

// Contract Addresses
const ClaimsAddress = '0x9a1B58399EdEBd0606420045fEa0347c24fB86c2';
const FrozenTokenAddress = '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907';

// Default endpoint
const DefaultEndpoint = 'https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159';

// JSON template
const Template = require('../template.json');

type W3Api = any;

type ClaimData = {
  balance: BN,
  index: number,
  pubKey: string,
  vested: BN,
}

export const assert = (condition: boolean, errorMsg: string) => {
  if (!condition) {
    throw new Error(errorMsg);
  }
}

export const getW3 = (providerUrl: string): W3Api => {
  const provider = new Web3.providers.HttpProvider(providerUrl);
  return new Web3(provider);
}

(async () => {
  const w3 = getW3(DefaultEndpoint);
  const claimsContract = await new w3.eth.Contract(ClaimsAbi, ClaimsAddress);
  const frozenTokenContract = await new w3.eth.Contract(FrozenTokenAbi, FrozenTokenAddress);

  // Map TokenHolder to ClaimData.
  const tokenHolders = new Map();

  // Get all the balances of FrozenToken by parsing `Transfer` events.
  (await frozenTokenContract.getPastEvents('Transfer', {
    fromBlock: '0',
    toBlock: 'latest',
  })).forEach((event: any) => {
    const { from, to, value } = event.returnValues;
    if (tokenHolders.has(from)) {
      const oldData = tokenHolders.get(from);
      const newBalance = oldData.balance.sub(w3Util.toBN(value));
      const newData = Object.assign(oldData, {
        balance: newBalance,
      });

      tokenHolders.set(from, newData);
    } else {
      // Initialize the data to the correct types.
      tokenHolders.set(from, {
        balance: w3Util.toBN(value),
        index: 0,
        pubKey: '',
        vested: w3Util.toBN(0),
      });
    }

    if (tokenHolders.has(to)) {
      const oldData = tokenHolders.get(to);
      const newBalance = oldData.balance.add(w3Util.toBN(value));
      const newData = Object.assign(oldData, {
        balance: newBalance,
      });
      
      tokenHolders.set(to, newData);
    } else {
      // Initialize the data to the correct types.
      tokenHolders.set(to, {
        balance: w3Util.toBN(value),
        index: 0,
        pubKey: '',
        vested: w3Util.toBN(0),
      });
    }
  });
  
  // Get all the `Claimed` events.
  (await claimsContract.getPastEvents('Claimed', {
    fromBlock: '0',
    toBlock: 'latest',
  })).forEach((event: any) => {
    const { eth, idx, dot } = event.returnValues;
    assert(tokenHolders.has(eth), `Claimed: Account ${eth} not found having balance!`);

    const oldData = tokenHolders.get(eth);
    assert(!oldData.pubKey, "Account already has a public key!");
    const newData = Object.assign(oldData, {
      index: Number(idx),
      pubKey: dot,
    });
    tokenHolders.set(eth, newData);
  });

  // Get all the `Vested` events.
  (await claimsContract.getPastEvents('Vested', {
    fromBlock: '0',
    toBlock: 'latest',
  })).forEach((event: any) => {
    const { eth, amount } = event.returnValues;
    assert(tokenHolders.has(eth), `Vested: Account ${eth} not found having balance!`);

    const oldData = tokenHolders.get(eth);
    assert(oldData.vested.isZero(), "Account already been vested!");
    const newData = Object.assign(oldData, {
      vested: w3Util.toBN(amount),
    });
    tokenHolders.set(eth, newData);
  });

  // Separate those who have claimed from those who have not.
  // For claimers we can shed the Ethereum addresses and use the pubKey
  //  as the key.
  const claimers = new Map();
  tokenHolders.forEach((value: any, key: string) => {
    const { pubKey } = value;
    if (pubKey) {
      tokenHolders.delete(key);
      if (claimers.has(pubKey)) {
        // A claim has already been made to this pubKey, must increment the
        //  balance and vested amounts. Use the lower index.
        const oldData = claimers.get(pubKey);
        const newData = {
          balance: oldData.balance.add(value.balance),
          index: oldData.index > value.index ? value.index : oldData.index,
          vested: oldData.vested.add(value.vested),
        };
        claimers.set(pubKey, newData);
      } else {
        // New entry.
        claimers.set(pubKey, {
          balance: value.balance,
          index: value.index,
          vested: value.vested || w3Util.toBN(0),
        });
      }
    }
  });

  // Write to the genesis config those that still need to claim.
  tokenHolders.forEach((value: any, key: string) => {
    Template.genesis.runtime.claims.claims.push([
      w3Util.hexToBytes(key),
      value.balance.toNumber(),
    ]);
    tokenHolders.delete(key);
  });

  assert(tokenHolders.size === 0, 'Token Holders have not been cleared!');

  // Fill the indices with the max length now.
  Template.genesis.runtime.indices.ids = new Array(claimers.size + 925).fill('xxx');

  // Write to the genesis config those that have claimed.
  claimers.forEach((value: any, key: string) => {
    // Put in the balances.
    Template.genesis.runtime.balances.balances.push([
      pUtil.hexToU8a(key),
      value.balance.toNumber(),
    ]);

    // Put in the vesting.
    if (value.vested.gt(w3Util.toBN(0))) {
      const liquid = value.balance.sub(value.vested);
      Template.genesis.runtime.balances.vesting.push([
        pUtil.hexToU8a(key),
        0,
        24,
        liquid.toNumber(),
      ]);
    }

    // Put in the index array.
    Template.genesis.runtime.indices.ids[value.index] = key;
  });

  fs.writeFileSync('kusama.json', JSON.stringify(Template, null, 2));

  process.stdout.write('done'); process.exit(0);
})();
