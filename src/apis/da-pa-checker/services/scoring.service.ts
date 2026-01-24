/**
 * Scoring engine for calculating DA, PA, and Spam Score
 */

import { logNormalize, ratio } from './normalize';

export interface DASignals {
  referringDomains: number;
  backlinksTotal: number;
  backlinksDofollow: number;
  linkQualityScore: number;
  domainAgeYears?: number;
  anchorNaturalRatio?: number;
}

/**
 * Calculate Domain Authority (DA) score
 * @param signals - Domain authority signals
 * @returns DA score between 0 and 100
 */
export function calculateDA(signals: DASignals): number {
  const RD = logNormalize(signals.referringDomains, 1_000_000);
  const LQ = signals.linkQualityScore / 1000;
  const DF = ratio(signals.backlinksDofollow, signals.backlinksTotal);
  const AG = signals.domainAgeYears ? logNormalize(signals.domainAgeYears, 20) : 0.3;

  const raw = RD * 0.35 + LQ * 0.25 + DF * 0.15 + AG * 0.15;

  return Math.round(100 * Math.pow(raw, 0.8));
}

/**
 * Calculate Page Authority (PA) score
 * @param pageRefDomains - Number of referring domains pointing to the page
 * @param pageLinkQuality - Link quality score for the page (0-1000)
 * @param internalLinks - Number of internal links on the page
 * @returns PA score between 0 and 100
 */
export function calculatePA(pageRefDomains: number, pageLinkQuality: number, internalLinks: number): number {
  const PRD = logNormalize(pageRefDomains, 100_000);
  const LQ = pageLinkQuality / 1000;
  const IL = logNormalize(internalLinks, 500);

  const raw = PRD * 0.45 + LQ * 0.35 + IL * 0.2;

  return Math.round(100 * Math.pow(raw, 0.85));
}

/**
 * Calculate Spam Score
 * @param dofollowRatio - Ratio of dofollow links to total links
 * @param anchorNaturalRatio - Ratio of natural anchor texts
 * @returns Spam score between 0 and 100 (higher = more spammy)
 */
export function calculateSpamScore(dofollowRatio: number, anchorNaturalRatio: number): number {
  let score = 0;

  if (dofollowRatio > 0.95) score += 25;
  if (anchorNaturalRatio < 0.4) score += 40;
  if (anchorNaturalRatio < 0.2) score += 20;

  return Math.min(score, 100);
}
