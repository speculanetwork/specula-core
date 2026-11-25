import { getAddress, isAddress } from "viem";
import { z } from "zod";
import type { TargetKind } from "../types/specula";

export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function normalizeWalletAddress(address: string): string {
  const trimmed = address.trim();
  if (!ETH_ADDRESS_REGEX.test(trimmed)) {
    throw new Error("Invalid EVM address format. Expected 0x followed by 40 hex characters.");
  }
  // Use lowercase hex first so mixed-case non-checksummed inputs still normalize safely via getAddress
  return getAddress(trimmed.toLowerCase());
}

export function isValidEvmAddress(address: string): boolean {
  const trimmed = address.trim();
  return ETH_ADDRESS_REGEX.test(trimmed) && isAddress(trimmed.toLowerCase());
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 4) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export interface ParsedInvestigationTarget {
  rawInput: string;
  normalizedTarget: string;
  initialKind: Extract<TargetKind, "contract" | "website" | "github_repo">;
  githubOwnerRepo?: { owner: string; repo: string };
}

export function parseGitHubRepoUrl(urlStr: string): { owner: string; repo: string; normalizedUrl: string } | null {
  try {
    const u = new URL(urlStr.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return null;
    const parts = u.pathname
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/i, "");
    if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
      return null;
    }
    return {
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch {
    return null;
  }
}

export function parseTargetInput(rawInput: string): ParsedInvestigationTarget {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Enter a Robinhood Chain contract address, wallet address, GitHub repository URL, or website URL.");
  }

  if (ETH_ADDRESS_REGEX.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedTarget: normalizeWalletAddress(trimmed),
      initialKind: "contract",
    };
  }

  // Allow shorthand http/https URLs only when explicitly prefixed or valid domain
  const candidateUrl = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/.*)?$/.test(trimmed)
      ? `https://${trimmed}`
      : null;

  if (!candidateUrl) {
    throw new Error(
      "Unrecognized target format. Provide a 0x Robinhood Chain contract/wallet address, https://github.com/owner/repo, or a public https:// website URL."
    );
  }

  const gh = parseGitHubRepoUrl(candidateUrl);
  if (gh) {
    return {
      rawInput: trimmed,
      normalizedTarget: gh.normalizedUrl,
      initialKind: "github_repo",
      githubOwnerRepo: { owner: gh.owner, repo: gh.repo },
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host === "x.com" || host === "www.x.com" || host === "twitter.com" || host === "www.twitter.com") {
    throw new Error(
      "Direct X/Twitter scraping is disabled under free-tier policy. Enter a Robinhood Chain address, GitHub repo, or website as primary target and attach X URL as optional reference."
    );
  }

  parsedUrl.hash = "";
  return {
    rawInput: trimmed,
    normalizedTarget: parsedUrl.toString(),
    initialKind: "website",
  };
}

const optionalContextUrl = z
  .string()
  .trim()
  .max(512)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), {
    message: "Optional context URL must start with http:// or https://",
  });

export const createInvestigationRequestSchema = z.object({
  target: z
    .string()
    .trim()
    .min(4, "Target is required")
    .max(512, "Target exceeds maximum length"),
  websiteUrl: optionalContextUrl,
  githubUrl: optionalContextUrl.refine((v) => !v || Boolean(parseGitHubRepoUrl(v)), {
    message: "GitHub context URL must match https://github.com/<owner>/<repo>",
  }),
  xUrl: optionalContextUrl.refine(
    (v) => {
      if (!v) return true;
      try {
        const h = new URL(v).hostname.toLowerCase();
        return h === "x.com" || h === "www.x.com" || h === "twitter.com" || h === "www.twitter.com";
      } catch {
        return false;
      }
    },
    { message: "X reference URL must use x.com or twitter.com" }
  ),
  turnstileToken: z.string().trim().max(4096).optional().nullable(),
  forceRefresh: z.boolean().optional().default(false),
});

export type CreateInvestigationRequest = z.infer<typeof createInvestigationRequestSchema>;

export const siweVerifyRequestSchema = z.object({
  address: z.string().regex(ETH_ADDRESS_REGEX, "Invalid Ethereum wallet address"),
  message: z.string().min(40).max(4096),
  signature: z.string().regex(/^0x[a-fA-F0-9]{128,1024}$/, "Invalid hexadecimal signature"),
});

