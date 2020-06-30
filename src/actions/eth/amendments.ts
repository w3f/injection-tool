import { Command } from "commander";
import * as fs from "fs";
import Web3 from "web3";

const claims = require("../../../build/contracts/Claims.json");

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
};

export const makeAmendments = async (cmd: Command) => {
  const {
    csv,
    claims,
    providerUrl,
    from,
    gas,
    gasPrice,
    nonce,
    output,
    password,
  } = cmd;
  if (!from) {
    throw new Error("A `from` address is required!");
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  const originals: any[] = [];
  const amends: any[] = [];
  fs.readFileSync(csv, { encoding: "utf-8" })
    .split("\n")
    .filter((line: any) => line !== "")
    .forEach((entry: any) => {
      const [original, amend] = entry.split(",");
      originals.push(original);
      amends.push(amend);
    });

  const txParams: any = {
    from,
    gas,
    gasPrice,
  };

  if (originals.length != amends.length) {
    throw new Error(
      "Attempted to supply arrays of non-equal lengths to `injectAllocations`!"
    );
  }

  const step = Math.min(50, originals.length);

  const startingNonce = Number(nonce);

  let nonceCounter = 0;

  const start = 0;
  for (
    let i = start, end = step;
    i < originals.length;
    i += step, end = Math.min(end + step, originals.length)
  ) {
    console.log(`Amendments | i: ${i} | end: ${end - 1} | Signing...`);

    const originalsArg = originals.slice(i, end);
    const amendsArg = amends.slice(i, end);

    const encoded = claimsContract.methods
      .amend(originalsArg, amendsArg)
      .encodeABI();

    const tx = Object.assign(txParams, {
      data: encoded,
      to: claimsContract.options.address,
      nonce: startingNonce + nonceCounter,
    });

    const txObj = await w3.eth.personal.signTransaction(tx, password);

    fs.appendFileSync(output, txObj.raw + "\n");

    nonceCounter++;
  }

  console.log("Next nonce:", startingNonce + nonceCounter);
};
