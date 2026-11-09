# SeatRush

A ticket drop that is fair, fast, and never sells the same seat twice. NestJS API, React web app, PostgreSQL.

## Run it

```
docker compose up --build
```

| What | Where |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:3000 |
| API docs (interactive) | http://localhost:3000/docs |
| OpenAPI JSON | http://localhost:3000/docs-json |

The database, its tables and one demo event that is already on sale are created on start. No manual steps.

To test with a short hold time:

```
HOLD_TTL_SECONDS=20 docker compose up --build
```

## Test it

The tests run against a real PostgreSQL, so start the database first:

```
docker compose up -d db
cd api
npm ci
npm run test:all
```

`test:all` runs the unit tests (best available, seat map) and the API tests against the database: holding seats (all or nothing, the per-fan limit, expiry), best available (including the brief's example), checkout, and 50 fans holding the same seat at once, where exactly one wins.

## Environment variables

All have defaults, so nothing needs to be set. `.env.example` lists them. Docker Compose passes `HOLD_TTL_SECONDS` and `MAX_SEATS_PER_USER` through from your environment.

| Variable | Default | What it does |
|---|---|---|
| `HOLD_TTL_SECONDS` | `300` | How long a hold lasts, in seconds |
| `MAX_SEATS_PER_USER` | `4` | Most seats one fan can hold or buy in one event, held and bought together |
| `DATABASE_URL` | `postgres://seatrush:seatrush@localhost:5432/seatrush` | Where the API finds the database. Inside Docker it's set to the `db` service |
| `PORT` | `3000` | Port the API listens on |

## How fans are identified

- No passwords. A fan is a username, sent in the `X-Username` header with every request that needs one.
- A username is 1 to 30 English letters, numbers, `_` or `-`. Usernames are case-sensitive: `Dana` and `dana` are two fans. A new username is created on first use.
- Anyone can view the events and seat maps without logging in. Holding, checkout and My tickets need a username.
- In the web app, the username is kept per browser window (`sessionStorage`), so two windows can be two different fans. Closing a window logs that fan out. Logging in again with the same username brings back their holds and tickets.

## Extra credit

- **No lone seats:** a hold that would leave one available seat stuck between taken seats, or between a taken seat and the end of the row, is rejected. Best available skips such blocks.

## Known gaps

- The largest concurrency test is 50 requests at once. There's no load test with thousands of fans.
- No automated tests for the screens. They were tested by hand, with two browser windows.
- Ports 5432, 3000 and 5173 must be free on the machine.

More detail: [DECISIONS.md](DECISIONS.md) for the design and assumptions, [AI_LOG.md](AI_LOG.md) for how AI tools were used.
