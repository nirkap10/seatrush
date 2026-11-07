export interface ZoneRows {
  name: string;
  fromRow: string;
  toRow: string;
}

export interface NewSeat {
  zoneName: string;
  label: string;
  rowLetter: string;
  seatNumber: number;
}

// Row 0 is A, row 1 is B, and so on.
function rowLetter(rowIndex: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + rowIndex);
}

function zoneCoversRow(zone: ZoneRows, row: string): boolean {
  return zone.fromRow <= row && row <= zone.toRow;
}

// Returns a message describing the first problem, or null if the zones are valid.
export function findZoneProblem(
  zones: ZoneRows[],
  rowCount: number,
): string | null {
  const lastRow = rowLetter(rowCount - 1);
  const seenNames = new Set<string>();

  for (const zone of zones) {
    if (seenNames.has(zone.name)) {
      return `There is more than one zone named ${zone.name}`;
    }
    seenNames.add(zone.name);

    if (zone.fromRow > zone.toRow) {
      return `Zone ${zone.name} starts at row ${zone.fromRow}, which is after its last row ${zone.toRow}`;
    }
    if (zone.toRow > lastRow) {
      return `Zone ${zone.name} goes up to row ${zone.toRow}, but the event only has rows A to ${lastRow}`;
    }
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rowLetter(rowIndex);
    const zonesForRow = zones.filter((zone) => zoneCoversRow(zone, row));

    if (zonesForRow.length === 0) {
      return `Row ${row} has no zone`;
    }
    if (zonesForRow.length > 1) {
      return `Row ${row} is in more than one zone`;
    }
  }

  return null;
}

// Assumes the zones already passed findZoneProblem.
export function buildSeats(
  zones: ZoneRows[],
  rowCount: number,
  seatsPerRow: number,
): NewSeat[] {
  const seats: NewSeat[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rowLetter(rowIndex);
    const zone = zones.find((candidate) => zoneCoversRow(candidate, row));

    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
      seats.push({
        zoneName: zone!.name,
        label: `${row}${seatNumber}`,
        rowLetter: row,
        seatNumber,
      });
    }
  }

  return seats;
}
