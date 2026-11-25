# Changelog

All notable changes to `@speculanetwork/core` and SPECULA methodology are documented in this file.

## [0.1.0] - 2026-11-25

### Added
- Initial release of SPECULA v1.0.0 deterministic core primitives for Robinhood Chain (`4663`).
- Solidity CBOR metadata stripping and normalized runtime bytecode hashing (`analyzeContractBytecode`, `stripSolidityCborMetadata`).
- `EIP-1167` minimal proxy delegate extraction and `EIP-1967` proxy tagging.
- Content-addressed `keccak256` evidence hashing and `EvidenceAccumulator` deduplication.
- Evidence-backed `buildConnectionGraph` builder with explicit `inferred` edge classification.
- `EIP-55` target normalization and `METHODOLOGY.md` v1.0 specification.
