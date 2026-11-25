import { getAddress, keccak256 } from "viem";

export interface BytecodeInspection {
  isContract: boolean;
  sizeBytes: number;
  bytecodeHash: string | null;
  normalizedRuntimeHash: string | null;
  proxyType: "none" | "eip1167_minimal_proxy" | "eip1967_proxy" | "unknown";
  eip1167Target: string | null;
}

/**
 * Strips trailing Solidity CBOR compiler metadata (IPFS / Swarm hash) so contracts compiled
 * from identical functional logic with different metadata comments still normalize cleanly.
 */
export function stripSolidityCborMetadata(hexWithoutPrefix: string): string {
  const clean = hexWithoutPrefix.toLowerCase();
  if (clean.length < 24) return clean;

  // Last 2 bytes in Solidity >=0.5.9 encode the uint16 byte-length of appended CBOR metadata
  const last4Hex = clean.slice(-4);
  const cborByteLen = parseInt(last4Hex, 16);
  if (
    !Number.isNaN(cborByteLen) &&
    cborByteLen >= 32 &&
    cborByteLen <= 96 &&
    clean.length > (cborByteLen + 2) * 2 + 16
  ) {
    const metaStart = clean.length - (cborByteLen + 2) * 2;
    const prefixByte = clean.slice(metaStart, metaStart + 2);
    // CBOR map header 0xa1, 0xa2, or 0xa3
    if (prefixByte === "a1" || prefixByte === "a2" || prefixByte === "a3") {
      return clean.slice(0, metaStart);
    }
  }
  return clean;
}

export function analyzeContractBytecode(
  bytecodeHex: string,
  eip1967SlotAddress?: string | null
): BytecodeInspection {
  const normalized = bytecodeHex.trim().toLowerCase();
  if (!normalized || normalized === "0x" || normalized === "0x0") {
    return {
      isContract: false,
      sizeBytes: 0,
      bytecodeHash: null,
      normalizedRuntimeHash: null,
      proxyType: "none",
      eip1167Target: null,
    };
  }

  const rawBody = normalized.startsWith("0x") ? normalized.slice(2) : normalized;
  const sizeBytes = Math.floor(rawBody.length / 2);
  const fullHex = `0x${rawBody}` as `0x${string}`;
  const bytecodeHash = keccak256(fullHex);

  // Detect standard EIP-1167 minimal proxy clone:
  // 363d3d373d3d3d363d73 <20-byte address> 5af43d82803e903d91602b57fd5bf3
  const eip1167Match = /^363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3$/.exec(
    rawBody
  );

  if (eip1167Match?.[1]) {
    const impl = getAddress(`0x${eip1167Match[1]}`);
    return {
      isContract: true,
      sizeBytes,
      bytecodeHash,
      normalizedRuntimeHash: bytecodeHash,
      proxyType: "eip1167_minimal_proxy",
      eip1167Target: impl,
    };
  }

  const stripped = stripSolidityCborMetadata(rawBody);
  const normalizedRuntimeHash = keccak256(`0x${stripped}` as `0x${string}`);

  if (eip1967SlotAddress) {
    return {
      isContract: true,
      sizeBytes,
      bytecodeHash,
      normalizedRuntimeHash,
      proxyType: "eip1967_proxy",
      eip1167Target: null,
    };
  }

  return {
    isContract: true,
    sizeBytes,
    bytecodeHash,
    normalizedRuntimeHash,
    proxyType: "none",
    eip1167Target: null,
  };
}
