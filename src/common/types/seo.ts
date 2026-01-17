export interface SeoAnalysisResponse {
  target: string;
  da: number;
  pa: number;
  spamScore: number;
  backlinks: {
    total: number;
    dofollow: number;
    nofollow: number;
  };
  referringDomains: number;
  generatedAt: string;
}
