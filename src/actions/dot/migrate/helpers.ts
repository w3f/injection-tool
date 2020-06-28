import Keyring from "@polkadot/keyring";
import { CryptoType } from "./types";

/**
 * Initialized a Signer from a secret. 
 * @param suri The secret for the signer you want to initialize.
 * @param cryptoType The specific crypto type to derive your account form the SURI.
 */
export const initializeSigner = (suri: string, cryptoType: CryptoType = "sr25519") => {
  const keyring = new Keyring({ type: cryptoType })
  return keyring.addFromUri(suri);
}
