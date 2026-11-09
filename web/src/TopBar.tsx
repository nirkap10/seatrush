import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import userLogo from './assets/user-logo.png';
import { NAVY, RED } from './theme.ts';

export function TopBar(props: {
  username: string | null;
  onLogOut: () => void;
}) {
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'white' }}>
      {/* Three equal parts: name on the left, links in the middle, user on the right */}
      <Toolbar sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 2 }}>
        <Typography
          variant="h5"
          component={Link}
          to="/"
          sx={{ fontWeight: 700, color: NAVY, textDecoration: 'none' }}
        >
          SeatRush
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/">
            Events
          </Button>
          <Button component={Link} to="/my-tickets">
            My tickets
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
        >
          {props.username ? (
            <>
              <img src={userLogo} alt="" width={28} height={28} />
              <Typography sx={{ color: NAVY, fontWeight: 600, pr: 1 }}>
                {props.username}
              </Typography>
              <Button variant="outlined" onClick={props.onLogOut}>
                Log out
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
