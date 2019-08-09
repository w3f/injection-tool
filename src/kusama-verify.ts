import { ApiPromise, WsProvider } from '@polkadot/api';
import { getW3, getFrozenTokenContract, getClaimsContract, getTokenHolderData, getClaimers } from './genesis';

// const KusamaTestnetEndpoint = 'wss://testnet-0.kusama.network';
const KusamaTestnetEndpoint = 'ws://127.0.0.1:9944'

try {
  (async () => {
    const provider = new WsProvider(KusamaTestnetEndpoint);
    const api = await ApiPromise.create(provider);

    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version()
    ]);

    console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

    // Get all the old Ethereum data.
    const w3 = getW3();
    const frozenTokenContract = getFrozenTokenContract(w3);
    const claimsContract = getClaimsContract(w3);

    const tokenHolders = await getTokenHolderData(frozenTokenContract, claimsContract);

    const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders); 

    // Now iterate through these data sets and check them against the state of Kusama.
    // First check the leftovers...
    leftoverTokenHolders.forEach(async (value: any, key: any) => {
      console.log(key);
      // @ts-ignore
      // const res = await api.rpc.claims.claims(key);
      // console.log(res);
    });
  })();
} catch (e) { console.error('wtf\n\n', e); }
