# TESTER verdict — tablet: rail → drawer + "โครงเพลง" collapsible

**Branch** `tablet-rail-drawer` @ `047a7a7` · base round 31 `68b25ca` · dev server `:5360`.
Independent QA session (separate from the dev). Method: real-browser viewport emulation
(Claude Browser pane, CDP-accurate `innerWidth`) + computed DOM + source audit + `vitest`/`vite build`.

## OVERALL: PASS — safe for PM gate → P'Aim → deploy (round 32)

All 9 checklist items PASS. No FAIL, no NEEDS-P'AIM blockers. One design note (item 4) for P'Aim awareness, not a defect.

## Automated
- `npx vitest run` → **713 passed**. Only failing suite = `notationLint.test.mjs` (`process.exit called with "0"` = lint PASSED, harness noise). Confirmed pre-existing: neither the test nor its `src/lib/notation*` inputs are in the diff (`git diff --name-only 68b25ca..HEAD` = 3 files only), so it fails identically to base. PASS-equivalent.
- `npx vite build` → **OK** (built in ~2s).

## Width matrix (real emulated viewport, computed DOM)
| Width | Mode | rail pos/width | `.rail-mhead` | `.ed-crumb` | โครงเพลง aria | ทำนอง aria |
|---|---|---|---|---|---|---|
| 360 | **DRAWER** | fixed / 324 (90%) | visible | visible | true | false |
| 412 | **DRAWER** | fixed / 340 (cap) | visible | visible | true | false |
| 768 | **DRAWER** | fixed / 340 | visible | visible | true | false |
| 834 | **DRAWER** | fixed / 340 | visible | visible | true | false |
| 900 | **DRAWER** | fixed / 340 | visible | visible | true | false |
| 901 | **SIDE-RAIL** | sticky / 288 | hidden | visible | true | false |
| 1024 | **SIDE-RAIL** | sticky / 288 | hidden | visible | true | false |
| 1280 | **SIDE-RAIL** | sticky / 288 | hidden | visible | true | false |

## Per-item
1. **Tablet = drawer (768 & 834):** PASS. `position:fixed`, width 340, off-screen when closed (`translateX(-102%)`); drawer header + ✕ visible; crumb opens it — with transitions disabled the open target resolves to `transform:none, left:0` (fully on-screen). *(The transient `-346.8px` the dev flagged is confirmed the frozen 0.22s slide of the pane's backgrounded tab, `visibilityState:"hidden"` — not a bug; it snaps to `none` once the transition is removed.)*
2. **Wide = side rail (1024 & 1280):** PASS. `position:sticky`, width 288, `.rail-mhead` hidden, no drawer. Crumb collapses the rail (base behavior), does not open a drawer.
3. **Breakpoint = 900:** PASS. 900 → DRAWER (`matchMedia(max-width:900)`=true, fixed 340). 901 → SIDE-RAIL (=false, sticky 288). Clean split, CSS and `isMobileView()` agree.
4. **Phone diff-0 (360 & 412):** PASS. Still DRAWER, `≤760` rules active (`mm760`=true), rail/drawer/backdrop mechanics unchanged (the `≤760` CSS is byte-identical; only the media max-width widened 760→900, and ≤760 is a subset). **Note for P'Aim:** the "โครงเพลง" collapse ▾ is a *global* addition (mirrors `melodyOpen`) so phone users also get the new chevron/button — intended, but phone is not literally pixel-identical (header div → button). Rail behavior is diff-0.
5. **"โครงเพลง" collapsible, DEFAULT OPEN:** PASS. `aria-expanded="true"` at every width; clicking ▾ collapses (rows→0, "เพิ่มท่อน"+hint hidden) and re-expands (rows→1, controls restored). Verified inside the tablet drawer (768) and the desktop rail.
6. **"ทำนอง (โน้ต)" DEFAULT CLOSED:** PASS. `aria-expanded="false"` at every width — unchanged.
7. **hover:none safe:** PASS. Grep confirms EditorMode.vue has **no `@media(pointer:…)`** query at all, and the only `@media(hover:none)` blocks *increase* visibility (`.rail-del{opacity:1}`, touch-min sizing) — none hide the trigger/✕/▾. All three controls have computed `display` = flex/inline-flex/block and pass an `elementFromPoint` hit-test (nothing obscures them) at the tested widths. No control's display is gated on hover/pointer.
8. **Keyboard + visible focus:** PASS. `.ed-crumb`, `.rail-x`, `.rg-toggle.rg-main` are all native `<button>` (focusable, tabIndex 0, not disabled) → Enter/Space activation is a browser platform guarantee. On focus each shows a **2px solid brand (rgb(139,69,19)) outline** — visible indicator; no `outline:none` reset targets them. *(Did not synthesize untrusted key events; relied on the native-button guarantee + measured focus ring.)*
9. **No regression:** PASS. `git diff --name-only 68b25ca..HEAD` = exactly `EditorMode.vue` + `EditorMode.section-ux.test.js` + this report's sibling doc. **`DockKey.vue`, the sheet render, and fermata are untouched.** EditorMode diff = only the 4 documented hunks (`mainOpen` ref, `isMobileView` 760→900, `@media` 760→900, "โครงเพลง" wrapped in collapse toggle). Test diff is purely additive (TRD1–TRD6; only the import line changed to add `vi`).

## WCAG target sizes (2.5.8)
▾ toggle 44px · crumb 40px (≥34) · ✕ 32px at tablet (bumped to 44 touch-min at ≤760). Meets the stated targets.

## Verdict
Ship-ready. Recommend PM gate → P'Aim preview → deploy as round 32.
