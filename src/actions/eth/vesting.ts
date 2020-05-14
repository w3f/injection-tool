import { Command } from "commander";
import Web3 from "web3";
import parse from "csv-parse/lib/sync";
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

export const vesting = async (cmd: Command) => {
  const { csv, claims, providerUrl, from, gas, gasPrice, nonce, output, password } = cmd;
  if (!from) {
    throw new Error("A `from` address is required!");
  }

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = initclaims(claims, providerUrl);

  const csvParsed = parse(fs.readFileSync(csv, { encoding: "utf-8" }));
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
      "Attempted to supply arrays of non-equal lengths to `setVesting`!"
    );
  }

  const step = Math.min(50, destinations.length);

  const startingNonce = Number(nonce);

  let nonceCounter = 0;
  const start = 0;
  for (
    let i = start, end = step;
    i < destinations.length;
    i += step, end = Math.min(end + step, destinations.length)
  ) {
    console.log(`Vesting | i: ${i} | end: ${end - 1} | Sending...`);

    const vestingArg = destinations.slice(i, end);
    const amtArg = amounts.slice(i, end);

    console.log(vestingArg);
    console.log(amtArg);
    const encoded = claimsContract.methods
      .setVesting(vestingArg, amtArg)
      .encodeABI();
    const tx = Object.assign(txParams, {
      data: encoded,
      to: claimsContract.options.address,
      nonce: startingNonce + nonceCounter,
    });

    const txObj = await w3.eth.personal.signTransaction(tx, password);

    fs.appendFileSync(output, txObj.raw + '\n');

    nonceCounter++;
  }

  console.log('Next nonce:', startingNonce + nonceCounter);
};
