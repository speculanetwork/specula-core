# specula-core

**Every project leaves a trace. Follow the evidence.**

`@speculanetwork/core` contains the deterministic forensic primitives and domain schemas used by **SPECULA** on **Robinhood Chain (`Chain ID: 4663`)**.

- **Platform:** [https://specula.observer](https://specula.observer)
- **X:** [@Specula_rbh](https://x.com/Specula_rbh)
- **`$SPEC` Contract (Robinhood Chain `4663`):** `0x2e6caa4d8191bae986458bfc37ea19c85a55294a`
- **Buy on Pons:** [https://ponsfamily.com/launchpad/0x2e6caa4d8191bae986458bfc37ea19c85a55294a](https://ponsfamily.com/launchpad/0x2e6caa4d8191bae986458bfc37ea19c85a55294a)

---

## Scope

- **`src/blockchain/bytecode.ts`** — Strips trailing Solidity CBOR compiler metadata (`IPFS` / `Swarm`), computes normalized runtime `keccak256` fingerprints, and detects `EIP-1167` minimal proxy clones and `EIP-1967` implementation slots.
- **`src/evidence/builder.ts`** — Canonicalizes chain-scoped entity keys (`eip155:4663:0x...`, `github:...`, `web:...`), computes content-addressed `keccak256` evidence hashes, and deduplicates subject–predicate–object observations within an investigation.
- **`src/graph/builder.ts`** — Constructs bounded `ConnectionGraphPayload` topologies where every edge is strictly backed by a stored `EvidenceRecord` ID and tagged with explicit inference/confidence metadata.
- **`src/validation/inputs.ts`** — Normalizes `EIP-55` addresses, classifies investigation targets (contracts, wallets, GitHub repositories, public websites), and enforces Zod input schemas.
- **`src/types/specula.ts`** — TypeScript definitions for `InvestigationReport`, `EvidenceRecord`, `DeveloperDnaSignal`, `TimelineEvent`, and `IndexedLaunchRecord`.
- **`docs/METHODOLOGY.md`** — Evidence standards, Developer DNA rules, two-hop funding trace boundaries, and explicit coverage limitations.

---

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
```

---

## License

MIT — see [`LICENSE`](./LICENSE).
