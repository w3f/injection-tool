import Keyring from "@polkadot/keyring";
import * as fs from "fs";

import { initApi } from "../../../helpers";
import { Block } from "./types";
import { IgnoreMethods } from "./consts";
import { initializeSigner } from "./helpers";
import { ApiPromise } from "@polkadot/api";
import { hexToU8a } from "@polkadot/util";

const sendHandler = (result: any, unsub: any) => {
  const { status } = result;

  console.log(`Current status is ${status.type}`);
  if (status.isFinalized) {
    console.log(`Included in block hash ${status.asFinalized}`);
    unsub();
  }
}

type CallDetails = {
  args: any;
  callIndex: string;
};

/**
 * Recursive function to create the correct calls.
 * @param api 
 * @param extrinsic 
 */
const createCall = (api: ApiPromise, details: CallDetails): any => {
  const { args, callIndex } = details;
  const { method, section } = api.registry.findMetaCall(
    hexToU8a(callIndex),
  );

  console.log(details);

  switch (method) {
    case "killStorage":
      return api.tx[section][method](args.keys);
    case "setStorage":
      return api.tx[section][method](args.items);
    case "bond":
      return api.tx[section][method](args.controller, args.value, args.payee);
    case "nominate":
      return api.tx[section][method](args.targets);
    case "setController":
      return api.tx[section][method](args.controller);
    case "setKeys":
      return api.tx[section][method](args.keys, args.proof);
    case "validate":
      return api.tx[section][method](args.prefs);
    case "forceTransfer":
      return api.tx[section][method](args.source, args.dest, args.value);
    case "transfer":
      return api.tx[section][method](args.dest, args.value);
    case "proxy": {
      const call: any = createCall(api, args.call);
      return api.tx[section][method](args.real, args.force_proxy_type, call);
    }
    case "sudo": {
      return api.tx[section][method](createCall(api, args.call))
    }
    case "batch": {
      const calls = args.calls.map((call: CallDetails) => createCall(api, call));
      return api.tx[section][method](calls);
    }
    case "anonymous": {
      return api.tx[section][method](args.proxy_type, args.index);
    }
    default: {
      throw new Error(`############### Method missing to check ############# : ${section} ${method}`);
    }
  }
}

// class Logger {
//   constructor(dry = false) {

//   }
// }

type Options = {
  dbPath: string;
  dry: boolean;
  ensureComplete: boolean;
  suri: string;
  wsEndpoint: string;
}

const migrate = async (opts: Options) => {
  const { dbPath, dry, ensureComplete, suri, wsEndpoint } = opts;

  const api = await initApi(wsEndpoint);

  // Get the database contents, sort it by block number and filter the transactions
  // we don't want.
  const blocks: Block[] = fs.readFileSync(dbPath, { encoding: "utf-8" })
    .split("\n")                    // Split by newlines
    .filter(line => line !== "")    // filter empty lines
    .map(line => JSON.parse(line))  // make 'em JSON
    .sort((a: any, b: any) => {     // sort them in ascending
      return a.number - b.number;
    });
    
  const signer = initializeSigner(suri);
  console.log(`Signer address: ${signer.address}`);

  const sudo = await api.query.sudo.key();
  if (!dry && (signer.address !== sudo.toString())) {
    throw new Error(
`NOT SUDO SIGNER.. GOT ${signer.address} EXPECTED ${sudo.toString()}`
    );
  }

  const { nonce } = await api.query.system.account(signer.address);
  const startingNonce: number = nonce.toNumber();

  // Now cycle through blocks ascending and inject new transactions.
  let index = 0;
  for (const block of blocks) {
    const { extrinsics, number } = block;
    console.log(`Checking block ${number}`);

    for (const extrinsic of extrinsics) {
      const { args, hash, method, signature } = extrinsic;
      
      if (IgnoreMethods.includes(method)) {
        console.log(`Skipping ignore method: ${method}`)
        continue;
      }

      const [module, txType] = method.split('.');

      if (txType === "sudoUncheckedWeight" && args[0].args.code) {
        console.log(`Skipping runtime upgrade.`);
        continue;
      }

      if (txType === "claimAttest") {
        // The only unsigned transaction.
        try {
          // const unsub = await api.tx[module][txType](...args).send((result) => {
          //   sendHandler(result, unsub);
          // });
        } catch (err) {
          throw new Error(`Failed submitting transfaction: ${err}`);
        } 
      } else {
        const { signer } = signature;
        const currentNonce = Number(startingNonce) + index;
        const nonceStr = `Nonce: ${currentNonce} |`;
        const logStr = `${nonceStr} Migrating transaction ${module}.${txType} originally sent by ${signer}.`;

        console.log(logStr);
        console.log(extrinsic);
        console.log(`Args: ${JSON.stringify(args)}`);
        
        /// Construct the proposal.
        let proposal = null;
        switch (txType) {
          case "batch": {
            const calls = args[0].map((details: CallDetails) => {
              return createCall(api, details);
            });
            proposal = api.tx[module][txType](calls);
            break;
          }
          case "sudo": {
            proposal = api.tx[module][txType](createCall(api, args[0])); 
            break;
          }
          case "sudoUncheckedWeight": {
            proposal = api.tx[module][txType](createCall(api, args[0]), args[1]);
            break;
          }
          case "asMulti": {
            proposal = api.tx[module][txType](args[0], args[1], args[2], createCall(api, args[3]));
            break;
          }
          default:
            proposal = api.tx[module][txType](...args);
        }
      }
    }
  }
}

export default migrate;
