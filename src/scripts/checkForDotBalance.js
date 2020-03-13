const fs = require('fs');
const Web3 = require('web3');

const w3Util = (new Web3()).utils

const { encodeAddress } = require('@polkadot/keyring');

const FrozenToken = require('../../build/contracts/FrozenToken.json');
const Claims = require('../../build/contracts/Claims.json');

const DOT_ALLOCATION = '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907';
const CLAIMS_ADDRESS = '0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907';

const INFURA = 'https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159';

const initFrozenToken = (address, provider) => {
	const w3 = new Web3(new Web3.providers.HttpProvider(provider));
	return new w3.eth.Contract(FrozenToken.abi, address);
}

const initClaims = (address, provider) => {
	const w3 = new Web3(new Web3.providers.HttpProvider(provider));
	return new w3.eth.Contract(Claims.abi, address);
}

const getAllDotHolders = async (frozenTokenContract) => {
	let tokenHolders = new Map();

	(await frozenTokenContract.getPastEvents('Transfer', {
    fromBlock: '0',
    toBlock: 'latest',
  })).forEach((event) => {
    const { from, to, value } = event.returnValues;

    if (tokenHolders.has(from)) {
      // We've seen this sending address before.
      const oldData = tokenHolders.get(from);
      const newBalance = oldData.balance.sub(w3Util.toBN(value));
      const newData = Object.assign(oldData, {
        balance: newBalance,
      });

      tokenHolders.set(from, newData);
    } else {
      // assert(from === FrozenTokenAdmin, 'Seen a new sender that is not admin.');

      tokenHolders.set(from, {
        balance: w3Util.toBN(10000000000).sub(w3Util.toBN(value)),
        index: 0,
        pubKey: '',
        vested: w3Util.toBN(0),
      });
    }

    if (tokenHolders.has(to)) {
      // We've seen this recipient address before.
      const oldData = tokenHolders.get(to);
      const newBalance = oldData.balance.add(w3Util.toBN(value));
      const newData = Object.assign(oldData, {
        balance: newBalance,
      });

      tokenHolders.set(to, newData);
    } else {
      // First time we've seen this recipient.
      tokenHolders.set(to, {
        balance: w3Util.toBN(value),
        index: 0,
        pubKey: '',
        vested: w3Util.toBN(0),
      });
    }
	});
	
	return tokenHolders.keys();
}

const main = async () => {
	const frozenTokenContract = initFrozenToken(DOT_ALLOCATION, INFURA);
	const tokenHolders = new Set(await getAllDotHolders(frozenTokenContract));
	console.log(tokenHolders);

	const claimsContract = initClaims(CLAIMS_ADDRESS, INFURA);
	
	let counter = 0;
	let claimed = await claimsContract.methods.claimed(counter).call();
	while (claimed) {
		console.log(counter);
		if (tokenHolders.has(claimed)) {
			tokenHolders.delete(claimed);
		} else {
			throw new Error('Claimed did not show up in tk');
		}

		counter++;
		try {
			claimed = await claimsContract.methods.claimed(counter).call();
		} catch(err) { break; }
	}

	for (const holder of tokenHolders) {
		fs.appendFileSync('bleh.csv', `${holder}\n`);
	}
	

		// const claimData = await claimsContract.methods.claims(claimed).call();
	// 	const { pubKey } = claimData;
	// 	// let pubKey = '0x3135467544503246385978476d526f447159547670385a6f755659444450574e';

	// 	let chars = [];
	// 	for (let i = 0; i < pubKey.length; i+=2) {
	// 		const cur = pubKey.slice(i, i+2);
	// 		if (cur === '0x') continue;
	// 		else chars.push(String.fromCharCode('0x'+ cur));
	// 	}

	// 	const maybeAddress = chars.join('');
	// 	const isAddress = /^[a-z0-9]+$/i.test(maybeAddress);

	// 	if (isAddress) {
	// 		console.log('\n\nGOT EM\n\n');
	// 		fs.appendFileSync('gotEm.log', `${counter} | ${claimed} | ${pubKey} | ${maybeAddress} \n`);
	// 	} else {

	// 		fs.appendFileSync('total.md', `| ${counter} | ${claimed} | ${pubKey} | ${encodeAddress(pubKey, 0).toString()} |\n`);
	// 	}

	// 	// console.log(`${counter} | ${claimed} | ${JSON.stringify(claimData)}`);
		counter++;
		claimed = await claimsContract.methods.claimed(counter).call();
	// }
}

main();