import { Command } from "commander";
import * as fs from "fs";
import Web3 from "web3";
// @ts-ignore
import Api from "@parity/api";

const w3Util = new Web3().utils;

const claims = require("../../../build/contracts/Claims.json");

export const initclaims = async (address: string, provider: string) => {
  // const w3 = new Web3(new Web3.providers.HttpProvider(provider));
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return await new w3.eth.Contract(claims.abi, address);
};

export const checkAmount = async (cmd: Command) => {
  const { csv, claims, providerUrl, startBlock, endBlock } = cmd;

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
  const claimsContract = await initclaims(claims, providerUrl);

  const destinations: any[] = [];
  const amounts: any[] = [];
  fs.readFileSync(csv, { encoding: "utf-8" })
    .split("\n")
    .forEach((entry: any) => {
      const [destination, amount] = entry.split(",");
      destinations.push(destination.toLowerCase());
      amounts.push(amount);
    });

  // const provider = new Api.Provider.Ws(providerUrl);
  const total: any = destinations.length;
  let count: any = 0;

  (
    await claimsContract.getPastEvents("VestedIncreased", {
      fromBlock: startBlock,
      toBlock: endBlock,
    })
  ).forEach((event: any) => {
    const { eth, newTotal } = event.returnValues;
    const index = destinations.indexOf(eth.toLowerCase());

    if (index > -1) {
      if (amounts[index] !== newTotal) {
        console.log(
          `Warning: ${
            destinations[index]
          }'s amount defined in csv is not same as the one on-chain. csv:${
            amounts[index]
          } , on-chain:${(newTotal / 1000).toFixed(3)}`
        );
      }
      destinations.splice(index, 1);
      amounts.splice(index, 1);
      count += 1;
    }
  });

  if (total === count) {
    console.log(`${count} out of ${total} went through successfully.`);
  } else {
    console.log(`${count} out of ${total} went through successfully.`);
    console.log(`Missing ${destinations}.`);
  }
};
