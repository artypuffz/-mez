import { describe, expect, it } from 'vitest';
import { BRANCH_DEFINITIONS, deriveOnCallProfile, deriveWeeklyBaseline, getBranchDefinition, getBranchOverallDifficulty } from './branches';
import { GLOBAL_SHIFT_BOUNDS } from './onCallEconomyConfig';

// Phase 11 §3/§4/§52 — exactly the 26 named clinical branches, none of the
// explicitly excluded basic-science branches.
// "Psikiyatri" (not "Ruh Sağlığı ve Hastalıkları") is the ONE deliberate
// exception here — the pre-existing branch id/display-name predates Phase
// 11 and is kept for backward compatibility (existing saves/content
// reference branchId "psikiyatri" throughout). Its difficultyBaseline is
// still sourced from the authoritative table's "Ruh Sağlığı ve
// Hastalıkları" row — see branches.ts's inline comment on that entry.
const EXPECTED_BRANCH_NAMES = [
  'Acil Tıp', 'Aile Hekimliği', 'Anesteziyoloji ve Reanimasyon', 'Beyin ve Sinir Cerrahisi',
  'Çocuk Cerrahisi', 'Çocuk Sağlığı ve Hastalıkları', 'Çocuk ve Ergen Ruh Sağlığı ve Hastalıkları',
  'Deri ve Zührevi Hastalıkları', 'Enfeksiyon Hastalıkları ve Klinik Mikrobiyolojisi',
  'Fiziksel Tıp ve Rehabilitasyon', 'Genel Cerrahi', 'Göğüs Cerrahisi', 'Göğüs Hastalıkları',
  'Göz Hastalıkları', 'İç Hastalıkları', 'Kadın Hastalıkları ve Doğum', 'Kalp ve Damar Cerrahisi',
  'Kardiyoloji', 'Kulak Burun Boğaz Hastalıkları', 'Nöroloji', 'Nükleer Tıp',
  'Ortopedi ve Travmatoloji', 'Plastik, Rekonstrüktif ve Estetik Cerrahi', 'Radyoloji',
  'Psikiyatri', 'Üroloji',
];

const EXCLUDED_BASIC_SCIENCES = [
  'Anatomi', 'Fizyoloji', 'Histoloji ve Embriyoloji', 'Tıbbi Mikrobiyoloji',
  'Tıbbi Genetik', 'Tıbbi Patoloji', 'Halk Sağlığı', 'Adli Tıp',
];

describe('BRANCH_DEFINITIONS', () => {
  it('has exactly 26 branches', () => {
    expect(BRANCH_DEFINITIONS.length).toBe(26);
  });

  it('has unique ids', () => {
    const ids = BRANCH_DEFINITIONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches the 26 named clinical branches exactly, no more, no fewer', () => {
    const names = BRANCH_DEFINITIONS.map((b) => b.name).sort();
    expect(names).toEqual([...EXPECTED_BRANCH_NAMES].sort());
  });

  it('never includes a basic-science / excluded branch', () => {
    const names = new Set(BRANCH_DEFINITIONS.map((b) => b.name));
    for (const excluded of EXCLUDED_BASIC_SCIENCES) {
      expect(names.has(excluded)).toBe(false);
    }
  });

  it('every branch has a difficultyBaseline within 1.0-5.0 on all three axes', () => {
    for (const branch of BRANCH_DEFINITIONS) {
      const { onCallLoad, workingHours, hierarchyPressure } = branch.difficultyBaseline;
      for (const axis of [onCallLoad, workingHours, hierarchyPressure]) {
        expect(axis).toBeGreaterThanOrEqual(1.0);
        expect(axis).toBeLessThanOrEqual(5.0);
      }
    }
  });

  it("keeps the 3 pre-existing branches' Phase 10-tuned weeklyBaseline/onCallProfile untouched", () => {
    const ic = getBranchDefinition('ic_hastaliklari');
    expect(ic.weeklyBaseline).toEqual({ fatiguePressure: 4, stressPressure: 3 });
    expect(ic.onCallProfile).toEqual({ baseMonthlyShifts: 6, minMonthlyShifts: 4, maxMonthlyShifts: 9, weekendBias: 0.35 });

    const cerrahi = getBranchDefinition('genel_cerrahi');
    expect(cerrahi.weeklyBaseline).toEqual({ fatiguePressure: 3.7, stressPressure: 2.7 });
    expect(cerrahi.onCallProfile.baseMonthlyShifts).toBe(7);

    const psik = getBranchDefinition('psikiyatri');
    expect(psik.weeklyBaseline).toEqual({ fatiguePressure: 3.3, stressPressure: 3.2 });
    expect(psik.onCallProfile.baseMonthlyShifts).toBe(6);
  });

  it('every derived (23 new) branch has an onCallProfile inside the global safety band', () => {
    const [min, max] = GLOBAL_SHIFT_BOUNDS;
    for (const branch of BRANCH_DEFINITIONS) {
      expect(branch.onCallProfile.minMonthlyShifts).toBeGreaterThanOrEqual(min);
      expect(branch.onCallProfile.maxMonthlyShifts).toBeLessThanOrEqual(max);
      expect(branch.onCallProfile.baseMonthlyShifts).toBeGreaterThanOrEqual(branch.onCallProfile.minMonthlyShifts);
      expect(branch.onCallProfile.baseMonthlyShifts).toBeLessThanOrEqual(branch.onCallProfile.maxMonthlyShifts);
    }
  });

  it('every branch has a positive residencyYears', () => {
    for (const branch of BRANCH_DEFINITIONS) {
      expect(branch.residencyYears).toBeGreaterThan(0);
    }
  });
});

describe('getBranchOverallDifficulty (§8 — never stored, always derived)', () => {
  it('matches the documented weighted formula', () => {
    const branch = getBranchDefinition('genel_cerrahi');
    const expected =
      branch.difficultyBaseline.onCallLoad * 0.35 +
      branch.difficultyBaseline.workingHours * 0.4 +
      branch.difficultyBaseline.hierarchyPressure * 0.25;
    expect(getBranchOverallDifficulty(branch)).toBeCloseTo(expected, 6);
  });

  it('the highest-baseline branch (Beyin ve Sinir Cerrahisi) scores higher than the lowest (Aile Hekimliği)', () => {
    const hardest = getBranchDefinition('beyin_ve_sinir_cerrahisi');
    const easiest = getBranchDefinition('aile_hekimligi');
    expect(getBranchOverallDifficulty(hardest)).toBeGreaterThan(getBranchOverallDifficulty(easiest));
  });
});

describe('deriveOnCallProfile — §41 sanity check (5.0 branch > 1.5 branch)', () => {
  it('a 5.0 onCallLoad branch produces a higher baseMonthlyShifts than a 1.5 one', () => {
    expect(deriveOnCallProfile(5.0).baseMonthlyShifts).toBeGreaterThan(deriveOnCallProfile(1.5).baseMonthlyShifts);
  });
});

describe('deriveWeeklyBaseline — monotonic in both axes', () => {
  it('a higher workingHours/hierarchyPressure produces a higher fatigue/stress baseline', () => {
    const low = deriveWeeklyBaseline(1.0, 1.0);
    const high = deriveWeeklyBaseline(5.0, 5.0);
    expect(high.fatiguePressure).toBeGreaterThan(low.fatiguePressure);
    expect(high.stressPressure).toBeGreaterThan(low.stressPressure);
  });
});
