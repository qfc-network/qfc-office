import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC = "https://rpc.testnet.qfc.network";
const PRIVATE_KEY = process.argv[2];
if (!PRIVATE_KEY) { console.error("Usage: node deploy.mjs <private-key>"); process.exit(1); }

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const abi = JSON.parse(readFileSync(join(__dirname, "out/contracts_OfficeRegistry_sol_OfficeRegistry.abi"), "utf8"));
const bin = readFileSync(join(__dirname, "out/contracts_OfficeRegistry_sol_OfficeRegistry.bin"), "utf8");

console.log(`Deploying OfficeRegistry from ${wallet.address}...`);
const factory = new ethers.ContractFactory(abi, "0x" + bin, wallet);
const contract = await factory.deploy({ gasPrice: ethers.parseUnits("1", "gwei"), gasLimit: 2_000_000 });
console.log(`TX: ${contract.deploymentTransaction().hash}`);
await contract.waitForDeployment();
const addr = await contract.getAddress();
console.log(`✅ OfficeRegistry deployed at: ${addr}`);

writeFileSync(join(__dirname, "deployment.json"), JSON.stringify({
  contract: "OfficeRegistry",
  address: addr,
  deployer: wallet.address,
  txHash: contract.deploymentTransaction().hash,
  chainId: 9000,
  rpc: RPC,
  deployedAt: new Date().toISOString(),
}, null, 2));
console.log("Saved deployment.json");
