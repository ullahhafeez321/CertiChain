
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertiChain {
    address public owner;

    // Accounts allowed to issue/revoke certificates (owner is always allowed).
    mapping(address => bool) public authorizedIssuers;

    // Fee paid by the issuer for every certificate (sent to the contract owner).
    uint256 public issuanceFee = 0.01 ether;

    struct Certificate {
        bytes32 dataHash;
        address issuer;
        uint64 issuedAt;
        bool revoked;
        bool exists;
    }

    mapping(bytes32 => Certificate) private certificates;

    event CertificateIssued(
        string certificateId,
        bytes32 dataHash,
        address issuer
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

    function issueCertificate(
        string calldata certificateId,
        bytes32 dataHash
    ) external payable onlyIssuer {
        require(bytes(certificateId).length > 0, "Certificate ID required");
        require(dataHash != bytes32(0), "Invalid data hash");
        require(msg.value == issuanceFee, "Incorrect issuance fee");

        bytes32 idHash = keccak256(bytes(certificateId));

        require(!certificates[idHash].exists, "Certificate already exists");

        certificates[idHash] = Certificate({
            dataHash: dataHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            revoked: false,
            exists: true
        });

        // Forward the issuance fee to the university admin (contract owner).
        if (msg.value > 0) {
            (bool sent, ) = payable(owner).call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }

        emit CertificateIssued(certificateId, dataHash, msg.sender);
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
            bool exists
        )
    {
        bytes32 idHash = keccak256(bytes(certificateId));
        Certificate memory cert = certificates[idHash];

        return (
            cert.dataHash,
            cert.issuer,
            cert.issuedAt,
            cert.revoked,
            cert.exists
        );
    }

    function revokeCertificate(
        string calldata certificateId
    ) external onlyIssuer {
        bytes32 idHash = keccak256(bytes(certificateId));

        require(certificates[idHash].exists, "Certificate not found");
        require(!certificates[idHash].revoked, "Already revoked");

        certificates[idHash].revoked = true;

        emit CertificateRevoked(certificateId, msg.sender);
    }
}
