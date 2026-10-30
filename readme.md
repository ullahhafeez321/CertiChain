# 🎓 CertiChain — Decentralized Academic Credential Verification Platform

CertiChain is an Ethereum-based blockchain application for issuing, managing, and verifying tamper-proof academic certificates. Built with Solidity smart contracts, Hardhat, Ethers.js v6, and a modern React 19 glassmorphic interface, CertiChain allows universities to mint immutable academic credentials and provides employers or students with instant, zero-cost QR code verification directly from mobile devices or web browsers.

---

## 🌟 Key Features

* **Immutable Blockchain Storage:** Academic credentials are tied to cryptographic Keccak-256 data hashes committed directly to the Ethereum blockchain.
* **Instant Mobile QR Verification:** Universal QR codes allow any smartphone camera on the same network to scan and verify authentic credentials with zero setup or MetaMask requirements.
* **Live Interactive Credential Preview:** Real-time visual rendering of official certificates as administrative data is typed.
* **MetaMask Auto-Detection & Role Management:** Automatically detects connected wallets, checks network synchronization, and displays administrative verification badges.
* **Built-in LAN RPC Proxy:** Integrated reverse proxy (`/rpc`) in Vite enables mobile devices on local WiFi to seamlessly query Ganache without port-forwarding or CORS restrictions.
* **Revocation Support:** Allows authorized university administrators to permanently invalidate compromised or revoked credentials on-chain.
* **Persistent Session History:** In-browser history of issued certificates with one-click QR code viewing, link copying, and PDF print capability.

---

## 🏗️ Technology Stack

| Component | Technology | Version |
| :--- | :--- | :--- |
| **Smart Contracts** | Solidity | `^0.8.24` |
| **Development Environment** | Hardhat | `^2.22.17` |
| **Local Blockchain** | Ganache (CLI or GUI) | Port `8545`, Chain ID `1337` |
| **Web3 Client** | Ethers.js | `v6.17.0` |
| **Frontend Framework** | React | `v19.3.1` |
| **Build Tool & Dev Server** | Vite | `v8.3.5` |
| **Icons & UI** | Lucide React | `^1.65.0` |
| **QR Code Engine** | QRCode.react (SVG) | `^4.2.0` |

---

## 📋 Prerequisites

Before running CertiChain, ensure you have the following installed on your system:

1. **Node.js** (v18.0.0 or higher) & **npm**:
   ```bash
   node -v
   npm -v
   ```
2. **MetaMask Extension** installed in your browser ([Download MetaMask](https://metamask.io/download/)).
3. **Ganache** (CLI or GUI):
   * *Option A (CLI):* Can be run via `npx ganache` (no global installation needed).
   * *Option B (GUI):* Download from [Truffle Suite](https://trufflesuite.com/ganache/).

---

## 🚀 Complete Step-by-Step Setup Guide

### Step 1: Start the Local Ganache Blockchain

The smart contract runs on a local Ethereum network (Ganache) on port `8545` with chain ID `1337`.

#### Option A: Running Ganache via Terminal (Recommended)
Open a dedicated terminal tab and execute:
```bash
npx ganache --port 8545 --chainId 1337
```
*(Keep this terminal window running in the background).*

#### Option B: Running Ganache GUI
1. Launch the **Ganache GUI** application.
2. Click **Quickstart Ethereum**.
3. Click the gear icon (⚙️ Settings) at the top-right:
   * **Server Tab:**
     * **Hostname:** `127.0.0.1`
     * **Port Number:** `8545`
     * **Network ID:** `1337`
4. Click **Save and Restart** in the top right.

---

### Step 2: Configure MetaMask for Local Ganache

1. Open your MetaMask browser extension.
2. Click the network selector dropdown (top left) and click **Add a network** > **Add a network manually**.
3. Fill in the network parameters:
   * **Network Name:** `Ganache Local`
   * **New RPC URL:** `http://127.0.0.1:8545`
   * **Chain ID:** `1337`
   * **Currency Symbol:** `ETH`
4. Click **Save** and switch to **Ganache Local**.

#### Import a Funded Ganache Account into MetaMask:
1. In your Ganache terminal or GUI, copy the **Private Key** of any account (Account 0, 1, 2, ...).
   * In Ganache CLI: Look for `Private Keys` listed in the terminal.
   * In Ganache GUI: Click the key icon (🔑) next to the account and copy the private key.
2. In MetaMask:
   * Click your account avatar > **Add account or hardware wallet** > **Import account**.
   * Paste the copied Private Key and click **Import**.
   * Your account will now display 100 test ETH.

> The deploy script authorizes every unlocked Ganache account as an issuer, so any imported Ganache account can issue certificates. To authorize a different address later, run `npm run authorize` with `ISSUER=0xYourAddress`.

---

### Step 3: Compile and Deploy the Smart Contract

1. In the project root directory, install root dependencies:
   ```bash
   npm install
   ```

2. Compile the Solidity smart contract:
   ```bash
   npx hardhat compile
   ```

3. Deploy the contract to Ganache:
   ```bash
   npm run deploy
   ```

> **Note:** The deployment script automatically authorizes all Ganache accounts as certificate issuers and copies the newly deployed contract address and ABI into `frontend/src/contract.json`!

---

### Step 4: Launch the Frontend Application

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. The application will be live at:
   * **Local Machine:** `http://localhost:5173/`
   * **Mobile / Local Network (LAN):** `http://<YOUR_LOCAL_IP>:5173/` (e.g. `http://192.168.0.152:5173/`)

---

## 🔍 How to Use & Verify Each Feature

### 1. Connecting Your Wallet
1. Open `http://localhost:5173/` in your browser.
2. If MetaMask is already connected, CertiChain automatically detects your account and shows a **● Connected** pill with your shortened address.
3. If not connected, click **Connect Wallet** in the top-right navbar and approve in MetaMask.
4. If your wallet deployed the contract, an **Admin** badge will display next to your address. Other authorized Ganache accounts show an **Issuer** badge and can also issue certificates.
5. If MetaMask is on the wrong network, click the yellow/red pill to switch to **Ganache (1337)** automatically.

---

### 2. Issuing a Certificate
1. Navigate to the **Issue Certificate** tab.
2. Fill out the student details:
   * **Student Full Name:** e.g. `Ali Ahmed Khan`
   * **Student ID / Roll No:** e.g. `CS-2026-042`
   * **Degree / Major:** e.g. `BS Computer Science`
   * **Institution:** e.g. `University of Gwadar`
   * **Graduation Year:** e.g. `2026`
   * **Certificate Unique ID:** Click **Auto-Generate** or type a custom ID (e.g. `CERT-2026-8812`).
3. Notice the **Live Credential Preview** on the right side updating in real-time as you type!
4. Issuance has **no certificate fee by default** — authorized issuers only pay gas. The owner can optionally enable a fee with `FEE=0.05 npm run fee`.
5. Click **Issue & Mint Certificate**.
6. MetaMask will pop up requesting transaction approval. Click **Confirm**.
7. When mined:
   * A celebratory **Success Modal** appears displaying:
     * High-resolution QR code
     * Complete on-chain transaction hash
     * Recipient details
   * Click **Copy Verification URL** to copy the public link.
   * Click **Print / Save Credential** to print or export as PDF.
   * Click **Open Verification Page** to inspect the public record.

---

### 2b. Student-Paid Certificates

1. In the **Issue Certificate** tab, enable **Require student to pay & claim**.
2. Optionally enter the student's wallet address (leave blank to let any wallet claim) and a **Claim Fee** in ETH.
3. Submit the form. This creates a **pending** certificate request; it is not valid yet.
4. The student goes to the **Claim** tab, enters the Certificate ID, clicks **Check**, then **Pay & Claim**.
5. The claim fee is paid directly to the **issuer account** that created the request, and the certificate becomes valid on-chain.

If a specific student wallet was set, only that wallet can claim the certificate. If left blank, whichever wallet connects and pays can claim it.

---

### 3. Verifying a Certificate

#### Option A: Verification from Computer
1. Click the **Verify Credential** tab on the dashboard.
2. Enter the Certificate ID (or click one of the suggested recent IDs) and click **Verify**.
3. You will be redirected to `/verify/<CERTIFICATE_ID>`.
4. The page queries the blockchain and shows:
   * ✅ **OFFICIALLY VERIFIED CREDENTIAL** (Green seal)
   * Student Name, ID, Program, Institution, and Year
   * Document Keccak-256 cryptographic hash (with copy button)
   * Issuer contract address
   * Exact block timestamp and date of issuance

#### Option B: Mobile Phone Camera Verification (Universal QR)
1. Ensure your smartphone is connected to the **same Wi-Fi network** as your computer.
2. Open your smartphone camera or QR scanner app.
3. Scan the QR code displayed on the screen (from the issuance modal or the **Issued History** tab).
4. Tap the link to open the page on your phone (e.g. `http://192.168.0.152:5173/verify/...`).
5. **No MetaMask or wallet is needed on the phone!** The built-in Vite `/rpc` reverse proxy routes the query to Ganache, and the authentic verified certificate displays instantly on your mobile screen.

---

### 4. Revoking a Certificate
1. Click the **Revoke** tab on the navigation bar.
2. Enter the Certificate ID you wish to revoke (e.g. `CERT-2026-8812`).
3. Click **Revoke on Blockchain** and confirm the transaction in MetaMask.
4. Once confirmed, re-open the verification page for that certificate:
   * The status will update to ❌ **CREDENTIAL HAS BEEN REVOKED** (Crimson warning badge).

---

### 5. Checking Issued Certificates History
1. Click the **Issued History** tab.
2. View all certificates issued during your session.
3. Use the **QR** button to bring up the QR code modal anytime.
4. Use the **Verify** button to view the public on-chain verification report.

---

## 📂 Project Directory Structure

```text
CertiChain/
├── contracts/
│   └── CertiChain.sol          # Solidity smart contract (Storage, Issue, Verify, Revoke)
├── scripts/
│   └── deploy.js               # Deployment script (saves address & ABI to frontend)
├── hardhat.config.js           # Hardhat configuration (Ganache network setup)
├── package.json                # Root package configuration (Hardhat & dependencies)
├── .gitignore                  # Git ignore rules (node_modules, artifacts, cache)
├── readme.md                   # Complete documentation and setup guide
└── frontend/                   # React 19 + Vite frontend
    ├── index.html              # HTML entry point with Google Fonts (Outfit, Plus Jakarta Sans)
    ├── vite.config.js          # Vite config with LAN IP detection and /rpc reverse proxy
    ├── package.json            # Frontend dependencies (React 19, Ethers v6, Lucide)
    └── src/
        ├── main.jsx            # React root component with BrowserRouter
        ├── App.jsx             # Main application (Dashboard, Issue, Verify, History, Modals)
        ├── style.css           # Modern Web3 glassmorphic design system and print styles
        └── contract.json       # Auto-generated contract ABI and deployed address
```

---

## 🛠️ Troubleshooting & FAQs

### Q1: MetaMask shows "Nonce too high" or transaction hangs?
* **Cause:** Happens if you restarted Ganache while MetaMask remembered the previous blockchain state.
* **Fix:** In MetaMask, go to **Settings** > **Advanced** > **Clear activity tab data** (or Reset Account). This clears the cached nonce without losing any keys.

### Q2: Mobile phone says "Connection error: Failed to fetch"?
* **Cause:** Phone is on mobile data instead of the same Wi-Fi, or firewall is blocking incoming port `5173`.
* **Fix:**
  1. Ensure both your computer and phone are connected to the same Wi-Fi network.
  2. Verify that your computer firewall permits incoming connections on port `5173`.

### Q3: Does verification cost any gas fees?
* **Answer:** **No.** Reading from the blockchain using `verifyCertificate` is marked `view` in Solidity. It is 100% free and consumes zero gas on any network.

---

## 📜 License

This project is licensed under the MIT License — feel free to modify and build upon it for your academic and production projects.
