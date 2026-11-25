import { getAddress, keccak256, toBytes } from "viem";
import type {
  ConfidenceCategory,
  EntityRecord,
  EntityRelationshipRecord,
  EvidenceRecord,
  EvidenceSourceType,
  GraphEdgeType,
  GraphNodeType,
  VerificationStatus,
} from "../types/specula";

export const METHODOLOGY_VERSION = "1.0.0";

export function canonicalEntityKey(
  type: GraphNodeType,
  identifier: string,
  chainId: number | null = 4663
): string {
  const trimmed = identifier.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return `eip155:${chainId ?? 4663}:${trimmed.toLowerCase()}`;
  }
  if (type === "repository") {
    return `github:${trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?github\.com\//i, "")}`;
  }
  if (type === "website") {
    try {
      const u = new URL(trimmed);
      return `web:${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
    } catch {
      return `web:${trimmed.toLowerCase()}`;
    }
  }
  return `${type}:${trimmed.toLowerCase()}`;
}

export function formatEntityAddress(identifier: string): string {
  if (/^0x[a-fA-F0-9]{40}$/.test(identifier.trim())) {
    return getAddress(identifier.trim().toLowerCase());
  }
  return identifier.trim();
}

export function buildExplorerAddressUrl(explorerBaseUrl: string, address: string): string {
  const base = explorerBaseUrl.replace(/\/+$/, "");
  return `${base}/address/${getAddress(address.toLowerCase())}`;
}

export function buildExplorerTxUrl(explorerBaseUrl: string, txHash: string): string {
  const base = explorerBaseUrl.replace(/\/+$/, "");
  return `${base}/tx/${txHash}`;
}

export function computeEvidenceHash(input: {
  sourceType: EvidenceSourceType;
  subject: string;
  predicate: string;
  object: string;
  transactionHash?: string | null;
}): string {
  const canonical = [
    input.sourceType,
    input.subject.toLowerCase(),
    input.predicate.toLowerCase(),
    input.object.toLowerCase(),
    (input.transactionHash ?? "").toLowerCase(),
  ].join("|");
  return keccak256(toBytes(canonical));
}

export class EvidenceAccumulator {
  private readonly investigationId: string;
  private readonly byHash = new Map<string, EvidenceRecord>();
  private readonly entities = new Map<string, EntityRecord>();
  private readonly relationships = new Map<string, EntityRelationshipRecord>();

  constructor(investigationId: string) {
    this.investigationId = investigationId;
  }

  addEvidence(params: {
    sourceType: EvidenceSourceType;
    sourceUrl?: string | null;
    transactionHash?: string | null;
    blockNumber?: number | null;
    observedAt?: string;
    subject: string;
    predicate: string;
    object: string;
    description: string;
    confidence: ConfidenceCategory;
    verificationStatus: VerificationStatus;
    provider: string;
    metadata?: Record<string, unknown>;
  }): EvidenceRecord {
    const evidenceHash = computeEvidenceHash({
      sourceType: params.sourceType,
      subject: params.subject,
      predicate: params.predicate,
      object: params.object,
      transactionHash: params.transactionHash,
    });

    const existing = this.byHash.get(evidenceHash);
    if (existing) {
      return existing;
    }

    const record: EvidenceRecord = {
      id: crypto.randomUUID(),
      investigationId: this.investigationId,
      sourceType: params.sourceType,
      sourceUrl: params.sourceUrl ?? null,
      transactionHash: params.transactionHash ?? null,
      blockNumber: params.blockNumber ?? null,
      observedAt: params.observedAt ?? new Date().toISOString(),
      subject: params.subject,
      predicate: params.predicate,
      object: params.object,
      description: params.description,
      confidence: params.confidence,
      verificationStatus: params.verificationStatus,
      provider: params.provider,
      methodologyVersion: METHODOLOGY_VERSION,
      evidenceHash,
      metadata: params.metadata ?? {},
    };

    this.byHash.set(evidenceHash, record);
    return record;
  }

  registerEntity(params: {
    entityType: GraphNodeType;
    identifier: string;
    chainId?: number | null;
    displayLabel: string;
    metadata?: Record<string, unknown>;
  }): EntityRecord {
    const chainId = params.chainId === undefined ? 4663 : params.chainId;
    const key = canonicalEntityKey(params.entityType, params.identifier, chainId);
    const nowIso = new Date().toISOString();
    const existing = this.entities.get(key);

    if (existing) {
      const updated: EntityRecord = {
        ...existing,
        displayLabel:
          params.displayLabel && params.displayLabel.length > existing.displayLabel.length
            ? params.displayLabel
            : existing.displayLabel,
        lastObservedAt: nowIso,
        metadata: {
          ...existing.metadata,
          ...(params.metadata ?? {}),
        },
      };
      this.entities.set(key, updated);
      return updated;
    }

    const created: EntityRecord = {
      id: crypto.randomUUID(),
      canonicalKey: key,
      entityType: params.entityType,
      chainId,
      addressOrIdentifier: formatEntityAddress(params.identifier),
      displayLabel: params.displayLabel,
      firstObservedAt: nowIso,
      lastObservedAt: nowIso,
      metadata: params.metadata ?? {},
    };
    this.entities.set(key, created);
    return created;
  }

  addRelationship(params: {
    sourceEntityKey: string;
    targetEntityKey: string;
    relationshipType: GraphEdgeType;
    evidenceId: string;
    sourceReference?: string | null;
    confidence: ConfidenceCategory;
    observedAt?: string;
  }): EntityRelationshipRecord | null {
    if (params.sourceEntityKey === params.targetEntityKey) {
      return null;
    }
    const dedupKey = `${params.sourceEntityKey}|${params.relationshipType}|${params.targetEntityKey}|${params.sourceReference ?? ""}`;
    const existing = this.relationships.get(dedupKey);
    if (existing) return existing;

    const rel: EntityRelationshipRecord = {
      id: crypto.randomUUID(),
      sourceEntityKey: params.sourceEntityKey,
      targetEntityKey: params.targetEntityKey,
      relationshipType: params.relationshipType,
      evidenceId: params.evidenceId,
      sourceReference: params.sourceReference ?? null,
      confidence: params.confidence,
      observedAt: params.observedAt ?? new Date().toISOString(),
      investigationId: this.investigationId,
    };
    this.relationships.set(dedupKey, rel);
    return rel;
  }

  getEvidenceList(): EvidenceRecord[] {
    return Array.from(this.byHash.values());
  }

  getEntities(): EntityRecord[] {
    return Array.from(this.entities.values());
  }

  getRelationships(): EntityRelationshipRecord[] {
    return Array.from(this.relationships.values());
  }
}

