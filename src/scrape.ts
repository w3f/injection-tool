import * as pUtil from '@polkadot/util';
import * as keyring from '@polkadot/keyring';
import * as fs from 'fs';
import Web3 from 'web3';

const utils = (new Web3()).utils;

const Claims = require('./build/contracts/Claims.json');
const FrozenToken = require('./build/contracts/FrozenToken.json');

const Template = require('./template.json')

type Contract = any;
type Address = string;

type ClaimData = {
  balance: string,
  eth: string,
  pubKey: string,
  index: string,
  vested: boolean,
};

export const getAllTokenHolders = async (frozenToken: Contract, fromBlock: string = '0', toBlock: string = 'latest'): Promise<Address[]> => {
  return (await frozenToken.getPastEvents('Transfer', {
    fromBlock,
    toBlock,
  })).map((event: any) => event.returnValues.to);
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

  let allHolders = await getAllTokenHolders(frozenToken);

  const memory = new Map();

  for (let i = 0; i < Number(claimedLength); i++) {
    const ethAddress = await claims.methods.claimed(i).call();

    // Splice the address out of `allHolders` array.
    const indexOf = allHolders.indexOf(ethAddress);
    allHolders.splice(indexOf, 1);

    const balance = await frozenToken.methods.balanceOf(ethAddress).call();
    const { index, polkadot, vested } = await claims.methods.claims(ethAddress).call();

    if (memory.has(polkadot)) {
      // More than one claim has been made to this Polkadot public key.
      // Need to merge the old data with the new data.
      const oldData = memory.get(polkadot);
      const newData = {
        // Add the balances together.
        balance: oldData.balance + balance, // TODO use BNs
        // Assign the lowest index for multiples claims to the same public key.
        index: Math.min(Number(index), Number(oldData.index)),
        // Vesting is turned on if its been turned on for any of the claims.
        vested: vested || oldData.vested,
      } 

      memory.set(polkadot, newData);
    } else {
      // The public key has not been used before, likely the more common case.
      memory.set(polkadot, {
        balance,
        index,
        vested,
      });
    }
  }

  const stillToClaim = await Promise.all(allHolders.map(async (holder: Address) => {
    const bal = await frozenToken.methods.balanceOf(holder).call();
    return [utils.hexToBytes(holder), Number(bal)];
  }))

  return {
    memory,
    stillToClaim,
  };
};

export const writeGenesis = async (memory: Map<any, any>, template: any, stillToClaim: any[]) => {
  let indices: any[] = [];

  memory.forEach((value: any, key: string) => {
    const encodedAddress = keyring.encodeAddress(pUtil.hexToU8a(key));
    template.genesis.runtime.balances.balances.push(
      [encodedAddress, Number(value.balance)]
    );

    if (value.vested) {
      template.genesis.runtime.balances.vesting.push(encodedAddress);
    }

    // The tricky part is the indices array, we must be sure to preserve
    // the correct ordering: hence this intermediate step.
    indices.push({ polkadot: encodedAddress, index: value.index });
  });

  indices.sort((a: any, b: any) => {
    return Number(a.index) - Number(b.index);
  });

  let correctIndex = 0;
  template.genesis.runtime.indices.ids = indices.map((entry: any) => {
    if (entry.index != correctIndex) {
      throw new Error('Index ordering did not work!');
    }
    correctIndex++;
    return entry.polkadot;
  });

  template.genesis.claims.claims = stillToClaim;

  return template;
}

try {
  (async () => {
    if (process.argv[2] && process.argv[2].indexOf('help') !== -1) {
      console.log(`
Usage:

  ts-node scrape.ts <provider>
`);
      process.exit(1);
    };

    const provider = process.argv[2] || 'https://mainnet.infura.io';
    const web3 = new Web3(new Web3.providers.HttpProvider(provider));

    const netId = (await web3.eth.net.getId()).toString();

    const frozenToken = new web3.eth.Contract(FrozenToken.abi, FrozenToken.networks[netId].address);
    const claims = new web3.eth.Contract(Claims.abi, Claims.networks[netId].address);

    let frozenTokenHolders = await getAllTokenHolders(frozenToken, 'latest');

    const claimedLength = await claims.methods.claimedLength().call();

    const memory = new Map();

    for (let i = 0; i < claimedLength; i++) {
      const address = await claims.methods.claimed(i).call(); 
      const indexOf = frozenTokenHolders.indexOf(address);
      frozenTokenHolders.splice(indexOf, 1);
      const claimData = await claims.methods.claims(address).call();
      const balance = await frozenToken.methods.balanceOf(address).call();
      
      const { index, polkadot, vested } = claimData;

      if (memory.has(polkadot)) {
        // Polkadot public key been used - have to merge new data with the old data.
        const oldData = memory.get(polkadot);
        let newData = {
          balance: oldData.balance + balance,                   // Balance is simply summed.
          index: index < oldData.index ? index : oldData.index, // We assign the lower index.
          vested: vested || oldData.vested,                     // We turn vesting on if any of the claims were vested.
        }
        
        memory.set(polkadot, newData);
      } else {
        // New entry
        memory.set(polkadot, {
          balance,
          index,
          vested,
        });
      }
    }

    // Now all the data is in memory, we must construct the genesis file.
    // It's easiest to now separate the two data collections we need:
    //  - Balances: Vec<(Polkadot, balance)>
    //  - Indices: Vec<Polkadot>
    //  - Vesting: Vec<(Polkadot, Begins, Length)> Begins = 0, Length = 12 months in blocks or something

    let balances: any[] = [];
    let indices: any[] = [];
    let vesting: any[] = [];

    memory.forEach((value, key) => {
      const encoded = keyring.encodeAddress(pUtil.hexToU8a(key));
      balances.push([encoded, Number(value.balance)]);
      indices.push({ polkadot: encoded, index: value.index });
      if (value.vested) {
        vesting.push([encoded, 0, 120000000000]);
      }
    });

    indices.sort((a: any, b: any): number => {
      return a.index - b.index;
    })

    Template.genesis.runtime.indices.ids = indices.map((entry:any) => entry.polkadot);
    Template.genesis.runtime.balances.balances = balances;
    Template.genesis.runtime.balances.vesting = vesting;

    /// Collect all the holders that didn't claim.
    const stillToBeClaimed = await Promise.all(frozenTokenHolders.map(async (holder: any) => {
      const bal = await frozenToken.methods.balanceOf(holder).call();
      return [web3.utils.hexToBytes(holder), Number(bal)];
    }));

    Template.genesis.runtime.claims.claims = stillToBeClaimed;

    fs.writeFileSync('kusama.json', JSON.stringify(Template, null, 2));

  })();
} catch (e) { console.error(e); }
