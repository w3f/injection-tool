import { ApiPromise, WsProvider } from "@polkadot/api";
import { Command } from "commander";
import parse from "csv-parse/lib/sync";
import * as fs from "fs";

const KusamaCanaryEndpoint = "wss://canary-4.kusama.network";

const getApi = (
  endpoint: string = KusamaCanaryEndpoint
): Promise<ApiPromise> => {
  const provider = new WsProvider(endpoint);
  return ApiPromise.create({
    provider,
  });
};

const parseCSV = (filepath: string) => {
  // The CSV file be formatted <dest>,<amount>
  const csvRead = fs.readFileSync(filepath, { encoding: "utf-8" });
  return parse(csvRead);
};

export const injectClaims = async (cmd: Command) => {
  const { endpoint, csv } = cmd;

  const csvParsed = parseCSV(csv);

  const api = await getApi(endpoint);

  csvParsed.map(async (entry: any, index: any) => {
    const [dest, sig] = entry;

    console.log(
      `Sending transaction to claim to ${dest} with signature ${sig}.`
    );
    const hash = await api.tx.claims.claim(dest, sig).send();
    console.log(`Hash: ${hash.toString()}`);
    fs.appendFileSync("claim.hashes.log", hash.toString() + "\n");
  });
};
