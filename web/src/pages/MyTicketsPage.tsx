import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api.ts';
import { formatPrice } from '../money.ts';
import { formatDateTime } from '../time.ts';
import type { Order } from '../types.ts';

export function MyTicketsPage(props: { username: string }) {
  const orders = useQuery({
    queryKey: ['orders', props.username],
    queryFn: () => api<Order[]>('/me/orders'),
  });

  if (orders.isPending) {
    return <CircularProgress />;
  }
  if (orders.isError) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => orders.refetch()}>Try again</Button>}
      >
        {orders.error.message}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h1" sx={{ fontSize: 32 }}>
        My tickets
      </Typography>

      {orders.data.length === 0 && (
        <Typography>
          No tickets yet. <Link to="/">Browse the events</Link> to find seats.
        </Typography>
      )}

      {orders.data.map((order) => (
        <Card key={order.id}>
          <CardContent>
            <Typography variant="h2" sx={{ fontSize: 20 }}>
              {order.eventName}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              {order.venue} · {formatDateTime(order.startsAt)}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              {order.seats.map((seat) => (
                <Chip key={seat} color="secondary" label={`Seat ${seat}`} />
              ))}
            </Stack>
            <Typography>
              Paid {formatPrice(order.totalAgorot)}
              {order.promoCode &&
                ` (saved ${formatPrice(order.discountAgorot)} with ${order.promoCode})`}{' '}
              · Order #{order.id} ·{' '}
              {formatDateTime(order.createdAt)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
