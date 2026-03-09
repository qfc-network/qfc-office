import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://rpc.testnet.qfc.network";
const KEYSTORE = path.join(process.env.HOME, ".openclaw/qfc-wallets/keystore/0x5be349d95787b0b4135cc4cfee27ad70ac9f3132.json");

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = await ethers.Wallet.fromEncryptedJson(
    fs.readFileSync(KEYSTORE, "utf8"), "qfc-testnet-2026"
  );
  const deployer = wallet.connect(provider);
  console.log("Deployer:", deployer.address);

  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "build/contracts_OfficeRegistry_sol_OfficeRegistry.abi"), "utf8"));
  const bytecode = "0x" + fs.readFileSync(path.join(__dirname, "build/contracts_OfficeRegistry_sol_OfficeRegistry.bin"), "utf8").trim();

  console.log("Deploying OfficeRegistry...");
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ OfficeRegistry deployed at:", address);

  fs.writeFileSync(path.join(__dirname, "deployment.json"), JSON.stringify({
    contract: "OfficeRegistry", address,
    deployer: deployer.address, chainId: 9000,
    txHash: contract.deploymentTransaction().hash,
    timestamp: new Date().toISOString()
  }, null, 2));

  // Test checkIn
  console.log("Testing checkIn...");
  const tx = await contract.checkIn("大厅");
  await tx.wait();
  console.log("✅ Checked in to 大厅");
  
  // Test moveRoom  
  const tx2 = await contract.moveRoom("工位区");
  await tx2.wait();
  console.log("✅ Moved to 工位区");
  
  // Test checkOut
  const tx3 = await contract.checkOut();
  await tx3.wait();
  console.log("✅ Checked out");
  
  console.log("All tests passed!");
}

main().catch(console.error);
