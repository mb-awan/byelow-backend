import type { IDAPAAnalysis } from '@/common/models/dapaAnalysis';
import type { DomainAnalysisResult } from '@/common/services/domainAnalysis.service';

/** Dashboard-compatible DA/PA analysis shape (byelow-dashboard). */
export interface DAPACheckerResponse {
  target: string;
  da: number;
  pa: number;
  spamScore: number;
  backlinksTotal: number;
  backlinksDofollow: number;
  backlinksNofollow: number;
  referringDomains: number;
  generatedAt: string;
  cached: boolean;
}

export function toDAPACheckerResponse(result: DomainAnalysisResult): DAPACheckerResponse {
  return {
    target: result.domain,
    da: result.metrics.da,
    pa: result.metrics.pa,
    spamScore: result.metrics.spamScore,
    backlinksTotal: result.backlinks.total,
    backlinksDofollow: result.backlinks.dofollow,
    backlinksNofollow: result.backlinks.nofollow,
    referringDomains: result.referringDomains,
    generatedAt: result.fetchedAt,
    cached: result.cached,
  };
}

export function toDAPACheckerResponseFromHistory(analysis: IDAPAAnalysis): DAPACheckerResponse & { id: string } {
  return {
    id: analysis._id.toString(),
    target: analysis.domain,
    da: analysis.domainAuthority,
    pa: analysis.pageAuthority,
    spamScore: analysis.spamScore,
    backlinksTotal: analysis.totalBacklinks,
    backlinksDofollow: analysis.dofollowLinks,
    backlinksNofollow: analysis.nofollowLinks,
    referringDomains: analysis.referringDomains,
    generatedAt: analysis.createdAt?.toISOString(),
    cached: true,
  };
}
