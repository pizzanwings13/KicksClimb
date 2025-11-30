const hre = require("hardhat");

async function main() {
  const kicksTokenAddress = process.env.KICKS_TOKEN_ADDRESS;
  const adminAddress = process.env.ADMIN_ADDRESS;
  const signerAddress = process.env.SIGNER_ADDRESS;

  if (!kicksTokenAddress || !adminAddress || !signerAddress) {
    console.error("Missing required environment variables:");
    console.error("- KICKS_TOKEN_ADDRESS: KICKS token contract address");
    console.error("- ADMIN_ADDRESS: Admin wallet address for vault management");
    console.error("- SIGNER_ADDRESS: Address that will sign claim authorizations");
    process.exit(1);
  }

  console.log("Deploying KicksClaimVault...");
  console.log("KICKS Token:", kicksTokenAddress);
  console.log("Admin:", adminAddress);
  console.log("Signer:", signerAddress);

  const KicksClaimVault = await hre.ethers.getContractFactory("KicksClaimVault");
  const vault = await KicksClaimVault.deploy(
    kicksTokenAddress,
    adminAddress,
    signerAddress
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("\nKicksClaimVault deployed to:", vaultAddress);
  console.log("\nNext steps:");
  console.log("1. Add VAULT_CONTRACT_ADDRESS to your environment:", vaultAddress);
  console.log("2. Deposit KICKS tokens to the vault for payouts");
  console.log("3. Update your game settings with the vault address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
