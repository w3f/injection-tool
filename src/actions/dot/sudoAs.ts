import { ApiPromise, WsProvider } from "@polkadot/api";
import pdKeyring from "@polkadot/keyring";
import { createType, GenericImmortalEra } from "@polkadot/types";
import { Command } from "commander";
import * as fs from "fs";
import { initApi } from "../../helpers";

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
      const [source, args] = rest.split(/,(.+)/);

      return {
        method,
        source,
        args: args.split(","),
      };
    });

  const prevHashesParsed = fs
    .readFileSync(prevHashes, { encoding: "utf-8" })
    .split("\n");

  const api = await initApi(wsEndpoint, types);
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

  if (sudoKey.address !== (await api.query.sudo.key()).toString()) {
    console.log(sudoKey.address);
    console.log((await api.query.sudo.key()).toString());
    throw Error("This is not the secret for the Sudo key.");
  }

  const accountData = await api.query.system.account(sudoKey.address);
  const startingNonce = accountData.nonce.toNumber();

  let index = 0;
  try {
    for (const entry of csvParsed) {
      if (!entry) continue;

      const { method, source, args } = entry;
      const [s, m] = method.split(".");

      const proposal = api.tx[s][m](...args);
      const nonce = Number(startingNonce) + index;

      const era = createType(
        api.registry,
        "ExtrinsicEra",
        new GenericImmortalEra(api.registry)
      );

      const logString = `Sending transaction ${s}::${m} from ${source} with sudo key ${sudoKey.address} and nonce: ${nonce}.`;
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
      await sleep(1000);
    }
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};
