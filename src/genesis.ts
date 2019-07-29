import BN from 'bn.js';
import fs from 'fs';
import * as pUtil from '@polkadot/util';
import * as keyring from '@polkadot/keyring';
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

// Vesting (over 6 months for Kusama + assuming 6 second block times)
const VestingLength = 10 * 60 * 24 * 30 * 6;

type W3Api = any;

type ClaimData = {
  balance: BN,
  index: number,
  pubKey: string,
  vested: BN,
}

type EthAddress = string;

export const assert = (condition: boolean, errorMsg: string) => {
  if (!condition) {
    throw new Error(errorMsg);
  }
}

export const getW3 = (providerUrl: string = DefaultEndpoint): W3Api => {
  const provider = new Web3.providers.HttpProvider(providerUrl);
  return new Web3(provider);
}

export const getClaimsContract = (w3: any, claimsAbi: any = ClaimsAbi, address: string = ClaimsAddress): any => {
  return new w3.eth.Contract(claimsAbi, address);
}

export const getFrozenTokenContract = (w3: any, frozenTokenAbi: any = FrozenTokenAbi, address: string = FrozenTokenAddress): any => {
  return new w3.eth.Contract(frozenTokenAbi, address);
}

export const getTokenHolderData = async (frozenTokenContract: any, claimsContract: any): Promise<Map<EthAddress, ClaimData>> => {
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

    return tokenHolders;
}

const getClaimers = (tokenHolders: Map<EthAddress, ClaimData>): any => {
  // Even though this is marked `const` it is indeed mutable because we
  // use the Map.delete(key) built-in to mutate it. That's JavaScript :)
  const leftoverTokenHolders = tokenHolders;

  // Separate those who have claimed from those who have not.
  // For claimers we can shed the Ethereum addresses and use the pubKey
  //  as the key.
  const claimers = new Map();
  tokenHolders.forEach((value: any, key: string) => {
    const { pubKey } = value;
    if (pubKey) {
      leftoverTokenHolders.delete(key);
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

  return { leftoverTokenHolders, claimers };
}

(async () => {
  const w3 = getW3();
  const claimsContract = getClaimsContract(w3);
  const frozenTokenContract = getFrozenTokenContract(w3);

  // Map TokenHolder to ClaimData.
  const tokenHolders = await getTokenHolderData(frozenTokenContract, claimsContract);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders);

  // Write to the genesis config those that still need to claim.
  leftoverTokenHolders.forEach((value: any, key: string) => {
    Template.genesis.runtime.claims.claims.push([
      w3Util.hexToBytes(key),
      value.balance.toNumber(),
    ]);
    leftoverTokenHolders.delete(key);
  });

  assert(leftoverTokenHolders.size === 0, 'Token Holders have not been cleared!');

  // Fill the indices with the max length now.
  Template.genesis.runtime.indices.ids = Array.from(
    { length: claimers.size + 925 },
    // @ts-ignore
    () => keyring.encodeAddress(pUtil.hexToU8a(w3Util.randomHex(32))),
  );

  // Write to the genesis config those that have claimed.
  claimers.forEach((value: any, key: string) => {
    // @ts-ignore
    const encodedAddress = keyring.encodeAddress(pUtil.hexToU8a(key));

    // Put in the balances.
    Template.genesis.runtime.balances.balances.push([
      encodedAddress,
      value.balance.toNumber(),
    ]);

    // Put in the vesting.
    if (value.vested.gt(w3Util.toBN(0))) {
      const liquid = value.balance.sub(value.vested);
      Template.genesis.runtime.balances.vesting.push([
        encodedAddress,
        0,
        VestingLength,
        liquid.toNumber(),
      ]);
    }

    // Put in the index array.
    Template.genesis.runtime.indices.ids[value.index] = encodedAddress;
  });

  // For testing...
  Template.genesis.runtime.staking.stakers.forEach((entry: any) => {
    let [account1, account2, reqBalance] = entry;
    Template.genesis.runtime.balances.balances.push([
      account1,
      reqBalance,
    ], [
      account2,
      reqBalance,
    ]);
  });

  fs.writeFileSync('kusama.json', JSON.stringify(Template, null, 2));

  process.stdout.write('done'); process.exit(0);
})();
