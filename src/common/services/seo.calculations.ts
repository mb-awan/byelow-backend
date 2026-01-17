/**
 * Logarithmic normalization function
 * Normalizes a value to 0-1 range using logarithmic scale
 */
export function normalizeLog(value: number, max: number): number {
  if (value <= 0) return 0;
  if (value >= max) return 1;
  return Math.log(value + 1) / Math.log(max + 1);
}

/**
 * Calculate Domain Authority (DA) score
 *
 * Formula components:
 * - log(referringDomains): Logarithmic normalization of referring domains
 * - backlink diversity factor: Ratio of backlinks to referring domains (higher = more diverse)
 * - spam penalty: Applied based on spam indicators
 *
 * PHASE 2 TODO: Enhance with internal link graph analysis
 * PHASE 3 TODO: Add learning-based spam detection
 *
 * @param input - Domain authority signals
 * @returns DA score between 0 and 100
 */
export function calculateDA(input: {
  referringDomains: number;
  backlinksTotal: number;
  backlinksDofollow: number;
  backlinksNofollow: number;
}): number {
  const { referringDomains, backlinksTotal, backlinksDofollow } = input;

  // 1. Logarithmic normalization of referring domains (primary factor)
  const referringDomainsScore = normalizeLog(referringDomains, 1_000_000);

  // 2. Backlink diversity factor (backlinks per referring domain)
  // Higher ratio = more backlinks per domain = potentially less diverse (penalty)
  // Lower ratio = fewer backlinks per domain = more diverse (bonus)
  const backlinkToDomainRatio = referringDomains > 0 ? backlinksTotal / referringDomains : 0;
  // Normalize: ideal ratio is around 1-5, higher ratios get penalized
  const diversityFactor = backlinkToDomainRatio <= 5 ? 1.0 : Math.max(0.3, 1.0 - (backlinkToDomainRatio - 5) / 50); // Penalty for ratios > 5

  // 3. Dofollow percentage (quality indicator)
  const dofollowRatio = backlinksTotal > 0 ? backlinksDofollow / backlinksTotal : 0;

  // 4. Spam penalty (based on abnormal patterns)
  // High dofollow percentage (>95%) can indicate spam
  // Very high backlink-to-domain ratio can indicate spam
  let spamPenalty = 1.0;
  if (dofollowRatio > 0.95) {
    spamPenalty *= 0.9; // 10% penalty for suspiciously high dofollow ratio
  }
  if (backlinkToDomainRatio > 20) {
    spamPenalty *= 0.85; // 15% penalty for very high backlink-to-domain ratio
  }

  // Combine factors
  const rawScore =
    referringDomainsScore * 0.5 + // Primary: referring domains (log normalized)
    diversityFactor * 0.25 + // Backlink diversity
    dofollowRatio * 0.15 + // Dofollow percentage
    0.1; // Base score

  // Apply spam penalty
  const adjustedScore = rawScore * spamPenalty;

  // Normalize to 0-100 range with logarithmic curve
  return Math.round(Math.min(100, Math.max(0, 100 * Math.pow(adjustedScore, 0.8))));
}

/**
 * Calculate Page Authority (PA) score for homepage
 *
 * Formula components:
 * - Homepage backlink strength: Based on referring domains pointing to homepage
 * - Internal link proxy: Basic heuristic for internal link structure
 *
 * PHASE 2 TODO: Implement homepage crawl + internal link analysis
 * PHASE 3 TODO: Full page-level link graph analysis
 *
 * @param input - Page authority signals
 * @returns PA score between 0 and 100
 */
export function calculatePA(input: {
  referringDomains: number; // Referring domains pointing to homepage
  backlinksTotal: number; // Total backlinks to homepage
}): number {
  const { referringDomains, backlinksTotal } = input;

  // 1. Homepage backlink strength (log normalized referring domains)
  const homepageBacklinkStrength = normalizeLog(referringDomains, 100_000);

  // 2. Internal link proxy (basic heuristic)
  // Estimate internal link structure based on backlink-to-domain ratio
  // Higher ratio suggests more internal linking (proxy indicator)
  const backlinkToDomainRatio = referringDomains > 0 ? backlinksTotal / referringDomains : 0;
  // Normalize internal link proxy (assume moderate internal linking for most sites)
  const internalLinkProxy = Math.min(1.0, normalizeLog(backlinkToDomainRatio, 10));

  // Combine factors
  const rawScore =
    homepageBacklinkStrength * 0.7 + // Primary: homepage backlink strength
    internalLinkProxy * 0.3; // Secondary: internal link proxy

  // Normalize to 0-100 range with logarithmic curve
  return Math.round(Math.min(100, Math.max(0, 100 * Math.pow(rawScore, 0.85))));
}

/**
 * Calculate Spam Score
 *
 * Formula components:
 * - Backlink-to-domain ratio: Abnormal ratios indicate spam
 * - Dofollow percentage: Very high percentages (>95%) indicate spam
 * - Abnormal patterns: Various heuristics for spam detection
 *
 * PHASE 2 TODO: Enhance with link quality analysis from internal crawler
 * PHASE 3 TODO: Implement learning-based spam detection
 *
 * @param input - Spam score signals
 * @returns Spam score between 0 and 100 (higher = more spammy)
 */
export function calculateSpamScore(input: {
  backlinksTotal: number;
  referringDomains: number;
  backlinksDofollow: number;
  backlinksNofollow: number;
}): number {
  const { backlinksTotal, referringDomains, backlinksDofollow, backlinksNofollow } = input;

  let spamScore = 0;

  // 1. Backlink-to-domain ratio
  // Normal sites have 1-10 backlinks per referring domain
  // Spam sites often have 50+ backlinks per referring domain
  if (referringDomains > 0) {
    const backlinkToDomainRatio = backlinksTotal / referringDomains;
    if (backlinkToDomainRatio > 50) {
      spamScore += 40; // Very high ratio = strong spam indicator
    } else if (backlinkToDomainRatio > 20) {
      spamScore += 25; // High ratio = moderate spam indicator
    } else if (backlinkToDomainRatio > 10) {
      spamScore += 10; // Elevated ratio = slight spam indicator
    }
  } else if (backlinksTotal > 0) {
    // If there are backlinks but no referring domains, that's suspicious
    spamScore += 30;
  }

  // 2. Dofollow percentage
  // Normal sites have 60-90% dofollow links
  // Spam sites often have >95% dofollow links
  if (backlinksTotal > 0) {
    const dofollowPercentage = (backlinksDofollow / backlinksTotal) * 100;
    if (dofollowPercentage > 95) {
      spamScore += 30; // Very high dofollow percentage = spam indicator
    } else if (dofollowPercentage > 90) {
      spamScore += 15; // High dofollow percentage = slight spam indicator
    }
  }

  // 3. Abnormal patterns
  // Very low nofollow ratio can indicate spam
  if (backlinksTotal > 0) {
    const nofollowPercentage = (backlinksNofollow / backlinksTotal) * 100;
    if (nofollowPercentage < 5 && backlinksTotal > 100) {
      spamScore += 20; // Very few nofollow links = spam indicator
    }
  }

  // 4. Extreme values
  // Sites with very high backlink counts but low referring domains
  if (backlinksTotal > 10000 && referringDomains < 100) {
    spamScore += 25; // Extreme imbalance = spam indicator
  }

  // Normalize to 0-100 range
  return Math.min(100, Math.max(0, spamScore));
}
