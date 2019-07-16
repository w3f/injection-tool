import Web3 from 'web3';

const Claims = require('../build/contracts/Claims.json');

const PASSWORD = '';

const DOT_ALLOCATION_INDICATOR = '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907';
const OWNER = '0x00444c3281dadacb6e7c55357e5a7BBD92C2DC34';

const providerUrl = 'ws://127.0.0.1:8546';

const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));

const deployClaims = async (txParams: any, password: string) => {
  const encoded = (new w3.eth.Contract(Claims.abi)).deploy({
    data: Claims.bytecode,
    arguments: [
      OWNER,
      DOT_ALLOCATION_INDICATOR,
    ],
  }).encodeABI();

  let tx = Object.assign(txParams, { data: encoded });
  return w3.eth.personal.sendTransaction(tx, password);
}

(async () => {
  const txParams = {
    from: '0x00444c3281dadacb6e7c55357e5a7BBD92C2DC34',
    gas: '1500000',
    gasPrice: '29500000000',
  };

  // 1) deploy Claims
  process.stdout.write('Deploying the Claims contract...');
  const claimsHash = await deployClaims(txParams, PASSWORD);
  console.log('done');
  console.log(`Claims transaction hash: ${claimsHash}`)

  // 2) initialize Frozen Token
  // process.stdout.write('Initializing the Frozen Token contract...')
  // const frozenTokenContract = await initFrozenToken(DOT_ALLOCATION_INDICATOR, providerUrl);
  // console.log('done');

  // 3) Make injections
  // 3.1) Make allocations injections

})();
