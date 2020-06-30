import Web3 from "web3";
import * as fs from "fs";

// Takes a string like "file,file,file" and gives us back [file,file,file].
const splitCsvs = (csv: string): string[] => {
  if (csv.indexOf(",") === -1) {
    return [csv];
  } else {
    return csv.split(",");
  }
};

type BroadcastOptions = {
  batch: string;
  csv: string;
  providerUrl: string;
};

const broadcast = async (opts: BroadcastOptions) => {
  const { batch, csv, providerUrl } = opts;

  const csvs = splitCsvs(csv);

  const w3 = new Web3(new Web3.providers.WebsocketProvider(providerUrl));

  let submissionCount = 0;
  for (const filePath of csvs) {
    const file = fs.readFileSync(filePath, { encoding: "utf-8" });

    const rawTxs = file.split("\n").filter((entry: string) => entry !== "");

    for (const rawTx of rawTxs) {
      console.log(
        `Broadcasting ${submissionCount} - ${rawTx.slice(
          0,
          12
        )}...${rawTx.slice(-10)}`
      );

      try {
        const promise = w3.eth
          .sendSignedTransaction(rawTx)
          .on("receipt", (receipt: any) => {
            fs.appendFileSync(
              "receipts",
              `${rawTx} :: ${JSON.stringify(receipt)}`
            );
          });

        if (Number(batch) <= 1) {
          await promise;
        } else if (submissionCount % Number(batch) === 0) {
          console.log("Waiting for batch to complete.");
          await promise;
        } else if (submissionCount === rawTxs.length - 1) {
          console.log("Waiting for final broadcast to complete.");
          await promise;
        }
      } catch (err) {
        console.error(err);
      }

      submissionCount++;
    }
  }
};

export default broadcast;
