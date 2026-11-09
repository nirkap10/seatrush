import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { theme } from './theme.ts';

// Keeps the answers from the API, so pages can share and refresh them.
const queryClient = new QueryClient();

// Find the empty <div id="root"> in index.html and draw the app inside it.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Lets every page use TanStack Query (useQuery, useMutation) */}
    <QueryClientProvider client={queryClient}>
      {/* Lets the app show a different page for each address, like /my-tickets */}
      <BrowserRouter>
        {/* Gives every MUI component our font and colors */}
        <ThemeProvider theme={theme}>
          {/* Resets the browser's default styles, and sets the gray background */}
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
