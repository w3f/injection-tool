import * as fs from "fs";
import Web3 from "web3";

import { convertFromDecimalString } from "./vesting";

const Claims = require("../../../build/contracts/Claims.json");
const FrozenToken = require("../../../build/contracts/FrozenToken.json");

export const initClaims = async (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return await new w3.eth.Contract(Claims.abi, address);
};

export const initToken = async (address: string, provider: string) => {
  const w3 = new Web3(new Web3.providers.WebsocketProvider(provider));
  return await new w3.eth.Contract(FrozenToken.abi, address);
}

enum CsvFileType {
  Amendments,
  Claim,
  IncreaseVested,
  Indices,
  Regular,
  Vested,
}

const getCsvFileType = (str: string): CsvFileType => {
  switch (str.toLowerCase()) {
    case "amendments": return CsvFileType.Amendments;
    case "claim": return CsvFileType.Claim;
    case "increasevested": return CsvFileType.IncreaseVested;
    case "indices": return CsvFileType.Indices;
    case "regular": return CsvFileType.Regular;
    case "vested": return CsvFileType.Vested;
    default: throw Error("Unknown csv file type.")
  }
}

type Options = {
  claimAddress: string;
  csvFileType: string;
  csv: string;
  frozenTokenAddress: string;
  providerUrl: string;
}

export const checkCsv = async (opts: Options) => {
  const { claimAddress, csvFileType, csv, frozenTokenAddress, providerUrl } = opts;

  const frozenToken = await initToken(frozenTokenAddress, providerUrl);
  const claims = await initClaims(claimAddress, providerUrl)

  const fileType = getCsvFileType(csvFileType);

  switch (fileType) {
    case CsvFileType.Amendments: {
      const file = fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      let errors = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const [old,amended] = line.split(",");
        const result = await claims.methods.amended(old).call();
        if (result.toLowerCase() !== amended.toLowerCase()) {
          console.log(`|${counter}| Failed! ADDRESS: ${old} GOT ${result} EXPECTED ${amended}`);
          errors++;
        } else {
          console.log(`|${counter}| OK`);
        }
        counter++
      }
      
      console.log(`DONE\nERRORS FOUND: ${errors}`);
      break;
    }
    case CsvFileType.Claim: {
      const file = fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      let errors = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const [ethAddr, pubKey] = line.split(",");
        const result = await claims.methods.claims(ethAddr).call();
        // console.log(result);
        if (result.pubKey.toLowerCase() !== pubKey.toLowerCase()) {
          console.log(`|${counter}| Failed! ADDRESS ${ethAddr} GOT ${result.pubKey} EXPECTED ${pubKey}`);
          errors++;
        } else {
          console.log(`|${counter}| OK`);
        }
        counter++;
      }
      console.log(`DONE\nERRORS FOUND: ${errors}`);
      break;
    }
    case CsvFileType.IncreaseVested: {
      const file =fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      let errors = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const [ethAddr, amt] = line.split(",");
        const amount = convertFromDecimalString(amt);
        const result = await claims.methods.claims(ethAddr).call();
        if (result.vested.toString() !== amount) {
          console.log(`|${counter}| Failed! ADDRESS ${ethAddr} GOT ${result.vested.toString()} EXPECTED ${amount}`);
          errors++;
        } else {
          console.log(`|${counter}| OK`);
        }
        counter++;
      }
      console.log(`DONE\nERRORS FOUND: ${errors}`);
      break;
    }
    case CsvFileType.Indices: {
      const file = fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      let errors = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const ethAddr = line;
        const result = await claims.methods.claims(ethAddr).call();
        if (Number(result.index) !== counter) {
          console.log(`|${counter}| Failed! ADDRESS ${ethAddr} GOT ${Number(result.index)} EXPECTED ${counter}`);
          errors++;
        } else {
          console.log(`|${counter}| OK`);
        }
        counter++;
      }
      console.log(`DONE\nERRORS FOUND: ${errors}`);

      break;
    }
    case CsvFileType.Regular: {
      const file = fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      let errors = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const [ethAddr, amt] = line.split(",");
        const amount = convertFromDecimalString(amt);
        const result = await frozenToken.methods.balanceOf(ethAddr).call();
        if (result.toString() !== amount) {
          console.log(`|${counter}| Failed! ADDRESS ${ethAddr} GOT ${result.toString()} EXPECTED ${amount}`);
          errors++;
        } else {
          console.log(`|${counter}| OK`);
        }
        counter++;
      }
      console.log(`DONE\nERRORS FOUND: ${errors}`);

      break;
    }
    case CsvFileType.Vested: {
      const file = fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      let errors = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const [ethAddr,amt] = line.split(",");
        const amount = convertFromDecimalString(amt);
        const result = await claims.methods.claims(ethAddr).call();
        if (result.vested.toString() !== amount) {
          console.log(`|${counter}| Failed! ADDRESS ${ethAddr} GOT ${result.vested.toString()} EXPECTED ${amount}`);
          errors++;
        } else {
          console.log(`|${counter}| OK`);
        }
        counter++;
      }
      console.log(`DONE\nERRORS FOUND: ${errors}`);
      break;
    }
    default: throw Error("Should never reach here. Something went wrong.")
  }
}
