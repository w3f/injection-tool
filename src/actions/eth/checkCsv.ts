import { Command } from "commander";
import * as fs from "fs";
import Web3 from "web3";
import { initFrozenToken } from "./dotAllocations";

const w3Util = new Web3().utils;

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

  const frozenToken = await initFrozenToken(frozenTokenAddress, providerUrl);
  const claims = await initClaims(claimAddress, providerUrl)

  const fileType = getCsvFileType(csvFileType);

  switch (fileType) {
    case CsvFileType.Amendments: {
      const file = fs.readFileSync(csv, { encoding: "utf-8" });
      let counter = 0;
      for (const line of file.split("\n").filter(line => line !== "")) {
        const [old,amended] = line.split(",");
        const result = await claims.methods.amended(old).call();
        if (result.toLowerCase() !== amended.toLowerCase()) {
          console.log(`|${counter}| Failed! ADDRESS: ${old} GOT ${result} EXPECTED ${amended}`);

        } else {
          console.log(`|${counter}| OK`);
        }
        counter++
      }
      break;
    }
    case CsvFileType.Claim: {
      break;
    }
    case CsvFileType.IncreaseVested: {
      break;
    }
    case CsvFileType.Indices: {
      break;
    }
    case CsvFileType.Regular: {
      break;
    }
    case CsvFileType.Vested: {
      break;
    }
    default: throw Error("Should never reach here. Something went wrong.")
  }
}
