export type InvestigationStatus =
  | "queued"
  | "collecting"
  | "analyzing"
  | "summarizing"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

export type TargetKind =
  | "token_contract"
  | "contract"
  | "wallet"
  | "website"
  | "github_repo";

export type ConfidenceCategory =
  | "confirmed"
  | "supported"
  | "weak_association"
  | "unverified";

export type VerificationStatus =
  | "verified"
  | "derived"
  | "hypothesis"
  | "missing";

export type EvidenceSourceType =
  | "robinhood_rpc"
  | "alchemy_rpc"
  | "blockscout"
  | "pons_factory"
  | "github_api"
  | "rdap"
  | "website_html"
  | "persistent_memory"
  | "code_fingerprint";

export type AgentRoleId =
  | "ARGUS"
  | "HERMES"
  | "DAEDALUS"
  | "NYX"
  | "MNEMOSYNE"
  | "THEMIS";

export type GraphNodeType =
  | "token"
  | "wallet"
  | "contract"
  | "funding_source"
  | "website"
  | "repository"
  | "project";

export type GraphEdgeType =
  | "created"
  | "funded"
  | "transferred"
  | "shared_funding_source"
  | "exact_bytecode_match"
  | "repository_reference"
  | "code_similarity"
  | "observed_association";

export interface EvidenceRecord {
  id: string;
  investigationId: string;
  sourceType: EvidenceSourceType;
  sourceUrl: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  observedAt: string;
  subject: string;
  predicate: string;
  object: string;
  description: string;
  confidence: ConfidenceCategory;
  verificationStatus: VerificationStatus;
  provider: string;
  methodologyVersion: string;
  evidenceHash: string;
  metadata?: Record<string, unknown>;
}

export interface EntityRecord {
  id: string;
  canonicalKey: string;
  entityType: GraphNodeType;
  chainId: number | null;
  addressOrIdentifier: string;
  displayLabel: string;
  firstObservedAt: string;
  lastObservedAt: string;
  metadata: Record<string, unknown>;
}

export interface EntityRelationshipRecord {
  id: string;
  sourceEntityKey: string;
  targetEntityKey: string;
  relationshipType: GraphEdgeType;
  evidenceId: string;
  sourceReference: string | null;
  confidence: ConfidenceCategory;
  observedAt: string;
  investigationId: string;
}

export interface GraphNodeData {
  id: string;
  label: string;
  nodeType: GraphNodeType;
  addressOrUrl: string;
  chainId: number | null;
  explorerUrl: string | null;
  verified: boolean;
  isPrimaryTarget?: boolean;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relationshipType: GraphEdgeType;
  evidenceId: string;
  sourceReference: string | null;
  confidence: ConfidenceCategory;
  observedAt: string;
  inferred: boolean;
}

export interface ConnectionGraphPayload {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  truncated: boolean;
}

export interface ContractInspectionResult {
  address: string;
  chainId: number;
  isContract: boolean;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupplyRaw: string | null;
  totalSupplyFormatted: string | null;
  ownerAddress: string | null;
  bytecodeSizeBytes: number;
  bytecodeHash: string | null;
  normalizedRuntimeHash: string | null;
  proxyType: "none" | "eip1167_minimal_proxy" | "eip1967_proxy" | "unknown";
  implementationAddress: string | null;
  creationTxHash: string | null;
  creationBlockNumber: number | null;
  creationTimestamp: string | null;
  creatorAddress: string | null;
  deploymentFactoryAddress: string | null;
  ponsLaunchCurve: string | null;
  verifiedSource: boolean | null;
  contractName: string | null;
  compilerVersion: string | null;
}

export interface FundingHop {
  hop: 1 | 2;
  from: string;
  to: string;
  valueWei: string;
  valueEthFormatted: string;
  txHash: string;
  blockNumber: number;
  timestamp: string | null;
  classification: "eoa_or_unknown" | "contract_or_service" | "high_volume_relayer";
}

export interface DeployerAnalysisResult {
  deployerAddress: string | null;
  factoryAddress: string | null;
  txSenderAddress: string | null;
  ownerAddress: string | null;
  nativeBalanceEth: string | null;
  transactionCount: number | null;
  earliestObservedActivity: string | null;
  previousDeployments: Array<{
    contractAddress: string;
    tokenName: string | null;
    tokenSymbol: string | null;
    txHash: string | null;
    blockNumber: number | null;
    timestamp: string | null;
    viaFactory: string | null;
  }>;
  fundingHops: FundingHop[];
  sharedFundingMatches: Array<{
    funderAddress: string;
    relatedEntityKey: string;
    relatedAddress: string;
    evidenceId: string;
    observedAt: string;
  }>;
  coverageNote: string;
}

export interface HolderEntry {
  address: string;
  balanceRaw: string;
  sharePercent: number | null;
  classification:
    | "burn_address"
    | "pons_bonding_curve"
    | "pons_locker"
    | "smart_contract"
    | "wallet_or_unknown";
  label: string | null;
}

export interface HolderAnalysisResult {
  available: boolean;
  holderCount: number | null;
  top10Percent: number | null;
  top20Percent: number | null;
  observedBlock: number | null;
  observedAt: string;
  topHolders: HolderEntry[];
  limitationNote: string | null;
}

export interface DeveloperDnaSignal {
  signalType:
    | "exact_deployer_match"
    | "shared_funding_relationship"
    | "exact_bytecode_hash"
    | "normalized_runtime_hash"
    | "pons_factory_pattern"
    | "github_repository_metadata"
    | "source_file_fingerprint";
  title: string;
  detail: string;
  fingerprint: string | null;
  matchedEntities: string[];
  confidence: ConfidenceCategory;
  isTemplateReuseOnly: boolean;
  evidenceIds: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  category:
    | "domain_registration"
    | "repository_creation"
    | "first_accessible_commit"
    | "first_observed_funding"
    | "contract_deployment"
    | "indexed_token_launch"
    | "liquidity_event"
    | "first_observed_website";
  title: string;
  detail: string;
  evidenceId: string;
  sourceUrl: string | null;
}

export interface InvestigationFinding {
  id: string;
  title: string;
  summary: string;
  caveat: string;
  confidence: ConfidenceCategory;
  verificationStatus: VerificationStatus;
  evidenceIds: string[];
}

export interface AgentEventLog {
  id: string;
  investigationId: string;
  agent: AgentRoleId;
  action: string;
  toolName: string | null;
  mode: "deterministic" | "llm_tool_selection" | "llm_review";
  createdAt: string;
}

export interface AiInvestigationSummary {
  generatedByModel: string;
  executiveSummary: string;
  verifiedHighlights: Array<{
    statement: string;
    evidenceIds: string[];
  }>;
  uncertaintiesAndGaps: string[];
  contradictionsObserved: string[];
}

export interface InvestigationReport {
  id: string;
  targetInput: string;
  normalizedTarget: string;
  targetKind: TargetKind;
  chainId: number;
  chainName: string;
  status: InvestigationStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cachedFromInvestigationId: string | null;
  contextInputs: {
    websiteUrl: string | null;
    githubUrl: string | null;
    xUrl: string | null;
  };
  coverage: {
    rpcAvailable: boolean;
    explorerApiAvailable: boolean;
    githubAvailable: boolean;
    rdapAvailable: boolean;
    websiteFetched: boolean;
    aiSummaryAvailable: boolean;
    notes: string[];
  };
  contract: ContractInspectionResult | null;
  deployer: DeployerAnalysisResult | null;
  holders: HolderAnalysisResult | null;
  developerDna: DeveloperDnaSignal[];
  timeline: TimelineEvent[];
  findings: InvestigationFinding[];
  openQuestions: string[];
  limitations: string[];
  aiSummary: AiInvestigationSummary | null;
  deterministicSummary: string;
  evidence: EvidenceRecord[];
  graph: ConnectionGraphPayload;
  agentEvents: AgentEventLog[];
}

export interface IndexedLaunchRecord {
  id: string;
  chainId: number;
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  curveOrPoolAddress: string | null;
  deployerAddress: string | null;
  factoryAddress: string;
  pairTokenAddress: string | null;
  txHash: string;
  blockNumber: number;
  launchedAt: string | null;
  relatedLaunchCount: number;
}
