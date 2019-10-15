import { createType, GenericImmortalEra } from '@polkadot/types';
import { Command } from 'commander';
import * as fs from 'fs';
import { assert, getSudoSigner, initApi, sleep } from './helpers';

const countdown = (ms: number) => {
  console.log('Counting down...');
  let index = Math.floor(ms / 1000);
  return new Promise(res => {
    const intervalId = setInterval(() => {
      if (index === 0) {
        console.log('Blast-off');
        clearInterval(intervalId);
        res();
        return;
      }
      console.log(`\t${index}`);
      index--;
    }, 1000)
  });
}

export const transitionToPoS = async (cmd: Command) => {
  const { cryptoType, mnemonic, runtimeCode, wsEndpoint } = cmd;

  const api = await initApi(wsEndpoint);
  const sudoSigner = getSudoSigner(cryptoType, mnemonic);

  assert(
    sudoSigner.address === (await api.query.sudo.key()).toString(),
    'Signer secret does not unlock the Sudo key for this chian!',
  );

  const startingNonce = await api.query.system.accountNonce(sudoSigner.address);
  
  // Needs to flip the forcing of the eras.
  const newEraProposal = api.tx.staking.forceNewEra();
  const era = createType('ExtrinsicEra', new GenericImmortalEra());

  console.log(`Sending extrinsics Staking::force_new_era from ${sudoSigner.address}`);
  const unsub = await api.tx.sudo.sudo(newEraProposal).signAndSend(
    sudoSigner,
    { blockHash: api.genesisHash, era, nonce: Number(startingNonce) },
    (result) => {
      const { status } = result;
      console.log(`Status now: ${status.type}`);

      if (status.isFinalized) {
        console.log(`Extrinsic included at block hash ${status.asFinalized}`);
        unsub();
      }
    }
  );

  await countdown(12000);
  console.log('\nSending runtime upgrade!')

  // Needs to perform the runtime upgrade.
  const code = '0x' + fs.readFileSync(runtimeCode).toString('hex');
  const upgradeProposal = api.tx.system.setCode(code);
  
  console.log(`Sending extrinsics Staking::set_code from ${sudoSigner.address}`);
  const unsubTwo = await api.tx.sudo.sudo(upgradeProposal).signAndSend(
    sudoSigner,
    { blockHash: api.genesisHash, era, nonce: Number(startingNonce)+1 },
    (result) => {
      const { status } = result;
      console.log(`Status now: ${status.type}`);

      if (status.isFinalized) {
        console.log(`Extrinsic included at block hash ${status.asFinalized}`);
        unsubTwo();
      }
    }
  );
}
