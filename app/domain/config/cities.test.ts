import { describe, expect, it } from 'vitest';
import { CITY_DEFINITIONS, getCityDefinition } from './cities';

describe('CITY_DEFINITIONS — Phase 11 expansion', () => {
  it('has 62 cities (up from the original 6)', () => {
    expect(CITY_DEFINITIONS.length).toBe(62);
  });

  it('has unique ids', () => {
    const ids = CITY_DEFINITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves İstanbul's Phase 10-tuned indices exactly", () => {
    const istanbul = getCityDefinition('istanbul');
    expect(istanbul).toEqual({ id: 'istanbul', name: 'İstanbul', costIndex: 68, rentIndex: 70, transportPressure: 72, socialOpportunity: 90 });
  });

  it('preserves the other 5 original cities exactly', () => {
    expect(getCityDefinition('ankara').costIndex).toBe(55);
    expect(getCityDefinition('izmir').costIndex).toBe(65);
    expect(getCityDefinition('bursa').costIndex).toBe(55);
    expect(getCityDefinition('antalya').costIndex).toBe(60);
    expect(getCityDefinition('eskisehir').costIndex).toBe(45);
  });

  it('every new city has a fully-populated, in-range economic profile', () => {
    for (const city of CITY_DEFINITIONS) {
      for (const value of [city.costIndex, city.rentIndex, city.transportPressure, city.socialOpportunity]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('throws for an unknown city id', () => {
    expect(() => getCityDefinition('nonexistent_city')).toThrow();
  });
});
