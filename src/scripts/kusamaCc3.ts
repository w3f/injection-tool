import Keyring, { encodeAddress, decodeAddress } from "@polkadot/keyring";
import { createType, GenericImmortalEra } from "@polkadot/types";
import * as util from "@polkadot/util";

import camel from "camelcase";
import * as fs from "fs";
import { initApi, sleep } from "../helpers";

const main = async (cmd: any) => {
  const { csv, cryptoType, mnemonic, wsEndpoint } = cmd;

  const api = await initApi(wsEndpoint);
  const keyring = new Keyring({ type: cryptoType });
  // api.tx.staking.nominate().sign
  const input = fs.readFileSync(csv, { encoding: "utf-8" }).split("\n");

  const sudoSigner = keyring.addFromMnemonic(mnemonic);
  const sudo = await api.query.sudo.key();
  if (sudoSigner.address.toString() !== sudo.toString()) {
    throw new Error("Sudos dont match!");
  }

  const startingNonce = await api.query.system.accountNonce(sudoSigner.address);

  let counter = 0;
  let lineCounter = 0;
  for (const line of input) {
    lineCounter++;
    const json = JSON.parse(line);

    const nonce = Number(startingNonce) + counter;
    const trace = `Line ${lineCounter} | Nonce ${nonce} | `;

    const era = createType(
      api.registry,
      "ExtrinsicEra",
      new GenericImmortalEra(api.registry)
    );

    if (json.kind == 2) {
      console.log("the second kind");
      // only have to do sudoAs
      try {
        const { moduleId, callId, sender, params } = json;
        if (callId === "validate") {
          const payment = params[0].validatorPayment;
          if (payment != "0") {
            params[0] = {
              commission: 1000000000,
            };
          } else {
            params[0] = {
              commission: 0,
            };
          }
        }
        if (callId === "setKeys") {
          const key1 = decodeAddress(params[0][0]);
          const key2 = decodeAddress(params[0][1]);
          const key3 = decodeAddress(params[0][2]);
          const key4 = decodeAddress(params[0][3]);
          console.log(key1, key2, key3, key4);
        }
        console.log(...params);
        const proposal = api.tx[moduleId][callId](...params);
        console.log(
          `${trace}Sending extrinsic (sudo::sudo_as) ${moduleId}::${callId} with arguments ${JSON.stringify(
            params
          )}`
        );
        const unsub = await api.tx.sudo
          .sudoAs(sender, proposal)
          .signAndSend(
            sudoSigner,
            { blockHash: api.genesisHash, era, nonce },
            (result: any) => {
              const { status } = result;

              if (status.type == "Dropped" || status.type == "Future") {
                throw new Error(`${trace} ${status.type}`);
                process.exit(1);
              }

              console.log(`${trace}Status now: ${status.type}`);
              if (status.isFinalized) {
                console.log(
                  `${trace}Extrinsic included at block hash ${status.asFinalized}`
                );
                unsub();
              }
            }
          );
        counter++;
        await sleep(1000);
      } catch (err) {
        console.log(`${trace}\t\t\t${err}`);
        console.log("blockZEROO");
        process.exit(1);
      }
    } else {
      let { moduleId, callId } = json;

      if (moduleId == "electionsphragmen") moduleId = "electionsPhragmen";

      if (moduleId === "claims" && callId === "claim") {
        const dest = encodeAddress(json.dest, 2);
        const trace = `Line ${lineCounter} | Nonce N/A | `;
        console.log(
          `${trace}Sending ${moduleId}::${callId} with args dest: ${dest} , ethSignature: 0x${json.ethSig}`
        );
        try {
          const unsub = await api.tx.claims
            .claim(dest, `0x${json.ethSig}`)
            .send((result: any) => {
              const { status } = result;

              console.log(`${trace}Current status is ${status.type}.`);
              if (status.isFinalized) {
                console.log(
                  `${trace}Transaction included at block hash ${status.asFinalized}`
                );
                unsub();
              }
            });
        } catch (err) {
          console.error(`${trace}\t\t\t${err}`);
        }
        await sleep(3000);
      } else {
        // It's a normal transaction but we got some handlin' to do...
        if (moduleId === "sudo" && callId === "sudo_as") {
          const [who, params] = JSON.parse(json.params);
          const values = params.value.params.map((entry: any) => {
            if (entry.type === "Address") {
              return encodeAddress(`0x${entry.value}`, 2);
            }
            if (entry.type.indexOf("<BalanceOf>") !== -1) {
              if (entry.value.validatorPayment) {
                const payment = util
                  .hexToBn(util.numberToHex(entry.value.validatorPayment))
                  .toString();
                if (payment != "0") {
                  return { commisssion: 1000000000 };
                }
                return { commission: 1000000000 };
              }
              const res = util.hexToBn(util.numberToHex(entry.value));
              return res;
            }
            return entry.value;
          });
          const callIndex = `0x${params.value.call_index}`;
          const { method, section } = api.registry.findMetaCall(
            util.hexToU8a(callIndex)
          );
          if (method !== camel(params.value.call_name)) {
            throw new Error(
              `doesnt match! ${method} and ${params.value.call_name}`
            );
          }
          if (method === "nominate") {
            values[0] = values[0].map((value: any) =>
              encodeAddress(`0x${value}`, 2)
            );
          }
          if (method === "setKeys") {
            values[0] = values[0].babe
              .concat(values[0].grandpa.slice(2))
              .concat(values[0].im_online.slice(2))
              .concat(values[0].parachains.slice(2))
              .concat("00".repeat(32));
            values[1] = "0x";
          }
          try {
            const proposal = api.tx[section][camel(params.value.call_name)](
              ...values
            );
            const newWho = encodeAddress(`0x${who.value}`, 2);
            console.log(
              `${trace}Sending extrinsic (sudo::sudo_as) ${section}::${method} as ${newWho} with arguments ${JSON.stringify(
                values
              )}`
            );
            const unsub = await api.tx.sudo
              .sudoAs(newWho, proposal)
              .signAndSend(
                sudoSigner,
                { blockHash: api.genesisHash, era, nonce },
                (result: any) => {
                  const { status } = result;

                  if (status.type == "Dropped" || status.type == "Future") {
                    throw new Error(`${trace} status.type`);
                    process.exit(1);
                  }

                  console.log(`${trace}Status now: ${status.type}`);
                  if (status.isFinalized) {
                    console.log(
                      `${trace}Extrinsic included at block hash ${status.asFinalized}`
                    );
                    unsub();
                  }
                }
              );
          } catch (err) {
            console.error(`${trace}\t\t\t${err}`);
            console.log(moduleId);
            console.log("blockOne");
            if (err.toString().indexOf("Priority is too low") == -1) {
              process.exit(1);
            }
          }
        } else if (moduleId === "sudo" && callId === "sudo") {

          const innerJson = JSON.parse(json.params);
          if (innerJson.length > 1) {
            throw new Error("length error woah");
          }
          const { value } = innerJson[0];
          const { params, call_index } = value;
          if (
            value.call_name === "set_storage" ||
            value.call_name === "kill_storage"
          ) {
            console.log("skippin");
            continue;
          }
          if (value.call_name === "set_code") {
            console.log("skip set code");
            continue;
          }
          const values = params.map((entry: any) => {
            if (entry.type === "AccountId") {
              return encodeAddress(entry.value, 2);
            }
            if (entry.type === "Address") {
              return encodeAddress(`0x${entry.value}`, 2);
            }
            if (
              entry.type.indexOf("<BalanceOf>") !== -1 ||
              entry.type.indexOf("Balance")
            ) {
              if (entry.value.validatorPayment) {
                const payment = util
                  .hexToBn(util.numberToHex(entry.value.validatorPayment))
                  .toString();
                if (payment != "0") {
                  return { commisssion: 1000000000 };
                }
                return { commission: 1000000000 };
              }
              const res = util.hexToBn(util.numberToHex(entry.value));
              return res;
            }
            return entry.value;
          });
          const callIndex = `0x${call_index}`;
          const { method, section } = api.registry.findMetaCall(
            util.hexToU8a(callIndex)
          );
          if (value.call_name === "set_key") {
            console.log(`${trace} skip set key`);
            continue;
          }
          if (section === "unknown") {
            console.log(`${trace} skipping UNKNOWN`);
            continue;
          }
          if (value.call_module.toLowerCase() !== section.toLowerCase()) {
            throw new Error("Doesnt match!");
          }

          try {
            // console.log(trace, ...values)
            const proposal = api.tx[section][method](...values);

            console.log(
              `${trace}Sending extrinsic (sudo::sudo) ${section}::${method} with args ${values}`
            );
            const unsub = await api.tx.sudo
              .sudo(proposal)
              .signAndSend(
                sudoSigner,
                { blockHash: api.genesisHash, era, nonce },
                (result: any) => {
                  const { status } = result;

                  if (status.type == "Dropped" || status.type == "Future") {
                    throw new Error(`${trace} ${status.type}`);
                    process.exit(1);
                  }

                  console.log(`${trace}Status now: ${status.type}`);
                  if (status.isFinalized) {
                    console.log(
                      `${trace}Extrinsic included at block hash ${status.asFinalized}`
                    );
                    unsub();
                  }
                }
              );
          } catch (err) {
            console.error(`${trace}\t\t\t${err}`);
            console.log(section);
            console.log(method);
            console.log(...values);
            console.log("blockTwo");
            process.exit(1);
          }
        } else if (moduleId === "sudo" && callId === "set_key") {
          console.log("SKIP SET KEY");
          continue;
        } else {
          const values = JSON.parse(json.params).map((entry: any) => {
            if (entry.type === "Address") {
              return encodeAddress(`0x${entry.value}`, 2);
            }
            if (entry.type.indexOf("<BalanceOf>") !== -1) {
              if (entry.value.validatorPayment) {
                const payment = util
                  .hexToBn(util.numberToHex(entry.value.validatorPayment))
                  .toString();
                if (payment !== "0") {
                  return { commisssion: 1000000000 };
                }
                return { commission: 1000000000 };
              }
              const res = util.hexToBn(util.numberToHex(entry.value));
              return res;
            }
            return entry.value;
          });

          if (callId === "nominate") {
            values[0] = values[0].map((value: any) =>
              encodeAddress(`0x${value}`, 2)
            );
          }

          if (camel(callId) === "setKeys") {
            values[0] = values[0].babe
              .concat(values[0].grandpa.slice(2))
              .concat(values[0].im_online.slice(2))
              .concat(values[0].parachains.slice(2))
              .concat("00".repeat(32));
            values[1] = "0x";
          }

          try {
            const proposal = api.tx[moduleId][camel(callId)](...values);
            const sender = encodeAddress(json.sender.toString(), 2);
            console.log(
              `${trace}Sending extrinsic (sudo::sudo_as) ${moduleId}::${camel(
                callId
              )} as ${sender} with args ${values}`
            );
            const unsub = await api.tx.sudo
              .sudoAs(sender, proposal)
              .signAndSend(
                sudoSigner,
                { blockHash: api.genesisHash, era, nonce },
                (result: any) => {
                  const { status } = result;

                  if (status.type == "Dropped" || status.type == "Future") {
                    throw new Error(`${trace} status.type`);
                    process.exit(1);
                  }

                  console.log(`${trace}Status now: ${status.type}`);
                  if (status.isFinalized) {
                    console.log(
                      `${trace}Extrinsic included at block hash ${status.asFinalized}`
                    );
                    unsub();
                  }
                }
              );
          } catch (err) {
            console.error(`${trace}\t\t\t`, +err);
            console.log(moduleId);
            console.log(camel(callId));
            console.log(...values);
            console.log("block3");
            process.exit(1);
          }
        }
        counter++;
        await sleep(1000);
      }
    }
  }
};

try {
  main({
    csv: "actual-slashed.csv",
    wsEndpoint: "ws://176.58.102.23:9944",
    cryptoType: "sr25519",
  } as any);
} catch (err) {
  console.error(err);
}
