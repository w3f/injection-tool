import { Command } from "commander";
import * as fs from "fs";
import Web3 from "web3";

import { sleep } from "../../helpers";

const w3Util = new Web3().utils;

const Claims = require("../../../build/contracts/Claims.json");

export const assignIndices = async (cmd: Command) => {
  const {
    claims,
    csv,
    from,
    gas,
    gasPrice,
    password,
    providerUrl,
    start,
    nonce,
    output
  } = cmd;

  const txParams = {
    from,
    gas,
    gasPrice,
  };

  const addresses = fs.readFileSync(csv, { encoding: "utf-8" }).split("\n");

  // Web3.js instantiation.
  const w3Provider = new Web3.providers.WebsocketProvider(providerUrl);
  const w3 = new Web3(w3Provider);

  const claimsContract = new w3.eth.Contract(Claims.abi, claims);

  const step = Math.min(50, addresses.length);

  const startingNonce = Number(nonce);

  let nonceCounter = 0;

  for (
    let i = start, end = step;
    i < addresses.length;
    i += step, end = Math.min(end + step, addresses.length)
  ) {
    const currentNonce = startingNonce + nonceCounter;
    console.log(
      `Injecting indices... ${i} - ${end - 1} | Current nonce ${currentNonce}`
    );

    const indicesArg = addresses.slice(i, end);

    const encoded = claimsContract.methods
      .assignIndices(indicesArg)
      .encodeABI();

    const tx = Object.assign(txParams, {
      data: encoded,
      to: claims,
      nonce: currentNonce,
    });

    const txObj = await w3.eth.personal.signTransaction(tx, password);

    fs.appendFileSync(output, txObj.raw + '\n');

    nonceCounter++;
  }

  console.log('Next nonce:', startingNonce + nonceCounter);
};
