import { discountFor } from './promo.js';

describe('discountFor', () => {
  it('SAVE10 takes 10%, rounded half up (the brief example)', () => {
    // 349.35 with SAVE10: discount 34.94, total 314.41.
    expect(discountFor('SAVE10', 34935)).toBe(3494);
    expect(34935 - discountFor('SAVE10', 34935)).toBe(31441);
  });

  it('SAVE10 rounds down below half', () => {
    expect(discountFor('SAVE10', 34934)).toBe(3493);
  });

  it('WELCOME20 takes 20.00 off', () => {
    expect(discountFor('WELCOME20', 34935)).toBe(2000);
  });

  it('WELCOME20 never takes the total below 0', () => {
    expect(discountFor('WELCOME20', 1500)).toBe(1500);
  });

  it('rejects an unknown code', () => {
    expect(() => discountFor('FREE', 1000)).toThrow('not a promo code');
  });
});
