import { newLoneSeat, pickBestBlock } from './best-available.js';

// A row with the given seat numbers taken. With no filters, usable = available.
function row(letter: string, length: number, taken: number[] = []) {
  const available = Array.from({ length }, (_, i) => !taken.includes(i + 1));
  return { letter, available, usable: available };
}

const FULL = [1, 2, 3, 4, 5, 6, 7, 8];

describe('pickBestBlock', () => {
  it("solves the brief's example, skipping row B because of lone seats", () => {
    // Without the lone seat rule the answer would be B2-B3, but every pair
    // in row B leaves a lone seat, so the answer is C4-C5.
    const rows = [row('A', 8, FULL), row('B', 8, [4, 5]), row('C', 8)];

    expect(pickBestBlock(rows, 2)).toEqual({ rowLetter: 'C', firstSeat: 4 });
  });

  it('picks the middle of an empty row', () => {
    expect(pickBestBlock([row('A', 8)], 2)).toEqual({
      rowLetter: 'A',
      firstSeat: 4,
    });
  });

  it('prefers the lower first seat when two blocks are equally central', () => {
    // Free: 1-3 and 6-8. For 1 seat, A3 and A6 are equally central, so A3
    // wins (A2 would leave A1 alone). For 3 seats, A1-A3 and A6-A8 tie.
    const rows = [row('A', 8, [4, 5])];

    expect(pickBestBlock(rows, 1)).toEqual({ rowLetter: 'A', firstSeat: 3 });
    expect(pickBestBlock(rows, 3)).toEqual({ rowLetter: 'A', firstSeat: 1 });
  });

  it('prefers the row nearest the stage, even if its block is off-center', () => {
    const rows = [row('A', 8, [3, 4, 5, 6, 7, 8]), row('B', 8)];

    expect(pickBestBlock(rows, 2)).toEqual({ rowLetter: 'A', firstSeat: 1 });
  });

  it('finds a block on the right when the left and middle are full', () => {
    const rows = [row('A', 8, [1, 2, 3, 4, 5, 6])];

    expect(pickBestBlock(rows, 2)).toEqual({ rowLetter: 'A', firstSeat: 7 });
  });

  it('only uses seats that pass the filters', () => {
    const rows = [{ ...row('A', 4), usable: [false, false, true, true] }];

    expect(pickBestBlock(rows, 2)).toEqual({ rowLetter: 'A', firstSeat: 3 });
  });

  it('returns null when nothing fits', () => {
    const rows = [row('A', 4, [2]), row('B', 4, [3])];

    expect(pickBestBlock(rows, 3)).toBeNull();
  });
});

describe('newLoneSeat', () => {
  it('finds a seat left alone between two taken seats', () => {
    // Taken: 4. Holding 1 and 2 leaves 3 alone between 2 and 4.
    expect(newLoneSeat(row('A', 6, [4]).available, [1, 2])).toBe(3);
  });

  it('finds a seat left alone at the end of the row', () => {
    expect(newLoneSeat(row('A', 6).available, [2, 3])).toBe(1);
  });

  it('ignores a seat that was already alone', () => {
    // Seat 1 is already alone (2 is taken). Holding 5 and 6 leaves nothing new.
    expect(newLoneSeat(row('A', 6, [2]).available, [5, 6])).toBeNull();
  });
});
