import Web3 from "web3";
import { Command } from "commander";
import * as fs from "fs";

const FrozenToken = require("../../../build/contracts/FrozenToken.json");

export const frozenTokenDeploy = async (cmd: Command) => {
  const {
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

  const encoded = new w3.eth.Contract(FrozenToken.abi)
    .deploy({
      data: FrozenToken.bytecode,
      arguments: [
        "1000000", // One thousand total supply.
        owner,
      ],
    })
    .encodeABI();

  const tx = Object.assign(txParams, { data: encoded, nonce: Number(nonce) });
  const txObj = await w3.eth.personal.signTransaction(tx, password);

  fs.writeFileSync(output, txObj.raw);

  console.log(`Raw transaction written out to ${output}.`);
  console.log(
    "Use the injection-tool broadcast command to broadcast this to the network."
  );
  console.log(
    `If you are generating more transactions use --nonce ${Number(nonce) + 1}`
  );
};
