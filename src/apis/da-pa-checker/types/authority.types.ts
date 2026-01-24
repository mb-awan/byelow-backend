/**
 * Type definitions for DA/PA Authority responses
 */

export interface AuthorityResponse {
  domain: string;
  url?: string;
  domainAuthority: number;
  pageAuthority?: number;
  spamScore: number;
  backlinks: {
    total: number;
    dofollow: number;
    nofollow: number;
  };
  referringDomains: number;
  signals: {
    domainAgeYears?: number;
    dofollowRatio: number;
    linkQualityScore: number;
    anchorNaturalRatio?: number;
  };
  meta: {
    calculatedAt: string;
    dataSource: 'api' | 'crawler' | 'hybrid';
    cached: boolean;
  };
}
