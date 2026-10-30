const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const target = process.argv[2] || process.env.ISSUER;

    if (!target || !hre.ethers.isAddress(target)) {
        throw new Error(
            "Usage: ISSUER=0xYourAddress npx hardhat run scripts/authorizeIssuer.js --network ganache"
        );
    }

    const provider = new hre.ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const owner = await provider.getSigner(0);

    const contractFile = path.join(__dirname, "../frontend/src/contract.json");
    const { address, abi } = JSON.parse(fs.readFileSync(contractFile, "utf8"));

    const contract = new hre.ethers.Contract(address, abi, owner);

    console.log("Authorizing issuer:", target);
    const tx = await contract.authorizeIssuer(target, true);
    await tx.wait();

    console.log("Issuer authorized:", target);
    console.log("Transaction hash:", tx.hash);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
