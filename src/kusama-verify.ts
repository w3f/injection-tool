import { ApiPromise, WsProvider } from '@polkadot/api';
import { getW3, getFrozenTokenContract, getClaimsContract, getTokenHolderData } from './genesis';

const KusamaTestnetEndpoint = 'wss://testnet-0.kusama.network';

(async () => {
  const provider = new WsProvider(KusamaTestnetEndpoint);
  const api = await ApiPromise.create(provider);

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

  // const w3 = getW3();
  // const frozenTokenContract = getFrozenTokenContract(w3);
  // const claimsContract = getClaimsContract(w3);

  // const tokenHolders = await getTokenHolderData(frozenTokenContract, claimsContract);


})();
