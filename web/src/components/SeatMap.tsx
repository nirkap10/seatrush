import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { formatPrice } from '../money.ts';
import { NAVY, RED } from '../theme.ts';
import type { Seat, Zone } from '../types.ts';

// One color per zone for available seats, from Thing or Two's palette.
const ZONE_COLORS = ['#090078', '#7639E2', '#28D2DC', '#F4A886', '#6ECA09'];
const HELD = '#C9CED6';
const SOLD = '#5B6270';

export function SeatMap(props: {
  seats: Seat[];
  zones: Zone[];
  mySeats: string[]; // seats in my active holds
  selected: string[];
  onToggle: (label: string) => void;
}) {
  const zoneIndex = new Map(props.zones.map((zone, i) => [zone.id, i]));
  const zoneById = new Map(props.zones.map((zone) => [zone.id, zone]));

  // Group the seats into rows. They arrive sorted: A1, A2, ..., B1, ...
  const rows = new Map<string, Seat[]>();
  for (const seat of props.seats) {
    rows.set(seat.rowLetter, [...(rows.get(seat.rowLetter) ?? []), seat]);
  }

  function colorOf(seat: Seat) {
    if (props.mySeats.includes(seat.label)) return RED;
    if (seat.status === 'sold') return SOLD;
    if (seat.status === 'held') return HELD;
    return ZONE_COLORS[(zoneIndex.get(seat.zoneId) ?? 0) % ZONE_COLORS.length];
  }

  return (
    <Box>
      {/* Legend: zones with prices, then the statuses */}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {props.zones.map((zone, i) => (
          <Legend
            key={zone.id}
            color={ZONE_COLORS[i % ZONE_COLORS.length]}
            text={`${zone.name} · rows ${zone.fromRow}–${zone.toRow} · ${formatPrice(zone.priceAgorot)}`}
          />
        ))}
        <Legend color={RED} text="Yours" />
        <Legend color={HELD} text="Held" />
        <Legend color={SOLD} text="Sold" />
      </Stack>

      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box
          sx={{
            bgcolor: NAVY,
            color: 'white',
            textAlign: 'center',
            borderRadius: 1,
            py: 0.5,
            mb: 2,
            fontWeight: 600,
            minWidth: 'max-content',
          }}
        >
          STAGE
        </Box>

        {[...rows.entries()].map(([letter, rowSeats]) => (
          <Stack
            key={letter}
            direction="row"
            spacing={0.5}
            sx={{ mb: 0.5, alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography sx={{ width: 24, fontWeight: 700, color: NAVY }}>
              {letter}
            </Typography>
            {rowSeats.map((seat) => {
              const isSelected = props.selected.includes(seat.label);
              const canPick = seat.status === 'available';
              const zone = zoneById.get(seat.zoneId);
              return (
                <Tooltip
                  key={seat.label}
                  title={`${seat.label} · ${zone?.name} · ${formatPrice(zone?.priceAgorot ?? 0)} · ${
                    props.mySeats.includes(seat.label) ? 'yours' : seat.status
                  }`}
                >
                  <Box
                    component="button"
                    type="button"
                    disabled={!canPick}
                    onClick={() => props.onToggle(seat.label)}
                    aria-label={`Seat ${seat.label}, ${seat.status}`}
                    aria-pressed={isSelected}
                    sx={{
                      width: 30,
                      height: 30,
                      flexShrink: 0,
                      border: isSelected ? `3px solid ${RED}` : 'none',
                      borderRadius: '8px 8px 4px 4px',
                      bgcolor: isSelected ? 'white' : colorOf(seat),
                      color: isSelected ? RED : 'white',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: canPick ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {seat.seatNumber}
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function Legend(props: { color: string; text: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: props.color }} />
      <Typography variant="body2">{props.text}</Typography>
    </Stack>
  );
}
