import { buildExplorerAddressUrl } from "../evidence/builder";
import { shortenAddress } from "../validation/inputs";
import type {
  ConnectionGraphPayload,
  EntityRecord,
  EntityRelationshipRecord,
  EvidenceRecord,
  GraphEdgeData,
  GraphNodeData,
} from "../types/specula";

const INFERRED_EDGE_TYPES = new Set([
  "shared_funding_source",
  "code_similarity",
  "observed_association",
]);

export function buildConnectionGraph(params: {
  primaryEntityKey: string;
  entities: EntityRecord[];
  relationships: EntityRelationshipRecord[];
  evidence: EvidenceRecord[];
  explorerBaseUrl: string;
  maxNodes?: number;
  maxEdges?: number;
}): ConnectionGraphPayload {
  const maxNodes = params.maxNodes ?? 42;
  const maxEdges = params.maxEdges ?? 64;

  const validEvidenceIds = new Set(params.evidence.map((e) => e.id));
  const entityMap = new Map<string, EntityRecord>();
  for (const ent of params.entities) {
    entityMap.set(ent.canonicalKey, ent);
  }

  // Only include edges backed by actual stored evidence IDs
  const verifiedRelationships = params.relationships.filter(
    (rel) =>
      validEvidenceIds.has(rel.evidenceId) &&
      entityMap.has(rel.sourceEntityKey) &&
      entityMap.has(rel.targetEntityKey)
  );

  const truncatedEdges = verifiedRelationships.length > maxEdges;
  const selectedRels = verifiedRelationships.slice(0, maxEdges);

  const neededEntityKeys = new Set<string>([params.primaryEntityKey]);
  for (const rel of selectedRels) {
    if (neededEntityKeys.size >= maxNodes) break;
    neededEntityKeys.add(rel.sourceEntityKey);
    if (neededEntityKeys.size >= maxNodes) break;
    neededEntityKeys.add(rel.targetEntityKey);
  }

  const nodes: GraphNodeData[] = [];
  for (const key of neededEntityKeys) {
    const ent = entityMap.get(key);
    if (!ent) continue;

    const isEvm = /^0x[a-fA-F0-9]{40}$/.test(ent.addressOrIdentifier);
    const explorerUrl = isEvm
      ? buildExplorerAddressUrl(params.explorerBaseUrl, ent.addressOrIdentifier)
      : /^https?:\/\//i.test(ent.addressOrIdentifier)
        ? ent.addressOrIdentifier
        : null;

    nodes.push({
      id: ent.canonicalKey,
      label: ent.displayLabel || (isEvm ? shortenAddress(ent.addressOrIdentifier) : ent.addressOrIdentifier),
      nodeType: ent.entityType,
      addressOrUrl: ent.addressOrIdentifier,
      chainId: ent.chainId,
      explorerUrl,
      verified: true,
      isPrimaryTarget: ent.canonicalKey === params.primaryEntityKey,
    });
  }

  const includedNodeIds = new Set(nodes.map((n) => n.id));
  const edges: GraphEdgeData[] = selectedRels
    .filter((r) => includedNodeIds.has(r.sourceEntityKey) && includedNodeIds.has(r.targetEntityKey))
    .map((r) => ({
      id: r.id,
      source: r.sourceEntityKey,
      target: r.targetEntityKey,
      relationshipType: r.relationshipType,
      evidenceId: r.evidenceId,
      sourceReference: r.sourceReference,
      confidence: r.confidence,
      observedAt: r.observedAt,
      inferred:
        INFERRED_EDGE_TYPES.has(r.relationshipType) ||
        r.confidence === "weak_association" ||
        r.confidence === "unverified",
    }));

  return {
    nodes,
    edges,
    truncated: truncatedEdges || entityMap.size > maxNodes,
  };
}

