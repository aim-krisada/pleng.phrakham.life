# Report — tablet: rail → drawer + "โครงเพลง" collapsible

Feature branch `tablet-rail-drawer`, based on live round 31 `68b25ca` (main after fermata).
Full-stack in one session (SA+UX+UI+dev). Approved by P'Aim on the wireframe (keep drawer at
340px on tablet — standard mobile-drawer look, no widening). This report is for the **tester
session**.

## Problem
"โครงเพลง" is a fixed **288px** side rail. The old code split at one breakpoint only —
`≤760px` = phone (rail = slide-in drawer), `≥761px` = desktop (rail sticks at 288px). So
**portrait tablets (768–1024) fell into desktop mode**: 288px eats the width and barely any room
is left to write notes.

## What changed (all in `src/components/EditorMode.vue`)

| # | file:line | change |
|---|-----------|--------|
| 1 | `:228` | new `const mainOpen = ref(true)` — "โครงเพลง" collapse state, **default OPEN** (mirrors `melodyOpen` at `:227`, which stays **default closed**). |
| 2 | `:1969` | `isMobileView()` matchMedia threshold `760px → 900px` — decides whether the breadcrumb **opens the drawer** (≤900) or **collapses the side rail** (≥901). |
| 3 | `:4165` | rail-drawer CSS block `@media (max-width: 760px) → (max-width: 900px)` (the block with `.studio-app{display:block}`, `.rail{position:fixed; transform:translateX(-102%)}`, `.rail.open`, `.rail-mhead`, `.rail-backdrop`). Widening the range keeps every ≤760 rule byte-identical, so phone stays diff 0. |
| 4 | `:2598 / :2601 / ~:2651` | wrapped "โครงเพลง" in a collapse toggle: the plain `<div class="rail-group rg-main">` became `<button class="rail-group rg-toggle rg-main" :aria-expanded="mainOpen" @click="mainOpen = !mainOpen">` with a chevron, and the hint + `.srow` list + "เพิ่มท่อน" are wrapped in `<template v-if="mainOpen">`. Reuses the existing `rg-toggle` / `rg-chev` pattern — no new CSS. |

Nothing else touched. The other four `@media (max-width: 760px)` blocks (float, studio-bar,
edhead padding, note-bar wrap — `:3914 / :4013 / :4388 / :4746`) are unrelated to the rail and
left at 760px. `isNarrow()` at `:2154` (floating sheet window) is also left at 760px.

## Breakpoint rationale — **900px** (≤900 = drawer, ≥901 = side rail)
Tuned on real tablet widths: 768 & 834 portrait must become the drawer; 1024 landscape has room
for the 288px rail (1024 − 288 − 16 gap = 720 content), so it keeps the side rail. 900 cleanly
splits the two. The drawer stays capped at `max-width: 340px` (existing phone rule — P'Aim
approved keeping it).

## Verified live (computed DOM at each width, dev server on :5360)
| Width | Mode | rail | `.rail-mhead` | note |
|---|---|---|---|---|
| 360 / 412 phone | DRAWER | fixed, 90% (≤340) | shown | unchanged (was already drawer ≤760) |
| 768 tablet-P | DRAWER | fixed, 340px | shown | **NEW** — was 288px side rail |
| 834 tablet-P | DRAWER | fixed, 340px | shown | **NEW** |
| 1024 tablet-L | SIDE-RAIL | sticky, 288px | hidden | keeps rail |
| 1280 desktop | SIDE-RAIL | sticky, 288px | hidden | unchanged, diff 0 |

The drawer's `translateX` resolves to `none` when open (a transient `-346.8px` seen once was the
0.22s CSS slide animating under a throttled background tab, not a bug).

## Unit tests
Added to `src/components/EditorMode.section-ux.test.js` (jsdom has no layout, so these assert the
JS drawer-vs-collapse decision + collapse state; the CSS breakpoint itself is verified live above):
- **TRD1** — ≤900 (768/834/900): breadcrumb opens the drawer (`.rail.open`), not the desktop collapse.
- **TRD2** — ≥901 (901/1024/1280): breadcrumb collapses the side rail (`.studio-app.rail-hidden`), never a drawer.
- **TRD3** — phone 375: opens the drawer, the ✕ (`.rail-x`) closes it (unchanged path).
- **TRD4** — "โครงเพลง" ▾ toggle present, `aria-expanded="true"` by default, rows render without a click.
- **TRD5** — clicking it collapses (`.srow` → 0) then expands (`.srow` → 2).
- **TRD6** — "ทำนอง (โน้ต)" stays `aria-expanded="false"` (default closed) — different default guard.

Suite: **713 passed**. Build: `vite build` OK. The only failing suite is the **pre-existing**
`notationLint.test.mjs` (`process.exit called with "0"` = lint passed; harness noise) — it fails
identically on base `68b25ca` and its files are untouched.

## TESTER checklist
Dev server (this session): `http://localhost:5360/#/studio` · Network `http://192.168.1.124:5360/#/studio` (`--host --port 5360`).

- [ ] **Tablet 768 & 834:** "โครงเพลง" is NOT a fixed side rail — it is hidden as a drawer; the breadcrumb trigger (panel-left-open icon, top-left of the edit header) is visible; tapping it slides the drawer in; the ✕ / backdrop / selecting a ท่อน closes it. Full width for notes when closed.
- [ ] **Tablet 1024 & Desktop 1280:** the 288px side rail is present (no drawer, no drawer trigger opening a panel — the crumb collapses/expands the rail as before). Diff 0 vs base.
- [ ] **Phone 360 & 412:** unchanged from base — drawer behaves exactly as before (diff 0).
- [ ] **"โครงเพลง" collapse:** a ▾ chevron toggles it; **default OPEN**; collapsing hides the ท่อน list + "เพิ่มท่อน", expanding restores them; works in the desktop rail AND inside the tablet drawer.
- [ ] **"ทำนอง (โน้ต)":** still **default CLOSED** (unchanged).
- [ ] **hover:none safe:** on a touchscreen laptop (Surface reports `hover:none` even with a mouse) the drawer trigger, the drawer close ✕, and the ▾ collapse toggle are all visible — none are gated by `@media(hover)` / pointer-type. (Verify computed `display` on a real Chrome with `hover:none` forced.)
- [ ] **Keyboard:** Tab to the breadcrumb → Enter/Space opens the drawer; Tab to the ✕ → closes it; Tab to the ▾ "โครงเพลง" toggle → Enter/Space collapses/expands. Focus is visible on each.
- [ ] **WCAG target sizes (2.5.8):** the ▾ toggle ≈44px tall; the drawer trigger ≥34px; the ✕ ≥32px.
- [ ] **No regression:** fermata, `DockKey.vue`, and the sheet unchanged (diff limited to `EditorMode.vue` + its test file).

## Guardrails honoured
- ⛔ Did not touch fermata, `DockKey.vue`, or the sheet.
- ⛔ No control gated on `@media(hover)` / pointer-type.
- Phone ≤760 diff 0; desktop side rail diff 0; only the 761–900 tablet band changed.
- Reused the existing drawer + `melodyOpen` pattern — no redesign, no extra features.
