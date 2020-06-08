import { ApiPromise, WsProvider } from "@polkadot/api";
import pdKeyring from "@polkadot/keyring";
import { createType, GenericImmortalEra } from "@polkadot/types";
import { Command } from "commander";
import * as fs from "fs";
import { initApi } from "../../helpers";

import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex, hexToU8a } from "@polkadot/util";
import { nominate } from "./nominate";


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const KusamaCanaryEndpoint = "wss://canary-4.kusama.network";

/// We need a file set up like so:
/// - <method>,<source>,<args>
export const sudoAs = async (cmd: Command) => {
  const {
    wsEndpoint,
    csv,
    cryptoType,
    mnemonic,
    suri,
    types,
    jsonPath,
    prevHashes,
  } = cmd;

  const csvParsed = fs
    .readFileSync(csv, { encoding: "utf-8" })
    .split("\n")
    .map((line) => {
      if (!line) return;

      const [method, rest] = line.split(/,(.+)/);
      const [ source, args ] = rest.split(/,(.+)/);

      const propArgs = method === "utility.batch" ? args : args.split(",");

      return {
        method,
        source,
        args: propArgs,
      };
    });

  const prevHashesParsed = fs
    .readFileSync(prevHashes, { encoding: "utf-8" })
    .split("\n");

  // const api = await initApi(wsEndpoint, types);
  const api = await initApi(wsEndpoint);

  const keyring = new pdKeyring({ type: cryptoType });

  let sudoKey: any;
  if (suri) {
    sudoKey = keyring.addFromUri(suri);
  } else if (mnemonic) {
    sudoKey = keyring.addFromMnemonic(mnemonic);
  } else if (jsonPath) {
    sudoKey = keyring.addFromJson(
      JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" }))
    );
  } else {
    throw Error("Failed to pass in a method to get the address.");
  }

  const polkadotPrefixAddr = encodeAddress(sudoKey.address, 0);

  if (polkadotPrefixAddr !== (await api.query.sudo.key()).toString()) {
    console.log(polkadotPrefixAddr);
    console.log((await api.query.sudo.key()).toString());
    throw Error("This is not the secret for the Sudo key.");
  }

  const accountData = await api.query.system.account(polkadotPrefixAddr);
  const startingNonce = accountData.nonce.toNumber();

  const constructSessionKey = (args: any) => {    
    const key1 = u8aToHex(decodeAddress(args[0]))
    const key2 = u8aToHex(decodeAddress(args[1])).slice(2)
    const key3 = u8aToHex(decodeAddress(args[2])).slice(2)
    const key4 = u8aToHex(decodeAddress(args[3])).slice(2)
    const key5 = u8aToHex(decodeAddress(args[4])).slice(2)
    const sessionKeys = key1 + key2 + key3 + key4 + key5
    return sessionKeys
  }

  let index = 0;
  try {
    for (const entry of csvParsed) {
      if (!entry) continue;
      const { method, source, args } = entry as any;
      const [s,m] = method.split('.');

      let proposal: any;

      switch (m) {  // check whether this is unsigned or signed tx action
        case 'claimAttest': 
          try {
            const unsub = await api.tx.claims[m](source, ...args)
              .send((result: any) => {
                const { status } = result;
  
                console.log(`Current status is ${status.type}.`);
                if (status.isFinalized) {
                  console.log(
                    `Transaction included at block hash ${status.asFinalized}`
                  );
                  unsub();
                }
              });
          } catch (err) {
            console.error(`Submitting unsigned tx: \t${err}`);
          }
          break;
        default:
          switch (m) {
            case 'nominate':
              proposal = api.tx[s][m](args);
              break;
            case 'sudo':
              // TODO: need to test & verify
              proposal = api.tx[s][m]((args[0], (args[1], args[2], args[3])));
              break;
            case 'setKeys':
              const sessionKeys = constructSessionKey(args);
              proposal = api.tx[s][m](sessionKeys, args[5]);
              break;
            case 'validate':
              proposal = api.tx[s][m]({commission: args[0]});
              break;
            case 'batch': // restruct the batchCalls
              const functionCalls = JSON.parse(`[${args}]`)
              const batchCalls : any = [];

              functionCalls.forEach((txDetails : any) => {
                const { method, section } = api.registry.findMetaCall(hexToU8a(txDetails.callIndex));
                if (method === "bond") {
                  proposal = api.tx[section][method](txDetails.controller, 
                    txDetails.valueBonded, txDetails.paymentDestination);
                } else if (method === "nominate") {
                  proposal = api.tx[section][method](txDetails.candidates);
                } else if (method === "setController") {
                  proposal = api.tx[section][method](txDetails.controller);
                } else if (method === "setKeys") {
                  const sessionKeys = constructSessionKey(txDetails.keys);
                  proposal = api.tx[section][method](sessionKeys, txDetails.proof);
                } else if (method === "validate") {
                  proposal = api.tx[section][method]({ commission: txDetails.commission });
                }
                batchCalls.push(proposal);
              })

              proposal = api.tx[s][m](batchCalls);
              break;
            default:
              proposal = api.tx[s][m](...args);
          }

          const nonce = Number(startingNonce) + index;

          const era = createType(
            api.registry,
            "ExtrinsicEra",
            new GenericImmortalEra(api.registry)
          );
  
          const logString = `Sending transaction ${s}::${m} from ${source} with sudo key ${polkadotPrefixAddr} and nonce: ${nonce}.`;
          console.log(logString);
  
          const thisIndex = index;
  
          const unsub = await api.tx.sudo
            .sudoAs(source, proposal)
            .signAndSend(
              sudoKey,
              { blockHash: api.genesisHash, era, nonce },
              (result) => {
                const { status } = result;
  
                console.log("Current status is", status.type);
                fs.appendFileSync(
                  "sudAs.hashes.log",
                  logString + "\n" + "Current status is" + status.type + "\n"
                );
  
                if (status.isFinalized) {
                  console.log(
                    `Transaction included at blockHash ${status.asFinalized}`
                  );
                  fs.appendFileSync(
                    "sudoAs.hashes.map.log",
                    `${logString}\t${status.asFinalized.toString()}\t${
                      prevHashesParsed[thisIndex]
                    }\n`
                  );
                  fs.appendFileSync(
                    "sudoAs.hashes.log",
                    logString + "\n" + status.asFinalized.toString() + "\n"
                  );
                  // Loop through Vec<EventRecord> to display all events
                  // events.forEach(({ phase, event: { data, method, section } }) => {
                  //   fs.appendFileSync(
                  //     "sudoAs.hashes.log",
                  //     `\t' ${phase}: ${section}.${method}:: ${data}\n`
                  //   );
                  // });
                  unsub();
                }
              }
            );
  
          index++;
      }
      await sleep(1000);

    }
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};
