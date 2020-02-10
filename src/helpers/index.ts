import { ApiPromise, WsProvider } from '@polkadot/api';
import Keyring from '@polkadot/keyring';

export const assert = (condition: boolean, message: string): void => {
    if (!condition) throw new Error(message);
};

export const getSigner = (cryptoType: 'ed25519' | 'sr25519', suri: string) => {
    const keyring = new Keyring({ type: cryptoType });
    return keyring.addFromUri(suri);
};

export const initApi = (wsEndpoint: string = 'ws://localhost:9944'): Promise<ApiPromise> => {
    const provider = new WsProvider(wsEndpoint);
    // @ts-ignore
    return ApiPromise.create({
        provider,
        typesChain: {
            'Kusama CC3 Tester': {
                Keys: 'SessionKeys5',
            },
        },
    });
};

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const CallIndices = {
    Timestamp: '0x0200',
    FinalityHint: '0x0900',
    Heartbeat: '0x0b00',
    Claim: '0x1200',
    ParachainHeads: '0x1300',
};
