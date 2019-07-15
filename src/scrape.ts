import BN from 'bn.js';
import * as pUtil from '@polkadot/util';
import * as keyring from '@polkadot/keyring';
import Web3 from 'web3';

const utils = (new Web3()).utils;

type EthAddress = string;
type DotPublicKey = string;
type Contract = any;

// Intermediate claim data type
type ClaimData = {
  balance: BN,
  index: number,
  vested: BN,
};

// Intermediate indices type
type IndexData = {
  encodedAddress: string,
  index: number,
}

// Abridged web3 event type
type W3Event = {
  returnValues: {
    to: string,
  }
}

export const getAllTokenHolders = async (frozenToken: Contract, fromBlock: string = '0', toBlock: string = 'latest'): Promise<Set<EthAddress>> => {
  const tokenHolders: Set<EthAddress> = new Set();

  (await frozenToken.getPastEvents('Transfer', {
    fromBlock,
    toBlock,
  })).map((event: W3Event) => tokenHolders.add(event.returnValues.to));

  return tokenHolders;
};

export const getAmended = async (claims: Contract, fromBlock: string = '0', toBlock: string = 'latest') => {
  return (await claims.getPastEvents('Amended', {
    fromBlock,
    toBlock,
  })).map((event: any) => ({
    original: event.returnValues.original,
    amendedTo: event.returnValues.amendedTo,
  }));
};

export const getClaimedFromEvents = async (claims: Contract, fromBlock: string = '0', toBlock: string = 'latest') => {
  return (await claims.getPastEvents('Claimed', {
    fromBlock,
    toBlock,
  })).map((event: any) => ({
    eth: event.returnValues.eth,
    dot: event.returnValue.dot,
    idx: event.returnValues.idx,
  }));
};

export const getVestedFromEvents = async (claims: Contract, fromBlock: string = '0', toBlock: string = 'latest') => {
  return (await claims.getPastEvents('Vested', {
    fromBlock,
    toBlock,
  })).map((event: any) => event.returnValues.eth);
};

export const getFullDataFromState = async (claims: Contract, frozenToken: Contract) => {
  const claimedLength = await claims.methods.claimedLength().call();

  const allHolders: Set<EthAddress> = await getAllTokenHolders(frozenToken);

  const memory: Map<DotPublicKey, ClaimData> = new Map();

  for (let i = 0; i < Number(claimedLength); i++) {
    const ethAddress = await claims.methods.claimed(i).call();

    // Delete the address out of `allHolders` array.
    allHolders.delete(ethAddress);

    const balance: BN = utils.toBN(
      await frozenToken.methods.balanceOf(ethAddress).call()
    );

    const { index, pubKey, vested } = await claims.methods.claims(ethAddress).call();
    

    if (memory.has(pubKey)) {
      // More than one claim has been made to this Polkadot public key.
      // Need to merge the old data with the new data.
      const oldData = memory.get(pubKey);
      const newData = {
        // Add the balances together.
        balance: oldData!.balance.add(balance),
        // Assign the lowest index for multiples claims to the same public key.
        index: Math.min(Number(index), Number(oldData!.index)),
        // Vesting is turned on if its been turned on for any of the claims.
        vested: oldData!.vested.add(utils.toBN(vested)),
      } 

      memory.set(pubKey, newData);
    } else {
      // The public key has not been used before, likely the more common case.
      memory.set(pubKey, {
        balance,
        index,
        vested: utils.toBN(vested),
      });
    }
  }

  const stillToClaim = await Promise.all(Array.from(allHolders).map(async (holder: EthAddress) => {
    const bal = await frozenToken.methods.balanceOf(holder).call();
    return [utils.hexToBytes(holder), Number(bal)];
  }))

  return {
    memory,
    stillToClaim,
  };
};

export const writeGenesis = (memory: Map<DotPublicKey, ClaimData>, template: any, stillToClaim: any[]) => {
  let indices: IndexData[] = [];

  memory.forEach((value: ClaimData, key: DotPublicKey) => {
    const encodedAddress = keyring.encodeAddress(pUtil.hexToU8a(key));
    template.genesis.runtime.balances.balances.push(
      [encodedAddress, value.balance.toNumber()]
    );

    if (value.vested.gt(utils.toBN(0))) {
      const { balance, vested } = value;
      const liquid = balance.sub(vested);
      template.genesis.runtime.balances.vesting.push([encodedAddress, 0, 24, liquid.toNumber()]);
    }

    // The tricky part is the indices array, we must be sure to preserve
    // the correct ordering: hence this intermediate step.
    indices.push({ encodedAddress, index: value.index });
  });

  indices.sort((a: IndexData, b: IndexData) => {
    return Number(a.index) - Number(b.index);
  });

  let correctIndex = 0;
  template.genesis.runtime.indices.ids = indices.map((entry: IndexData) => {
    if (entry.index != correctIndex) {
      throw new Error('Index ordering did not work!');
    }
    correctIndex++;
    return entry.encodedAddress;
  });

  template.genesis.runtime.claims.claims = stillToClaim;

  return template;
}
