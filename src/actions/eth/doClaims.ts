import { Command } from "commander";
import * as fs from "fs";
import Web3 from "web3";

const claims = require("../../../build/contracts/Claims.json");

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
};

export const doClaims = async (cmd: Command) => {
  const { csv, claims, providerUrl, from, gas, gasPrice, nonce, output, password } = cmd;
  if (!from) {
    throw new Error("A `from` address is required!");
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  const destinations: any[] = [];
  const pubKeys: any[] = [];
  fs.readFileSync(csv, { encoding: "utf-8" })
    .split("\n")
    .forEach((entry: any) => {
      const [destination, pubKey] = entry.split(",");
      destinations.push(destination);
      pubKeys.push(pubKey);
    });

  const txParams: any = {
    from,
    gas,
    gasPrice,
  };

  if (destinations.length != pubKeys.length) {
    throw new Error(
      "Attempted to supply arrays of non-equal lengths to `injectAllocations`!"
    );
  }

  const startingNonce = Number(nonce);

  let nonceCounter = 0;
  for (let i = 0; i < destinations.length; i++) {
    console.log(
      `Sending claim for allocation at ${destinations[i]} for pubkey ${
        pubKeys[i]
      } with nonce ${startingNonce + i}`
    );

    const encoded = claimsContract.methods
      .claim(destinations[i], pubKeys[i])
      .encodeABI();

    const tx = Object.assign(txParams, {
      data: encoded,
      to: claimsContract.options.address,
      nonce: startingNonce + i,
    });

    const txObj = await w3.eth.personal.signTransaction(tx, password);

    fs.appendFileSync(output, txObj.raw + '\n');
    nonceCounter++;
  }

  console.log('Next nonce:', startingNonce + nonceCounter);
};
