import { ApiPromise, WsProvider } from '@polkadot/api';

export const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
}

export const initApi = (wsEndpoint: string = 'ws://localhost:9944'): Promise<ApiPromise> => {
  const provider = new WsProvider(wsEndpoint);
  return ApiPromise.create({ provider });
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const CallIndices = {
  'Timestamp': '0x0200',
  'FinalityHint': '0x0900',
  'Heartbeat': '0x0b00',
  'Claim': '0x1200',
  'ParachainHeads': '0x1300',
}
