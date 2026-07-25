# DS — /v2 header: beta framing, version switch & back-navigation

Design-only spec. Answers P'Aim's question: the three things on the /v2 top bar
(label **"v2 รุ่นทดลอง"**, switch **⇄**, back **‹**) — is this the best UX, and *what is
`‹` even for?* Proposal for PM gate + P'Aim's go. **No app code touched here.**

---

## 1. What is actually on the bar today (investigated live, not guessed)

Live-verified on `https://pleng.phrakham.life/v2/` (deployed `studio-shell-redesign@00aa719`),
desktop 1280 + phone song-bar state.

| # | Element | Source | What it does | Scope |
|---|---|---|---|---|
| a | Brand **เพลง.พระคำ.ชีวิต** / app icon | `ShellBar.vue` (`.sb-brand`) | `router-link` → `/` (v2 home) | in-app |
| b | Pill **`[v2] รุ่นทดลอง ⇄`** | `VersionSwitch.vue`, mounted at `ShellBar.vue:213` | ONE `<a href="/">` → **v1 root** (carries the same song on shared routes via `SHARED_ROUTES`) | **cross-version (global)** |
| c | **`‹`** back "กลับ" | `Studio.vue:836` teleported into `#shell-title`, handler `goBack()` (`Studio.vue:619`) | edit/sheet mode → view mode; view mode → `router.push('/')` (catalog). Present only when a song is open (`liveSong`). | **in-app, one step (local)** |

So (1) "label" + (2) "⇄" that P'Aim sees are **one fused pill** — a state badge that is
*also* a big button that leaves v2 entirely. (3) `‹` is a separate, unrelated control.

**Why each exists (honest read):**
- **Pill** — while v2 runs beside v1 on the same domain + Supabase DB, a reader who lands
  on /v2 must answer "which am I on?" and "how do I get back?". The badge answers both.
- **`‹`** — added when the mode tab-strip was removed; it is the single return path so the
  full editor / song view is not a one-way surface. **It is the app's back button.**

## 2. 🔴 The risk P'Aim flagged — proven, not assumed

**Is `‹` the only way back on mobile / installed PWA?** → On the phone song bar, **yes, in
practice.**

Proven live: forcing the phone song-bar state (`shell-compact` + `sb-song`) the CSS rule
`:root.shell-compact .shell-bar.sb-song .sb-brand { display:none }` (`styles.css:687`)
**hides the brand**. The remaining left-edge affordances become, left→right:

1. **the amber pill** (x≈14, most prominent) → jumps to **v1** (leaves v2), and
2. the small **`‹`** (x≈88) → the real "back to song list".

An installed PWA in standalone display has **no browser back button**. So on a phone the
*only* obvious in-app return to the catalog is `‹` (the sole fallback is ☰ → รายการเพลง,
a non-obvious 2-tap). **Therefore `‹` must NOT simply be deleted — it is the primary back.**

Worse, the current order is a trap: the biggest, most colourful element (the pill) is the
one a user is most likely to tap to "go back", but it throws them into a *different version*,
while the actual back is the small chevron beside it.

## 3. What world-class does (Material 3 + Apple HIG — verified, not paraphrased)

Consulted G (2 rounds; transcripts in `_evidence/`). G's directional advice matched the
analysis; its citations were then **independently verified** (G's URLs were vague — the
hallucination risk):

- **M3 Top app bar** — the **leading** slot is *the* navigation icon; **actions live on the
  right**, least-used going into the **overflow (⋮)** for "help, settings, and feedback".
  Verified: navigationIcon = *"The primary icon for navigation. Appears on the left"*
  (canonical example = a **back arrow**); actions = *"appear on the right of the app bar."*
  — [M3 app bars](https://m3.material.io/components/app-bars/guidelines) ·
  [Android app-bars](https://developer.android.com/develop/ui/compose/components/app-bars) ·
  [M3 menus](https://m3.material.io/components/menus/guidelines)
- **Apple HIG** — the back button sits at the **leading edge** of the navigation bar and is
  reserved for retracing the hierarchy; don't crowd the nav area with unrelated controls.
  — [HIG Navigation & search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search)
- **Gestalt (proximity/similarity)** — a pill placed next to `‹` reads as *one navigation
  group*, inviting accidental taps; and mixing a **local**-scope control (`‹`) with a
  **global**-scope one (switch versions) side-by-side is a scope-confusion / cognitive-load error.
- **Beta on production, honestly** — persistent, medium-contrast **state badge** next to the
  title (not a bright call-to-action), plus **just-in-time scoped warnings** at the actually-
  broken feature, and a **switch-back** exit kept available (GitHub feature-preview pattern:
  "trade a little UI to set the right expectation"). A pop-up alert to announce beta is
  discouraged (HIG).

## 4. Recommendation — one direction (not a menu)

Split the three roles that are currently mashed together; put each where the standard says.

### 4.1 `‹` back — **KEEP. Leave it as the leading navigation icon.**
It is the M3/HIG-correct leading element and the proven primary back on mobile/PWA. This is
the direct answer to *"what is `‹` for?"* — **it is the back button; on a phone it is the
only visible way back to the list.** (Minor: keep its edit→view→catalog step logic as-is.)

### 4.2 Version switch — **move OFF the leading edge to the right, into overflow (⋮) / menu.**
Change it from an amber pill beside `‹` to a plain menu item on the right:
> **ใช้รุ่นปัจจุบัน (v1)** — เสถียร ใช้บนเวทีได้

Keep the existing "carry me to the same song in v1" behaviour (`SHARED_ROUTES`). On the phone
song bar it joins the ⋮ overflow. This removes the accidental-tap trap, the cross-version
confusion, and the scope clash — exactly where M3 puts secondary/global actions.

### 4.3 Beta signaling — **keep an honest, non-interactive `v2 · เบต้า` badge by the brand/title.**
A small, medium-contrast **state marker** (not a button, doesn't navigate) that stays visible
so "which am I on?" is always answered. It is *separate* from the switch control.

### 4.4 Bug honesty — **just-in-time + one first-run banner.**
- A one-time **dismissible** strip under the header on first entry to /v2:
  *"กำลังลองรุ่นทดลอง v2 — พบปัญหากดสลับกลับรุ่นปัจจุบันได้ตลอด [สลับกลับ v1]"*. After dismiss it
  stays gone; the switch remains in ⋮.
- A small **⚠️ scoped note** at features that genuinely don't work yet (e.g. D.C./D.S. repeat),
  right where a user would rely on them.

### Resulting phone song bar
`‹  [ชื่อเพลง]  … ↗  ⋮`  — one clean navigation icon on the left; version-switch + secondary
actions on the right; the `v2·เบต้า` badge rides with the brand/title, not as a bright button.

## 5. ⚠️ Strategic flag for P'Aim (not ours to decide)

De-emphasising "รุ่นทดลอง" makes the header cleaner, **but v2 still has real bugs** (D.C./D.S.
repeat not working). Bleaching the beta framing to near-invisible while those remain risks a
worship leader treating v2 as stable, hitting a broken repeat **live on stage** ("ต้องชัวร์
100% บนเวที"), and losing trust. **Recommendation: keep honest beta framing** (§4.3–4.4) and
keep the switch-back exit easy to find. **Tone/prominence of the badge and whether to soften
"รุ่นทดลอง" is P'Aim's call** — this spec defaults to honest-but-tidy, not hidden.

---

### Evidence
- Live DOM findings: §1–§2 (measured on the deployed /v2, desktop + forced phone song-bar).
- G transcripts: `docs/ds/_evidence/g-round1.md`, `g-round2.md`
  (also `C:\gl\.aibridge\transcripts\pleng-v2-header-2026-07-25-G-*.md`).
- Standards independently verified via the M3 / Android / HIG URLs cited in §3.
