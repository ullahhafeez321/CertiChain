
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const provider = new hre.ethers.JsonRpcProvider(
        "http://127.0.0.1:8545"
    );

    // Uses the first unlocked Ganache account.
    const signer = await provider.getSigner(0);

    console.log("Deploying from:", await signer.getAddress());

    const artifact = await hre.artifacts.readArtifact("CertiChain");

    const factory = new hre.ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        signer
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();

    console.log("CertiChain deployed at:", address);

    // Save the contract address and ABI for the React website.
    const output = {
        address: address,
        abi: artifact.abi
    };

    const frontendFolder = path.join(__dirname, "../frontend/src");

    fs.writeFileSync(
        path.join(frontendFolder, "contract.json"),
        JSON.stringify(output, null, 2)
    );

    console.log("Contract details saved to frontend/src/contract.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
