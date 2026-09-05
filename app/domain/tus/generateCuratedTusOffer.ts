import type { ResidencyProgram } from "../config/residencyPrograms";
import { getBranchCompetitivenessTier, type CompetitivenessTier } from "../config/branchCompetitiveness";
import { getHospitalCompetitivenessModifier } from "../config/hospitalCompetitiveness";
import { getCityCompetitivenessModifier } from "../config/cityCompetitiveness";
import { createScopedRng, type SeededRng } from "../rng/seededRng";

// TUS System Redesign (post-Hotfix-1), §13-21 — the player must NOT see
// every program they're eligible for. This curates a fixed-size (up to 7)
// PREFERENCE OFFER out of the full eligible pool (already computed by
// filterAvailablePrograms — this function never re-checks or weakens
// eligibility, it only SELECTS from an already-eligible list).
export const CURATED_OFFER_SIZE = 7;

interface TierSlot {
  tier: CompetitivenessTier;
  count: number;
}

// §15 — the requested composition per playerReachableTier. Ordered
// top-tier-first: diversity/attractiveness selection processes the
// player's best-reachable tier first, then works down through the
// "idealistic career alternative" slots.
const TIER_COMPOSITIONS: Record<CompetitivenessTier, TierSlot[]> = {
  5: [{ tier: 5, count: 4 }, { tier: 4, count: 1 }, { tier: 3, count: 1 }, { tier: 2, count: 1 }],
  4: [{ tier: 4, count: 4 }, { tier: 3, count: 1 }, { tier: 2, count: 1 }, { tier: 1, count: 1 }],
  3: [{ tier: 3, count: 4 }, { tier: 2, count: 2 }, { tier: 1, count: 1 }],
  2: [{ tier: 2, count: 5 }, { tier: 1, count: 2 }],
  1: [{ tier: 1, count: 7 }],
};

// §14 — "the highest specialty tier for which the player has meaningful
// actual eligible production programs", derived from the real eligible
// pool rather than a fixed score band: the highest tier with at least one
// eligible program in it.
export function determinePlayerReachableTier(eligiblePool: readonly ResidencyProgram[]): CompetitivenessTier {
  for (const tier of [5, 4, 3, 2, 1] as const) {
    if (eligiblePool.some((p) => getBranchCompetitivenessTier(p.branchId) === tier)) return tier;
  }
  return 1;
}

// "Institution attractiveness" for a program — used both to prefer strong
// hospital/city combinations for lower-tier "idealistic alternative" slots
// (§19) and to spread institution quality across same-specialty picks
// within the player's top reachable tier (§20's "weaker/average/strong
// institution" flavor). Never exposed to the player (§22) — development/
// selection-only.
function institutionStrength(program: ResidencyProgram): number {
  return getHospitalCompetitivenessModifier(program.hospitalId) + getCityCompetitivenessModifier(program.cityId);
}

function sortDeterministic(programs: readonly ResidencyProgram[]): ResidencyProgram[] {
  return [...programs].sort((a, b) => a.id.localeCompare(b.id));
}

// Picks up to `count` programs from `candidates` (already filtered to one
// tier and to unused ids), preferring distinct specialties not yet used
// anywhere in the offer (§18) before duplicating a branch — and only
// duplicating when it creates a genuinely different hospital/city
// (§18's "meaningful hospital/city trade-off").
function pickFromTier(
  candidates: readonly ResidencyProgram[],
  count: number,
  usedBranches: ReadonlySet<string>,
  preferAttractive: boolean,
  rng: SeededRng
): ResidencyProgram[] {
  const byBranch = new Map<string, ResidencyProgram[]>();
  for (const p of candidates) {
    const list = byBranch.get(p.branchId) ?? [];
    list.push(p);
    byBranch.set(p.branchId, list);
  }

  // `pickIndex` is the position of THIS pick within the whole slot (0, 1,
  // 2, ...) — NOT the slot's own index in the composition — so each of
  // the (e.g. 4) top-tier picks gets a genuinely different institution
  // band, per §20's "weaker/average/strong institution" flavor. A fixed
  // per-slot index here was an earlier bug: it gave every pick in a slot
  // the same band.
  function pickRepresentative(branchCandidates: ResidencyProgram[], pickIndex: number): ResidencyProgram {
    const sorted = [...branchCandidates].sort((a, b) => institutionStrength(a) - institutionStrength(b));
    if (preferAttractive) {
      // §19 — lower-tier alternative slots should be genuinely attractive,
      // not the weakest available program: pick from the strong end, with
      // seeded variety among near-ties.
      const topBand = sorted.slice(Math.max(0, sorted.length - Math.ceil(sorted.length / 3)));
      return rng.pick(topBand);
    }
    // §20 — within the player's own top reachable tier, deliberately
    // spread institution quality across the picks (weaker/average/strong)
    // rather than always picking the single best, so specialty choice and
    // institution quality become a real, separate trade-off.
    const bandCount = 3;
    const bandIndex = pickIndex % bandCount;
    const bandSize = Math.max(1, Math.ceil(sorted.length / bandCount));
    const start = bandIndex * bandSize;
    const band = sorted.slice(start, start + bandSize).length > 0 ? sorted.slice(start, start + bandSize) : sorted;
    return rng.pick(band);
  }

  const picks: ResidencyProgram[] = [];
  const pickedBranches = new Set<string>();

  // Pass 1 — one program per distinct branch, preferring branches unused
  // anywhere else in the offer, in a seeded (not fixed-alphabetical) order
  // so different saves at the same reachable tier still see variety.
  const branchIds = [...byBranch.keys()];
  const freshBranches = shuffle(branchIds.filter((b) => !usedBranches.has(b)), rng);
  const reusedBranches = shuffle(branchIds.filter((b) => usedBranches.has(b)), rng);
  for (const branchId of [...freshBranches, ...reusedBranches]) {
    if (picks.length >= count) break;
    const rep = pickRepresentative(byBranch.get(branchId)!, picks.length);
    picks.push(rep);
    pickedBranches.add(branchId);
  }

  // Pass 2 — still short: duplicate a branch already used in THIS slot,
  // but only with a program at a different hospital/city than the one
  // already picked (a "meaningful trade-off", never a near-identical dupe).
  if (picks.length < count) {
    for (const branchId of [...freshBranches, ...reusedBranches]) {
      if (picks.length >= count) break;
      const already = picks.filter((p) => p.branchId === branchId);
      const remaining = byBranch.get(branchId)!.filter(
        (p) => !already.some((used) => used.hospitalId === p.hospitalId && used.cityId === p.cityId)
      );
      if (remaining.length === 0) continue;
      picks.push(pickRepresentative(remaining, picks.length));
    }
  }

  return picks.slice(0, count);
}

function shuffle<T>(items: readonly T[], rng: SeededRng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// §21 — DETERMINISTIC generation: reads only the already-eligible pool
// (itself a pure function of PRODUCTION_PROGRAMS + the player's tusScore —
// see filterAvailablePrograms) plus the save's own persisted rngSeed,
// through the existing createScopedRng scoping convention. No new
// persisted state was needed: the offer is fully re-derivable from data
// the save already carries (tusScore + rngSeed), so refresh/leave-reopen/
// save-load all recompute the exact same offer rather than rerolling it.
export function generateCuratedTusOffer(
  eligiblePool: readonly ResidencyProgram[],
  rngSeed: string
): ResidencyProgram[] {
  if (eligiblePool.length <= CURATED_OFFER_SIZE) {
    return sortDeterministic(eligiblePool);
  }

  const rng = createScopedRng(rngSeed, "tus:curatedOffer");
  const reachableTier = determinePlayerReachableTier(eligiblePool);
  const composition = TIER_COMPOSITIONS[reachableTier];

  const used = new Set<string>();
  const usedBranches = new Set<string>();
  const offer: ResidencyProgram[] = [];

  composition.forEach((slot) => {
    const candidates = eligiblePool.filter(
      (p) => getBranchCompetitivenessTier(p.branchId) === slot.tier && !used.has(p.id)
    );
    const picks = pickFromTier(candidates, slot.count, usedBranches, slot.tier !== reachableTier, rng);
    for (const p of picks) {
      offer.push(p);
      used.add(p.id);
      usedBranches.add(p.branchId);
    }
  });

  // §16 fallback — a requested tier came up short (not enough distinct/
  // duplicable eligible programs in it). Walk strictly downward through
  // every eligible tier below the shortfall, filling from unused eligible
  // programs, before ever considering the offer incomplete. Never inserts
  // an ineligible program — every candidate here already came from
  // `eligiblePool`.
  if (offer.length < CURATED_OFFER_SIZE) {
    for (let tier = reachableTier; tier >= 1 && offer.length < CURATED_OFFER_SIZE; tier--) {
      const remaining = eligiblePool.filter(
        (p) => getBranchCompetitivenessTier(p.branchId) === (tier as CompetitivenessTier) && !used.has(p.id)
      );
      const needed = CURATED_OFFER_SIZE - offer.length;
      const picks = pickFromTier(remaining, needed, usedBranches, false, rng);
      for (const p of picks) {
        offer.push(p);
        used.add(p.id);
        usedBranches.add(p.branchId);
      }
    }
  }

  return offer;
}
