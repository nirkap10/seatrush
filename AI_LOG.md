# SeatRush – AI Log

## Tools

- **Claude Code** (Claude Opus 5.5), in VS Code's terminal: planning, explaining code and concepts, writing code in small steps, and running the tests.

I reviewed each part, asked about anything I didn't understand, and made the decisions myself. Below are real examples of suggestions I checked, changed or rejected.

## Examples

### Best available: I kept the early stop the AI advised against

**What I proposed:** scan each row from the left, and stop as soon as moving right can only give worse blocks.

**What the AI suggested:** drop the early stop and check every block in the row. Its reasons were that a row has at most 100 seats, so the speed difference is microseconds, and that the stop condition has edge cases that are easy to get slightly wrong.

**What I decided, and why:** I kept the early stop. The distance from a block's middle to the row's middle goes down and then up as the block moves right, so once a block is no closer than the best one found, every later block is worse. It's correct, and it does less work. The AI agreed that the math holds and named the edge cases: only stop once a best exists, use the distance even for blocks that aren't available, and stop on a tie, because the later block has a higher first seat. I covered those with unit tests in `api/src/holds/best-available.spec.ts`.
