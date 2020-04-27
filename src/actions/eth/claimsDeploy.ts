import Web3 from "web3";
import { Command } from "commander";

const Claims = require("../../../build/contracts/Claims.json");

export const claimsDeploy = async (cmd: Command) => {
  const {
    dotIndicator,
    from,
    gas,
    gasPrice,
    owner,
    password,
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
        "5000", // Five thousand blocks set up delay.
      ],
    })
    .encodeABI();

  const tx = Object.assign(txParams, { data: encoded });
  const claimsHash = await w3.eth.personal.sendTransaction(tx, password);

  console.log(`Claims transaction hash: ${claimsHash}`);
};
