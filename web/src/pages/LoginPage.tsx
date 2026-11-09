import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.ts';

export function LoginPage(props: { onLogIn: (username: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  // The page that sent the fan here, so we can go back after logging in.
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    setSending(true);
    setError(null);
    try {
      const user = await api<{ username: string }>('/users/login', {
        method: 'POST',
        body: { username: name.trim() },
      });
      props.onLogIn(user.username);
      navigate(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  return (
    <Paper sx={{ maxWidth: 420, mx: 'auto', p: 4 }}>
      <Typography variant="h1" sx={{ fontSize: 28, mb: 1 }}>
        Who's watching?
      </Typography>
      <Typography sx={{ mb: 3 }}>
        Pick a username. No password needed. Open another window to be a
        different fan.
      </Typography>
      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField
          label="Username"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="1 to 30 English letters, numbers, _ or -"
          autoFocus
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={sending || name.trim() === ''}
        >
          {sending ? 'Logging in…' : 'Log in'}
        </Button>
      </Stack>
    </Paper>
  );
}
