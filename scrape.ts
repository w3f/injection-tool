import Web3 from 'web3';

const FrozenToken = require('./build/contracts/FrozenToken.json');
const Claims = require('./build/contracts/Claims.json');

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

    // const accounts = await web3.eth.getAccounts();
    // console.log(accounts);

    const frozenToken = new web3.eth.Contract(FrozenToken.abi, FrozenToken.networks["5"].address);
    const claims = new web3.eth.Contract(Claims.abi, Claims.networks["5"].address);

    const claimedLength = await claims.methods.claimedLength.call();

    const memory = new Map();

    for (let i = 0; i < claimedLength; i++) {
      const address = await claims.methods.claimed(i).call(); 
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

    let balances = new Map();
    let indices: any[] = [];
    let vesting = [];

    // Just iterate through memory and create these Vecs
    memory.forEach((value, key) => {
      balances.set(key, value.balance);
      indices.push({ polkadot: key, index: value.index });
      if (value.vested) {
        vesting.push(key);
      }
    });

    indices.sort((a: any, b: any): number => {
      return a.index - b.index;
    })


    const text = `
    vec![

    ],
`;

  })();
} catch (e) { console.error(e); }
