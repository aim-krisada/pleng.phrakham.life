# Brief for G — unified self-contained app-shell navigation (Thai worship-song PWA)

## Context
Vue3 + hash-router PWA. Runs as: installed PWA (display:standalone — NO browser chrome, NO
browser back button), desktop-web, mobile-web. Same app on all three. Currently the header
back is a mobile-style bare "‹" chevron, and a bright amber "v2 รุ่นทดลอง ⇄" pill (a version
switch to a separate build) is jammed into the leading area next to it. We are redesigning the
WHOLE in-app navigation to be self-contained and identical across all three surfaces.

## App navigation hierarchy (verified from source)
- Level 0 — **Catalog / home** `/` (SongList). The app's start destination.
- Level 1 — **Song** `/song/:id` (opens in Studio). Sub-modes (lateral): `view` ฝึกร้อง (default,
  reading; inline pencil ✏️ edit lives here) · `sheet` แผ่นเพลง (print). Deeper action: `edit`
  แก้ไข (full grid editor — mutates the song).
- Siblings via header nav: New-song `/studio`, Guide `/guide`, Notation `/notation`, About `/about`.
- `/list` shared playlist.

## Current problems (DOM-verified on live /v2)
1. On the phone song bar the brand/home is hidden by CSS (`.shell-compact .sb-song .sb-brand{display:none}`);
   the only visible in-app return is the small "‹". Installed PWA has no browser back → "‹" is the
   sole back. The bright amber version-pill sits LEFT of it and is the most prominent element, but it
   jumps to a DIFFERENT app version (v1) → accidental-tap trap + scope confusion (local back vs global
   version-switch adjacent).
2. "‹" is unlabeled and conflates two destinations: from edit→view, from view→catalog. Ambiguous.
3. Desktop shows brand + "‹" + pill clustered = three overlapping leading affordances.
4. No persistent "where am I" indicator without the browser URL bar.

## My proposed model (please VERIFY or REFUTE each, with exact citations + URLs)
A. Adopt **Material "Up" navigation** as a persistent in-app app-bar affordance, present on every
   non-top-level surface, identical on all 3 display modes (never depends on browser chrome). Hidden
   only at the top-level catalog (Android: Up never exits the app / absent at start destination).
B. Make the Up control **labeled with its destination** so it is intentional/elegant on desktop and
   unambiguous everywhere: on a song = `‹ รายการเพลง` + current song title as location; in edit =
   `‹ ดูเพลง` + "แก้ไข" state. (A collapsed 2-item "up + current" rather than a full breadcrumb,
   because NN/g says full breadcrumbs aren't useful for 1–2-level hierarchies.)
C. Keep a distinct **Home** (brand = jump to start) reachable on EVERY surface incl. mobile song bar
   (fix the hide). Home (to start) and Up (one level) are two different, both-valuable intents.
D. Remove version-switch + beta from the nav leading area entirely. Beta = a non-interactive status
   chip by the title; version-switch = an action in the right-side app/overflow menu
   ("ออกจากรุ่นทดลอง → ไปรุ่นปัจจุบัน v1", carrying the same song). M3: leading = navigation only;
   global/secondary actions = trailing/overflow.

## My verified citations (confirm these say what I claim; correct me if not)
- Android Navigation Principles — Up appears in the app bar; "Within your app's task, the Up and Back
  buttons behave identically"; "the Up button does not appear [at start destination], because the Up
  button never exits the app." https://developer.android.com/guide/navigation/principles
- MDN PWA — standalone has no browser back; PWAs must implement their own in-app back navigation.
  https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- M3 top app bar — leading = the one navigation icon; actions/overflow on the right.
  https://m3.material.io/components/app-bars/guidelines
- WAI-ARIA APG Breadcrumb — nav landmark + ordered list + aria-current=page.
  https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/  · NN/g breadcrumbs not for 1–2-level.

## Questions for G (answer each with element/guideline name + URL; if unsure say so — do NOT invent)
1. Is "Up navigation" (labeled, in-app, hidden at start) the correct world-class model for a
   self-contained PWA that cannot use browser back? Any better-fitting documented pattern?
2. For a shallow 2-level hierarchy, is a labeled "Up + current location" better than a full
   breadcrumb? Cite the breadcrumb depth guidance.
3. How do leading content PWAs (name specific ones) render in-app back/up WITHOUT browser chrome on
   desktop so it looks intentional (not a mobile chevron)? Give concrete examples + how.
4. Where exactly should a "you're on the beta/experimental build" indicator + the switch-to-stable
   action live per M3/HIG, so they don't collide with navigation? Cite.
5. Any accessibility must-haves for an in-app back/up on a PWA (focus, aria, target size)? Cite.
