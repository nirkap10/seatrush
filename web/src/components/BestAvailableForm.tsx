import { Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState, type FormEvent } from 'react';
import type { Zone } from '../types.ts';

export interface BestAvailableRequest {
  count: number;
  zone?: string;
  maxPriceAgorot?: number;
}

// "Find me the best N seats together", with optional zone and price filters.
export function BestAvailableForm(props: {
  zones: Zone[];
  busy: boolean;
  onSubmit: (request: BestAvailableRequest) => void;
}) {
  const [count, setCount] = useState(2);
  const [zone, setZone] = useState(''); // '' means any zone
  const [maxPrice, setMaxPrice] = useState(''); // in shekels, '' means any price

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.onSubmit({
      count,
      zone: zone || undefined,
      maxPriceAgorot: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined,
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
          label="Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          <MenuItem value="">Any zone</MenuItem>
          {props.zones.map((z) => (
            <MenuItem key={z.id} value={z.name}>
              {z.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="number"
          label="Max price per seat (₪)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
        />
        <Button type="submit" variant="contained" disabled={props.busy}>
          {props.busy ? 'Finding seats…' : `Find ${count} seats`}
        </Button>
      </Stack>
    </Paper>
  );
}
