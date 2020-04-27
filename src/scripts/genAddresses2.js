const Web3 = require('web3');
const fs = require('fs')
const EthWallet = require('ethereumjs-wallet');
const pUtil = require('@polkadot/util');
const { encodeAddress, decodeAddress } = require('@polkadot/keyring'); 

/**
 * Generates the input for making amendments on FrozenToken.
 * @param {*} file 
 */
const main = async (file) => {
  const entries = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n');

  for (let i = 0; i < entries.length; i++) {
    const [pdAddress,amount] = entries[i].split(',');
    const eWallet = EthWallet.generate();
    const privkey = eWallet.getPrivateKeyString();
    const ethAddress = eWallet.getAddressString();
    fs.appendFileSync(`stash/privkeys_${file}.csv`, `${privkey},${ethAddress}\n`)

    const decoded = pUtil.u8aToHex(decodeAddress(pdAddress));

    // input:
    //  - Dot allocation
    //  - Amendment: generated -> w3f
    //  - Claim
    fs.appendFileSync(`stash/allocation_${file}.csv`, `${ethAddress},${amount}\n`);
    fs.appendFileSync(`stash/amendment_${file}.csv`, `${ethAddress},0xOUR_ADDRESS\n`);
    fs.appendFileSync(`stash/claims_${file}.csv`, `${ethAddress},${decoded}\n`);
  }
}

try {
  main(process.argv[2]);
} catch (ERR) {
  console.error(ERR);
}
