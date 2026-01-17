import { logNormalize, ratio } from '@/common/utils/normalize';

interface DASignals {
  referringDomains: number;
  backlinksTotal: number;
  backlinksDofollow: number;
  linkQualityScore: number;
  domainAgeYears?: number;
  anchorNaturalRatio?: number;
}

export function calculateDA(s: DASignals): number {
  const RD = logNormalize(s.referringDomains, 1_000_000);
  const LQ = s.linkQualityScore / 1000;
  const DF = ratio(s.backlinksDofollow, s.backlinksTotal);
  const AG = s.domainAgeYears ? logNormalize(s.domainAgeYears, 20) : 0.3;

  const raw = RD * 0.35 + LQ * 0.25 + DF * 0.15 + AG * 0.15;

  return Math.round(100 * Math.pow(raw, 0.8));
}

export function calculatePA(pageRefDomains: number, pageLinkQuality: number, internalLinks: number): number {
  const PRD = logNormalize(pageRefDomains, 100_000);
  const LQ = pageLinkQuality / 1000;
  const IL = logNormalize(internalLinks, 500);

  const raw = PRD * 0.45 + LQ * 0.35 + IL * 0.2;

  return Math.round(100 * Math.pow(raw, 0.85));
}

export function calculateSpamScore(dofollowRatio: number, anchorNaturalRatio: number): number {
  let score = 0;

  if (dofollowRatio > 0.95) score += 25;
  if (anchorNaturalRatio < 0.4) score += 40;
  if (anchorNaturalRatio < 0.2) score += 20;

  return Math.min(score, 100);
}
