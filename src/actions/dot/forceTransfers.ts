import Keyring from "@polkadot/keyring";
import { createType, GenericImmortalEra } from "@polkadot/types";
import { Command } from "commander";
import { initApi, sleep } from "../../helpers";
import parse from "csv-parse/lib/sync";
import * as fs from "fs";

const parseCSV = (filepath: string) => {
  // The CSV file be formatted <dest>,<amount>
  const csvRead = fs.readFileSync(filepath, { encoding: "utf-8" });
  return parse(csvRead);
};

export const forceTransfers = async (cmd: Command) => {
  const { csv, cryptoType, mnemonic, suri, jsonPath, source, wsEndpoint } = cmd;
  if (!source) {
    throw Error("Source address is required!");
  }

  const csvParsed = parseCSV(csv);

  const api = await initApi(wsEndpoint);
  const keyring = new Keyring({ type: cryptoType });

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

  const startingNonce = await api.query.system.accountNonce(sudoKey.address);
  let counter = 0;
  for (const entry of csvParsed) {
    const [dest, amount] = entry;

    const proposal = api.tx.balances.forceTransfer(source, dest, amount);
    const nonce = Number(startingNonce) + counter;
    const nonceString = `Nonce ${nonce} | `;

    const era = createType(
      api.registry,
      "ExtrinsicEra",
      new GenericImmortalEra(api.registry)
    );

    console.log(
      `${nonceString}Sending transaction Balances::force_transfer from ${source} to ${dest} for amount ${amount}.`
    );
    const unsub = await api.tx.sudo
      .sudo(proposal)
      .signAndSend(
        sudoKey,
        { blockHash: api.genesisHash, era, nonce },
        (result) => {
          const { status } = result;

          console.log(`${nonceString}Current status is ${status.type}.`);
          if (status.isFinalized) {
            console.log(
              `${nonceString}Transaction included at block hash ${status.asFinalized}.`
            );
            unsub();
          }
        }
      );
    counter++;
    await sleep(1000);
  }
};
