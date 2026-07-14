# violin-iowa — multi-dynamic solo violin (candidate · B107 P2 quality upgrade)

**Source:** University of Iowa Electronic Music Studios — Musical Instrument Samples (MIS), Violin 2012 set.
<https://theremin.music.uiowa.edu/MIS.html>

**License:** Public Domain — "freely available… may be downloaded and used for any projects, without restrictions" (since 1997). No attribution required; a courtesy credit in About/Guide is planned anyway.

**Why this exists:** the launch violin (`../violin`, VSCO-2 CC0) is a SINGLE dynamic → changing loudness only scales gain, timbre never changes → flat/lifeless. Iowa MIS is recorded at THREE dynamics (pp/mf/ff) — the same idea that made the Grand sing with 5 velocity layers. A soft note = airy/warm; an accented note = brighter with more bow bite.

**Structure:** `{pp,mf,ff}/<midi>.ogg` — 8 anchor pitches × 3 dynamics (24 files, ~644KB).
Pitches (MIDI): 55 (G3) · 60 (C4) · 62 (D4) · 69 (A4) · 72 (C5) · 76 (E5) · 84 (C6) · 96 (C7).
Each = the reliable FIRST note of an Iowa chromatic run (start pitch exact from the filename), sliced,
RMS-normalized to mean −18 dB (even body loudness across notes/layers; the recorded timbre difference
between pp/mf/ff is what carries the dynamic), mono, ogg q5. A pitch-shifting sampler covers the gaps.

**Reproduce / extend:** `tools/slice-iowa-violin.sh`. For production, extend to the full chromatic range
(silence-split each run) and consider the stereo 16/44.1 (150MB) or 24/96 (652MB) sets for more width.

**Status (candidate):** proposed to replace the VSCO-2 violin pending P'Aim's ear (A/B demo:
`docs/spikes/violin-iowa-demo.html`). NOT yet wired into the app. If chosen, dev wires a multi-dynamic
bowed playback path (layer-select by intensity + per-note bow envelope) — see `docs/reports/violin-solo.md`.
