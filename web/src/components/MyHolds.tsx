import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { formatPrice } from '../money.ts';
import { formatCountdown } from '../time.ts';
import type { MyHold, Seat, Zone } from '../types.ts';

// The fan's active holds in this event, each with its own countdown.
export function MyHolds(props: {
  holds: MyHold[];
  seats: Seat[];
  zones: Zone[];
  serverNow: number; // the current time by the server's clock
  busy: boolean;
  onCheckout: (holdId: number) => void;
  onRelease: (holdId: number) => void;
}) {
  function priceOf(label: string) {
    const seat = props.seats.find((s) => s.label === label);
    const zone = props.zones.find((z) => z.id === seat?.zoneId);
    return zone?.priceAgorot ?? 0;
  }

  if (props.holds.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h2" sx={{ fontSize: 18, mb: 1.5 }}>
        Your held seats
      </Typography>
      <Stack spacing={2}>
        {props.holds.map((hold) => {
          const msLeft = new Date(hold.expiresAt).getTime() - props.serverNow;
          const total = hold.seats.reduce((sum, label) => sum + priceOf(label), 0);

          if (msLeft <= 0) {
            return (
              <Alert key={hold.id} severity="error">
                Your hold on {hold.seats.join(', ')} expired, so the seats went
                back on sale.
              </Alert>
            );
          }
          return (
            <Stack key={hold.id} spacing={1}>
              <Typography sx={{ fontWeight: 600 }}>
                {hold.seats.join(', ')} · {formatPrice(total)}
              </Typography>
              {msLeft < 60_000 ? (
                <Alert severity="warning">
                  Your seats are held for {formatCountdown(msLeft)} more. Check
                  out now to keep them.
                </Alert>
              ) : (
                <Typography color="text.secondary">
                  Held for you for {formatCountdown(msLeft)}
                </Typography>
              )}
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={props.busy}
                  onClick={() => props.onCheckout(hold.id)}
                >
                  Checkout {formatPrice(total)}
                </Button>
                <Button
                  variant="outlined"
                  disabled={props.busy}
                  onClick={() => props.onRelease(hold.id)}
                >
                  Release
                </Button>
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
