import { ApiPromise, WsProvider } from '@polkadot/api';
import * as pdUtil from '@polkadot/util';
import * as pdKeyring from '@polkadot/keyring';

import { getW3, getFrozenTokenContract, getClaimsContract, getTokenHolderData, getClaimers } from './genesis';

// const KusamaTestnetEndpoint = 'wss://testnet-0.kusama.network';
const KusamaTestnetEndpoint = 'ws://127.0.0.1:9944'

// try {
//   (async () => {
//     const provider = new WsProvider(KusamaTestnetEndpoint);
//     const api = await ApiPromise.create(provider);


//   })();
// } catch (e) { console.error('wtf\n\n', e); }

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
      }
    }
  });
}

const lookupIndex = async (api: any, index: number, enumSetSize: number = 64) => {
  const set = await api.query.indices.enumSet(index / enumSetSize);
  const i = index % enumSetSize;
  return pdUtil.u8aToHex(set[i]);
}

export const verifyGenesis = async () => {
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

  const tokenHolders = await getTokenHolderData(frozenTokenContract, claimsContract);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders); 

  // Now iterate through these data sets and check them against the state of Kusama.
  // First check the leftovers...
  // leftoverTokenHolders.forEach(async (value: any, key: any) => {
  //   console.log(key);

  //   const { balance } = value;

  //   // @ts-ignore
  //   const res = await api.query.claims.claims(key);
  //   if (res.toString() !== balance.toString()) {
  //     throw new Error('KUSAMA STATE IS CORRUPTED');
  //   } else {
  //     console.log('Claims: checked!');
  //   }
  // });

  // Now check the claimed ones for three things:
  //    1. Correct balance.
  //    2. Correct index.
  //    3. Correct vesting status.
  claimers.forEach(async (value: any, key: any) => {
    const { balance, index, vested } = value;
    const encodedAddress = pdKeyring.encodeAddress(pdUtil.hexToU8a(key));

    const pdBalance = await api.query.balances.freeBalance(encodedAddress);
    if (pdBalance.toString() !== balance.toString()) {
      console.log('Balance: False!', pdBalance.toString(), balance.toString());
    } else {
      console.log('Balance: checked!');
    }

    const pubKey = await lookupIndex(api, index);
    if (pubKey !== key) {
      console.log('False!', pubKey, key);
      console.log(index);
    } else { console.log('Index: checked!'); }

    if (vested.toNumber() > 0) {
      const pdVested = JSON.parse((await api.query.balances.vesting(encodedAddress)).toString());
      if (vested.toNumber() !== pdVested.locked) {
        console.log('Vesting: False!', vested.toNumber(), pdVested.locked);
      } else {
        console.log('Vesting: checked!');
      }
    }

  })


  setTimeout(() => console.log('Verified!'), 500);
}