import Keyring from "@polkadot/keyring";
import * as fs from "fs";
import { initApi, parseCsv, sleep } from "../../helpers";

type Options = {
  cryptoType: "ed25519" | "sr25519" | "ecdsa" | undefined;
  csv: string;
  dry: boolean;
  source: string;
  suri: string;
  types: any;
  wsEndpoint: string;
};

export const batchTransfer = async (opts: Options) => {
  const { csv, cryptoType, dry, source, suri, types, wsEndpoint } = opts;

  const input = parseCsv(csv);
  const api = await initApi(wsEndpoint, types);
  const keyring = new Keyring({ type: cryptoType });
  const signer = keyring.addFromUri(suri);

  const sudo = (await api.query.sudo.key()).toString();

  console.log(`Signer: ${signer.address}`);

  const calls = input.map((entry: any) => {
    const [dest, amount] = entry;

    const forceTransfer = api.tx.balances.forceTransfer(source, dest, amount);
    const sudoCall = api.tx.sudo.sudo(forceTransfer);
    const proxyCall = api.tx.proxy.proxy(sudo, "sudobalances", sudoCall);
    return proxyCall;
  });

  const accountData = await api.query.system.account(signer.address);
  const startingNonce = accountData.nonce.toNumber();
  const nonceStr = `Nonce: ${startingNonce} |> `;

  if (dry) {
    const callHex = api.tx.utility.batch(calls).toHex();
    const cost = await api.rpc.payment.queryInfo(callHex);

    console.log("Cost:", cost.toString());
    return;
  }

  console.log(
    `${nonceStr}Sending transaction Utility::batch from ${signer.address}.`
  );
  const unsub = await api.tx.utility
    .batch(calls)
    .signAndSend(signer, { nonce: startingNonce }, (result: any) => {
      const { status } = result;

      console.log(`${nonceStr}Current status is ${status.type}`);
      if (status.isFinalized) {
        console.log(
          `${nonceStr}Transaction included at block hash ${status.asFinalized}`
        );
        unsub();
      }
    });

  await sleep(20000);
};
