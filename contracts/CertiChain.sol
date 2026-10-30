
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertiChain {
    address public owner;

    // Accounts allowed to issue/revoke certificates (owner is always allowed).
    mapping(address => bool) public authorizedIssuers;

    // Optional fee paid by the issuer for direct issuance (default 0: gas only).
    uint256 public issuanceFee = 0;

    struct Certificate {
        bytes32 dataHash;
        string metadata;
        address issuer;
        address student;
        uint64 issuedAt;
        uint256 claimFee;
        bool revoked;
        bool exists;
        bool pending;
    }

    mapping(bytes32 => Certificate) private certificates;

    event CertificateIssued(
        string certificateId,
        bytes32 dataHash,
        address issuer
    );

    event CertificateRequested(
        string certificateId,
        bytes32 dataHash,
        address indexed issuer,
        address indexed student,
        uint256 claimFee
    );

    event CertificateClaimed(
        string certificateId,
        address indexed student,
        uint256 amountPaid
    );

    event CertificateRequestCancelled(
        string certificateId,
        address indexed issuer
    );

    event CertificateRevoked(
        string certificateId,
        address issuer
    );

    event IssuerAuthorized(
        address indexed issuer,
        bool authorized
    );

    event IssuanceFeeUpdated(uint256 fee);

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only university admin");
        _;
    }

    modifier onlyIssuer() {
        require(
            msg.sender == owner || authorizedIssuers[msg.sender],
            "Not an authorized issuer"
        );
        _;
    }

    function authorizeIssuer(address issuer, bool authorized) external onlyOwner {
        require(issuer != address(0), "Invalid issuer address");
        authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorized(issuer, authorized);
    }

    function isIssuer(address account) external view returns (bool) {
        return account == owner || authorizedIssuers[account];
    }

    function setIssuanceFee(uint256 fee) external onlyOwner {
        issuanceFee = fee;
        emit IssuanceFeeUpdated(fee);
    }

    // Issuer mints a certificate directly and pays gas (plus optional issuanceFee).
    function issueCertificate(
        string calldata certificateId,
        bytes32 dataHash,
        string calldata metadata
    ) external payable onlyIssuer {
        require(bytes(certificateId).length > 0, "Certificate ID required");
        require(dataHash != bytes32(0), "Invalid data hash");
        require(msg.value == issuanceFee, "Incorrect issuance fee");

        bytes32 idHash = keccak256(bytes(certificateId));
        Certificate storage existing = certificates[idHash];

        require(!existing.exists && !existing.pending, "Certificate already exists");

        certificates[idHash] = Certificate({
            dataHash: dataHash,
            metadata: metadata,
            issuer: msg.sender,
            student: address(0),
            issuedAt: uint64(block.timestamp),
            claimFee: 0,
            revoked: false,
            exists: true,
            pending: false
        });

        // Forward the optional issuance fee to the university admin.
        if (msg.value > 0) {
            (bool sent, ) = payable(owner).call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }

        emit CertificateIssued(certificateId, dataHash, msg.sender);
    }

    // Issuer creates a pending certificate that the student pays for and claims.
    function createCertificateRequest(
        string calldata certificateId,
        bytes32 dataHash,
        address student,
        uint256 claimFee,
        string calldata metadata
    ) external onlyIssuer {
        require(bytes(certificateId).length > 0, "Certificate ID required");
        require(dataHash != bytes32(0), "Invalid data hash");

        bytes32 idHash = keccak256(bytes(certificateId));
        Certificate storage existing = certificates[idHash];

        require(!existing.exists && !existing.pending, "Certificate already exists");

        certificates[idHash] = Certificate({
            dataHash: dataHash,
            metadata: metadata,
            issuer: msg.sender,
            student: student,
            issuedAt: 0,
            claimFee: claimFee,
            revoked: false,
            exists: false,
            pending: true
        });

        emit CertificateRequested(
            certificateId,
            dataHash,
            msg.sender,
            student,
            claimFee
        );
    }

    // Student pays the claim fee and the certificate becomes valid on-chain.
    function claimCertificate(string calldata certificateId) external payable {
        bytes32 idHash = keccak256(bytes(certificateId));
        Certificate storage cert = certificates[idHash];

        require(cert.pending, "No pending certificate");
        require(!cert.exists, "Certificate already claimed");

        if (cert.student != address(0)) {
            require(msg.sender == cert.student, "Not assigned to this student");
        }

        require(msg.value == cert.claimFee, "Incorrect claim fee");

        cert.pending = false;
        cert.exists = true;
        cert.issuedAt = uint64(block.timestamp);

        // The claim fee is paid to the issuer who created the certificate.
        if (msg.value > 0) {
            (bool sent, ) = payable(cert.issuer).call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }

        emit CertificateIssued(certificateId, cert.dataHash, cert.issuer);
        emit CertificateClaimed(certificateId, msg.sender, msg.value);
    }

    // Issuer or admin can cancel an unclaimed request.
    function cancelCertificateRequest(
        string calldata certificateId
    ) external onlyIssuer {
        bytes32 idHash = keccak256(bytes(certificateId));
        Certificate storage cert = certificates[idHash];

        require(cert.pending, "No pending request");
        require(
            cert.issuer == msg.sender || msg.sender == owner,
            "Not allowed"
        );

        delete certificates[idHash];

        emit CertificateRequestCancelled(certificateId, msg.sender);
    }

    function getCertificateRequest(
        string calldata certificateId
    )
        external
        view
        returns (
            bytes32 dataHash,
            address issuer,
            address student,
            uint256 claimFee,
            bool pending,
            bool exists,
            bool revoked,
            string memory metadata
        )
    {
        Certificate memory cert = certificates[keccak256(bytes(certificateId))];

        return (
            cert.dataHash,
            cert.issuer,
            cert.student,
            cert.claimFee,
            cert.pending,
            cert.exists,
            cert.revoked,
            cert.metadata
        );
    }

    function verifyCertificate(
        string calldata certificateId
    )
        external
        view
        returns (
            bytes32 dataHash,
            address issuer,
            uint64 issuedAt,
            bool revoked,
            bool exists,
            bool pending,
            uint256 claimFee,
            string memory metadata
        )
    {
        Certificate memory cert = certificates[keccak256(bytes(certificateId))];

        return (
            cert.dataHash,
            cert.issuer,
            cert.issuedAt,
            cert.revoked,
            cert.exists,
            cert.pending,
            cert.claimFee,
            cert.metadata
        );
    }

    function revokeCertificate(
        string calldata certificateId
    ) external onlyIssuer {
        Certificate storage cert = certificates[keccak256(bytes(certificateId))];

        require(cert.exists, "Certificate not found");
        require(!cert.revoked, "Already revoked");

        cert.revoked = true;

        emit CertificateRevoked(certificateId, msg.sender);
    }
}
