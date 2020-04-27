import Keyring from "@polkadot/keyring";
import { createType, GenericImmortalEra } from "@polkadot/types";
import { Command } from "commander";
import * as fs from "fs";
import { assert, getSigner, initApi, sleep } from "../../helpers";

const OneKSM = 10 ** 12;
const FiftyKSM = 50 * OneKSM;

export const bondAndValidate = async (cmd: Command) => {
  const {
    csvController,
    csvStash,
    csvSessionKeys,
    cryptoType,
    mnemonic,
    wsEndpoint,
  } = cmd;

  const api = await initApi(wsEndpoint);
  const era = createType(
    api.registry,
    "ExtrinsicEra",
    new GenericImmortalEra(api.registry)
  );

  const controllers = fs
    .readFileSync(csvController, { encoding: "utf-8" })
    .split("\n");
  const stashes = fs.readFileSync(csvStash, { encoding: "utf-8" }).split("\n");

  const sudoSigner = getSigner(cryptoType, mnemonic);
  assert(
    sudoSigner.address === (await api.query.sudo.key()).toString(),
    "Signer secret does not unlock the Sudo key for this chian!"
  );

  const startingNonce = await api.query.system.accountNonce(sudoSigner.address);

  let index = 0;
  for (const controller of controllers) {
    const proposal = api.tx.staking.bond(controller, OneKSM, "Staked");
    const nonce = Number(startingNonce) + index;
    const trace = `Index ${nonce} | `;

    console.log(
      `${trace}Sending extrinsic Staking::bond as ${stashes[index]} to controller ${controller}.`
    );
    const unsub = await api.tx.sudo
      .sudoAs(stashes[index], proposal)
      .signAndSend(
        sudoSigner,
        { blockHash: api.genesisHash, era, nonce },
        (result) => {
          const { status } = result;

          console.log(`${trace}Status now: ${status.type}`);
          if (status.isFinalized) {
            console.log(
              `${trace}Extrinsic included at block hash ${status.asFinalized}`
            );
            unsub();
          }
        }
      );

    index++;
    await sleep(1000);
  }

  // Now wait one block (with latency).
  await sleep(7000);

  const sessionKeys = fs
    .readFileSync(csvSessionKeys, { encoding: "utf-8" })
    .split("\n");
  /// Now set the session keys.
  let sessionIndex = 0;
  for (const controller of controllers) {
    console.log(sessionKeys[sessionIndex]);
    const proposal = api.tx.session.setKeys(sessionKeys[sessionIndex] as any, "0x");
    const nonce = Number(startingNonce) + index;
    const trace = `Index ${nonce} | `;

    console.log(
      `${trace}Sending extrinsic Session::set_keys as ${controller}.`
    );
    const unsub = await api.tx.sudo
      .sudoAs(controller, proposal)
      .signAndSend(
        sudoSigner,
        { blockHash: api.genesisHash, era, nonce },
        (result) => {
          const { status } = result;
          console.log(`${trace}Status now: ${status.type}`);

          if (status.isFinalized) {
            console.log(
              `${trace}Extrinsic included at block hash ${status.asFinalized}.`
            );
            unsub();
          }
        }
      );

    index++;
    sessionIndex++;
    await sleep(1000);
  }

  // Waits on block (with latency).
  await sleep(7000);

  for (const controller of controllers) {
    
    const proposal = api.tx.staking.validate({ validatorPayment: FiftyKSM } as any);
    const nonce = Number(startingNonce) + index;
    const trace = `Index ${nonce} | `;

    console.log(
      `${trace}Sending extrinsic Staking::validate as ${controller}.`
    );
    const unsub = await api.tx.sudo
      .sudoAs(controller, proposal)
      .signAndSend(
        sudoSigner,
        { blockHash: api.genesisHash, era, nonce },
        (result) => {
          const { status } = result;
          console.log(`${trace}Status now: ${status.type}`);

          if (status.isFinalized) {
            console.log(
              `${trace}Extrinsic included at block hash ${status.asFinalized}`
            );
            unsub();
          }
        }
      );

    index++;
    await sleep(1000);
  }
};
