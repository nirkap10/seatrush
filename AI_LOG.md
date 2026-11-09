# SeatRush – AI Log

## Tools

- **Claude Code** (Claude Opus 5.5): planning, explaining code and concepts, writing code in small steps, and running the tests.

Below are real examples of suggestions I checked, changed or rejected.

## Examples

### Best available: I kept the early stop the AI advised against

**What I proposed:** scan each row from the left, and stop as soon as moving right can only give worse blocks.

**What the AI suggested:** drop the early stop and check every block in the row. Its reasons were that a row has at most 100 seats, so the speed difference is microseconds, and that the stop condition has edge cases that are easy to get slightly wrong.

**What I decided, and why:** I kept the early stop. The distance from a block's middle to the row's middle goes down and then up as the block moves right, so once a block is no closer than the best one found, every later block is worse. It's correct, and it does less work. The AI agreed that the math holds and named the edge cases: only stop once a best exists, use the distance even for blocks that aren't available, and stop on a tie, because the later block has a higher first seat. I covered those with unit tests in `api/src/holds/best-available.spec.ts`.

### The holds index: I questioned it, then kept it

**What the AI suggested:** an index on `holds (event_id, user_id)`, for counting a fan's seats in an event (the per-fan limit).

**What I questioned:** I said `user_id` alone is enough, since a fan rarely has holds in many events, and that the extra column only slows down writes.

**What I decided, and why:** the AI agreed that `user_id` alone would be just as fast here. But it corrected the cost: writes get slower because an index exists at all, not because of a second column in it. So the two-column index costs about the same on writes as a one-column one, and it fits the query exactly. Since it costs nothing extra, I kept it as it was.

### The "server is slow" message: I didn't want to tell fans we have problems

**What the AI suggested:** a note for fans when the server is slow, as part of the brief's "Think about the fans".

**What I questioned:** I wasn't sure it's good to show fans that our server has issues.

**What we did:** the AI agreed that a message like "our server has problems" would be bad, and explained the goal: a fan should never stare at a frozen screen, unsure whether their click worked, which is the brief's opening story. So the note stays, with calm wording that blames no one: "Lots of fans are buying right now. Hang on, we're still working on it." It only appears after a request has taken more than 10 seconds.


### Promo codes: I dropped the feature instead of adding more logic

**What the AI suggested:** the promo codes extra (SAVE10 and WELCOME20), with a text box next to Checkout. The code was sent with the checkout, and the fan only saw the discount after buying.

**What I wanted instead:** an Apply button that shows the new price before checkout, with the old price crossed out.

**What I decided, and why:** the AI explained what that takes: a new endpoint that checks the code without using it up (only the server knows whether a fan already used WELCOME20), and checking the code again at checkout, in case it was used in another window in the meantime. That's a lot more logic for an optional extra. I decided to drop promo codes completely and keep the app simple, and the AI reverted that commit.
