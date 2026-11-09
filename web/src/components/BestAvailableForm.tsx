import { Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { formatPrice } from '../money.ts';
import type { Zone } from '../types.ts';

export interface BestAvailableRequest {
  count: number;
  maxPriceAgorot?: number;
}

// "Find me the best N seats together", with an optional max price.
export function BestAvailableForm(props: {
  zones: Zone[];
  busy: boolean;
  onSubmit: (request: BestAvailableRequest) => void;
}) {
  const [count, setCount] = useState(2);
  const [maxPrice, setMaxPrice] = useState(0); // in agorot, 0 means any price

  // Each different price in this event, cheapest first.
  const prices = [...new Set(props.zones.map((z) => z.priceAgorot))].sort(
    (a, b) => a - b,
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.onSubmit({
      count,
      maxPriceAgorot: maxPrice || undefined,
    });
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h2" sx={{ fontSize: 18, mb: 1.5 }}>
        Best available
      </Typography>
      <Stack component="form" spacing={1.5} onSubmit={handleSubmit}>
        <TextField
          select
          size="small"
          label="Seats together"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          {[1, 2, 3, 4].map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Max price per seat"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
        >
          <MenuItem value={0}>Any price</MenuItem>
          {prices.map((price) => (
            <MenuItem key={price} value={price}>
              Up to {formatPrice(price)}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" disabled={props.busy}>
          {props.busy ? 'Finding seats…' : `Find ${count} seats`}
        </Button>
      </Stack>
    </Paper>
  );
}
