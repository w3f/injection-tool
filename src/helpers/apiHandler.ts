import { ApiPromise, WsProvider } from "@polkadot/api";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { getSpecTypes } from "@polkadot/types-known";

type FullBlockData = {
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  logs: any;
  extrinsics: any;
};

class ApiHandler {
  api: ApiPromise;
  private specVersion: any;

  static create = async (wsEndpoint: string): Promise<ApiHandler> => {
    const api = await ApiPromise.create({
      provider: new WsProvider(wsEndpoint),
    });
    return new ApiHandler(api);
  };

  constructor(api: ApiPromise) {
    this.api = api;
    this.specVersion = api.createType("u32", -1);
  }

  getBlockHash = (number: number): Promise<any> => {
    return this.api.rpc.chain.getBlockHash(number);
  };

  askForClaims = async (addr: string, blockNum: number) => {
    const hash = await this.getBlockHash(blockNum);
    const api = await this.ensureMeta(hash);
    //@ts-ignore
    return api.query.claims.claims.at(hash, addr);
  };

  async fetchBlock(hash: any) {
    const api = await this.ensureMeta(hash);
    const [{ block }, events] = await Promise.all([
      api.rpc.chain.getBlock(hash),
      this.fetchEvents(hash),
    ]);

    const { parentHash, number, stateRoot, extrinsicsRoot } = block.header;

    const logs = block.header.digest.logs.map((log) => {
      const { type, index, value } = log;

      return { type, index, value };
    });

    const defaultSuccess = typeof events === "string" ? events : false;
    const queryInfo = await Promise.all(
      block.extrinsics.map(async (extrinsic) => {
        if (extrinsic.isSigned && extrinsic.method.sectionName !== "sudo") {
          try {
            return await api.rpc.payment.queryInfo(extrinsic.toHex(), hash);
          } catch (err) {
            console.error(err);

            return {
              error: "Unable to fetch fee info.",
            };
          }
        }
      })
    );

    const extrinsics = block.extrinsics.map((extrinsic, idx) => {
      const {
        method,
        nonce,
        signature,
        signer,
        isSigned,
        tip,
        args,
      } = extrinsic;
      const hash = u8aToHex(blake2AsU8a(extrinsic.toU8a(), 256));
      const info = queryInfo[idx];

      return {
        method: `${method.sectionName}.${method.methodName}`,
        signature: isSigned ? { signature, signer } : null,
        nonce,
        args,
        tip,
        hash,
        info,
        events: [],
        success: defaultSuccess,
      };
    });

    if (Array.isArray(events)) {
      for (const record of events) {
        const { event, phase } = record;

        if (phase.isApplyExtrinsic) {
          const extrinsicIdx = Number(phase.asApplyExtrinsic);
          const extrinsic: any = extrinsics[extrinsicIdx];

          if (!extrinsic) {
            throw new Error(
              `Missing extrinsic ${extrinsicIdx} in block ${hash}`
            );
          }

          const method = `${event.section}.${event.method}`;

          if (method === "system.ExtrinsicSuccess") {
            extrinsic.success = true;
          }

          extrinsic.events.push({
            method,
            data: event.data,
          });
        }
      }
    }

    return {
      number,
      hash,
      parentHash,
      stateRoot,
      extrinsicsRoot,
      logs,
      extrinsics,
    };
  }

  async fetchEvents(hash: string) {
    try {
      return await await this.api.query.system.events.at(hash);
    } catch (_) {
      return `Unable to fetch Events, cannot confirm extrinsic status. Check pruning settings on the node.`;
    }
  }

  async ensureMeta(hash: string) {
    const { api } = this;

    try {
      const runtimeVersion = await api.rpc.state.getRuntimeVersion(hash);
      const blockSpecVersion = runtimeVersion.specVersion;

      // swap metadata if spec version is different
      if (!this.specVersion.eq(blockSpecVersion)) {
        this.specVersion = blockSpecVersion;
        const meta = await api.rpc.state.getMetadata(hash);
        const chain = await api.rpc.system.chain();
        api.registry.register(
          getSpecTypes(api.registry, chain, runtimeVersion.specName, blockSpecVersion)
        );
        api.registry.setMetadata(meta);
      }
    } catch (err) {
      console.error(`Failed to get Metadata for block ${hash}, using latest.`);
      console.error(err);
      this.specVersion = api.createType("u32", -1);
    }

    return api;
  }
}

export default ApiHandler;
