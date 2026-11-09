import {
  Alert,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, serverDown } from '../api.ts';
import { formatCountdown, formatDateTime, useNow } from '../time.ts';

// One event, as GET /events sends it. Dates arrive as text (ISO format).
interface EventSummary {
  id: number;
  name: string;
  venue: string;
  startsAt: string;
  dropAt: string;
}

export function EventsPage() {
  // Ask the API for the events. TanStack Query remembers the answer and
  // tells us whether it's still loading or failed.
  const events = useQuery({
    queryKey: ['events'],
    queryFn: () => api<EventSummary[]>('/events'),
  });
  const now = useNow();

  if (events.isPending) {
    return <CircularProgress />;
  }
  if (events.isError) {
    const retry = <Button onClick={() => events.refetch()}>Try again</Button>;
    // Only explain when our side collapsed. Otherwise, just offer to retry.
    return serverDown(events.error) ? (
      <Alert severity="error" action={retry}>
        {events.error.message}
      </Alert>
    ) : (
      retry
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h1" sx={{ fontSize: 32 }}>
        Events
      </Typography>
      {events.data.length === 0 && <Typography>No events yet.</Typography>}

      {events.data.map((event) => {
        const msToDrop = new Date(event.dropAt).getTime() - now;
        return (
          <Card key={event.id}>
            <CardActionArea component={Link} to={`/events/${event.id}`}>
              <CardContent>
                <Typography variant="h2" sx={{ fontSize: 22 }}>
                  {event.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  {event.venue} · {formatDateTime(event.startsAt)}
                </Typography>
                {msToDrop > 0 ? (
                  <Chip
                    color="secondary"
                    label={`Tickets go on sale in ${formatCountdown(msToDrop)}`}
                  />
                ) : (
                  <Chip color="primary" label="On sale now" />
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}
    </Stack>
  );
}
