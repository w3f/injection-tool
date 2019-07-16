import Web3 from 'web3';

import {
  initFrozenToken,
} from './injection';

const Claims = require('../build/contracts/Claims.json');

const DOT_ALLOCATION_INDICATOR = '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907';
const OWNER = '';

const providerUrl = '';

const w3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

const deployClaims = async (txParams: any) => {
  return (new w3.eth.Contract(Claims.abi)).deploy({
    data: Claims.bytecode,
    arguments: [
      OWNER,
      DOT_ALLOCATION_INDICATOR,
    ],
  }).send(txParams);
}

(async () => {
  const txParams = {
    from: '',
    gas: '',
    gasPrice: '',
  };

  // 1) deploy Claims
  process.stdout.write('Deploying the Claims contract...');
  const claimsContract = await deployClaims(txParams);
  console.log('done');
  console.log(`Claims address: ${claimsContract.options.address}`)

  // 2) initialize Frozen Token
  process.stdout.write('Initializing the Frozen Token contract...')
  const frozenTokenContract = await initFrozenToken(DOT_ALLOCATION_INDICATOR, providerUrl);
  console.log('done');

  // 3) Make injections
  // 3.1) Make allocations injections

})();
