
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertiChain {
    address public owner;

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

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only university admin");
        _;
    }

    function issueCertificate(
        string calldata certificateId,
        bytes32 dataHash
    ) external onlyOwner {
        require(bytes(certificateId).length > 0, "Certificate ID required");
        require(dataHash != bytes32(0), "Invalid data hash");

        bytes32 idHash = keccak256(bytes(certificateId));

        require(!certificates[idHash].exists, "Certificate already exists");

        certificates[idHash] = Certificate({
            dataHash: dataHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            revoked: false,
            exists: true
        });

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
    ) external onlyOwner {
        bytes32 idHash = keccak256(bytes(certificateId));

        require(certificates[idHash].exists, "Certificate not found");
        require(!certificates[idHash].revoked, "Already revoked");

        certificates[idHash].revoked = true;

        emit CertificateRevoked(certificateId, msg.sender);
    }
}
