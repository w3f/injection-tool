const fs = require('fs');
const Web3 = require('web3');

const FrozenToken = require('../../build/contracts/FrozenToken.json');

const DOT_ALLOCATION = '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907';

const initFrozenToken = (address, provider) => {
	const w3 = new Web3(new Web3.providers.HttpProvider(provider));
	return new w3.eth.Contract(FrozenToken.abi, address);
}

const main = async () => {
	const fToken = initFrozenToken(DOT_ALLOCATION, 'https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159');
	const inputArray = fs.readFileSync('haveAny.csv', { encoding: 'utf-8' }).split('\n');
	inputArray.forEach(async (entry) => {
		// console.log(entry);
		const balance = await fToken.methods.balanceOf(entry).call();
		if (Number(balance) !== 0) {
			fs.appendFileSync('onEth.csv', `${entry},${balance}\n`);
		}
	});
}

main();