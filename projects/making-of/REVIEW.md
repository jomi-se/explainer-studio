# Review — making-of

Scores 1–10: clarity · accuracy · readability · composition · motion · continuity · pacing.

## Pass 2 (2026-10-14), after fixing pass 1

| Scene | cla | acc | rea | com | mot | con | pac | avg | Notes |
|---|---|---|---|---|---|---|---|---|---|
| title | 8 | 9 | 9 | 8 | 9 | 8 | 8 | 8.4 | Droste zoom loops seamlessly (last frame = first) |
| flipbook | 9 | 9 | 8 | 8 | 8 | 9 | 8 | 8.4 | frame total is live from the composition (2,544) |
| browser | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 8.1 | headless = window chrome melts to a dashed outline |
| seek | 9 | 9 | 8 | 8 | 8 | 9 | 8 | 8.4 | ball is drawn on the playhead's scale, so it sits above it |
| render | 8 | 9 | 8 | 7 | 8 | 8 | 8 | 8.0 | real frame ranges per worker (0001–0636 …) |
| motion | 8 | 9 | 8 | 8 | 9 | 8 | 8 | 8.3 | the curve is `spring()` itself; morphs into a wave |
| footage | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 8.1 | real edit list from another film; drawn terminal, random "secret" |
| claude | 8 | 9 | 8 | 7 | 8 | 8 | 8 | 8.0 | contact sheet is a real one of this film (earlier pass) |
| end | 8 | 9 | 8 | 8 | 8 | 9 | 8 | 8.3 | ends on its own last frame number |

Pass 1 fixes: captions held ≥ readTime, flipbook strip inside the safe area, render cards no longer overlap,
footage labels separated and lighter blur, Claude's loop turned so "look" faces the sheet, the frame counter
1-based to match the end card, the counter bows out when the end card shows the last frame.

Known weak spots: the right half of the Claude scene is empty for its first 9 s; render's first beat has
one lane in a big frame.
