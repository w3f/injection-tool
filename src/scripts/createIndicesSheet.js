const fs = require('fs');
const pUtil = require('@polkadot/util');
const { decodeAddress } = require('@polkadot/keyring');

const claimedIndices = fs.readFileSync('x.csv', { encoding: 'utf-8' }).split('\n').map((entry) => {
  const [index,address] = entry.split(',');
  const pubkey = pUtil.u8aToHex(decodeAddress(address));
  return { index, pubkey };
});
const listOfAddresses = fs.readFileSync('dotHolders.csv', { encoding: 'utf-8' }).split('\n');
const alreadyExists = fs.readFileSync('already.csv', { encoding: 'utf-8' }).split('\n');

const numNeeded = claimedIndices.length;

let ourAddresses = [];
for (let i = 0; i < numNeeded; i++) {
  const address = alreadyExists[i];
  ourAddresses.push(address);
  fs.appendFileSync('stash/pd-claim.csv', `${address},${claimedIndices[i].pubkey}\n`);
}

let next = 0;
let counter = 0;
while (counter !== 1000) {
  if (claimedIndices[next] && counter === Number(claimedIndices[next].index)) {
    fs.appendFileSync('stash/pd-indices.csv', `${ourAddresses[next]}\n`);
    next++;
  } else {
    const rando = listOfAddresses[counter+222];
    fs.appendFileSync('stash/pd-indices.csv', `${rando}\n`);
  }
  counter++;
}
