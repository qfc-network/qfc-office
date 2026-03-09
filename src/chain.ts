import { JsonRpcProvider } from "ethers";

const RPC_URL = "https://rpc.testnet.qfc.network";

export interface ChainInfo {
  blockNumber: number | null;
  networkName: string;
  online: boolean;
}

export async function getChainInfo(): Promise<ChainInfo> {
  try {
    const provider = new JsonRpcProvider(RPC_URL, undefined, {
      staticNetwork: true,
    });
    const blockNumber = await provider.getBlockNumber();
    return {
      blockNumber,
      networkName: "Testnet",
      online: true,
    };
  } catch {
    return {
      blockNumber: null,
      networkName: "Testnet",
      online: false,
    };
  }
}
