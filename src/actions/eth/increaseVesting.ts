import { Command } from "commander";
import Web3 from "web3";
import * as fs from "fs";

const claims = require("../../../build/contracts/Claims.json");

export const initclaims = (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return new w3.eth.Contract(claims.abi, address);
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

export const checkIfDuplicateExists = (w: Array<any>) => {
  return new Set(w).size !== w.length;
};

export const increaseVesting = async (cmd: Command) => {
  const { csv, claims, providerUrl, from, gas, gasPrice, nonce, output, password } = cmd;

  if (!from) {
    throw new Error("A `from` address is required!");
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  const csvParsed = fs.readFileSync(csv, { encoding: "utf-8" }).split("\n").filter((line: any) => line !== "");
  const destinations = csvParsed.map((entry: any) => entry[0]);
  const amounts = csvParsed.map((entry: any) =>
    convertFromDecimalString(entry[1])
  );

  const isDuplicate = checkIfDuplicateExists(destinations);

  if (isDuplicate) {
    throw new Error("Duplicate address exists in the data file!");
  }

  const txParams: any = {
    from,
    gas,
    gasPrice,
  };

  if (destinations.length != amounts.length) {
    throw new Error(
      "Attempted to supply arrays of non-equal lengths to `increaseVesting`!"
    );
  }

  const startingNonce = Number(nonce)

  const processSize = Math.min(10, destinations.length);
  const numOfTimes = Math.ceil(destinations.length / processSize);
  let i = 0;
  let start = 0;
  let end = processSize;

  while (i < numOfTimes) {
    const vestingArg = destinations.slice(start, end);
    const amtArg = amounts.slice(start, end);

    const encoded = claimsContract.methods
      .increaseVesting(vestingArg, amtArg)
      .encodeABI();

    const tx = Object.assign(txParams, {
      data: encoded,
      to: claimsContract.options.address,
      nonce: startingNonce + i,
    });

    const txObj = await w3.eth.personal.signTransaction(tx, password);

    fs.appendFileSync(output, txObj.raw + '\n');

    start = end;
    end = Math.min(end + processSize, destinations.length);

    console.log("Updated start : ", start);
    console.log("Updated end: ", end);

    i++;
  }
  console.log('Next nonce:', startingNonce + i);

};
