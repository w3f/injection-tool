import { ApiPromise, WsProvider } from '@polkadot/api';
import * as pdUtil from '@polkadot/util';
import * as pdKeyring from '@polkadot/keyring';

import { getW3, getFrozenTokenContract, getClaimsContract, getTokenHolderData, getClaimers } from './genesis';
import { Command } from 'commander';

const KusamaTestnetEndpoint = 'wss://testnet-0.kusama.network';
// const KusamaTestnetEndpoint = 'ws://127.0.0.1:9944'

const getPdApi = (endpoint: string = KusamaTestnetEndpoint): Promise<ApiPromise> => {
  const provider = new WsProvider(endpoint);
  return ApiPromise.create({
    provider,
    types: {
      ParachainPublic: "AccountId",
      VestingSchedule: {
        locked: "Balance",
        perBlock: "Balance",
        startingBlock: "BlockNumber",
      },
      Force: 'BlockNumber',
    }
  });
}

const lookupIndex = async (api: any, index: number, enumSetSize: number = 64) => {
  const set = await api.query.indices.enumSet(index / enumSetSize);
  const i = index % enumSetSize;
  return pdUtil.u8aToHex(set[i]);
}

export const verifyGenesis = async (cmd: Command) => {
  const { atBlock } = cmd;

  console.log('Verifying...');

  const api = await getPdApi();

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);

  console.log(`You are connected to ${chain} using ${nodeName} v${nodeVersion}`);

  // Get all the old Ethereum data.
  const w3 = getW3();
  const frozenTokenContract = getFrozenTokenContract(w3);
  const claimsContract = getClaimsContract(w3);

  const tokenHolders = await getTokenHolderData(frozenTokenContract, claimsContract, atBlock);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders); 

  // Now iterate through these data sets and check them against the state of Kusama.
  // First check the leftovers...
  leftoverTokenHolders.forEach(async (value: any, key: any) => {
    const { balance } = value;

    const pdClaim = await api.query.claims.claims(key);
    if (pdClaim.toString() !== balance.toString()) {
      throw new Error('KUSAMA STATE IS CORRUPTED');
    } else {
      console.log('Claims | checked!');
    }
  });

  // Now check the claimed ones for three things:
  //    1. Correct balance.
  //    2. Correct index.
  //    3. Correct vesting status.
  claimers.forEach(async (value: any, key: any) => {
    const { balance, index, vested } = value;
    const encodedAddress = pdKeyring.encodeAddress(pdUtil.hexToU8a(key));

    const pdBalance = await api.query.balances.freeBalance(encodedAddress);
    if (pdBalance.toString() !== balance.toString()) {
      throw new Error(`Balance | Got: ${pdBalance.toString()} | Expected ${balance.toString()}`);
    } else {
      console.log('Balance | checked!');
    }

    const pubKey = await lookupIndex(api, index);
    if (pubKey !== key) {
      throw new Error(`Index | Got: ${pubKey} | Expected: ${key}`);
    } else { console.log(`Index | ${index} | checked!`); }

    if (vested.toNumber() > 0) {
      const pdVested = JSON.parse((await api.query.balances.vesting(encodedAddress)).toString());
      if (vested.toNumber() !== pdVested.locked) {
        throw new Error(`Vesting | Got: ${pdVested.locked} | Expected: ${vested.toNumber()}`);
      } else {
        console.log('Vesting | checked!');
      }
    }

  })
}
