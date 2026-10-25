# Brief — How this video was made

**Logline**: explainer-studio turns code into video by drawing every frame as a web page at an exact time `t`,
and Claude makes films with it by writing scenes, then looking at stills of its own work.

**Audience**: engineers and curious colleagues who have seen the studio's films but have never done video or
animation. No knowledge of rendering assumed.

**The three takeaways**:
1. A video is a flipbook, and each page of it is a web page drawn at time `t` (`seek(t)`).
2. Because a frame depends only on `t`, rendering is "seek, screenshot, repeat", split across browsers, then ffmpeg.
3. Claude works through files you can review, and checks its work by looking at still frames.

**Format**: 1920×1080 · 30 fps · ~80 s · no voiceover · music + SFX

**Tone**: playful, a little self-aware (the film explains itself), still precise.

**Style direction**: the studio's graphite theme like the other films. Diagrams over text. Meta touches: a Droste
title, a frame counter in the corner that is itself computed from `t`, and a contact sheet of this very film.

**Palette**: lime = what works / the right way; blue = the automation (browser, Claude); red = the wrong way
(only on the "move a bit every tick" counter-example).

**Recurring cast**: the **ball** (lime dot: the thing being animated), the **frame card** (rounded rectangle with
a frame number: one picture of the film), the **browser** (window with three dots, blue: Chromium),
**Claude** (blue sparkle badge).

**Out of scope**: library comparisons; real screen recordings.

**Source**: the repo itself — see SOURCE_NOTES.md.
