# CertiChain Startup Guide

## Quick Start (copy-paste)

Use 3 terminals from the project root.

### Terminal 1 - Ganache (keep running)

```bash
npx ganache --port 8545 --chainId 1337
```

### Terminal 2 - Compile, deploy, and authorize accounts

```bash
npx hardhat compile && npm run deploy
```

The deploy script:
- deploys the contract
- authorizes all Ganache accounts as issuers
- updates `frontend/src/contract.json` automatically

### Terminal 3 - Start the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

---

## First-Time Setup Only

Install dependencies once:

```bash
# project root
npm install

# frontend
cd frontend
npm install
cd ..
```

---

## MetaMask Setup (once per Ganache session)

1. Add network:
   - Network name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - Currency: `ETH`
2. Import a Ganache account:
   - Ganache GUI: click the key icon next to any account and copy the private key.
   - MetaMask: account avatar > Add account or hardware wallet > Import account > paste key.
3. Switch MetaMask to **Ganache Local**.
4. Refresh the CertiChain website after deploying.

Any Ganache account can issue certificates because the deploy script authorizes all of them.

---

## Issue a Certificate

1. Go to the **Issue Certificate** tab.
2. Fill in the details and click **Issue & Mint Certificate**.
3. Confirm in MetaMask.

By default there is **no certificate fee** — issuers only pay gas.

To make the student pay:
1. In **Issue Certificate**, enable **Require student to pay & claim**.
2. Optionally set the student wallet (leave blank so any wallet can claim) and the claim fee.
3. Submit to create a pending request.
4. Student opens the **Claim** tab, enters the Certificate ID, and clicks **Pay & Claim**.
5. The claim fee is sent directly to the issuer account that created the request.

Optionally enable a per-certificate fee paid by the issuer to the contract owner:

```bash
FEE=0.05 npm run fee
```

---

## Important: After Restarting Ganache

Ganache state is in memory. Restarting it wipes all certificates and changes the contract address.

After every Ganache restart, run again:

```bash
npx hardhat compile && npm run deploy
```

Then refresh the website. Old certificates will no longer exist on-chain.

---

## Useful Commands

```bash
npm run deploy      # compile is separate; deploys and authorizes accounts
npm run authorize   # authorize another address: ISSUER=0x... npm run authorize
npm run fee         # optional fee: FEE=0.05 npm run fee (0 by default)
cd frontend && npm run dev      # start website
cd frontend && npm run build    # production build
```

---

## Troubleshooting

**`missing revert data` or issuance fails**
- Make sure the account is authorized: deploy again or run `ISSUER=0xYourAddress npm run authorize`.
- Make sure the website is using the latest contract: restart/deploy, then refresh the browser.

**Wrong network**
- Switch MetaMask to Ganache `1337` using the network pill in the navbar.

**Certificates from an old deployment still in History**
- They are only local browser history. Click **Clear History** in the History tab.

**MetaMask shows ~1,000 ETH after a transaction**
- That is Ganache's starting balance rounded by MetaMask. Only gas (and any optional fee) is deducted.
