# SPECULA Methodology & Evidence Standards (v1.0)

SPECULA aggregates public onchain and offchain data on **Robinhood Chain (`Chain ID: 4663`)** into structured, provenance-linked evidence records.

---

## 1. Evidence Separation

Every report separates observations into three non-overlapping classes:

1. **Verified Facts (`confirmed` / `verified`)**
   - Onchain bytecode retrieved via `eth_getCode`, contract creation transactions, factory `TokenLaunched` logs, block timestamps, `IANA RDAP` domain registration records, and public GitHub repository `created_at` timestamps.
2. **Derived Relationships (`supported` / `derived`)**
   - Two-hop native funding overlap prior to deployment, normalized runtime bytecode hash matches across distinct deployers, and cross-investigation entity matches in persistent memory.
3. **Documented Limitations (`weak_association` / `unverified` / `missing`)**
   - Unverified source code, truncated explorer pagination, shared exchange/bridge hot-wallet funding, or unverified offchain links.

---

## 2. Developer DNA Fingerprinting

- **CBOR Metadata Stripping:** Solidity compilers append trailing CBOR-encoded metadata (such as IPFS/Swarm source hashes) plus a 2-byte big-endian length suffix. `stripSolidityCborMetadata` removes valid trailing CBOR maps (`0xa1`–`0xa3`, 32–96 bytes) before hashing so functionally identical contracts compiled from different file paths still match on `normalizedRuntimeHash`.
- **Template Filtering:** Standard launchpad clones (including verified `PonsV2LaunchFactory` token templates and `EIP-1167` minimal proxies) are flagged with `isTemplateReuseOnly: true` so shared launchpad bytecode is never misattributed as a custom developer link.
- **Repository Fingerprints:** Bounded root file `gitBlobSha` hashes and earliest accessible commit SHAs are recorded with explicit caveats that public GitHub code does not by itself prove correspondence with unverified onchain bytecode.

---

## 3. Two-Hop Funding Trace Boundaries

- Funding traces inspect native value transfers preceding contract deployment up to **2 hops** (`funder -> intermediate -> deployer`).
- High-volume contracts, bridges, and exchange hot wallets are classified separately from ordinary EOAs.
- Shared upstream funding establishes an **onchain transfer path**, never proof of common personal identity.

---

## 4. Explicit Non-Goals

- No claim of complete historical indexing across all blocks.
- No guaranteed pre-launch token discovery (`Pons Launch Radar` indexes post-deployment `TokenLaunched` logs within bounded block checkpoints).
- No smart contract security auditing or financial safety certification.
- No personal KYC or real-world identity attribution.
