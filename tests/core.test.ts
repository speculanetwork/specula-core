import { describe, expect, it } from "vitest";
import {
  analyzeContractBytecode,
  buildConnectionGraph,
  canonicalEntityKey,
  computeEvidenceHash,
  EvidenceAccumulator,
  isValidEvmAddress,
  normalizeWalletAddress,
  parseGitHubRepoUrl,
  parseTargetInput,
  stripSolidityCborMetadata,
} from "../src/index";

describe("Address, Target & Entity Normalization", () => {
  it("validates and normalizes EIP-55 Ethereum addresses", () => {
    const raw = "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e";
    expect(isValidEvmAddress(raw)).toBe(true);
    expect(normalizeWalletAddress(raw)).toBe("0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e");
    expect(isValidEvmAddress("0x1234")).toBe(false);
    expect(() => normalizeWalletAddress("not-an-address")).toThrow();
  });

  it("parses contract/wallet addresses, GitHub URLs, and website URLs", () => {
    const addr = parseTargetInput("0x51f8f606bdfe17341a084b3a14b30a1db7e43822");
    expect(addr.initialKind).toBe("contract");
    expect(addr.normalizedTarget).toBe("0x51f8f606BdFe17341a084B3A14b30a1db7E43822");

    const gh = parseTargetInput("https://github.com/ethereum/go-ethereum");
    expect(gh.initialKind).toBe("github_repo");
    expect(gh.normalizedTarget).toBe("https://github.com/ethereum/go-ethereum");
    expect(parseGitHubRepoUrl("https://github.com/ethereum/go-ethereum.git")).toEqual({
      owner: "ethereum",
      repo: "go-ethereum",
      normalizedUrl: "https://github.com/ethereum/go-ethereum",
    });

    const web = parseTargetInput("https://example.org/docs");
    expect(web.initialKind).toBe("website");
    expect(web.normalizedTarget).toBe("https://example.org/docs");
  });

  it("constructs deterministic chain-scoped canonical entity keys", () => {
    const k1 = canonicalEntityKey("token", "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e", 4663);
    const k2 = canonicalEntityKey("token", "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e", 4663);
    const kOtherChain = canonicalEntityKey(
      "token",
      "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e",
      1
    );

    expect(k1).toBe(k2);
    expect(k1).not.toBe(kOtherChain);
  });
});

describe("Evidence Deduplication, Bytecode Fingerprinting & Graph", () => {
  it("deduplicates identical subject-predicate-object evidence and builds evidence-backed edges", () => {
    const acc = new EvidenceAccumulator("00000000-0000-4000-8000-000000000001");
    const token = acc.registerEntity({
      entityType: "token",
      identifier: "0x51f8f606BdFe17341a084B3A14b30a1db7E43822",
      chainId: 4663,
      displayLabel: "PIKAT",
    });
    const deployer = acc.registerEntity({
      entityType: "wallet",
      identifier: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
      chainId: 4663,
      displayLabel: "Factory",
    });

    const e1 = acc.addEvidence({
      sourceType: "robinhood_rpc",
      sourceUrl: "https://robinhoodchain.blockscout.com",
      subject: token.addressOrIdentifier,
      predicate: "deployed_by",
      object: deployer.addressOrIdentifier,
      description: "Contract deployed",
      confidence: "confirmed",
      verificationStatus: "verified",
      provider: "robinhood_rpc",
    });
    const e2 = acc.addEvidence({
      sourceType: "robinhood_rpc",
      sourceUrl: "https://robinhoodchain.blockscout.com",
      subject: token.addressOrIdentifier.toLowerCase(),
      predicate: "deployed_by",
      object: deployer.addressOrIdentifier.toLowerCase(),
      description: "Duplicate emission",
      confidence: "confirmed",
      verificationStatus: "verified",
      provider: "robinhood_rpc",
    });

    expect(e1.id).toBe(e2.id);
    expect(acc.getEvidenceList()).toHaveLength(1);
    expect(
      computeEvidenceHash({
        sourceType: "robinhood_rpc",
        subject: "0xAAA",
        predicate: "deployed_by",
        object: "0xBBB",
        transactionHash: null,
      })
    ).toHaveLength(66);

    acc.addRelationship({
      sourceEntityKey: deployer.canonicalKey,
      targetEntityKey: token.canonicalKey,
      relationshipType: "created",
      evidenceId: e1.id,
      confidence: "confirmed",
    });

    const graph = buildConnectionGraph({
      primaryEntityKey: token.canonicalKey,
      entities: acc.getEntities(),
      relationships: acc.getRelationships(),
      evidence: acc.getEvidenceList(),
      explorerBaseUrl: "https://robinhoodchain.blockscout.com",
    });

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.inferred).toBe(false);
  });

  it("strips Solidity CBOR metadata so identical contracts with different IPFS hashes match normalized hash", () => {
    const runtimeBody =
      "6080604052348015600f57600080fd5b506004361060285760003560e01c806306fdde0314602d57";
    const cborPayloadA = `a2${"646970667358221220".padEnd(100, "a")}0033`;
    const cborPayloadB = `a2${"646970667358221220".padEnd(100, "b")}0033`;

    expect(stripSolidityCborMetadata(`${runtimeBody}${cborPayloadA}`)).toBe(runtimeBody);

    const fpA = analyzeContractBytecode(`0x${runtimeBody}${cborPayloadA}`);
    const fpB = analyzeContractBytecode(`0x${runtimeBody}${cborPayloadB}`);

    expect(fpA.bytecodeHash).not.toBe(fpB.bytecodeHash);
    expect(fpA.normalizedRuntimeHash).toBe(fpB.normalizedRuntimeHash);
  });

  it("detects EIP-1167 minimal proxy clones and extracts delegate target", () => {
    const impl = "7ed598bcef8bd9edd8c97a195c6d13f40801ec7e";
    const eip1167 = `0x363d3d373d3d3d363d73${impl}5af43d82803e903d91602b57fd5bf3`;
    const analyzed = analyzeContractBytecode(eip1167);
    expect(analyzed.proxyType).toBe("eip1167_minimal_proxy");
    expect(analyzed.eip1167Target?.toLowerCase()).toBe(`0x${impl}`);
  });
});
