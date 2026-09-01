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
});
