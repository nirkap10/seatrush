# SeatRush – Decisions

Draft. The other sections the brief asks for will be added as the project is built.

## Preventing double selling

- Every hold, release and checkout runs in a transaction that first locks the event's row in the `events` table (`SELECT ... FOR UPDATE`). Changes to one event happen one at a time. Different events don't wait for each other.
- All the checks for a hold run inside that lock: the drop time, the seats being available (including expiry), and the per-fan seat limit. That way, nothing can change between the check and the save.
- We chose correct over fast, as the brief asks. Under heavy load, requests for the same event wait in a queue.

**Does it still work with 3 copies of the API?** Yes. The lock is kept by PostgreSQL, not in the API's memory. All 3 copies use the same database, so a request from any copy waits for the lock the same way. Time checks also use the database clock, so the copies agree on when a hold expires.

## Assumptions

Where the brief was silent or unclear, I assumed the following.
The project is still being built, so these describe the plan and may change.

### Identifying fans

- A fan is identified by a username sent in an `X-Username` header, with no password. Anyone can act as any username, which is acceptable because the brief asks for no passwords.
- A username that doesn't exist yet is created automatically.
- Visitors can see the events list and the seat map without logging in. Holding seats, checkout and My tickets ask them to log in first. Confirmed by Harel.
- A username is 1 to 30 English letters, numbers, `_` or `-`, because HTTP headers can only carry plain English characters. Usernames are case-sensitive, so `Dana` and `dana` are two different fans, and spaces aren't allowed. Confirmed by Harel.
- The logged-in user is kept per browser window (`sessionStorage`), so two windows of the same browser can be two different fans. Closing a window logs that fan out, and they can log back in with the same username.

### Events and seats

- All rows in an event have the same number of seats, because the brief gives one "seats per row" value.
- Rows run from A to Z, so an event has at most 26 rows.
- A row has at most 100 seats, so an event has at most 2,600 seats.
- The drop time can't be after the show starts.
- The demo event is created once, the first time the API starts. Starting again doesn't create a second one.
- An event has two times: when the show starts and when tickets go on sale (the drop).
- Each zone covers one continuous range of rows, such as A to C.
- Zones must cover every row with no overlap, so every seat has exactly one price. Otherwise, the event is rejected.
- Zone names are unique within an event, because the best available filter finds a zone by name.
- An event can be created with a drop time in the past, like the demo event.
- Prices are whole agorot and don't change after an event is created.

### Holds

- A fan can have more than one active hold in the same event, as long as their held and bought seats stay within `MAX_SEATS_PER_USER`. Each hold has its own timer. For example, with a limit of 4, a fan holding 3 seats can hold 1 more, but a request for 2 more is rejected as a whole. Confirmed by Harel, and his tests expect it when one fan sends many holds at once.
- Once a hold is released, expires or is checked out, the fan can make a new hold in that event, as long as their held and bought seats stay within `MAX_SEATS_PER_USER`.
- Viewing an event also returns the fan's own active holds in it (hold id, seats and expiry time for each), so a fan who closes the window and logs in again can still see, check out or release their seats.
- Holding at the exact drop time is allowed, because the brief only blocks holds before it.
- Asking to hold a seat you already hold is rejected, like any other seat that isn't available.
- A hold ends at the exact moment of `expires_at`. Seats are available again immediately, which is stricter than the 5 seconds the brief allows.
- Time checks use the database clock, so every copy of the API agrees on the time.

### Best available

- A request can ask for 1 to 4 seats, the same as a normal hold.
- Asking for more seats than the fan's limit allows is rejected, even if the seats exist.
- The max price filter includes seats priced exactly at that amount.
- A zone name that doesn't exist in the event is treated like any filter nothing fits: the request is rejected with "No 2 seats side by side are available for your choice".
- The row's middle is (seats per row + 1) / 2, and a block's middle is its first seat + (N - 1) / 2. Within a row, the search goes left to right and stops once a block is no closer to the middle than the best one found, since every later block is further away.

### No lone seats (extra credit)

- A lone seat is a free seat with a taken seat or the row's end on each side. Price and zone filters don't make a seat "taken": a seat the fan can't afford is still free for someone else.
- A normal hold that would create a new lone seat is rejected, and the message names the seat, for example "That would leave A1 empty on its own".
- Best available skips blocks that would create one. So in the brief's example the answer is C4–C5, not B2–B3.
- A hold across two rows is checked in each row.

### Checkout

- Checkout buys all the seats in a hold. A fan who wants fewer seats releases the hold and makes a new one.
- If a hold already has an order, checking out again returns that order to its owner, even after the hold's expiry time.
- A fan who doesn't own the hold is rejected, even if an order already exists.
- A released hold can't be checked out, and a hold that became an order can't be released.
- An order's total is the sum of its seats' zone prices at checkout, and it's stored on the order, so it stays correct even if something changes later.
- A sold seat keeps its `hold_id` and gets an `order_id`. `order_id` is what makes it sold.
- Checkout answers 200 both the first time and when it returns the existing order.

### Screens

- Seats refresh without reloading the page, by polling the server every 2 seconds.
- The screens are in English, like the brief.

### Testing and API

- Your tests find the endpoints through our OpenAPI docs, since the brief lets us design the API.
- The test command requires Docker to be running, for the real PostgreSQL test.
