export type Extrinsic = {
  method: string;
  signature: any | null;
  nonce: number;
  args: any[];
  tip: number;
  hash: string;
  events: any[];
  success: boolean;
}
  
export type Log = {
  type: string;
  index: number;
  value: any[];
}

export type Block = {
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  logs: Log[];
  extrinsics: Extrinsic[];
}

export type CryptoType = "sr25519" | "ed25519" | "ecdsa" | undefined;
