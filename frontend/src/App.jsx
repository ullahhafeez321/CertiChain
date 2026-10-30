import React, { useEffect, useState, useMemo } from "react";
import { Routes, Route, Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import {
    ShieldCheck,
    Award,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Copy,
    ExternalLink,
    Printer,
    Search,
    RefreshCw,
    FileText,
    Check,
    Lock,
    Wallet,
    LogOut,
    Eye,
    QrCode,
    Sparkles,
    Trash2,
    Calendar,
    GraduationCap,
    School,
    User,
    Hash
} from "lucide-react";
import contractInfo from "./contract.json";

const CONTRACT_ADDRESS = contractInfo.address;
const CONTRACT_ABI = contractInfo.abi;
const GANACHE_CHAIN_ID_HEX = "0x539"; // 1337
const GANACHE_CHAIN_ID_NUM = 1337;

// Storage keys
function getMetadataKey(id) {
    return `certichain_${id.trim()}`;
}
const HISTORY_STORAGE_KEY = "certichain_issued_history";

// Helper for verification URL (robust for localhost, LAN, and __KALI_IP__)
function generateVerificationUrl(metadata) {
    let baseOrigin = window.location.origin;
    try {
        if (typeof __KALI_IP__ !== "undefined" && __KALI_IP__ && window.location.hostname === "localhost") {
            baseOrigin = `http://${__KALI_IP__}:${window.location.port || 5173}`;
        }
    } catch {
        // Fallback to origin
    }

    const certId = encodeURIComponent(metadata.certificateId.trim());
    // Encode metadata so that any scanner on LAN / mobile can verify full details without local storage
    try {
        const encodedData = btoa(encodeURIComponent(JSON.stringify(metadata)));
        return `${baseOrigin}/verify/${certId}?d=${encodedData}`;
    } catch {
        return `${baseOrigin}/verify/${certId}`;
    }
}

// Canonical hash calculation
function createDataHash(metadata) {
    const canonical = {
        certificateId: metadata.certificateId.trim(),
        studentName: metadata.studentName.trim(),
        studentId: metadata.studentId.trim(),
        program: metadata.program.trim(),
        institution: metadata.institution.trim(),
        year: metadata.year.trim()
    };
    return ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(canonical))
    );
}

// Contract Provider Helper (Read-only works universally across desktop & mobile)
async function getReadContract() {
    // 1. Primary universal endpoint: Same-origin /rpc (proxied through Vite dev server)
    // This allows mobile phones and any device on the network to access Ganache without CORS or binding issues
    try {
        const rpcEndpoint = `${window.location.origin}/rpc`;
        const provider = new ethers.JsonRpcProvider(rpcEndpoint, undefined, {
            staticNetwork: true
        });
        return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (e) {
        console.warn("Primary /rpc proxy provider initialization failed", e);
    }

    // 2. If MetaMask is connected to Ganache (Chain ID 1337)
    if (window.ethereum) {
        try {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const net = await browserProvider.getNetwork();
            if (Number(net.chainId) === GANACHE_CHAIN_ID_NUM) {
                return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, browserProvider);
            }
        } catch {
            // fallback below
        }
    }

    // 3. Fallback direct host RPC
    const directHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8545"
        : `http://${window.location.hostname}:8545`;

    const fallbackProvider = new ethers.JsonRpcProvider(directHost, undefined, {
        staticNetwork: true
    });
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, fallbackProvider);
}

// Contract Signer Helper (For transactions)
async function getWriteContract() {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to issue or revoke certificates.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    if (chainId !== GANACHE_CHAIN_ID_NUM) {
        throw new Error(`Connected to Chain ID ${chainId}. Please switch MetaMask to Ganache Local (Chain ID 1337).`);
    }

    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// Switch to Ganache network helper
async function requestSwitchToGanache() {
    if (!window.ethereum) return;
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: GANACHE_CHAIN_ID_HEX }]
        });
    } catch (switchError) {
        if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: GANACHE_CHAIN_ID_HEX,
                            chainName: "Ganache Local",
                            rpcUrls: ["http://127.0.0.1:8545"],
                            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
                        }
                    ]
                });
            } catch (addError) {
                console.error("Failed to add Ganache network", addError);
            }
        }
    }
}

// ---------------- GLOBAL ERROR BOUNDARY ----------------
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "40px", textAlign: "center", color: "#f1f5f9", background: "#090d16", minHeight: "100vh" }}>
                    <h2 style={{ color: "#f43f5e", marginBottom: "16px" }}>Something went wrong</h2>
                    <p style={{ color: "#94a3b8", marginBottom: "24px" }}>{this.state.error?.message || "An unexpected error occurred."}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ---------------- HEADER / NAVBAR COMPONENT ----------------
function Navbar({ account, onConnect, isOwner, networkInfo, onSwitchNetwork }) {
    const [copied, setCopied] = useState(false);

    function copyAddress() {
        if (!account) return;
        navigator.clipboard.writeText(account);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const shortAddress = account
        ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
        : "";

    return (
        <header className="navbar">
            <div className="nav-content">
                <Link to="/" className="brand">
                    <div className="brand-icon">
                        <Award size={24} />
                    </div>
                    <div className="brand-text">
                        <h1>CertiChain</h1>
                    </div>
                    <span className="brand-badge">WEB3 CREDENTIALS</span>
                </Link>

                <div className="nav-actions">
                    {/* Network status pill */}
                    {networkInfo.chainId !== null && (
                        <div
                            className={`network-pill ${networkInfo.isCorrectNetwork ? "" : "wrong"}`}
                            onClick={!networkInfo.isCorrectNetwork ? onSwitchNetwork : undefined}
                            title={networkInfo.isCorrectNetwork ? "Connected to Ganache Local" : "Click to switch to Ganache (1337)"}
                        >
                            <span className="network-dot" />
                            {networkInfo.isCorrectNetwork ? (
                                <span>Ganache (1337)</span>
                            ) : (
                                <span>Wrong Network (Switch to 1337)</span>
                            )}
                        </div>
                    )}

                    {/* Wallet connection status */}
                    {account ? (
                        <div className="wallet-pill">
                            <div className="wallet-linked">
                                <span className="network-dot" style={{ background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }} />
                                <span className="wallet-address" title={account}>{shortAddress}</span>
                                {isOwner && <span className="admin-badge">Admin</span>}
                            </div>
                            <button
                                className="btn-icon-subtle"
                                onClick={copyAddress}
                                title={copied ? "Copied!" : "Copy Full Address"}
                            >
                                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            </button>
                        </div>
                    ) : (
                        <button className="btn btn-primary btn-sm" onClick={onConnect}>
                            <Wallet size={16} />
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

// ---------------- TOAST NOTIFICATION ----------------
function Toast({ toast, onClose }) {
    if (!toast) return null;
    const icons = {
        info: <RefreshCw className="animate-spin" size={18} color="#6366f1" />,
        success: <CheckCircle2 size={18} color="#10b981" />,
        error: <AlertTriangle size={18} color="#f43f5e" />
    };

    return (
        <div className={`toast-bar ${toast.type}`}>
            <div>{icons[toast.type] || icons.info}</div>
            <div className="toast-content">
                <div className="toast-title">{toast.title || "Notification"}</div>
                <div className="toast-message">{toast.message}</div>
            </div>
            <button className="btn-icon-subtle" onClick={onClose}>
                <XCircle size={16} />
            </button>
        </div>
    );
}

// ---------------- MAIN DASHBOARD & TABS ----------------
function Dashboard({ account, onConnect, isOwner, networkInfo, onSwitchNetwork, showToast }) {
    const [activeTab, setActiveTab] = useState("issue"); // 'issue' | 'verify' | 'revoke' | 'history'

    // Form inputs for issue
    const [studentName, setStudentName] = useState("");
    const [studentId, setStudentId] = useState("");
    const [program, setProgram] = useState("BS Computer Science");
    const [institution, setInstitution] = useState("University of Gwadar");
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [certificateId, setCertificateId] = useState("");

    // Revoke inputs
    const [revokeId, setRevokeId] = useState("");

    // Search input for verification tab
    const [searchId, setSearchId] = useState("");

    // Issued certificate success modal state
    const [issuedCert, setIssuedCert] = useState(null);
    const [busy, setBusy] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [copiedLink, setCopiedLink] = useState(false);

    const navigate = useNavigate();

    // Load recent certificates history from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (raw) {
                setHistoryList(JSON.parse(raw));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    // Generate random Certificate ID helper
    function generateId() {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const prefix = program.split(" ").map(w => w[0]).join("").toUpperCase() || "CERT";
        const newId = `${prefix}-${year}-${rand}`;
        setCertificateId(newId);
    }

    // Live preview metadata object
    const livePreviewMetadata = useMemo(() => ({
        certificateId: certificateId || "CERT-XXXX-001",
        studentName: studentName || "Student Full Name",
        studentId: studentId || "CS-2026-000",
        program: program || "Degree Program",
        institution: institution || "University Name",
        year: year || "2026"
    }), [certificateId, studentName, studentId, program, institution, year]);

    // Issue Certificate Handler
    async function handleIssueCertificate(e) {
        e.preventDefault();
        setBusy(true);

        try {
            if (!studentName.trim() || !studentId.trim() || !certificateId.trim() || !year.trim()) {
                throw new Error("Please complete all required certificate fields.");
            }

            const metadata = {
                certificateId: certificateId.trim(),
                studentName: studentName.trim(),
                studentId: studentId.trim(),
                program: program.trim(),
                institution: institution.trim(),
                year: year.trim()
            };

            const dataHash = createDataHash(metadata);

            showToast({
                type: "info",
                title: "MetaMask Prompt",
                message: "Please confirm the transaction in MetaMask..."
            });

            const contract = await getWriteContract();

            const tx = await contract.issueCertificate(
                metadata.certificateId,
                dataHash
            );

            showToast({
                type: "info",
                title: "Transaction Broadcast",
                message: "Awaiting confirmation on the Ethereum blockchain..."
            });

            const receipt = await tx.wait();

            // Store single item locally
            localStorage.setItem(
                getMetadataKey(metadata.certificateId),
                JSON.stringify(metadata)
            );

            // Generate universal verification link
            const verificationUrl = generateVerificationUrl(metadata);

            const record = {
                ...metadata,
                dataHash,
                txHash: receipt.hash || tx.hash,
                verificationUrl,
                issuedAt: Date.now()
            };

            // Update history list in storage
            const updatedHistory = [record, ...historyList.filter(h => h.certificateId !== record.certificateId)];
            setHistoryList(updatedHistory);
            try {
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory.slice(0, 50)));
            } catch (err) {
                console.warn("Storage full", err);
            }

            // Set state to trigger the modal safely (NO SCOPE ERRORS!)
            setIssuedCert(record);

            showToast({
                type: "success",
                title: "Certificate Issued!",
                message: `Certificate ${metadata.certificateId} successfully mined on block!`
            });

        } catch (error) {
            console.error("Issuance error", error);
            showToast({
                type: "error",
                title: "Issuance Failed",
                message: error.shortMessage || error.reason || error.message || "Failed to issue certificate"
            });
        } finally {
            setBusy(false);
        }
    }

    // Revoke Certificate Handler
    async function handleRevokeCertificate(e) {
        e.preventDefault();
        if (!revokeId.trim()) return;

        setBusy(true);
        try {
            showToast({
                type: "info",
                title: "Revocation Approval",
                message: "Please approve certificate revocation in MetaMask..."
            });

            const contract = await getWriteContract();
            const tx = await contract.revokeCertificate(revokeId.trim());

            showToast({
                type: "info",
                title: "Revoking Credential",
                message: "Waiting for blockchain confirmation..."
            });

            await tx.wait();

            showToast({
                type: "success",
                title: "Certificate Revoked",
                message: `Certificate ID ${revokeId.trim()} has been permanently revoked.`
            });

            setRevokeId("");
        } catch (error) {
            console.error("Revocation error", error);
            showToast({
                type: "error",
                title: "Revocation Failed",
                message: error.shortMessage || error.reason || error.message || "Revocation failed"
            });
        } finally {
            setBusy(false);
        }
    }

    // Copy Verification Link
    function copyIssuedUrl(url) {
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2200);
    }

    return (
        <div className="main-content">
            {/* Hero Section */}
            <section className="hero">
                <div className="eyebrow-tag">
                    <Lock size={13} />
                    <span>Next-Gen Ethereum Academic Credentialing</span>
                </div>
                <h2>Decentralized Academic Verification</h2>
                <p>
                    Issue tamper-proof academic credentials authenticated directly on the Ethereum blockchain with Keccak-256 cryptographic proofs and instant QR verification.
                </p>

                <div className="hero-badges">
                    <div className="hero-badge-item">
                        <ShieldCheck size={14} />
                        <span>Smart Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
                    </div>
                    <div className="hero-badge-item">
                        <Hash size={14} />
                        <span>Keccak-256 Merkle Proofs</span>
                    </div>
                    <div className="hero-badge-item">
                        <QrCode size={14} />
                        <span>Instant QR Mobile Scanning</span>
                    </div>
                </div>
            </section>

            {/* Navigation Tabs */}
            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === "issue" ? "active" : ""}`}
                    onClick={() => setActiveTab("issue")}
                >
                    <Award size={16} />
                    <span>Issue Certificate</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === "verify" ? "active" : ""}`}
                    onClick={() => setActiveTab("verify")}
                >
                    <Search size={16} />
                    <span>Verify Credential</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
                    onClick={() => setActiveTab("history")}
                >
                    <FileText size={16} />
                    <span>Issued History ({historyList.length})</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === "revoke" ? "active" : ""}`}
                    onClick={() => setActiveTab("revoke")}
                >
                    <Trash2 size={16} />
                    <span>Revoke</span>
                </button>
            </div>

            {/* TAB 1: ISSUE CERTIFICATE */}
            {activeTab === "issue" && (
                <div className="issue-grid">
                    {/* Left: Input Form Card */}
                    <div className="glass-card">
                        <div className="card-header">
                            <div className="card-title-group">
                                <div className="card-title-icon">
                                    <Award size={20} />
                                </div>
                                <div>
                                    <h3>Issue New Certificate</h3>
                                    <p>Deploy academic record to Ethereum blockchain</p>
                                </div>
                            </div>
                            {!account && (
                                <button className="btn btn-secondary btn-sm" onClick={onConnect}>
                                    <Wallet size={14} /> Connect Wallet
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleIssueCertificate}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Student Full Name</label>
                                    </div>
                                    <input
                                        type="text"
                                        value={studentName}
                                        onChange={e => setStudentName(e.target.value)}
                                        placeholder="e.g. Ali Ahmed Khan"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Student ID / Roll No</label>
                                    </div>
                                    <input
                                        type="text"
                                        value={studentId}
                                        onChange={e => setStudentId(e.target.value)}
                                        placeholder="e.g. CS-2026-042"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Degree / Major</label>
                                    </div>
                                    <input
                                        type="text"
                                        value={program}
                                        onChange={e => setProgram(e.target.value)}
                                        placeholder="e.g. BS Computer Science"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Institution</label>
                                    </div>
                                    <input
                                        type="text"
                                        value={institution}
                                        onChange={e => setInstitution(e.target.value)}
                                        placeholder="e.g. University of Gwadar"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Graduation Year</label>
                                    </div>
                                    <input
                                        type="number"
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        min="1990"
                                        max="2035"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Certificate Unique ID</label>
                                        <button
                                            type="button"
                                            className="btn-icon-subtle"
                                            onClick={generateId}
                                            title="Auto-generate Unique ID"
                                            style={{ color: "#38bdf8", fontSize: "11px", gap: "4px" }}
                                        >
                                            <Sparkles size={12} /> Auto-Generate
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={certificateId}
                                        onChange={e => setCertificateId(e.target.value)}
                                        placeholder="e.g. CERT-2026-8812"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={busy}
                                style={{ marginTop: "12px" }}
                            >
                                {busy ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={16} />
                                        <span>Minting on Ethereum...</span>
                                    </>
                                ) : (
                                    <>
                                        <Award size={18} />
                                        <span>Issue & Mint Certificate</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right: Live Certificate Preview */}
                    <div>
                        <div className="card-header" style={{ marginBottom: "12px" }}>
                            <div className="card-title-group">
                                <div className="card-title-icon" style={{ background: "rgba(234, 179, 8, 0.15)", borderColor: "rgba(234, 179, 8, 0.3)", color: "#fde047" }}>
                                    <Eye size={18} />
                                </div>
                                <div>
                                    <h4 style={{ color: "#ffffff", fontSize: "16px" }}>Live Credential Preview</h4>
                                    <p>Real-time visual rendering</p>
                                </div>
                            </div>
                        </div>

                        <div className="cert-preview-card">
                            <span className="cert-preview-badge">
                                <Sparkles size={11} /> Live Preview
                            </span>

                            <div className="cert-preview-header">
                                <div className="cert-seal">
                                    <Award size={28} />
                                </div>
                                <div className="cert-institution">{livePreviewMetadata.institution}</div>
                                <div className="cert-title">CERTIFICATE OF ACHIEVEMENT</div>
                            </div>

                            <div className="cert-body">
                                <div className="cert-presented">This certifies that</div>
                                <div className="cert-recipient">{livePreviewMetadata.studentName}</div>
                                <div className="cert-presented" style={{ marginTop: "6px" }}>has successfully met all requirements for the degree of</div>
                                <div className="cert-program">{livePreviewMetadata.program}</div>
                            </div>

                            <div className="cert-footer">
                                <div className="cert-meta-item">
                                    <strong>Student ID:</strong>
                                    <span>{livePreviewMetadata.studentId}</span>
                                </div>
                                <div className="cert-meta-item" style={{ textAlign: "center" }}>
                                    <strong>Conferred:</strong>
                                    <span>{livePreviewMetadata.year}</span>
                                </div>
                                <div className="cert-meta-item" style={{ textAlign: "right" }}>
                                    <strong>Credential ID:</strong>
                                    <span>{livePreviewMetadata.certificateId}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: VERIFY CREDENTIAL SEARCH */}
            {activeTab === "verify" && (
                <div className="glass-card" style={{ maxWidth: "680px", margin: "0 auto" }}>
                    <div className="card-header">
                        <div className="card-title-group">
                            <div className="card-title-icon">
                                <Search size={20} />
                            </div>
                            <div>
                                <h3>Verify Any Certificate</h3>
                                <p>Authenticate document authenticity on-chain</p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (searchId.trim()) {
                                navigate(`/verify/${encodeURIComponent(searchId.trim())}`);
                            }
                        }}
                    >
                        <div className="form-group">
                            <label>Certificate Unique ID</label>
                            <div className="input-with-action">
                                <input
                                    type="text"
                                    value={searchId}
                                    onChange={e => setSearchId(e.target.value)}
                                    placeholder="e.g. CERT-2026-001"
                                    required
                                />
                                <button type="submit" className="btn btn-primary">
                                    <Search size={16} /> Verify
                                </button>
                            </div>
                        </div>
                    </form>

                    {historyList.length > 0 && (
                        <div style={{ marginTop: "24px" }}>
                            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>Recently Issued Certificates:</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {historyList.slice(0, 5).map(h => (
                                    <button
                                        key={h.certificateId}
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => navigate(`/verify/${encodeURIComponent(h.certificateId)}`)}
                                        style={{ fontSize: "11px" }}
                                    >
                                        {h.certificateId} ({h.studentName})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: ISSUED CERTIFICATES HISTORY */}
            {activeTab === "history" && (
                <div className="glass-card">
                    <div className="card-header">
                        <div className="card-title-group">
                            <div className="card-title-icon">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3>Issued Certificates History</h3>
                                <p>Certificates minted from this browser session</p>
                            </div>
                        </div>
                    </div>

                    {historyList.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                            <Award size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
                            <p>No certificates issued yet. Issue your first certificate using the "Issue Certificate" tab!</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Certificate ID</th>
                                        <th>Student</th>
                                        <th>Program</th>
                                        <th>Year</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyList.map(item => (
                                        <tr key={item.certificateId}>
                                            <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", fontWeight: 600 }}>
                                                {item.certificateId}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.studentName}</div>
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>ID: {item.studentId}</div>
                                            </td>
                                            <td>{item.program}</td>
                                            <td>{item.year}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => setIssuedCert(item)}
                                                        title="View QR & Credentials"
                                                    >
                                                        <QrCode size={13} /> QR
                                                    </button>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => navigate(`/verify/${encodeURIComponent(item.certificateId)}`)}
                                                    >
                                                        <ExternalLink size={13} /> Verify
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: REVOCATION */}
            {activeTab === "revoke" && (
                <div className="glass-card" style={{ maxWidth: "640px", margin: "0 auto" }}>
                    <div className="card-header">
                        <div className="card-title-group">
                            <div className="card-title-icon" style={{ background: "rgba(244, 63, 94, 0.15)", borderColor: "rgba(244, 63, 94, 0.3)", color: "#f43f5e" }}>
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3>Revoke Certificate</h3>
                                <p>Permanently invalidate a previously issued credential</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "8px", padding: "14px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", gap: "10px", color: "#fda4af", fontSize: "13px" }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>
                                <strong>Warning:</strong> Revocation is recorded permanently on the blockchain. Once revoked, any subsequent verification will mark the document as invalid and revoked.
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleRevokeCertificate}>
                        <div className="form-group">
                            <label>Certificate ID to Revoke</label>
                            <input
                                type="text"
                                value={revokeId}
                                onChange={e => setRevokeId(e.target.value)}
                                placeholder="e.g. CERT-2026-001"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-danger btn-block"
                            disabled={busy}
                        >
                            {busy ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    <span>Processing Revocation...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    <span>Revoke on Blockchain</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* SUCCESS MODAL: SHOWN UPON SUCCESSFUL ISSUANCE (FIXES WHITE SCREEN BUG) */}
            {issuedCert && (
                <div className="modal-overlay" onClick={() => setIssuedCert(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setIssuedCert(null)}>
                            <XCircle size={20} />
                        </button>

                        <div className="success-badge-header">
                            <div className="success-icon-ring">
                                <Check size={32} />
                            </div>
                            <h3>Certificate Issued Successfully!</h3>
                            <p>Permanently recorded and verified on Ethereum</p>
                        </div>

                        {/* High-res QR code */}
                        <div style={{ textAlign: "center" }}>
                            <div className="qr-card">
                                <QRCodeSVG
                                    value={issuedCert.verificationUrl || generateVerificationUrl(issuedCert)}
                                    size={180}
                                    level="H"
                                    includeMargin
                                />
                            </div>
                            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                                Scan this QR code with any mobile camera to verify instant authenticity
                            </p>
                        </div>

                        {/* Certificate metadata summary */}
                        <div className="issued-details-box">
                            <div className="detail-row">
                                <span className="detail-label">Certificate ID</span>
                                <span className="detail-value">{issuedCert.certificateId}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Recipient</span>
                                <span className="detail-value">{issuedCert.studentName} ({issuedCert.studentId})</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Degree</span>
                                <span className="detail-value">{issuedCert.program}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Institution</span>
                                <span className="detail-value">{issuedCert.institution}</span>
                            </div>
                            {issuedCert.txHash && (
                                <div className="detail-row">
                                    <span className="detail-label">Tx Hash</span>
                                    <span className="detail-value mono" title={issuedCert.txHash}>
                                        {issuedCert.txHash.slice(0, 14)}...{issuedCert.txHash.slice(-8)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => copyIssuedUrl(issuedCert.verificationUrl || generateVerificationUrl(issuedCert))}
                            >
                                {copiedLink ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                <span>{copiedLink ? "Link Copied!" : "Copy Verification URL"}</span>
                            </button>

                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setIssuedCert(null);
                                    navigate(`/verify/${encodeURIComponent(issuedCert.certificateId)}`);
                                }}
                            >
                                <ExternalLink size={16} />
                                <span>Open Verification Page</span>
                            </button>
                        </div>

                        <div style={{ marginTop: "12px" }}>
                            <button
                                className="btn btn-secondary btn-block"
                                onClick={() => window.print()}
                            >
                                <Printer size={16} />
                                <span>Print / Save Credential</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------- VERIFY PAGE COMPONENT ----------------
function VerifyPage({ showToast }) {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [certificate, setCertificate] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [status, setStatus] = useState("QUERYING_BLOCKCHAIN");
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [copiedHash, setCopiedHash] = useState(false);

    useEffect(() => {
        let active = true;

        async function verify() {
            setLoading(true);
            try {
                const contract = await getReadContract();
                const result = await contract.verifyCertificate(id);

                if (!active) return;

                if (!result.exists) {
                    setStatus("NOT_FOUND");
                    setCertificate(null);
                    return;
                }

                // Check for metadata in URL query param 'd' (for universal QR scanning)
                let localMetadata = null;
                const encodedData = searchParams.get("d");
                if (encodedData) {
                    try {
                        localMetadata = JSON.parse(decodeURIComponent(atob(encodedData)));
                    } catch (e) {
                        console.warn("Failed to parse URL metadata parameter", e);
                    }
                }

                // Fallback to localStorage if not in URL param
                if (!localMetadata) {
                    const saved = localStorage.getItem(getMetadataKey(id));
                    if (saved) {
                        try {
                            localMetadata = JSON.parse(saved);
                        } catch {
                            localMetadata = null;
                        }
                    }
                }

                const certObj = {
                    dataHash: result.dataHash,
                    issuer: result.issuer,
                    issuedAt: Number(result.issuedAt),
                    revoked: result.revoked,
                    exists: result.exists
                };

                setCertificate(certObj);
                setMetadata(localMetadata);

                if (result.revoked) {
                    setStatus("REVOKED");
                } else if (localMetadata && createDataHash(localMetadata) !== result.dataHash) {
                    setStatus("HASH_MISMATCH");
                } else {
                    setStatus("VERIFIED");
                }

            } catch (error) {
                console.error("Verification query error", error);
                if (active) {
                    setStatus("ERROR");
                    setErrorMessage(error.message || "Failed to query blockchain record");
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        verify();

        return () => {
            active = false;
        };
    }, [id, searchParams]);

    function copyHash(text) {
        navigator.clipboard.writeText(text);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
    }

    return (
        <div className="main-content verify-container">
            <div style={{ marginBottom: "20px" }}>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate("/")}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {loading ? (
                <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                    <RefreshCw className="animate-spin" size={36} color="#6366f1" style={{ margin: "0 auto 16px" }} />
                    <h3 style={{ color: "#ffffff", marginBottom: "8px" }}>Querying Ethereum Blockchain...</h3>
                    <p style={{ color: "#94a3b8" }}>Verifying cryptographic proofs for Certificate ID: {id}</p>
                </div>
            ) : (
                <>
                    {/* Status Banner */}
                    {status === "VERIFIED" && (
                        <div className="verification-status-banner valid">
                            <div style={{ display: "inline-flex", padding: "12px", background: "rgba(16, 185, 129, 0.2)", borderRadius: "50%", color: "#10b981" }}>
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="status-badge-title">OFFICIALLY VERIFIED CREDENTIAL</div>
                            <p style={{ color: "#a7f3d0", marginTop: "6px", fontSize: "14px" }}>
                                This academic credential is authentic and validated by smart contract on the Ethereum blockchain.
                            </p>
                        </div>
                    )}

                    {status === "REVOKED" && (
                        <div className="verification-status-banner revoked">
                            <div style={{ display: "inline-flex", padding: "12px", background: "rgba(244, 63, 94, 0.2)", borderRadius: "50%", color: "#f43f5e" }}>
                                <XCircle size={40} />
                            </div>
                            <div className="status-badge-title">CREDENTIAL HAS BEEN REVOKED</div>
                            <p style={{ color: "#fecdd3", marginTop: "6px", fontSize: "14px" }}>
                                This certificate was previously issued but has since been revoked by the issuing authority.
                            </p>
                        </div>
                    )}

                    {status === "HASH_MISMATCH" && (
                        <div className="verification-status-banner invalid">
                            <div style={{ display: "inline-flex", padding: "12px", background: "rgba(245, 158, 11, 0.2)", borderRadius: "50%", color: "#f59e0b" }}>
                                <AlertTriangle size={40} />
                            </div>
                            <div className="status-badge-title">DATA INTEGRITY TAMPER WARNING</div>
                            <p style={{ color: "#fef3c7", marginTop: "6px", fontSize: "14px" }}>
                                The document data hash does not match the on-chain cryptographic commitment. The content may have been altered.
                            </p>
                        </div>
                    )}

                    {status === "NOT_FOUND" && (
                        <div className="verification-status-banner invalid">
                            <div style={{ display: "inline-flex", padding: "12px", background: "rgba(245, 158, 11, 0.2)", borderRadius: "50%", color: "#f59e0b" }}>
                                <AlertTriangle size={40} />
                            </div>
                            <div className="status-badge-title">CERTIFICATE NOT FOUND</div>
                            <p style={{ color: "#fef3c7", marginTop: "6px", fontSize: "14px" }}>
                                No cryptographic record exists on the blockchain for Certificate ID: "{id}".
                            </p>
                        </div>
                    )}

                    {status === "ERROR" && (
                        <div className="verification-status-banner invalid">
                            <AlertTriangle size={40} color="#f59e0b" style={{ margin: "0 auto 12px" }} />
                            <div className="status-badge-title">CONNECTION ERROR</div>
                            <p style={{ color: "#fef3c7", marginTop: "6px", fontSize: "14px" }}>{errorMessage}</p>
                        </div>
                    )}

                    {/* Certificate Details Card */}
                    {certificate && (
                        <div className="credentials-display-card">
                            {metadata ? (
                                <>
                                    <div className="student-highlight-banner">
                                        <div className="student-avatar">
                                            {metadata.studentName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="student-meta">
                                            <h2>{metadata.studentName}</h2>
                                            <p>{metadata.program}</p>
                                        </div>
                                    </div>

                                    <div className="form-grid" style={{ marginBottom: "20px" }}>
                                        <div className="detail-row">
                                            <span className="detail-label">Student ID</span>
                                            <span className="detail-value">{metadata.studentId}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Institution</span>
                                            <span className="detail-value">{metadata.institution}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Graduation Year</span>
                                            <span className="detail-value">{metadata.year}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Certificate ID</span>
                                            <span className="detail-value">{id}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
                                    <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                                        The on-chain proof exists on Ethereum. Display details were not cached in this browser session, but the immutable cryptographic proof and timestamp are verified below.
                                    </p>
                                </div>
                            )}

                            {/* Cryptographic Proof Details */}
                            <div className="proof-section">
                                <h4>
                                    <Lock size={14} color="#38bdf8" />
                                    <span>On-Chain Cryptographic Proof</span>
                                </h4>

                                <div style={{ marginBottom: "12px" }}>
                                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                                        Document Keccak-256 Hash
                                    </span>
                                    <div className="hash-pill">
                                        <span>{certificate.dataHash}</span>
                                        <button
                                            className="btn-icon-subtle"
                                            onClick={() => copyHash(certificate.dataHash)}
                                            title="Copy Hash"
                                        >
                                            {copiedHash ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "12px" }}>
                                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                                        Authorized Issuer Address
                                    </span>
                                    <div className="hash-pill">
                                        <span>{certificate.issuer}</span>
                                    </div>
                                </div>

                                <div className="detail-row" style={{ paddingTop: "8px" }}>
                                    <span className="detail-label">Block Timestamp</span>
                                    <span className="detail-value">
                                        {new Date(certificate.issuedAt * 1000).toLocaleString(undefined, {
                                            dateStyle: "full",
                                            timeStyle: "medium"
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Verification Page Actions */}
                            <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
                                <button className="btn btn-secondary" onClick={() => window.print()}>
                                    <Printer size={16} /> Print Verification
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        if (showToast) {
                                            showToast({
                                                type: "success",
                                                title: "Copied!",
                                                message: "Public verification URL copied to clipboard."
                                            });
                                        }
                                    }}
                                >
                                    <Copy size={16} /> Share Link
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ---------------- ROOT APP COMPONENT ----------------
export default function App() {
    const [account, setAccount] = useState("");
    const [isOwner, setIsOwner] = useState(false);
    const [networkInfo, setNetworkInfo] = useState({
        chainId: null,
        isCorrectNetwork: true
    });
    const [toast, setToast] = useState(null);

    function showToast(options) {
        setToast(options);
        if (options.type !== "info") {
            setTimeout(() => {
                setToast(current => (current === options ? null : current));
            }, 5000);
        }
    }

    // Check existing connection on mount ("if its linked already so show linked")
    useEffect(() => {
        let mounted = true;

        async function initWeb3() {
            if (!window.ethereum) return;

            try {
                // Request existing connected accounts silently without prompting
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });

                if (!mounted) return;

                const chainIdNum = parseInt(chainIdHex, 16);
                setNetworkInfo({
                    chainId: chainIdNum,
                    isCorrectNetwork: chainIdNum === GANACHE_CHAIN_ID_NUM
                });

                if (accounts && accounts.length > 0) {
                    const activeAccount = accounts[0];
                    setAccount(activeAccount);

                    // Check if owner
                    try {
                        const contract = await getReadContract();
                        const contractOwner = await contract.owner();
                        if (mounted) {
                            setIsOwner(contractOwner.toLowerCase() === activeAccount.toLowerCase());
                        }
                    } catch (e) {
                        console.warn("Could not fetch owner", e);
                    }
                }

                // Setup MetaMask event listeners
                window.ethereum.on("accountsChanged", (newAccounts) => {
                    if (newAccounts.length === 0) {
                        setAccount("");
                        setIsOwner(false);
                    } else {
                        setAccount(newAccounts[0]);
                        // Re-check owner
                        getReadContract().then(c => c.owner()).then(o => {
                            setIsOwner(o.toLowerCase() === newAccounts[0].toLowerCase());
                        }).catch(() => {});
                    }
                });

                window.ethereum.on("chainChanged", (newChainId) => {
                    const num = parseInt(newChainId, 16);
                    setNetworkInfo({
                        chainId: num,
                        isCorrectNetwork: num === GANACHE_CHAIN_ID_NUM
                    });
                });

            } catch (err) {
                console.error("Failed to initialize web3", err);
            }
        }

        initWeb3();

        return () => {
            mounted = false;
        };
    }, []);

    // Connect wallet explicitly when user clicks Connect
    async function handleConnect() {
        if (!window.ethereum) {
            showToast({
                type: "error",
                title: "MetaMask Missing",
                message: "MetaMask extension was not detected. Please install MetaMask to interact with the blockchain."
            });
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                const network = await provider.getNetwork();
                const chainIdNum = Number(network.chainId);
                setNetworkInfo({
                    chainId: chainIdNum,
                    isCorrectNetwork: chainIdNum === GANACHE_CHAIN_ID_NUM
                });

                try {
                    const contract = await getReadContract();
                    const contractOwner = await contract.owner();
                    setIsOwner(contractOwner.toLowerCase() === accounts[0].toLowerCase());
                } catch {
                    // ignore
                }

                showToast({
                    type: "success",
                    title: "Wallet Linked",
                    message: `Connected as ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
                });
            }
        } catch (error) {
            console.error("Connect error", error);
            showToast({
                type: "error",
                title: "Connection Failed",
                message: error.message || "Failed to link MetaMask account"
            });
        }
    }

    return (
        <ErrorBoundary>
            <div className="app-container">
                <Navbar
                    account={account}
                    onConnect={handleConnect}
                    isOwner={isOwner}
                    networkInfo={networkInfo}
                    onSwitchNetwork={requestSwitchToGanache}
                />

                <Routes>
                    <Route
                        path="/"
                        element={
                            <Dashboard
                                account={account}
                                onConnect={handleConnect}
                                isOwner={isOwner}
                                networkInfo={networkInfo}
                                onSwitchNetwork={requestSwitchToGanache}
                                showToast={showToast}
                            />
                        }
                    />
                    <Route
                        path="/verify/:id"
                        element={<VerifyPage showToast={showToast} />}
                    />
                </Routes>

                <Toast toast={toast} onClose={() => setToast(null)} />

                <footer>
                    <div className="footer-content">
                        <div>
                            <strong>CertiChain</strong> — Immutable Academic Credential Verification System
                        </div>
                        <div style={{ display: "flex", gap: "16px", color: "#64748b" }}>
                            <span>Solidity 0.8.24</span>
                            <span>•</span>
                            <span>Ethereum Ganache 1337</span>
                            <span>•</span>
                            <span>Ethers v6</span>
                        </div>
                    </div>
                </footer>
            </div>
        </ErrorBoundary>
    );
}
