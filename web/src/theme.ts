import { createTheme } from '@mui/material/styles';

// Thing or Two's font and colors, from thingortwo.com and the brief.
export const RED = '#EE1D3A';
export const NAVY = '#090078';

export const theme = createTheme({
  palette: {
    primary: { main: NAVY }, // main buttons, top bar
    secondary: { main: RED }, // titles and highlights
    background: { default: '#F6F7FA' }, // light gray page
  },
  typography: {
    fontFamily: 'Montserrat, Arial, sans-serif',
    h1: { fontWeight: 700, color: RED },
    h2: { fontWeight: 700, color: NAVY },
    button: { textTransform: 'none', fontWeight: 600 }, // "Hold seats", not "HOLD SEATS"
  },
  shape: { borderRadius: 8 },
});
