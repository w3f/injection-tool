import { Command } from 'commander';
import { initApi } from './helpers';
import * as util from '@polkadot/util';
import BN = require('bn.js');

const lookupIndex = async (api: any, index: number, enumSetSize = 64) => {
  const set = await api.query.indices.enumSet(Math.floor(index / enumSetSize));
  const i = index % enumSetSize;
  return util.u8aToHex(set[i]);
}

export const stateCheck = async (cmd: Command) => {
  const { wsEndpointOne, wsEndpointTwo } = cmd;

  console.log(wsEndpointOne);
  console.log(wsEndpointTwo);

  const apiOne = await initApi(wsEndpointOne);
  const apiTwo = await initApi(wsEndpointTwo);

  // const api = await initApi(wsEndpoint);
  const [chain, nodeName, nodeVersion, chain2, nodeName2, nodeVersion2] = await Promise.all([
    apiOne.rpc.system.chain(),
    apiOne.rpc.system.name(),
    apiOne.rpc.system.version(),
    apiTwo.rpc.system.chain(),
    apiTwo.rpc.system.name(),
    apiTwo.rpc.system.version(), 
  ]);

  console.log(`Comparing ${chain} ${nodeName} v${nodeVersion} to ${chain2} ${nodeName2} v${nodeVersion2}.`);

  const longCheck = async () => {
    let i = 57;
    let initial = await lookupIndex(apiOne, i);
    while (initial !== '0x') {
      const check = await lookupIndex(apiTwo, i);
      if (check !== initial) {
        throw new Error(`Index ${i} | ${check} does not match ${initial}`);
      } else {
        console.log(`Index ${i} | ${check} matches ${initial}`);
      }

      const numToBN = (num: number): BN => util.hexToBn(util.numberToHex(num));

      //@ts-ignore
      const balOne = (await apiOne.query.balances.freeBalance(check)).div(numToBN(10**12)).toString();
      //@ts-ignore
      const balTwo = (await apiTwo.query.balances.freeBalance(check)).div(numToBN(10**12)).toString();

      if (balOne !== balTwo) {
        throw new Error(`Index ${i} | ${balOne} does not match ${balTwo}`)
      } else {
        console.log(`Index ${i} | Balances match.`);
      }

      i++;
      initial = await lookupIndex(apiOne, i);
    }
  }

  const shortCheck = async () => {
    const stakersOne = await apiOne.query.staking.validators();
    const stakersTwo = await apiTwo.query.staking.validators();
    //@ts-ignore
    stakersOne[0].forEach(async (stash, index) => {
      stash = stash.toString();
      //@ts-ignore
      if (stash !== stakersTwo[0][index].toString()) {
        console.log('nop')
        console.log(stash)
        //@ts-ignore
        console.log(stakersTwo[0][index].toString());
      } else {
        console.log('yip')
      }
    })
  }

  await shortCheck();
}
