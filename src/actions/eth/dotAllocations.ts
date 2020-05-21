import { Command } from "commander";
import Web3 from "web3";
import * as fs from "fs";

const FrozenToken = require("../../../build/contracts/FrozenToken.json");

export const initFrozenToken = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(FrozenToken.abi, address);
};

export const convertFromDecimalString = (decimalString: any) => {
  if (decimalString.indexOf(".") == -1) {
    return decimalString.concat("000");
  }

  let [units, decimals] = decimalString.split(".");
  if (decimals.length > 3) {
    throw new Error(
      "Incorrect input " + decimalString + " given to convertFromDecimalString"
    );
  }
  if (decimals.length < 3) {
    decimals = decimals.padEnd(3, "0");
  }
  return units.concat(decimals).replace(/^0+/, "");
};

export const dotAllocations = async (cmd: Command) => {
  const { csv, frozenToken, providerUrl, from, gas, gasPrice, nonce, output, password } = cmd;
  if (!from) {
    throw new Error("A `from` address is required!");
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const frozenTokenContract = initFrozenToken(frozenToken, providerUrl);

  const csvParsed = fs.readFileSync(csv, { encoding: "utf-8" }).split("\n").filter((line: any) => line !== "").map((line: any) => line.split(','));
  const destinations = csvParsed.map((entry: any) => entry[0]);
  const amounts = csvParsed.map((entry: any) =>
    convertFromDecimalString(entry[1])
  );

  const txParams: any = {
    from,
    gas,
    gasPrice,
  };

  if (destinations.length != amounts.length) {
    throw new Error(
      "Attempted to supply arrays of non-equal lengths to `injectAllocations`!"
    );
  }

  const startingNonce = Number(nonce);

  let i = 0;
  while (i < destinations.length) {
    console.log(
      `Signing transfer of ${amounts[i]} FrozenToken to ${
        destinations[i]
      }. Has nonce ${startingNonce + i}`
    );

    const encoded = frozenTokenContract.methods
      .transfer(destinations[i], amounts[i])
      .encodeABI();

    const tx = Object.assign(txParams, {
      data: encoded,
      to: frozenTokenContract.options.address,
      nonce: startingNonce + i,
    });

    const txObj = await w3.eth.personal.signTransaction(tx, password);

    fs.appendFileSync(output, txObj.raw + '\n');

    i++;
  }
  console.log("TotalAllocationCount:", i);
  console.log('Next nonce:', startingNonce + i);

};
