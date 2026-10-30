const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const feeInput = process.argv[2] || process.env.FEE;

    if (!feeInput) {
        throw new Error(
            "Usage: FEE=0.01 npx hardhat run scripts/setIssuanceFee.js --network ganache"
        );
    }

    const fee = hre.ethers.parseEther(feeInput);

    const provider = new hre.ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const owner = await provider.getSigner(0);

    const contractFile = path.join(__dirname, "../frontend/src/contract.json");
    const { address, abi } = JSON.parse(fs.readFileSync(contractFile, "utf8"));

    const contract = new hre.ethers.Contract(address, abi, owner);

    console.log(`Setting issuance fee to ${feeInput} ETH...`);
    const tx = await contract.setIssuanceFee(fee);
    await tx.wait();

    console.log("Issuance fee updated:", hre.ethers.formatEther(fee), "ETH");
    console.log("Transaction hash:", tx.hash);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
