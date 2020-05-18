import Web3 from "web3";
import { Command } from "commander";
import * as fs from "fs";

const Claims = require("../../../build/contracts/Claims.json");

export const claimsDeploy = async (cmd: Command) => {
  const {
    dotIndicator,
    from,
    gas,
    gasPrice,
    owner,
    password,
    nonce,
    output,
    providerUrl,
  } = cmd;

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));

  const txParams = {
    from,
    gas,
    gasPrice,
  };

  console.log("Now deploying the Claims contract to Ethereum.");
  const encoded = new w3.eth.Contract(Claims.abi)
    .deploy({
      data: Claims.bytecode,
      arguments: [
        owner,
        dotIndicator,
        "5", // Five blocks set up delay.
      ],
    })
    .encodeABI();

  const tx = Object.assign(txParams, { data: encoded, nonce: Number(nonce) });
  const txObj = await w3.eth.personal.signTransaction(tx, password);

  fs.writeFileSync(output, txObj.raw);

  console.log(`Raw transaction written out to ${output}.`);
  console.log("Use the injection-tool broadcast command to broadcast this to the network.")
  console.log(`If you are generating more transactions use --nonce ${Number(nonce) + 1}`)
};
