# SeatRush – Decisions

## Architecture

**API (NestJS), in `/api/src`:**

- `events`: create an event with its zones and seats, list events, and view one event with every seat's status. Also creates the demo event on start.
- `users`: find or create a fan by username, and read the `X-Username` header.
- `holds`: hold seats, best available, release, the per-fan limit and the no-lone-seats rule.
- `orders`: checkout and My tickets.
- `database/migrations`: the tables, created when the API starts.

**Web app (React + Vite), in `/web/src`:** the pages (Login, Events, Event, My tickets), the seat map and hold components, and `api.ts`, which sends every request with the username and turns errors into readable messages.

**How a hold request flows from the screen to the database:**

1. The fan selects seats and clicks Hold. The button is disabled until the answer arrives, so a double click sends nothing.
2. `api.ts` sends `POST /events/:id/holds` with the seats, and the username in `X-Username`.
3. NestJS checks the body against the DTO rules (1 to 4 seats, labels like B7). The controller finds or creates the fan.
4. The hold service opens a transaction and locks the event's row (`SELECT ... FOR UPDATE`).
5. Inside the lock it checks, in order: the drop time has passed, every seat exists and is available, no lone seat would be left, and the fan stays within `MAX_SEATS_PER_USER` (held + bought + new).
6. It creates the hold, links the seats to it, and commits. The lock is released.
7. The screen shows the hold with a countdown. Other fans see the seats as held at their next poll, within 2 seconds. If a seat was taken, the fan sees "Someone just took B7".

## Schema

```
users    id, username (unique), created_at
events   id, name, venue, starts_at, drop_at, row_count, seats_per_row, created_at
zones    id, event_id, name, from_row, to_row, price_agorot
seats    id, event_id, zone_id, label, row_letter, seat_number, hold_id, order_id
holds    id, event_id, user_id, expires_at, status, created_at
orders   id, hold_id (unique), user_id, event_id, total_agorot, created_at
```

- **One row per seat**, created with the event. A seat is a real thing that can be locked, linked and counted, and the seat map is one simple query.
- **Seat status is not stored.** It's worked out on every request: `order_id` set means sold; a hold that is `active` with `expires_at` in the future means held; otherwise available. So a status can never go stale, and expiry needs no cleanup job.
- **Prices live only in `zones`**, in whole agorot, so there are no rounding errors. The order keeps its own `total_agorot`, so it stays correct later.
- **`holds.status`** is `active`, `released` or `converted` (bought). Expiry is not a status: it's `expires_at` compared with the database clock.
- **The database also guards the rules:** a seat label is unique per event, a hold has at most one order (`orders.hold_id` is unique), statuses and ranges are checked with `CHECK`, and every link is a foreign key.

## Preventing double selling

- Every hold, release and checkout runs in a transaction that first locks the event's row in the `events` table (`SELECT ... FOR UPDATE`). Changes to one event happen one at a time. Different events don't wait for each other.
- All the checks for a hold run inside that lock: the drop time, the seats being available (including expiry), and the per-fan seat limit. That way, nothing can change between the check and the save. The same lock keeps the per-fan limit when one fan sends many holds at once.
- We chose correct over fast, as the brief asks. Under heavy load, requests for the same event wait in a queue.
- A test sends 50 holds for the same seat at once, against a real PostgreSQL, and checks that exactly one wins.

**How expiry works:**

- A hold is held only while `expires_at` is in the future, by the database clock (`now()`). From that exact moment, the seat map shows its seats as available, a new hold can take them, and checkout fails.
- Nothing has to run for this to happen: there's no cleanup job, because every request compares `expires_at` with the time itself.
- An expired hold's seats keep their old `hold_id`. Since that hold is no longer active, the seat counts as available, and a new hold simply replaces the link.

## Stack choices and libraries

- **NestJS (TypeScript):** the brief's own backend, with modules, validation and OpenAPI built in.
- **PostgreSQL 17** (official Docker image), **TypeORM** for the connection, entities and migrations. The locking and seat queries are plain SQL, so exactly what runs is visible.
- **class-validator / class-transformer:** request body rules (DTOs). **@nestjs/swagger:** the docs at `/docs` and `/docs-json`. **@nestjs/config:** the environment variables.
- **React + TypeScript + Vite**, **MUI** for the components, with a custom CSS grid for the seat map. **Montserrat** font (`@fontsource/montserrat`).
- **TanStack Query** for fetching and polling, instead of Redux Toolkit. Almost all of the app's state comes from the server, which is what TanStack Query is built for. The rest is simple enough for `useState`, so Redux would be extra code. The brief leaves this choice open.
- **React Router** for the pages.
- **Vitest + Supertest:** unit tests, and API tests against a real PostgreSQL. NestJS 12 generates Vitest, so we kept it.
- **Docker Compose:** one command starts everything.

## Assumptions

Where the brief was silent or unclear, I assumed the following.

### Identifying fans

- A fan is identified by a username sent in an `X-Username` header, with no password. Anyone can act as any username, which is acceptable because the brief asks for no passwords.
- A username that doesn't exist yet is created automatically.
- Visitors can see the events list and the seat map without logging in. Holding seats, checkout and My tickets ask them to log in first. Confirmed by Harel.
- A username is 1 to 30 English letters, numbers, `_` or `-`, because HTTP headers can only carry plain English characters. Usernames are case-sensitive, so `Dana` and `dana` are two different fans, and spaces aren't allowed. Confirmed by Harel.
- The logged-in user is kept per browser window (`sessionStorage`), so two windows of the same browser can be two different fans. Closing a window logs that fan out, and they can log back in with the same username. Their holds and tickets are kept on the server, so nothing is lost. Confirmed by Harel.

### Events and seats

- Rows run from A to Z, so an event has at most 26 rows.
- A row has at most 100 seats, so an event has at most 2,600 seats.
- Each zone covers one continuous range of rows, such as A to C.
- Zones must cover every row with no overlap, so every seat has exactly one price. Otherwise, the event is rejected.
- Zone names are unique within an event, because the best available filter finds a zone by name.
- An event can be created with a drop time in the past, like the demo event.
- Prices are whole agorot and don't change after an event is created.

### Holds

- A fan can have more than one active hold in the same event, as long as their held and bought seats stay within `MAX_SEATS_PER_USER`. Each hold has its own timer. For example, with a limit of 4, a fan holding 3 seats can hold 1 more, but a request for 2 more is rejected as a whole. Confirmed by Harel, and his tests expect it when one fan sends many holds at once.
- Viewing an event also returns the fan's own active holds in it (hold id, seats and expiry time for each), so a fan who closes the window and logs in again can still see, check out or release their seats.
- Time checks use the database clock, so every copy of the API agrees on the time.

### Best available

- The row's middle is (seats per row + 1) / 2, and a block's middle is its first seat + (N - 1) / 2. Within a row, the search goes left to right and stops once a block is no closer to the middle than the best one found, since every later block is further away.

### Checkout

- Checkout buys all the seats in a hold. A fan who wants fewer seats releases the hold and makes a new one. Confirmed by Harel.

### Screens

- Seats refresh without reloading the page, by polling the server every 2 seconds.
- The best available box on the screen has only a max price filter, as a dropdown of this event's prices. Zones are bands of rows from the stage back, with no side zones, and best available already searches from the row nearest the stage backward. So choosing a max price is enough to pick which rows a fan wants. The API still has the zone filter, as the brief asks.

### Testing and API

- Your tests find the endpoints through our OpenAPI docs, since the brief lets us design the API.

## What I'd still change before a real launch

- A finer lock: lock the fan's row and the rows of seats a hold touches, always in the same order so two holds can't deadlock, instead of the whole event. Holds in different parts of the same event would then stop waiting for each other. The fan's row must stay locked, or one fan's parallel holds could pass the seat limit together.
- Push seat changes to the screens (WebSockets or server-sent events), and send only what changed, instead of every fan downloading the whole seat map every 2 seconds.
- A waiting room in front of the drop, letting fans in at a steady rate.
- Real accounts with passwords or sign-in, and a limit on requests per fan.
- An admin screen and admin login, instead of an open endpoint.
- More arena layouts: rows with different numbers of seats, aisles, and zones that cover part of a row (side zones, balconies) instead of only whole rows. Best available would then also need a zone filter on the screen.
- Clear out old holds and keep a log of every hold, release and order.
- Automated tests for the screens (React Testing Library for components, Playwright for whole flows in a real browser). Today they are tested by hand, with two browser windows.

## Two short answers

**What breaks first if 100,000 fans arrive in the first minute?** The seat map requests. Each fan's page loads the whole seat map (`GET /events/:id`) and asks for it again every 2 seconds, so 100,000 fans means 50,000 or more requests a second, each one needing database queries. Each API copy has only about 10 database connections, so requests pile up, slow down and time out, before most fans even get to click Hold.

**Does your protection still work with 3 copies of the API?** Yes. The lock is kept by PostgreSQL, not in the API's memory. All 3 copies use the same database, so a request from any copy waits for the lock the same way. Time checks also use the database clock, so the copies agree on when a hold expires.
