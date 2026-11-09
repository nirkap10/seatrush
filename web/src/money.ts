// 34935 agorot → "₪349.35"
export function formatPrice(agorot: number): string {
  return `₪${(agorot / 100).toFixed(2)}`;
}
