import { BadRequestException } from '@nestjs/common';

// The discount in agorot for a promo code. All money is whole agorot.
export function discountFor(code: string, totalAgorot: number): number {
  if (code === 'SAVE10') {
    // 10%, rounded to the nearest agora, half up: 3493.5 becomes 3494.
    return Math.round((totalAgorot * 10) / 100);
  }
  if (code === 'WELCOME20') {
    // ₪20 off, but never more than the total, so it can't go below 0.
    return Math.min(2000, totalAgorot);
  }
  throw new BadRequestException(`${code} is not a promo code we know`);
}
