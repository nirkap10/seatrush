import { Container } from '@mui/material';
import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { USERNAME_KEY } from './api.ts';
import { EventPage } from './pages/EventPage.tsx';
import { EventsPage } from './pages/EventsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MyTicketsPage } from './pages/MyTicketsPage.tsx';
import { TopBar } from './TopBar.tsx';

function App() {
  // The logged-in fan, or null. Kept in sessionStorage, so each browser
  // window can be a different fan, and a refresh keeps you logged in.
  const [username, setUsername] = useState(() =>
    sessionStorage.getItem(USERNAME_KEY),
  );
  const navigate = useNavigate();

  function logIn(name: string) {
    sessionStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
  }

  function logOut() {
    sessionStorage.removeItem(USERNAME_KEY);
    setUsername(null);
    navigate('/login');
  }

  return (
    <>
      <TopBar username={username} onLogOut={logOut} />
      <Container sx={{ py: 4 }}>
        {/* Shows the one page whose path matches the address */}
        <Routes>
          <Route path="/" element={<EventsPage />} />
          <Route
            path="/events/:id"
            element={<EventPage username={username} />}
          />
          <Route
            path="/my-tickets"
            element={
              username ? (
                <MyTicketsPage username={username} />
              ) : (
                <Navigate to="/login" state={{ from: '/my-tickets' }} replace />
              )
            }
          />
          <Route path="/login" element={<LoginPage onLogIn={logIn} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
