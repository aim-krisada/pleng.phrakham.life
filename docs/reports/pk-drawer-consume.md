# Report — pleng consumes the shared `pk-drawer` core (option ก)

**Branch:** `claude/peaceful-clarke-c4f54a` (forked from `studio-shell-redesign`)
**Dispatch:** `task_b512fd83` — mobile ☰ menu = phrakham's drawer (left slide + cream + scrim), refine not redesign.

## Objective
Make pleng's mobile ☰ menu identical to phrakham's by **consuming the ONE shared vanilla
drawer core** (edit-once, like `pk-scrollnav.js`) instead of pleng's own right-side `.sb-drawer`.

## What changed
- **`src/lib/pk-drawer.js`** — vendored **verbatim** from phrakham `main:assets/pk-drawer.js`
  (`61542cd`, the left/live SSOT — NOT `feat/pk-drawer-right`). 311 lines, no framework dep.
- **`src/main.js`** — `import './lib/pk-drawer.js'` (registers `window.PKDrawer`), beside pk-scrollnav.
- **`src/components/ShellBar.vue`**
  - `onMounted` → `PKDrawer.create({ side:'left', trigger: ☰, panel, label:'เมนู', scrim:true, onOpen, onClose })`;
    `onUnmounted` → `drawer.destroy()` (leak/HMR safe).
  - The ☰ button no longer has a Vue `@click`/`:aria-expanded` — the core wires the click and
    syncs `aria-expanded`. Open state is bridged onto the shared one-at-a-time `shellMenu` channel
    (key `'site'`) via `onOpen`/`onClose` + a `watch` (another menu opening closes the drawer).
  - The old right-side `<aside v-if="shellMenu==='site'">` became an **always-rendered**
    `<aside ref="drawerPanel" class="sb-drawer-panel">` — the core needs a stable node to
    lift onto `<body>`, slide, and focus-trap. Its content (nav + เครื่องมือ) is unchanged.
  - A `matchMedia('(min-width:992px)')` guard closes the drawer if the viewport crosses to desktop
    while open (guarded for jsdom, which lacks `matchMedia`).
- **`src/styles.css`**
  - Added `--pk-ink`/`--pk-border` token aliases so the core's CSS skins to pleng's warm palette
    (cream panel, brown accent) — matching phrakham.
  - Removed the old `.sb-drawer` shell CSS + `@keyframes sb-drawer-in` + the desktop `display:none`
    guard (the core owns positioning/slide/scrim/× now). Kept `.sb-drawer-nav/-sep/-lbl/-tools/-font*`
    (they style the panel *content*). Added `.sb-drawer-panel` padding with a top offset that clears
    the core's × button (mirrors phrakham `#pk-drawer-content`).
- **Backdrop scope fix (regression prevented):** the shared `.sb-backdrop` was `v-if="shellMenu"`
  (every key). Since the drawer now has the core's own scrim, it became
  `v-if="shellMenu && shellMenu !== 'site'"` — still covers the ⚙ font popover AND **Studio's
  teleported menus** (`'song'`/`'manage'`…), which rely on it for outside-click-close.
- **Tests updated:** `ShellBar.test.js` (drawer test now asserts the core opens the panel with
  `.is-open` + syncs aria-expanded + sets `shellMenu='site'`) and `ShellBar.font.test.js` (font
  queries scoped to `.sb-settings`, since the drawer's copy of the control is now always in the DOM).
- **`.claude/launch.json`** — added a `pkd` config serving this worktree on port 5454 `--host`.

## Verification (real browser, port 5454 · LAN `http://192.168.1.124:5454/`)
- **AC1 (open):** panel lands at `left:0`, `translateX(0)`, cream `rgb(250,246,240)`, full height
  (top 0 → bottom = viewport), scrim `rgba(45,42,38,.5)` opacity 1, nav + เครื่องมือ present. ✔
- **AC2 (a11y + Vue content):** Esc closes + restores focus to ☰; scrim-click closes + restores;
  focus trapped in panel; background `inert`. Vue content interactive inside the moved/trapped
  panel — font toggle → `data-font=looped`; nav link → navigates + closes the drawer. ✔
- **AC3 (desktop ≥992):** inline nav shows all 4 links, ☰ hidden, panel off-canvas hidden, login +
  Studio teleport targets (`#shell-left`/`#shell-menus`) present, no regress. Studio "จัดการ" menu
  opens → backdrop renders → backdrop-click closes it (regression check). ✔
- **AC4:** no horizontal scroll at 360 (panel 310px) or 412 (panel 354px); console clean;
  **627/627 unit tests green**; production build passes. ✔

### ⚠️ Verification caveat (not a bug)
The preview tab runs with `document.visibilityState === 'hidden'`, which **freezes CSS transitions**
(the core's own comments note rAF is throttled to never in a headless/backgrounded tab). So the
`.28s` slide never visually progresses in the preview — computed transform stays at the pre-slide
value. I confirmed the **end geometry** is correct by neutralizing the transition (`transition:none`
+ reflow): open → `translateX(0)` at `left:0`; closed (fresh load) → `translateX(-100%)`,
`visibility:hidden`, off-screen. On a real foregrounded phone the slide animates normally.
**พี่เปา device verify still recommended** for the actual slide feel.

## Left for PM
- **⛔ Not merged / not deployed** (per rules — PM gate + tester + P'Aim go).
- Tester: run against the full drawer AC (this report + brief).
- พี่เปา: real-device check of the left-slide animation feel on a phone.
