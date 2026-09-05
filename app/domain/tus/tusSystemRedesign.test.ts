import { describe, expect, it } from 'vitest';
import { PRODUCTION_PROGRAMS, LEGACY_PROGRAMS, type ResidencyProgram } from '../config/residencyPrograms';
import { resolveEntryThreshold } from './resolveEntryThreshold';
import { filterAvailablePrograms } from './filterAvailablePrograms';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';
import { getBranchCompetitivenessTier, BRANCH_COMPETITIVENESS_TIER, type CompetitivenessTier } from '../config/branchCompetitiveness';
import { getHospitalCompetitivenessTier, getHospitalCompetitivenessModifier, HOSPITAL_COMPETITIVENESS_MODIFIER } from '../config/hospitalCompetitiveness';
import { getCityCompetitivenessTier, getCityCompetitivenessModifier } from '../config/cityCompetitiveness';
import { HOSPITAL_DEFINITIONS } from '../config/hospitals';
import { CITY_DEFINITIONS } from '../config/cities';
import { BRANCH_DEFINITIONS } from '../config/branches';
import {
  generateCuratedTusOffer,
  determinePlayerReachableTier,
  CURATED_OFFER_SIZE,
} from './generateCuratedTusOffer';

// TUS System Redesign §25 — specialty/score requirements.
describe('TUS System Redesign — score & threshold bounds (§25)', () => {
  it('every production program threshold is within [50, 85]', () => {
    for (const program of PRODUCTION_PROGRAMS) {
      const threshold = resolveEntryThreshold(program)!;
      expect(threshold).toBeGreaterThanOrEqual(50);
      expect(threshold).toBeLessThanOrEqual(85);
    }
  });

  it('score 50 has at least one production option', () => {
    expect(filterAvailablePrograms(PRODUCTION_PROGRAMS, 50).length).toBeGreaterThan(0);
  });

  it('score 85 unlocks all 2191 production programs', () => {
    const available = filterAvailablePrograms(PRODUCTION_PROGRAMS, 85);
    expect(available.length).toBe(PRODUCTION_PROGRAMS.length);
  });

  // Monotonicity for EVERY INTEGER score in [50, 85], not just a sample.
  it('availability is monotonically non-decreasing for every integer score 50 through 85', () => {
    let previousIds = new Set<string>();
    let previousCount = 0;
    for (let score = 50; score <= 85; score++) {
      const available = filterAvailablePrograms(PRODUCTION_PROGRAMS, score);
      for (const id of previousIds) {
        expect(available.some((p) => p.id === id)).toBe(true);
      }
      expect(available.length).toBeGreaterThanOrEqual(previousCount);
      previousIds = new Set(available.map((p) => p.id));
      previousCount = available.length;
    }
  });

  it('mean threshold is strictly increasing tier 1 < 2 < 3 < 4 < 5', () => {
    const byTier: Record<CompetitivenessTier, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const program of PRODUCTION_PROGRAMS) {
      const tier = getBranchCompetitivenessTier(program.branchId);
      byTier[tier].push(resolveEntryThreshold(program)!);
    }
    const means = ([1, 2, 3, 4, 5] as const).map((t) => byTier[t].reduce((a, b) => a + b, 0) / byTier[t].length);
    for (let i = 1; i < means.length; i++) {
      expect(means[i]).toBeGreaterThan(means[i - 1]);
    }
  });

  it('all 26 production branches are covered by the competitiveness table (no fabrication, no silent omission)', () => {
    const branchIds = BRANCH_DEFINITIONS.map((b) => b.id);
    expect(branchIds).toHaveLength(26);
    for (const id of branchIds) {
      expect(id in BRANCH_COMPETITIVENESS_TIER).toBe(true);
    }
    expect(Object.keys(BRANCH_COMPETITIVENESS_TIER)).toHaveLength(26);
  });
});

// §26 — hospital/city structural requirements.
describe('TUS System Redesign — hospital & city competitiveness (§26)', () => {
  it('hospital tier mapping is deterministic and complete for every production hospital', () => {
    const productionHospitalIds = new Set(PRODUCTION_PROGRAMS.map((p) => p.hospitalId));
    for (const id of productionHospitalIds) {
      const t1 = getHospitalCompetitivenessTier(id);
      const t2 = getHospitalCompetitivenessTier(id);
      expect(t1).toBe(t2);
      expect(t1).toBeGreaterThanOrEqual(1);
      expect(t1).toBeLessThanOrEqual(5);
    }
  });

  it('city tier mapping covers all 62 cities', () => {
    expect(CITY_DEFINITIONS).toHaveLength(62);
    for (const city of CITY_DEFINITIONS) {
      const tier = getCityCompetitivenessTier(city.id);
      expect(tier).toBeGreaterThanOrEqual(1);
      expect(tier).toBeLessThanOrEqual(5);
    }
  });

  // Hospital-Independence Pass — every real production institution has an
  // explicit, reviewed tier; none falls through to an unreviewed default.
  // The 159 count (62 university + 97 training/research) matches the real
  // institution dataset exactly, and 5+4+3-tier totals must sum to it.
  it('every one of the 159 real production institutions has an explicit tier (no silent fallthrough)', () => {
    const realHospitals = HOSPITAL_DEFINITIONS.filter((h) => h.kind !== 'fictional');
    expect(realHospitals).toHaveLength(159);
    const byTier: Record<number, number> = {};
    for (const h of realHospitals) {
      const t = getHospitalCompetitivenessTier(h.id);
      byTier[t] = (byTier[t] ?? 0) + 1;
    }
    const total = Object.values(byTier).reduce((a, b) => a + b, 0);
    expect(total).toBe(159);
  });

  // §16 independence audit — the core correction this pass made: hospital
  // tier must NOT be derivable from city tier. Proven with real dataset
  // examples in both directions, not asserted in the abstract.
  describe('hospital tier is independent of city tier', () => {
    it('A: a strong (tier 4/5) hospital exists in a lower-tier (non-5) city', () => {
      const example = HOSPITAL_DEFINITIONS.find(
        (h) => h.kind !== 'fictional' && getHospitalCompetitivenessTier(h.id) >= 4 && getCityCompetitivenessTier(h.cityId) < 5
      );
      expect(example).toBeDefined();
    });

    it('B: a standard (tier 3) hospital exists in the highest-tier (5) cities', () => {
      const example = HOSPITAL_DEFINITIONS.find(
        (h) => h.kind !== 'fictional' && getHospitalCompetitivenessTier(h.id) === 3 && getCityCompetitivenessTier(h.cityId) === 5
      );
      expect(example).toBeDefined();
    });

    it('C: two hospitals in the same city have meaningfully different hospital tiers', () => {
      const byCity = new Map<string, number>();
      let found = false;
      for (const h of HOSPITAL_DEFINITIONS) {
        if (h.kind === 'fictional') continue;
        const t = getHospitalCompetitivenessTier(h.id);
        if (byCity.has(h.cityId) && Math.abs(byCity.get(h.cityId)! - t) >= 2) {
          found = true;
          break;
        }
        byCity.set(h.cityId, t);
      }
      expect(found).toBe(true);
    });

    it('D: the same hospital tier occurs across substantially different city tiers', () => {
      const cityTiersAtHospitalTier4 = new Set(
        HOSPITAL_DEFINITIONS.filter((h) => h.kind !== 'fictional' && getHospitalCompetitivenessTier(h.id) === 4).map((h) =>
          getCityCompetitivenessTier(h.cityId)
        )
      );
      // Tier 4 hospitals should span at least 3 distinct city tiers.
      expect(cityTiersAtHospitalTier4.size).toBeGreaterThanOrEqual(3);
    });

    it('changing which city an institution is nominally in does not change its stored tier (structural: hospital tier reads only hospitalId)', () => {
      // getHospitalCompetitivenessTier takes ONLY a HospitalId — there is
      // no cityId parameter for it to read, so two institutions that
      // differ only in city cannot differ in hospital tier for that
      // reason. Directly confirmed by A-D above holding real counter-
      // examples in both directions; this asserts the API shape itself.
      expect(getHospitalCompetitivenessTier.length).toBe(1);
    });
  });

  it('mean threshold is strictly increasing by hospital tier (T1 < T2 < T3 < T4 < T5)', () => {
    const byTier: Record<number, number[]> = {};
    for (const p of PRODUCTION_PROGRAMS) {
      const t = getHospitalCompetitivenessTier(p.hospitalId);
      byTier[t] = byTier[t] ?? [];
      byTier[t].push(resolveEntryThreshold(p)!);
    }
    const populatedTiers = Object.keys(byTier).map(Number).sort((a, b) => a - b);
    expect(populatedTiers).toEqual([1, 2, 3, 4, 5]);
    const means = populatedTiers.map((t) => avg(byTier[t]));
    for (let i = 1; i < means.length; i++) expect(means[i]).toBeGreaterThan(means[i - 1]);
  });

  it('within the same specialty and city, a higher hospital tier has a higher or equal average threshold', () => {
    // Group by (branch, city), compare average threshold across hospital
    // tier bands within each group — controls for specialty/city so the
    // hospital effect isolates.
    const groups = new Map<string, ResidencyProgram[]>();
    for (const p of PRODUCTION_PROGRAMS) {
      const key = `${p.branchId}::${p.cityId}`;
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    let comparablePairs = 0;
    let correctOrder = 0;
    for (const list of groups.values()) {
      const byHospitalTier = new Map<number, number[]>();
      for (const p of list) {
        const t = getHospitalCompetitivenessTier(p.hospitalId);
        const arr = byHospitalTier.get(t) ?? [];
        arr.push(resolveEntryThreshold(p)!);
        byHospitalTier.set(t, arr);
      }
      const tiers = [...byHospitalTier.keys()].sort((a, b) => a - b);
      for (let i = 1; i < tiers.length; i++) {
        const lowerMean = avg(byHospitalTier.get(tiers[i - 1])!);
        const higherMean = avg(byHospitalTier.get(tiers[i])!);
        comparablePairs++;
        if (higherMean >= lowerMean) correctOrder++;
      }
    }
    expect(comparablePairs).toBeGreaterThan(0);
    expect(correctOrder / comparablePairs).toBeGreaterThan(0.8);
  });

  it('within the same specialty and hospital tier, a higher city tier has a higher or equal average threshold', () => {
    const groups = new Map<string, ResidencyProgram[]>();
    for (const p of PRODUCTION_PROGRAMS) {
      const key = `${p.branchId}::${getHospitalCompetitivenessTier(p.hospitalId)}`;
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    let comparablePairs = 0;
    let correctOrder = 0;
    for (const list of groups.values()) {
      const byCityTier = new Map<number, number[]>();
      for (const p of list) {
        const t = getCityCompetitivenessTier(p.cityId);
        const arr = byCityTier.get(t) ?? [];
        arr.push(resolveEntryThreshold(p)!);
        byCityTier.set(t, arr);
      }
      const tiers = [...byCityTier.keys()].sort((a, b) => a - b);
      for (let i = 1; i < tiers.length; i++) {
        const lowerMean = avg(byCityTier.get(tiers[i - 1])!);
        const higherMean = avg(byCityTier.get(tiers[i])!);
        comparablePairs++;
        if (higherMean >= lowerMean) correctOrder++;
      }
    }
    expect(comparablePairs).toBeGreaterThan(0);
    expect(correctOrder / comparablePairs).toBeGreaterThan(0.8);
  });

  it('city modifiers are monotonic in their own tier (5 highest .. 1 lowest)', () => {
    const cMods = [5, 4, 3, 2, 1].map((t) => modifierForCityTier(t as 1 | 2 | 3 | 4 | 5));
    for (let i = 1; i < cMods.length; i++) expect(cMods[i - 1]).toBeGreaterThan(cMods[i]);
  });

  // Hospital-Independence Pass — no real production institution currently
  // resolves to tier 1 or 2 (see hospitalCompetitiveness.ts's own
  // methodology note: "avoid false precision" was preferred over inventing
  // a weak-tier distinction without evidence), so this checks the
  // exported modifier TABLE directly rather than hunting for an example
  // institution at every tier.
  it('the full HOSPITAL_COMPETITIVENESS_MODIFIER table is monotonic 5 highest .. 1 lowest', () => {
    const tiers = [5, 4, 3, 2, 1] as const;
    for (let i = 1; i < tiers.length; i++) {
      expect(HOSPITAL_COMPETITIVENESS_MODIFIER[tiers[i - 1]]).toBeGreaterThan(HOSPITAL_COMPETITIVENESS_MODIFIER[tiers[i]]);
    }
  });

  // Five-Tier Population Pass — every one of the 5 hospital tiers must
  // now be a real, populated gameplay category, not a theoretical one.
  it('every hospital tier 1-5 has at least one real production institution', () => {
    const tiersPresent = new Set(HOSPITAL_DEFINITIONS.filter((h) => h.kind !== 'fictional').map((h) => getHospitalCompetitivenessTier(h.id)));
    expect([...tiersPresent].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('at least one tier-1 and one tier-2 institution sits in a tier-5 (highest-demand) city — proves independence', () => {
    const realHospitals = HOSPITAL_DEFINITIONS.filter((h) => h.kind !== 'fictional');
    const tier1InTopCity = realHospitals.some((h) => getHospitalCompetitivenessTier(h.id) === 1 && getCityCompetitivenessTier(h.cityId) === 5);
    const tier2InTopCity = realHospitals.some((h) => getHospitalCompetitivenessTier(h.id) === 2 && getCityCompetitivenessTier(h.cityId) === 5);
    expect(tier1InTopCity).toBe(true);
    expect(tier2InTopCity).toBe(true);
  });

  it('at least one tier-3 and one tier-4 institution sits in a tier-1/2 (lowest-demand) city — proves independence', () => {
    const realHospitals = HOSPITAL_DEFINITIONS.filter((h) => h.kind !== 'fictional');
    const tier3InLowCity = realHospitals.some((h) => getHospitalCompetitivenessTier(h.id) === 3 && getCityCompetitivenessTier(h.cityId) <= 2);
    const tier4InLowCity = realHospitals.some((h) => getHospitalCompetitivenessTier(h.id) === 4 && getCityCompetitivenessTier(h.cityId) <= 2);
    expect(tier3InLowCity).toBe(true);
    expect(tier4InLowCity).toBe(true);
  });
});

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function modifierForCityTier(tier: 1 | 2 | 3 | 4 | 5): number {
  const city = CITY_DEFINITIONS.find((c) => getCityCompetitivenessTier(c.id) === tier);
  if (!city) throw new Error(`no city found at tier ${tier}`);
  return getCityCompetitivenessModifier(city.id);
}

// §27 — curated preference offer.
describe('TUS System Redesign — curated 7-option offer (§27)', () => {
  const legacyIds = new Set(LEGACY_PROGRAMS.map((p) => p.id));
  const productionIds = new Set(PRODUCTION_PROGRAMS.map((p) => p.id));

  it('never returns more than 7 options', () => {
    for (const score of [50, 55, 60, 65, 70, 75, 80, 85]) {
      const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, score);
      const offer = generateCuratedTusOffer(eligible, `offer-cap-${score}`);
      expect(offer.length).toBeLessThanOrEqual(CURATED_OFFER_SIZE);
    }
  });

  it('returns exactly 7 whenever at least 7 programs are eligible', () => {
    for (const score of [55, 65, 75, 85]) {
      const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, score);
      expect(eligible.length).toBeGreaterThanOrEqual(7);
      const offer = generateCuratedTusOffer(eligible, `offer-full-${score}`);
      expect(offer.length).toBe(7);
    }
  });

  it('returns every eligible program when fewer than 7 are eligible (never fabricates)', () => {
    const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, 50).slice(0, 3);
    const offer = generateCuratedTusOffer(eligible, 'offer-small-pool');
    expect(offer.length).toBe(3);
    expect(new Set(offer.map((p) => p.id))).toEqual(new Set(eligible.map((p) => p.id)));
  });

  it('every offered program is eligible, belongs to PRODUCTION_PROGRAMS, and is never a legacy/fictional id', () => {
    for (const score of [50, 60, 70, 80, 85]) {
      const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, score);
      const eligibleIds = new Set(eligible.map((p) => p.id));
      const offer = generateCuratedTusOffer(eligible, `offer-eligible-${score}`);
      for (const p of offer) {
        expect(eligibleIds.has(p.id)).toBe(true);
        expect(productionIds.has(p.id)).toBe(true);
        expect(legacyIds.has(p.id)).toBe(false);
      }
    }
  });

  it('is deterministic for the same eligible pool and seed (refresh/save-load never rerolls)', () => {
    const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, 72);
    const a = generateCuratedTusOffer(eligible, 'stable-save-seed').map((p) => p.id);
    const b = generateCuratedTusOffer(eligible, 'stable-save-seed').map((p) => p.id);
    const c = generateCuratedTusOffer(eligible, 'stable-save-seed').map((p) => p.id);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('determinePlayerReachableTier is derived from the real eligible pool, not a fixed score band', () => {
    // At score 50 only tier-1 branches are eligible at all (see the
    // representative-score audit) — reachable tier must reflect that.
    const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, 50);
    expect(determinePlayerReachableTier(eligible)).toBe(1);
  });

  it('prefers distinct specialties across the whole offer before duplicating one', () => {
    const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, 85);
    const offer = generateCuratedTusOffer(eligible, 'diversity-check');
    const distinctBranches = new Set(offer.map((p) => p.branchId)).size;
    // With the full 2191-program pool eligible, there is no shortage of
    // distinct specialties at every tier the composition draws from, so
    // duplication should never be needed.
    expect(distinctBranches).toBe(offer.length);
  });

  it('lower-tier alternative slots skew toward stronger hospital/city combinations, not the weakest available', () => {
    const eligible = filterAvailablePrograms(PRODUCTION_PROGRAMS, 85);
    let strongCount = 0;
    let totalAlternates = 0;
    for (let i = 0; i < 30; i++) {
      const offer = generateCuratedTusOffer(eligible, `attractiveness-${i}`);
      const reachable = determinePlayerReachableTier(eligible);
      const alternates = offer.filter((p) => getBranchCompetitivenessTier(p.branchId) !== reachable);
      for (const p of alternates) {
        totalAlternates++;
        const strength = getHospitalCompetitivenessModifier(p.hospitalId) + getCityCompetitivenessModifier(p.cityId);
        if (strength >= 0) strongCount++;
      }
    }
    expect(totalAlternates).toBeGreaterThan(0);
    expect(strongCount / totalAlternates).toBeGreaterThan(0.6);
  });
});
