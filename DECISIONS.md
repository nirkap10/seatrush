# SeatRush – Decisions

Draft. The other sections the brief asks for will be added as the project is built.

## Assumptions

Where the brief was silent or unclear, I assumed the following.
The project is still being built, so these describe the plan and may change.

### Identifying fans

- A fan is identified by a username sent in an `X-Username` header, with no password. Anyone can act as any username, which is acceptable because the brief asks for no passwords.
- A username that doesn't exist yet is created automatically.
- The logged-in user is kept per browser window (`sessionStorage`), so two windows of the same browser can be two different fans. Closing a window logs that fan out, and they can log back in with the same username.

### Events and seats

- All rows in an event have the same number of seats, because the brief gives one "seats per row" value.
- Rows run from A to Z, so an event has at most 26 rows.
- An event has two times: when the show starts and when tickets go on sale (the drop).
- Each zone covers one continuous range of rows, such as A to C.
- Zones must cover every row with no overlap, so every seat has exactly one price. Otherwise, the event is rejected.
- Zone names are unique within an event, because the best available filter finds a zone by name.
- An event can be created with a drop time in the past, like the demo event.
- Prices are whole agorot and don't change after an event is created.

### Holds

- A fan can have more than one active hold in the same event, as long as their held and bought seats stay within `MAX_SEATS_PER_USER`. Each hold has its own timer.
- Holding at the exact drop time is allowed, because the brief only blocks holds before it.
- Asking to hold a seat you already hold is rejected, like any other seat that isn't available.
- A hold ends at the exact moment of `expires_at`. Seats are available again immediately, which is stricter than the 5 seconds the brief allows.
- Time checks use the database clock, so every copy of the API agrees on the time.

### Best available

- A request can ask for 1 to 4 seats, the same as a normal hold.
- Asking for more seats than the fan's limit allows is rejected, even if the seats exist.
- The max price filter includes seats priced exactly at that amount.

### Checkout

- Checkout buys all the seats in a hold. A fan who wants fewer seats releases the hold and makes a new one.
- If a hold already has an order, checking out again returns that order to its owner, even after the hold's expiry time.
- A fan who doesn't own the hold is rejected, even if an order already exists.
- A released hold can't be checked out, and a hold that became an order can't be released.

### Screens

- Seats refresh without reloading the page, by polling the server every 2 seconds.
- The screens are in English, like the brief.

### Testing and API

- Your tests find the endpoints through our OpenAPI docs, since the brief lets us design the API.
- The test command requires Docker to be running, for the real PostgreSQL test.
