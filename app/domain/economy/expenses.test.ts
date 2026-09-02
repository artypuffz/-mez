import { describe, expect, it } from 'vitest';
import { computeMonthlyExpenses } from './expenses';
import { getCityDefinition } from '../config/cities';

const istanbul = getCityDefinition('istanbul');
const eskisehir = getCityDefinition('eskisehir');

describe('computeMonthlyExpenses', () => {
  it('a higher-rentIndex city costs more rent, all else equal', () => {
    const expensive = computeMonthlyExpenses(istanbul, 'kendi_basina');
    const cheap = computeMonthlyExpenses(eskisehir, 'kendi_basina');
    expect(expensive.rent).toBeGreaterThan(cheap.rent);
  });

  it('aile_yaninda gets a heavily reduced rent vs. the same city otherwise', () => {
    const normal = computeMonthlyExpenses(istanbul, 'kendi_basina');
    const withFamily = computeMonthlyExpenses(istanbul, 'aile_yaninda');
    expect(withFamily.rent).toBeLessThan(normal.rent);
  });

  it('ekonomik_rahat does NOT get a reduced rent — the background is already rewarded via starting money, not twice', () => {
    const kendiBasina = computeMonthlyExpenses(istanbul, 'kendi_basina');
    const ekonomikRahat = computeMonthlyExpenses(istanbul, 'ekonomik_rahat');
    expect(ekonomikRahat.rent).toBe(kendiBasina.rent);
  });

  it('a higher transportPressure city costs more transport', () => {
    const expensive = computeMonthlyExpenses(istanbul, 'kendi_basina');
    const cheap = computeMonthlyExpenses(eskisehir, 'kendi_basina');
    expect(expensive.transport).toBeGreaterThan(cheap.transport);
  });

  it('all figures are non-negative', () => {
    const expenses = computeMonthlyExpenses(istanbul, 'aile_yaninda');
    expect(Object.values(expenses).every((v) => v >= 0)).toBe(true);
  });

  // Gameplay Expansion Part A §8/§12/§27
  it('omitting foodTier/housingTier (or passing "normal") is byte-identical to the pre-Part-A formula', () => {
    const implicit = computeMonthlyExpenses(istanbul, 'kendi_basina');
    const explicitNormal = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'normal');
    expect(explicitNormal).toEqual(implicit);
  });

  it('cheap housing meaningfully reduces rent vs normal, in the same city', () => {
    const normal = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'normal');
    const cheapHousing = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'cheap');
    expect(cheapHousing.rent).toBeLessThan(normal.rent);
  });

  it('good housing costs more rent than normal', () => {
    const normal = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'normal');
    const goodHousing = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'good');
    expect(goodHousing.rent).toBeGreaterThan(normal.rent);
  });

  it('economical food reduces the food bill vs normal', () => {
    const normal = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'normal');
    const economical = computeMonthlyExpenses(istanbul, 'kendi_basina', 'economical', 'normal');
    expect(economical.food).toBeLessThan(normal.food);
  });

  it('good food costs more than normal', () => {
    const normal = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'normal');
    const good = computeMonthlyExpenses(istanbul, 'kendi_basina', 'good', 'normal');
    expect(good.food).toBeGreaterThan(normal.food);
  });

  // The audited structural finding: a low-on-call branch in İstanbul runs
  // a monthly deficit under "normal" lifestyle/housing (unchanged from
  // before Part A — the player still FEELS the city difference, per
  // §27's own goal), but "cheap" housing closes it — a real player
  // decision, not an artificial on-call bump.
  it('cheap housing can flip a structural İstanbul deficit into a surplus without touching on-call income', () => {
    const SALARY = 17000;
    const LOW_ONCALL_PAY = 3 * 900 + 1 * 400; // 3 shifts, 1 weekend — a genuinely low-nöbet branch/month
    const normal = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'normal');
    const normalTotal = normal.rent + normal.food + normal.transport + normal.utilities + normal.fixedOther;
    expect(SALARY + LOW_ONCALL_PAY - normalTotal).toBeLessThan(0); // still a real deficit at "normal"

    const cheap = computeMonthlyExpenses(istanbul, 'kendi_basina', 'normal', 'cheap');
    const cheapTotal = cheap.rent + cheap.food + cheap.transport + cheap.utilities + cheap.fixedOther;
    expect(SALARY + LOW_ONCALL_PAY - cheapTotal).toBeGreaterThan(0); // player's own choice fixes it
  });
});
