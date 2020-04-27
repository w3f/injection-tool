import Web3 from "web3";
import { Command } from "commander";

const FrozenToken = require("../../../build/contracts/FrozenToken.json");

export const frozenTokenDeploy = async (cmd: Command) => {
  const { from, gas, gasPrice, owner, password, providerUrl } = cmd;

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));

  const txParams = {
    from,
    gas,
    gasPrice,
  };

  console.log("Now deploying the FrozenToken contract to Ethereum.");
  const encoded = new w3.eth.Contract(FrozenToken.abi)
    .deploy({
      data: FrozenToken.bytecode,
      arguments: [
        "1000000", // One thousand total supply.
        owner,
      ],
    })
    .encodeABI();

  const tx = Object.assign(txParams, { data: encoded });
  const claimsHash = await w3.eth.personal.sendTransaction(tx, password);

  console.log(`FrozenToken transaction hash: ${claimsHash}`);
};
