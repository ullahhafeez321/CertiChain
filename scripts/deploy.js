
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
    const ownerAddress = (await signer.getAddress()).toLowerCase();

    console.log("CertiChain deployed at:", address);

    // Authorize every unlocked Ganache account as an issuer so any account
    // imported into MetaMask from this Ganache instance can issue certificates.
    const accounts = await provider.listAccounts();
    for (const accountSigner of accounts) {
        const accountAddress = await accountSigner.getAddress();
        if (accountAddress.toLowerCase() === ownerAddress) continue;

        try {
            const tx = await contract
                .connect(signer)
                .authorizeIssuer(accountAddress, true);
            await tx.wait();
            console.log("Authorized issuer:", accountAddress);
        } catch (error) {
            console.warn("Could not authorize", accountAddress, error.message);
        }
    }

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
