const Web3 = require('web3');
const fs = require('fs')
const EthWallet = require('ethereumjs-wallet');

const main = async () => {
  const providerUrl = 'ws://localhost:8546';
  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));

  for (let i = 0; i < 200; i++) {
    const eWallet = EthWallet.generate();
    // console.log(eWallet);
    fs.appendFileSync('keys.csv', `${eWallet.getPrivateKeyString()},${eWallet.getAddressString()}\n`)
  }
}

try {
  main()
} catch (ERR) {
  console.error(ERR);
}
