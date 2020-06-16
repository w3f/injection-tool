import Keyring from "@polkadot/keyring";
import { initApi, parseCsv, sleep } from "../../helpers";
import Web3 from "web3";

const w3Util = new Web3().utils;

const VestingLength = w3Util.toBN(Math.ceil(24 * 30 * 24 * 60 * (60 / 6)));

type Options = {
  cryptoType: "ed25519" | "sr25519" | "ecdsa" | undefined;
  csv: string;
  dry: boolean;
  source: string;
  suri: string;
  types: any;
  wsEndpoint: string;
  startingBlock: string;
};

export const batchVestedTransfer = async (opts: Options) => {
  const {
    csv,
    cryptoType,
    dry,
    source,
    suri,
    types,
    wsEndpoint,
    startingBlock,
  } = opts;

  const input = parseCsv(csv);
  const api = await initApi(wsEndpoint, types);
  const keyring = new Keyring({ type: cryptoType });
  const signer = keyring.addFromUri(suri);

  const sudo = (await api.query.sudo.key()).toString();

  console.log(`Signer: ${signer.address}`);

  const calls = input.map((entry: any) => {
    const [dest, amount] = entry;

    const perBlock = w3Util.toBN(amount).divRound(VestingLength);

    const vestedTransfer = api.tx.vesting.vestedTransfer(dest, {
      locked: amount,
      perBlock,
      startingBlock: 0,
    });
    const sudoCall = api.tx.sudo.sudoAs(sudo, vestedTransfer);
    const proxyCall = api.tx.proxy.proxy(sudo, "any", sudoCall);
    return proxyCall;
  });

  const accountData = await api.query.system.account(signer.address);
  const startingNonce = accountData.nonce.toNumber();
  const nonceStr = `Nonce: ${startingNonce} |> `;

  if (dry) {
    const callHex = api.tx.utility.batch(calls).toHex();
    const cost = await api.rpc.payment.queryInfo(callHex);

    console.log("Cost:", cost.toString())
    return;
  }

  console.log(
    `${nonceStr}Sending transaction Utility::batch from ${signer.address}.`
  );
  const unsub = await api.tx.utility.batch(calls).signAndSend(
    signer,
    { nonce: startingNonce },
    (result: any) => {
      const { status } = result;

      console.log(`${nonceStr}Current status is ${status.type}`);
      if (status.isFinalized) {
        console.log(
          `${nonceStr}Transaction included at block hash ${status.asFinalized}`
        );
        unsub();
      }
    }
  );

  await sleep(20000)

}