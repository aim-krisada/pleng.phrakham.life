# DS — Unified self-contained app-shell navigation

Design-only spec (PM gate + P'Aim's go). **No app code touched.** Supersedes the earlier
"three-button patch" — P'Aim rejected that as incremental. This is one navigation **system**
for the whole app, identical across **installed PWA (standalone) · desktop-web · mobile-web**,
depending on **no browser back/forward or chrome at all**.

Origin question still answered: the label **"v2 รุ่นทดลอง"**, switch **⇄**, and back **‹** are
not tuned individually — they are dissolved into, or moved out of, a single coherent nav model.

---

## 0. Why a system, not a patch (the core requirement)

An installed PWA runs in `display: standalone` — **no address bar, no browser back button**.
MDN is explicit: *a standalone PWA "still effectively runs in a browser window, even if the
usual browser UI elements, such as the address bar or back button, aren't visible"* → **the app
must implement its own in-app back navigation.**
[MDN – Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

So navigation cannot be an afterthought bolted to the header — it must be a first-class,
self-sufficient system that behaves **the same** whether or not any browser chrome exists.

## 1. The app's navigation hierarchy (defined, from source)

```
Level 0  Catalog / Home            /                (SongList) — the START destination
Level 1  Song                      /song/:id        (Studio)
            modes (lateral):  view ฝึกร้อง (default) · sheet แผ่นเพลง
            deeper action:    edit แก้ไข ✏️ (full editor — mutates the song)
Siblings (via app menu):  New song /studio · คู่มือ /guide · ทำเพลง /notation · เกี่ยวกับเรา /about
Aux:  Shared playlist /list
```

"Up / back / home" is now defined **once**, by hierarchy, and works identically everywhere:

| You are at | **Up** goes to | Shown? |
|---|---|---|
| Catalog `/` (start) | — | **No Up** (Up never exits the app) |
| Song · view/sheet | Catalog | Yes |
| Song · edit ✏️ | Song · view | Yes (one level, then Up again → Catalog) |

This is **Material "Up" navigation** — verified: *"The Up button appears in the app bar… Within
your app's task, the Up and Back buttons behave identically"* and *"the Up button does not appear
[at the start destination], because the Up button never exits the app."*
[Android – Principles of navigation](https://developer.android.com/guide/navigation/principles)

Hierarchical Up (not browser-style history arrows) is deliberately chosen: it is **predictable
regardless of how the user arrived** — QR link, shared link, search, deep link all land with a
correct Up target, whereas session-history arrows (à la Spotify's `‹ ›`) would not. Android's Up
even walks a *synthetic* back stack on deep links for exactly this reason (same source).

## 2. The one leading control — a **labeled Up button**

The single navigation affordance in the leading slot, on every non-start surface, identical on
all three surfaces:

- **Icon + destination label:** on a song → **`‹ รายการเพลง`**; in the full editor → **`‹ ดูเพลง`**.
  The label is what makes it *intentional and elegant on desktop* (not a bare mobile chevron —
  the exact complaint) and *unambiguous everywhere* (today's `‹` silently means different things).
- **Self-contained:** it is an in-app control; it renders and works the same with or without
  browser chrome. This is the PWA requirement met (§0).
- **Absent only on the catalog** (start destination — §1).

Desktop intentionality follows M3/HIG: an IconButton at a **48×48** target with a visible hover
state **plus the text label**, living in the app bar's leading area (M3 reserves the leading area
for the single navigation icon; actions go trailing/overflow).
[M3 – Top app bar](https://m3.material.io/components/app-bars/guidelines) ·
[Apple HIG – Navigation & search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search)

**Home is not a second button.** For a 2-level hierarchy, Up from a song lands directly on the
catalog (= home), so a separate Home control is redundant on the narrow mobile/standalone bar and
would overcrowd the leading area (target-spacing / visual-clutter). Rule: **Up-only** where space
is tight; the brand wordmark may remain purely as identity on desktop (where there is room), but
the *primary return* everywhere is the one labeled Up. (This finally justifies today's "brand
hidden on the phone song bar" — but only because Up is now labeled and clearly returns to
รายการเพลง.)

## 3. Where you are — collapsed 2-item "breadcrumb"

The Up label names the **parent**; the current **title** names **where you are**. Together they
are a two-item breadcrumb ("up + current") — the right depth for this hierarchy. Full multi-crumb
breadcrumbs are **not** warranted: they are unhelpful for 1–2-level structures.
[NN/g – Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/) ·
[WAI-ARIA APG – Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)

Edit mode adds a small **`แก้ไข`** state chip after the title, so the deeper level is visible
without a URL bar.

## 4. Version-switch + beta — integrated, out of the nav

These are **environment/build** concerns, not navigation. They leave the leading area entirely.

- **Beta status = a non-interactive tonal badge in the TITLE slot**, next to the app/song title:
  **`v2 · เบต้า`**. It is a status marker, never a button. (M3: *"Badges can be attached to other
  components, such as icons or text, to convey … status."* The title slot may carry inline status;
  the *leading-icon* slot is what is reserved for navigation only — so this does not conflict.)
  [M3 – Badges](https://m3.material.io/components/badges/guidelines)
- **Switch to stable = an action in the right-side app menu / overflow (⋮):**
  **"ออกจากรุ่นทดลอง → ไปรุ่นปัจจุบัน (v1)"**, carrying the same song across (keep today's
  `SHARED_ROUTES` behaviour). M3/HIG put global secondary actions in the trailing/overflow area,
  never in the leading nav slot.

This removes the accidental-tap trap (a bright pill that *looked* like back but left v2 entirely)
and the local-vs-global scope collision, while keeping the safety exit one tap away.

## 5. The three surfaces — one layout, three densities

```
DESKTOP-WEB            [brand เพลง.พระคำ.ชีวิต]   ‹ รายการเพลง · ｢ชื่อเพลง｣ v2·เบต้า        ↗  ⋮
                        home / identity (room)     labeled Up + location + status        actions

MOBILE-WEB             ‹ รายการเพลง   ｢ชื่อเพลง｣ v2·เบต้า                                  ↗ ⋮
& INSTALLED-PWA        labeled Up (primary return; reaches home in 1 press)  status       actions
(standalone)          └ identical control + identical Up targets — no browser chrome relied on
```

- Catalog (start) on every surface: **no Up**; brand/home + search + create + menu, as today.
- Song · edit ✏️: leading becomes **`‹ ดูเพลง`**, title gains the **`แก้ไข`** chip; Up again → catalog.

## 6. Accessibility (must-haves, verified)

- **Target ≥ 48×48 dp** (Material) / **44 pt** (HIG) for the Up control.
  [M3 accessibility](https://m3.material.io/foundations/accessible-design/accessibility-basics)
- **`aria-label` names the destination** — e.g. `aria-label="ย้อนกลับไปรายการเพลง"` — so the label
  isn't only visual. [WAI-ARIA APG – Names & labels](https://www.w3.org/WAI/ARIA/apg/practices/names-and-labels/)
- **Focus management on navigate:** move focus to the new view's `<h1>` / main region so keyboard
  and screen-reader users aren't stranded. [WCAG 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)

## 7. What changes vs today (delta, for the eventual build task)

| Today | New |
|---|---|
| bare `‹` (ambiguous: edit→view OR view→catalog) | **labeled Up** `‹ รายการเพลง` / `‹ ดูเพลง` — destination stated |
| amber pill `v2 รุ่นทดลอง ⇄` in the leading area, jumps to v1 | pill removed; **`v2·เบต้า` status badge** by the title + **switch in ⋮** |
| brand hidden on mobile song bar → home unclear | Up-only on mobile is *intentional* (Up = home in 1 press); brand=identity on desktop |
| no location cue without the URL bar | **up-label + title (+`แก้ไข` chip)** = 2-item breadcrumb |
| relies implicitly on browser back on web | **self-contained Up** — identical in standalone PWA |

## 8. ⚠️ Strategic flag for P'Aim (unchanged — his call)

v2 still has real bugs (e.g. D.C./D.S. repeat not working). Keeping an honest **`v2·เบต้า`** badge
+ an easy switch-to-v1 is deliberate: a worship leader must not mistake v2 for stable and hit a
broken repeat live on stage. **How prominent the beta framing should be is P'Aim's decision;** this
spec defaults to honest-but-integrated, not hidden.

---

### Evidence
- Standards independently verified (exact wording captured) via the Android / MDN / M3 / WAI-ARIA
  / WCAG / NN/g URLs cited inline above.
- G Pro consult (brief attached via `--file`): `docs/ds/_evidence/g-unified-nav-round1.md`,
  `g-unified-nav-round2.md`, brief `g-brief-unified-nav.md`. G confirmed the four load-bearing
  citations and verified proposals A–D (labeled hierarchical Up; Up-only on mobile for a 2-level
  hierarchy; beta badge in the title slot; switch in overflow).
- Live DOM findings (earlier rounds): `g-round1.md`, `g-round2.md`.
