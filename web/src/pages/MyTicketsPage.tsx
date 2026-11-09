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
import { api, serverDown } from '../api.ts';
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
    const retry = <Button onClick={() => orders.refetch()}>Try again</Button>;
    // Only explain when our side collapsed. Otherwise, just offer to retry.
    return serverDown(orders.error) ? (
      <Alert severity="error" action={retry}>
        {orders.error.message}
      </Alert>
    ) : (
      retry
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h1" sx={{ fontSize: 32 }}>
        My tickets
      </Typography>

      {orders.data.length === 0 && (
        <Typography>
          No tickets yet.
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
              Paid {formatPrice(order.totalAgorot)} · Order #{order.id} ·{' '}
              {formatDateTime(order.createdAt)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
