import pdKeyring from "@polkadot/keyring";
import { createType, GenericImmortalEra, bool } from "@polkadot/types";
import { Command } from "commander";
import * as fs from "fs";
import { initApi, sleep } from "../../helpers";

import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex, hexToU8a } from "@polkadot/util";

const sendHandler = (result: any, unsub: any) => {
  const { status } = result;

  console.log(`Current status is ${status.type}`);
  if (status.isFinalized) {
    console.log(`Included in block hash ${status.asFinalized}`);
    unsub();
  }
}

const isExist = (txType: string) => {
  return (txType === 'chill' || txType === 'bond' || txType === 'nominate' || txType === 'attest' ||
    txType === 'setKeys' || txType === 'validate' || txType === 'batch' ||
    txType === 'setIdentity' || txType === 'setController' || txType === 'bondExtra' ||
    txType === 'setPayee' || txType === 'unbond' || txType === 'claim' || txType === 'vestOther' ||
    txType === 'remark' || txType === 'vest' || txType === 'addProxy' || txType === 'approveAsMulti' || 
    txType === 'asMulti' || txType === 'setSubs' || txType === 'cancelAsMulti' || 
    txType === 'sudoUncheckedWeight' || txType === 'sudo')
}

const createCall = (api: any, txDetails: any) => {
  let proposal;
  const { method, section } = api.registry.findMetaCall(hexToU8a(txDetails.callIndex));
  // console.log("method & section :", section, method);
  switch (method) {
    case 'killStorage':
      proposal = api.tx[section][method](txDetails.args.keys);
      break;
    case 'setStorage':
      proposal = api.tx[section][method](txDetails.args.items);
      break;
    case 'bond':
      proposal = api.tx[section][method](txDetails.args.controller, txDetails.args.value, txDetails.args.payee);
      break;
    case 'nominate':
      proposal = api.tx[section][method](txDetails.args.targets);
      break;
    case 'setController':
      proposal = api.tx[section][method](txDetails.args.controller);
      break;
    case 'setKeys':
      proposal = api.tx[section][method](txDetails.args.keys, txDetails.args.proof);
      break;
    case 'validate':
      proposal = api.tx[section][method](txDetails.args.prefs);
      break;
    case 'forceTransfer':
      proposal = api.tx[section][method](txDetails.args.source, txDetails.args.dest, txDetails.args.value);
      break;
    case 'transfer':
      proposal = api.tx[section][method](txDetails.args.dest, txDetails.args.value);
      break;
    case 'batch':
      if (txDetails.args !== null) {
        const { method, section } = api.registry.findMetaCall(hexToU8a(txDetails.callIndex));
        const batchCalls: any = [];

        txDetails.args.calls.forEach((tx :any) => {
          const { method, section } = api.registry.findMetaCall(hexToU8a(tx.callIndex));
          batchCalls.push(api.tx[section][method](tx.args.new, tx.args.index));
        })
        proposal = api.tx[section][method](batchCalls);
      }
      break;
    case 'proxy':
      let sudoCall;
      let forceTransferCall;

      if (txDetails.args.length !== 0) {
        const { method, section } = api.registry.findMetaCall(hexToU8a(txDetails.args.call.callIndex));
        if (!txDetails.args.call.args) {
          const { method, section } = api.registry.findMetaCall(hexToU8a(txDetails.args.call.args.callIndex));
          forceTransferCall = api.tx[section][method](txDetails.args.call.args.call.args.source, txDetails.args.call.args.call.args.dest, txDetails.args.call.args.call.args.value);
        }
        sudoCall = api.tx[section][method](forceTransferCall);
      }
      proposal = api.tx[section][method](txDetails.args.real, txDetails.args.force_proxy_type, sudoCall);
      break;
    default:
      console.log("############### Method missing to check ############# :", section, method);    
  }
  return proposal;
}

export const migrate = async (opts: Options) => {
  const { dbPath, ensureComplete, suri, wsEndpoint } = opts;

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
    
  const sudoSigner = initializeSigner(suri);
  const sudoAddress = encodeAddress(sudoSigner.address, 0);

  console.log(`Signer address: ${sudoAddress}`)

  if (sudoAddress !== (await api.query.sudo.key()).toString()) {
    console.log(sudoAddress);
    console.log((await api.query.sudo.key()).toString());
    throw Error("This is not the secret for the Sudo key.");
  }
  
  const accountData = await api.query.system.account(sudoAddress);
  const startingNonce = accountData.nonce.toNumber();
  let index = 0;

  // Now cycle through blocks ascending and inject new transactions.
  for (const block of blocks) {
    const { extrinsics, number } = block;
    // console.log(`Checking block ${number}`);

    for (const extrinsic of extrinsics) {
      const { args, hash, method, signature } = extrinsic;
      if (IgnoreMethods.includes(method)) {
        // console.log(`Skipping ignore method: ${method}`)
        continue;
      }

      const [module, txType] = method.split('.');
      let proposal : any;
      const batchCalls : any = [];

      if (txType == "claimAttest") {   // Unsigned tx
        try {
          const unsub = await api.tx[module][txType](...args).send((result) => {
            sendHandler(result, unsub);
          });
        } catch (err) {
          throw new Error(`Failed submitting transfaction: ${err}`);
        } 
      } else {  // Signed tx
        const { signer } = signature;
        
        if (isExist(txType)) {  // 

          switch (txType) {
            case 'vest':
            case 'chill':
              proposal = api.tx[module][txType]();
              break;
            case 'asMulti':
              if (args.length !== 0) {
                const { method, section } = api.registry.findMetaCall(hexToU8a(args[3].callIndex));
                proposal = api.tx[module][txType](args[0], args[1], args[2], createCall(api, args[3]));
              }
              break;
            case 'sudo':
              args.forEach((txDetails : any) => {
                proposal = api.tx[module][txType](createCall(api, txDetails));
              });
              break;
            case 'sudoUncheckedWeight':
              if (txType === 'sudoUncheckedWeight' && !args[0].args.code) {
                const { method, section } = api.registry.findMetaCall(hexToU8a(args[0].callIndex));
                args[0].args.calls.forEach((txDetails : any) => {
                  batchCalls.push(createCall(api, txDetails));
                });
                proposal = api.tx[section][method](batchCalls);
              } 
              break;
            case 'batch':
              args[0].forEach((txDetails : any) => {
                batchCalls.push(createCall(api, txDetails));
              })
              proposal = api.tx[module][txType](batchCalls);
              break;
            default:
              proposal = api.tx[module][txType](...args);              
          }

              const nonce = Number(startingNonce) + index;
              const era = createType(
                api.registry,
                "ExtrinsicEra",
                new GenericImmortalEra(api.registry)
              );
      
              const logString = `Sending transaction ${module}::${txType} from ${signer} with sudo key ${sudoAddress} and nonce: ${nonce}.`;
              console.log(logString);
      
              const thisIndex = index;
      
              const unsub = await api.tx.sudo
                .sudoAs(signer, proposal)
                .signAndSend(
                  sudoSigner,
                  { blockHash: api.genesisHash, era, nonce },
                  (result) => {
                    const { status } = result;
      
                    console.log("Current status is", status.type);
                    fs.appendFileSync(
                      "sudAs.hashes.log",
                      logString + "\n" + "Current status is" + status.type + "\n"
                    );
      
                    if (status.isFinalized) {
                      console.log(
                        `Transaction included at blockHash ${status.asFinalized}`
                      );
                      // fs.appendFileSync(
                      //   "sudoAs.hashes.map.log",
                      //   `${logString}\t${status.asFinalized.toString()}\t${
                      //     prevHashesParsed[thisIndex]
                      //   }\n`
                      // );
                      // fs.appendFileSync(
                      //   "sudoAs.hashes.log",
                      //   logString + "\n" + status.asFinalized.toString() + "\n"
                      // );
                      // Loop through Vec<EventRecord> to display all events
                      // events.forEach(({ phase, event: { data, method, section } }) => {
                      //   fs.appendFileSync(
                      //     "sudoAs.hashes.log",
                      //     `\t' ${phase}: ${section}.${method}:: ${data}\n`
                      //   );
                      // });
      
                      unsub();
                    }
                  }
                );
      
              index++;

            // await sleep(100);
        } else {
          console.log(" what other missing :", txType)
        }
      }
    }
  }

}