import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api.ts';
import {
  BestAvailableForm,
  type BestAvailableRequest,
} from '../components/BestAvailableForm.tsx';
import { MyHolds } from '../components/MyHolds.tsx';
import { SeatMap } from '../components/SeatMap.tsx';
import { formatPrice } from '../money.ts';
import { formatCountdown, formatDateTime, useNow, useSlow } from '../time.ts';
import type { EventDetails, NewHold, Order } from '../types.ts';

const MAX_SELECTED = 4;

interface Notice {
  severity: 'success' | 'error' | 'info';
  text: string;
}

export function EventPage(props: { username: string | null }) {
  const { id } = useParams(); // the :id in /events/:id
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow();
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  // The event, its seats and my holds, asked for again every 2 seconds.
  // While a new answer is on its way, the last one stays on screen.
  const query = useQuery({
    queryKey: ['event', id, props.username],
    queryFn: () => api<EventDetails>(`/events/${id}`),
    refetchInterval: 2000,
  });
  const data = query.data;

  // If someone else takes a seat this fan had selected, unselect it and say so.
  useEffect(() => {
    if (!data) return;
    const mine = data.myHolds.flatMap((h) => h.seats);
    const unavailable = selected.filter((label) => {
      const seat = data.seats.find((s) => s.label === label);
      return seat?.status !== 'available';
    });
    if (unavailable.length > 0) {
      setSelected((current) =>
        current.filter((label) => !unavailable.includes(label)),
      );
    }
    // Seats in my own new hold aren't "taken by someone".
    const takenByOthers = unavailable.filter((label) => !mine.includes(label));
    if (takenByOthers.length > 0) {
      setNotice({
        severity: 'error',
        text: `Someone just took ${takenByOthers.join(', ')}`,
      });
    }
    // Only when new seat data arrives, not when the fan clicks a seat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['event', id] });
  }

  function showError(error: Error) {
    if (error instanceof ApiError && error.status === 401) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    // "Someone just took B3": unselect B3, so the fan can pick another seat.
    const taken = error.message.match(/^Someone just took (\w+)/)?.[1];
    if (taken) {
      setSelected((current) => current.filter((label) => label !== taken));
    }
    setNotice({ severity: 'error', text: error.message });
    refresh();
  }

  function onHeld(hold: NewHold) {
    setSelected([]);
    setNotice({
      severity: 'success',
      text: `${hold.seats.join(', ')} ${hold.seats.length > 1 ? 'are' : 'is'} yours for now. Check out before the timer runs out.`,
    });
    refresh();
  }

  const hold = useMutation({
    mutationFn: (seats: string[]) =>
      api<NewHold>(`/events/${id}/holds`, { method: 'POST', body: { seats } }),
    onSuccess: onHeld,
    onError: showError,
  });

  const bestAvailable = useMutation({
    mutationFn: (request: BestAvailableRequest) =>
      api<NewHold>(`/events/${id}/holds/best-available`, {
        method: 'POST',
        body: request,
      }),
    onSuccess: onHeld,
    onError: showError,
  });

  const checkout = useMutation({
    mutationFn: (holdId: number) =>
      api<Order>(`/holds/${holdId}/checkout`, { method: 'POST' }),
    onSuccess: (order) => {
      setNotice({
        severity: 'success',
        text: `You got ${order.seats.join(', ')}! Your tickets are in My tickets.`,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refresh();
    },
    onError: showError,
  });

  const release = useMutation({
    mutationFn: (holdId: number) =>
      api(`/holds/${holdId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setNotice({ severity: 'info', text: 'Released. Those seats are back on sale.' });
      refresh();
    },
    onError: showError,
  });

  // While any of them is working, buttons are disabled: no double sends.
  const busy =
    hold.isPending || bestAvailable.isPending || checkout.isPending || release.isPending;
  const slow = useSlow(busy);

  // Holding needs a fan. Viewing doesn't.
  function loggedIn(): boolean {
    if (!props.username) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return false;
    }
    return true;
  }

  function toggleSeat(label: string) {
    if (selected.includes(label)) {
      setSelected(selected.filter((l) => l !== label));
    } else if (selected.length >= MAX_SELECTED) {
      setNotice({ severity: 'info', text: `You can pick up to ${MAX_SELECTED} seats at a time.` });
    } else {
      setSelected([...selected, label]);
    }
  }

  if (query.isPending) {
    return <CircularProgress />;
  }
  if (!data) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => query.refetch()}>Try again</Button>}
      >
        {query.error?.message}
      </Alert>
    );
  }

  // The time by the server's clock: the browser's time, corrected by how far
  // the server's clock was from it when this answer arrived.
  const offset = new Date(data.serverTime).getTime() - query.dataUpdatedAt;
  const serverNow = now + offset;
  const msToDrop = new Date(data.event.dropAt).getTime() - serverNow;

  const mySeats = data.myHolds.flatMap((h) => h.seats);
  const selectedTotal = selected.reduce((sum, label) => {
    const seat = data.seats.find((s) => s.label === label);
    const zone = data.zones.find((z) => z.id === seat?.zoneId);
    return sum + (zone?.priceAgorot ?? 0);
  }, 0);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1" sx={{ fontSize: 32 }}>
          {data.event.name}
        </Typography>
        <Typography color="text.secondary">
          {data.event.venue} · {formatDateTime(data.event.startsAt)}
        </Typography>
      </Box>

      {slow && (
        <Alert severity="info">
          Lots of fans are buying right now. Hang on, we're still working on it.
        </Alert>
      )}

      {msToDrop > 0 ? (
        // Before the drop, the seat map stays hidden.
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>
            Tickets go on sale in
          </Typography>
          <Typography variant="h1" sx={{ fontSize: 48 }}>
            {formatCountdown(msToDrop)}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {formatDateTime(data.event.dropAt)}. The seat map opens right here,
            no need to refresh.
          </Typography>
        </Paper>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Paper sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <SeatMap
              seats={data.seats}
              zones={data.zones}
              mySeats={mySeats}
              selected={selected}
              onToggle={toggleSeat}
            />
          </Paper>

          <Stack spacing={2} sx={{ width: { md: 320 }, flexShrink: 0 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>
                Your selection
              </Typography>
              <Typography sx={{ mb: 1.5 }}>
                {selected.length === 0
                  ? `Click up to ${MAX_SELECTED} available seats.`
                  : `${selected.join(', ')} · ${formatPrice(selectedTotal)}`}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                disabled={selected.length === 0 || busy}
                onClick={() => loggedIn() && hold.mutate(selected)}
              >
                {hold.isPending ? 'Holding…' : 'Hold these seats'}
              </Button>
            </Paper>

            <BestAvailableForm
              zones={data.zones}
              busy={busy}
              onSubmit={(request) => loggedIn() && bestAvailable.mutate(request)}
            />

            <MyHolds
              holds={data.myHolds}
              seats={data.seats}
              zones={data.zones}
              serverNow={serverNow}
              busy={busy}
              onCheckout={(holdId) => checkout.mutate(holdId)}
              onRelease={(holdId) => release.mutate(holdId)}
            />
          </Stack>
        </Stack>
      )}

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={notice?.severity ?? 'info'}
          variant="filled"
          onClose={() => setNotice(null)}
        >
          {notice?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
