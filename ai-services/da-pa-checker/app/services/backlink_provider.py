from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class BacklinkEstimate:
    estimated_referring_domains: int
    estimated_backlinks_total: int
    estimated_dofollow: int
    estimated_nofollow: int


def estimate_backlinks_from_score(presence_score: float) -> BacklinkEstimate:
    """Estimate referring domains and backlinks from a web presence score (0-1).

    Mapping: estimated_rd = 50_000_000 ^ score
    Backlinks estimated at ~8x referring domains (typical ratio).
    """
    if presence_score <= 0.01:
        return BacklinkEstimate(0, 0, 0, 0)

    rd = max(1, round(math.pow(50_000_000, presence_score) - 1))
    backlinks = rd * 8
    dofollow = round(backlinks * 0.75)
    nofollow = backlinks - dofollow

    return BacklinkEstimate(
        estimated_referring_domains=rd,
        estimated_backlinks_total=backlinks,
        estimated_dofollow=dofollow,
        estimated_nofollow=nofollow,
    )
