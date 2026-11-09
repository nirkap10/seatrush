// One row of seats, index 0 is seat 1.
// available: the seat is free (not held, not sold).
// usable: it's free and passes the fan's filters (price, zone).
export interface Row {
  letter: string;
  available: boolean[];
  usable: boolean[];
}

export interface Block {
  rowLetter: string;
  firstSeat: number;
}

// Returns the seat number of a lone seat that holding these seats would
// create, or null. A lone seat is free, with a taken seat or the row's end
// on each side. Seats that were already alone don't count.
export function newLoneSeat(
  available: boolean[],
  seatNumbers: number[],
): number | null {
  const before = loneSeats(available);
  const after = available.map(
    (isFree, i) => isFree && !seatNumbers.includes(i + 1),
  );
  return loneSeats(after).find((seat) => !before.includes(seat)) ?? null;
}

function loneSeats(available: boolean[]): number[] {
  const lone: number[] = [];
  available.forEach((isFree, i) => {
    const leftClosed = i === 0 || !available[i - 1];
    const rightClosed = i === available.length - 1 || !available[i + 1];
    if (isFree && leftClosed && rightClosed) {
      lone.push(i + 1);
    }
  });
  return lone;
}

// Rows must be sorted from the stage back (A first).
// The first row with any fitting block wins.
export function pickBestBlock(rows: Row[], count: number): Block | null {
  for (const row of rows) {
    const firstSeat = bestFirstSeat(row, count);
    if (firstSeat !== null) {
      return { rowLetter: row.letter, firstSeat };
    }
  }
  return null;
}

// The block whose middle is closest to the row's middle.
// On a tie, the lower first seat wins, because it's found first.
function bestFirstSeat(row: Row, count: number): number | null {
  const rowMiddle = (row.usable.length + 1) / 2;
  let best: number | null = null;
  let bestDistance = Infinity;

  for (let first = 1; first + count - 1 <= row.usable.length; first++) {
    const distance = Math.abs(first + (count - 1) / 2 - rowMiddle);

    // Moving right, the distance shrinks until the middle, then grows.
    // So once it's no smaller than the best, every later block is worse.
    if (best !== null && distance >= bestDistance) {
      break;
    }

    const seatNumbers = Array.from({ length: count }, (_, i) => first + i);
    const fits =
      seatNumbers.every((seat) => row.usable[seat - 1]) &&
      newLoneSeat(row.available, seatNumbers) === null;
    if (fits) {
      best = first;
      bestDistance = distance;
    }
  }

  return best;
}
