import { Command } from 'commander';
import * as util from '@polkadot/util';
import { initApi, CallIndices } from './helpers';

import * as fs from 'fs';

// Scrapes all extrinsics from a Polkadot chain.
export const scrapeExtrinsics = async (cmd: Command) => {
  const { outFile, wsEndpoint, latestHash } = cmd;

  const api = await initApi(wsEndpoint);
  
  const latestBlock = await api.rpc.chain.getBlock(latestHash);
  let { block } = latestBlock;
  
  for (let i = Number(block.header.number); i > 0; i--) {
    const { extrinsics } = block;
    console.log(`Scraping extrinsics at block ${block.header.number}.`);

    extrinsics.forEach((extrinsic: any) => {
      const { signer, signature, method } = extrinsic;
      const callIndex = util.u8aToHex(method.callIndex);
      if (
        callIndex !== CallIndices.FinalityHint &&
        callIndex !== CallIndices.Heartbeat &&
        callIndex !== CallIndices.ParachainHeads &&
        callIndex !== CallIndices.Timestamp
      ) {
        fs.appendFileSync(outFile, `${signer},${method}\n`);
      }

      // Set the new block as this one's parent.
      //@ts-ignore
      block = await api.rpc.chain.getBlock(block.header.parentHash);
    })
  }
}
