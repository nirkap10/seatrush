import { buildSeats, findZoneProblem } from './seat-map.js';

describe('findZoneProblem', () => {
  it('accepts zones that cover every row exactly once', () => {
    const zones = [
      { name: 'Front', fromRow: 'A', toRow: 'B' },
      { name: 'Back', fromRow: 'C', toRow: 'C' },
    ];

    expect(findZoneProblem(zones, 3)).toBeNull();
  });

  it('rejects a row with no zone', () => {
    const zones = [{ name: 'Front', fromRow: 'A', toRow: 'B' }];

    expect(findZoneProblem(zones, 3)).toBe('Row C has no zone');
  });

  it('rejects a row in two zones', () => {
    const zones = [
      { name: 'Front', fromRow: 'A', toRow: 'B' },
      { name: 'Back', fromRow: 'B', toRow: 'C' },
    ];

    expect(findZoneProblem(zones, 3)).toBe('Row B is in more than one zone');
  });

  it('rejects a zone past the last row', () => {
    const zones = [{ name: 'Front', fromRow: 'A', toRow: 'D' }];

    expect(findZoneProblem(zones, 3)).toBe(
      'Zone Front goes up to row D, but the event only has rows A to C',
    );
  });

  it('rejects a zone whose rows are in the wrong order', () => {
    const zones = [{ name: 'Front', fromRow: 'C', toRow: 'A' }];

    expect(findZoneProblem(zones, 3)).toBe(
      'Zone Front starts at row C, which is after its last row A',
    );
  });

  it('rejects two zones with the same name', () => {
    const zones = [
      { name: 'Front', fromRow: 'A', toRow: 'A' },
      { name: 'Front', fromRow: 'B', toRow: 'B' },
    ];

    expect(findZoneProblem(zones, 2)).toBe(
      'There is more than one zone named Front',
    );
  });
});

describe('buildSeats', () => {
  const zones = [
    { name: 'Front', fromRow: 'A', toRow: 'A' },
    { name: 'Back', fromRow: 'B', toRow: 'B' },
  ];

  it('creates every seat, numbered from 1, in its zone', () => {
    const seats = buildSeats(zones, 2, 2);

    expect(seats).toEqual([
      { zoneName: 'Front', label: 'A1', rowLetter: 'A', seatNumber: 1 },
      { zoneName: 'Front', label: 'A2', rowLetter: 'A', seatNumber: 2 },
      { zoneName: 'Back', label: 'B1', rowLetter: 'B', seatNumber: 1 },
      { zoneName: 'Back', label: 'B2', rowLetter: 'B', seatNumber: 2 },
    ]);
  });
});
