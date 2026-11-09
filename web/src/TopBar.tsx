import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { NAVY, RED } from './theme.ts';

export function TopBar(props: {
  username: string | null;
  onSwitchUser: () => void;
}) {
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'white' }}>
      <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Typography
          variant="h5"
          component={Link}
          to="/"
          sx={{ fontWeight: 700, color: NAVY, textDecoration: 'none' }}
        >
          SeatRush
        </Typography>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button component={Link} to="/">
            Events
          </Button>
          <Button component={Link} to="/my-tickets">
            My tickets
          </Button>
          {props.username ? (
            <>
              <Typography sx={{ color: NAVY, fontWeight: 600, px: 1 }}>
                {props.username}
              </Typography>
              <Button variant="outlined" onClick={props.onSwitchUser}>
                Switch user
              </Button>
            </>
          ) : (
            <Button variant="contained" component={Link} to="/login">
              Log in
            </Button>
          )}
        </Stack>
      </Toolbar>
      {/* The red-to-navy line from the brief */}
      <Box
        sx={{ height: 4, background: `linear-gradient(90deg, ${RED}, ${NAVY})` }}
      />
    </AppBar>
  );
}
