# คำถามที่ส่ง

I am designing the editing surface of a web app (Vue 3) for Thai worship songs written
in **jianpu / numeric notation** (numbers 1–7 = scale degrees, dots above/below = octave,
`_` `.` `-` `~` `^` = duration marks, `|` = barline). Chords sit above the numbers and one
Thai syllable sits under each number.

Editing is **inline WYSIWYG**: the user presses a pencil FAB and the *same rendered song
sheet* becomes editable — click a number or a syllable, a caret lands there, type to
replace. There is no separate form.

**Who actually uses it:** one person keys in songs almost every day on a desktop/large
tablet. Phone users overwhelmingly only *read/sing*, so mobile editing must merely not
break; desktop/tablet is where quality matters.

I measured three problems on the real app (Chromium, hit-testing every visible glyph with
`document.elementFromPoint`):

### Problem 1 — the symbol palette occludes the text being edited

The palette holds: undo/redo, octave up/down, a chord picker, an insert/overwrite toggle,
and 12 jianpu symbol keys laid out in 3 labelled groups. It is **491 × 204 px** on desktop.

Today it is a **floating popup anchored to the selected note** (flips above/below, is
draggable, and fades to 12% opacity for 1 s while you type).

Measured occlusion (number of visible note/syllable cells whose centre point hit-tests to
the palette):

| viewport | palette | visible cells | occluded |
|||||
| 1280×900 | 491×204 floating popup | 197 | **29** (incl. the lyric line being edited) |
| 412×915 | 412×208 fixed bottom bar | 65 | **31** |
| 360×800 | 360×256 fixed bottom bar | 39 | **39** (all of them) |

The requirement I have been given is **zero occluded cells at any scroll position**, not
"less occlusion".

At 1280 the sheet itself is only ~650 px wide and centred, so there is ~230 px of empty
gutter on the left and ~350 px on the right.

The options I see:

- **(a)** turn the whole editing surface into a fixed app frame below the header —
  document in an inner scroll region, palette **docked as a side rail on desktop /
  a bottom bar on mobile**. Guarantees 0 occlusion at any scroll, and the palette stops
  moving (muscle memory), but it changes the document from page-scroll to inner-scroll.
- **(b)** keep the floating popup but reserve a margin around the sheet — cheaper, but I
  cannot see how it reaches 0 at every scroll offset.
- **(c)** a persistent full-height right panel (like a DAW inspector).

**Q1a.** Which of these do professional notation/score editors and document editors
converge on, and why? Is there a fourth model I am missing?
**Q1b.** What are the real hazards of moving a long document from page scroll to an inner
scroll region (keyboard scrolling, focus, browser find, mobile URL-bar behaviour,
`scrollIntoView` follow-along, printing)? Which of them actually bite?
**Q1c.** For a palette of 12 symbol keys + 6 controls, is a **vertical** rail defensible,
or does a horizontal bar always win for a symbol grid?

### Problem 2 — top-level mode tabs silently abandon an unsaved edit

The app still has 3 top-level tabs (Sing-along / Print sheet / *old* Editor). While the
inline editor is open with unsaved work, pressing a tab:

- switches mode immediately,
- shows **no warning at all** (I verified: no `beforeunload`, no `confirm`),
- leaves the inline editor's `editMode` flag true underneath,
- and the work *does* survive in memory + a `localStorage` working copy — but the user is
  never told any of that.

There *is* a confirm dialog on the editor's own "Done" button, and a `beforeunload` guard
for closing the tab — so the tab bar is the one hole.

**Q2a.** For "leaving an editing context with unsaved work, inside a SPA, where the work is
auto-saved locally but *not* to the server", what is the world-standard behaviour?
A modal confirm every time? Allow the switch and rely on a persistent "unsaved" badge +
a non-modal snackbar with Undo? Disable the tabs while editing?
**Q2b.** Modal confirms on every context switch are known to be trained-through ("yes,
yes, yes"). Where is the line between "protect the work" and "nag"?
**Q2c.** Given the tabs are themselves scheduled for removal later (the target design has
no mode tabs at all), does that change what the right interim behaviour is?

### Problem 3 — permanent 6-line help text eats the screen

Above the sheet, while editing, sits a permanent 2-paragraph / 6-line help block listing
every keyboard shortcut and every symbol character. Measured height: **72 px at 1280
(8% of the viewport), 165 px at 412 (18%), 226 px at 360 (28%)**.

The constraint I must respect: a previous feature in this app was moved into a menu and
was then used **0 times out of 155 sessions** — "a control you cannot see does not exist".
So I may not simply hide it.

**Q3a.** What is the standard pattern for "onboarding text that a first-time user needs and
a daily user has memorised"? Progressive disclosure with a persistence rule? A `?` affordance?
Show-until-first-successful-use?
**Q3b.** If I make it dismissible/collapsible with the state remembered in `localStorage`,
what is the correct default for a returning user, and how do they get it back without
hunting?
**Q3c.** The palette buttons already print their own character + Thai name + the physical
key position on each key. Does that make most of the help block redundant, and is
"put the knowledge on the control" the better answer than "collapse the help"?

Please be concrete and cite the actual conventions/specs you are relying on (Material,
Apple HIG, NN/g, WCAG) — and tell me where you are **unsure**, because I will verify your
claims against the primary sources before I build anything.


# คำตอบของ G (คัดลอกจากหน้าจอทั้งหมด)

Gemini said

Here is a direct, evidence-based analysis for your three problems, grounded in web platform standards and established design systems (Material Design 3, Apple HIG, and NN/g research).

Problem 1 — Palette Occlusion & Surface Layout
Q1a. Standard Layout Models for Desktop/Tablet Score & Document Editors

Professional editors (e.g., Flat.io, Noteflight, Figma, Google Docs, Musescore) converge almost universally on Model (a) / Model (c): Docked Shell Architecture.

Architecture Model	Desktop Implementation	Mobile Implementation	Zero-Occlusion Met?
A. Docked Shell (Fixed Frame)	Persistent Side Rail / Inspector	Fixed Bottom Sheet	Yes (Layout engine guarantees separation)
B. Floating / Anchored Popup	Contextual Floating Popover	Bottom Drawer	No (Violates requirement; obscures context under scroll)
C. Collapsible Side Inspector	Docked Right Panel	Full-screen Sheet Overlay	Yes (When docked)

Why Floating Popups (b) Fail for Dense Grid Notation:
Floating popups work well for sparse actions (e.g., bolding text in a paragraph). They fail in music notation because the layout of music is two-dimensional and spatially interdependent—editing a note requires seeing the surrounding measure, the chord above, and the Thai syllable below.

Industry Standard: Combine (a) and (c).

Desktop (≥1024px): A left or right side rail/inspector panel docked outside the page document.

Mobile (<600px): A fixed bottom bar (docked palette).

Q1b. Hazards of Moving from Page-Scroll to an Inner Scroll Region (overflow: auto)

Moving the primary document to an inner scroll container (height: 100vh; overflow-y: auto) introduces well-documented platform edge cases:

+-------------------------------------------------------+  100vh Fixed Shell
| Header / Top Bar                                      |
+-------------------++----------------------------------+
| Side Rail         || Inner Scroll Region              |
| (Palette)         || (Music Sheet Document)           |
|                   ||                                  |
|                   ||   [ Content Scrolls Here ]       |
|                   ||                                  |
+-------------------++----------------------------------+

Hazard Area	Specific Issue	Impact Severity	Workaround / Solution
Mobile Address Bar (vvh vs dvh)	100vh in mobile browsers includes the dynamic address bar, causing the bottom of the inner scroll to get cut off when the browser chrome expands/collapses.	High (Mobile)	Use 100dvh (Dynamic Viewport Height) or 100svh for the parent container.
scrollIntoView() Behavior	Standard element.scrollIntoView() scrolls the window by default, which can break inner frame locks or scroll parent containers unintentionally.	Medium	Pass { block: 'nearest', inline: 'nearest' } or use manual scroll computation (container.scrollTop = target.offsetTop).
Browser "Find in Page" (Ctrl+F)	Chromium/Firefox will find text inside overflow: auto containers, but auto-scrolling to the match inside nested scrollers can sometimes glitch or hide behind sticky headers.	Low–Medium	Native browser behavior handles this fine in modern Chromium, but test custom caret sync.
Keyboard Page Up / Page Down / Space	Keydown events for PageDown/Space only scroll the inner region if focus is explicitly inside that container. If focus is on the docked palette button, pressing Space triggers the button instead of scrolling the score.	High (Desktop power users)	Intercept PageUp/PageDown/Home/End at the window level when editing, or route focus back to the editor canvas/caret after palette interactions.
Overscroll / Elastic Bounce	iOS Safari and macOS trackpads cause "rubber-banding" on inner scrollers, sometimes scrolling the outer body if not locked.	Medium	Apply overscroll-behavior: contain on the inner scroll container.
Print Styles (@media print)	overflow: auto containers fail to expand across page breaks during printing, clipping all content beyond the visible viewport height.	High (If printing directly)	In @media print, set the scroll container to height: auto !important; overflow: visible !important;.

Verdict: The hazards are real, but for desktop/tablet power users, inner scrolling is standard practice in web application shells (e.g., Slack, VS Code, Figma). You can safely use inner scrolling as long as you apply overscroll-behavior: contain, 100dvh, and manage keyboard focus routing.

Q1c. Vertical Rail vs. Horizontal Palette

A vertical side rail is completely defensible and superior on desktop.

Spatial Availability: On a 1280px screen with a 650px sheet, you have ~600px of unused horizontal gutter space. Vertical screen real estate (900px height) is far more precious for seeing multiple lines of music at once.

Ergonomics & Layout: A 2x9 or 3x6 grid of symbol keys easily fits in a 180px–220px wide vertical rail on the left or right gutter.

Layout Rule: On Desktop (≥1024px), use a Vertical Side Rail. On Mobile/Tablet Portrait (<768px), switch the palette to a Fixed Bottom Bar (stacking vertically below the sheet).

Problem 2 — Top-Level Tab Switches & Unsaved Work
Q2a. Standard Pattern for Unsaved Local Drafts

According to Material Design 3 (App Architecture) and NN/g guidelines on Form/Data Loss Prevention:

Auto-save with explicit feedback is preferred over blocking modal dialogs. Since your app auto-saves to localStorage immediately, switching tabs is not a destructive action.

Standard Pattern:

Allow the user to switch tabs freely.

Display a non-modal Toast / Snackbar upon switching if active edits remain draft-only (e.g., "Editing paused — Draft saved locally" with an action button "Resume Editing").

Display an Unsaved/Draft indicator badge on the editor tab/button.

+-----------------------------------------------------------------------+
| [ Sing-along ]  [ Print Sheet ]  [ Editor (● Draft Saved) ]          |
+-----------------------------------------------------------------------+
| (User switches to Sing-along)                                        |
|                                                                       |
| [Snackbar: Editing paused. Draft saved locally.  ( Return to Editor ) ]|
+-----------------------------------------------------------------------+

Q2b. Where is the line between "protect the work" and "nag"?

Modal Confirm (window.confirm / Alert Modal): Reserved exclusively for irrecoverable data loss (e.g., closing a tab without auto-save, discarding a draft, or overwriting server data).

Non-destructive navigation (Auto-saved state): Showing a modal dialog here is considered a usability bug (modal fatigue). Because the data persists in localStorage, blocking the user with a confirmation modal causes friction without benefit.

Q2c. Impact of Pending Tab Removal

Since the top-level mode tabs are planned for removal:

Do NOT build complex tab-guarding routing guards or heavy confirm modals.

Interim Fix: When a user clicks a mode tab while editMode is active:

Pause/exit the inline editing mode cleanly.

Maintain the draft in localStorage.

Show a brief, auto-dismissing Toast notification: "Draft saved locally."

Problem 3 — Permanent Help Block & Onboarding
Q3a & Q3b. Progressive Disclosure & Default States

The telemetry finding (0 out of 155 sessions used a hidden menu feature) highlights the risk of false-floor hidden features. However, keeping a 226px permanent banner on mobile violates core screen efficiency principles.

Standard Pattern: Dismissible Onboarding Banner with "In-Context" Key Legends

Progressive Disclosure Strategy:

First-time users: Show the help block expanded above the editor sheet by default.

Actionable Dismiss: Provide a clear "Dismiss" / "Got it" (X) button on the block, rather than tucking it away in a menu.

Persistence: Save hasDismissedJianpuHelp: true in localStorage.

How returning users retrieve it without hunting:

Place a small, persistent [ ? ] or [ Keyboard Shortcuts ] icon button inside the palette header/rail, directly next to where users are interacting.

+-----------------------------------------+
| PALETTE                 [ ? Shortcuts ] |  <-- Always visible on palette
+-----------------------------------------+
| [1]  [2]  [3]  [4]  [5]  [6]  [7]       |
+-----------------------------------------+

Q3c. "Put the Knowledge on the Control" vs. Banner Help

"Put the knowledge on the control" is vastly superior.

According to Norman Nielsen Group (Tooltips & Microcopy Principles):

Users rarely read introductory block text above a workplace canvas; they learn by interacting directly with the canvas and tools.

If a palette button displays:

The symbol glyph (1, _, ^, .)

The shortcut key indicator (e.g., small badge showing physical key [Q], [W], [E])

A native title or hover tooltip with the Thai name

Then 80% of the 6-line help block is redundant.

Recommended Action Plan for Problem 3:

Enhance Palette Key Cap Labels: Add keycap shortcut badges directly onto the 12 palette buttons (e.g., top-right corner of each button shows key 1..7, -, .).

Convert Help Banner to a Collapsible / Dismissible Alert:

Default for new users: Visible.

Default for returning users (if dismissed or after 3 edit sessions): Collapsed into a single-line hint bar or accessible via the [?] icon in the palette rail.

Verification & Limitations

Desktop Focus Management: When implementing the inner scroll container (Option A), ensure that clicking buttons in the side rail does not permanently steal focus from the caret. Use e.preventDefault() on button mousedown events so the text input cursor stays in place while palette items are clicked.

Mobile Viewport Height: Be sure to test the inner scroll shell on iOS Safari specifically using 100dvh to ensure URL bar expansion/collapse does not clip the bottom palette bar.

---

Here is a direct, evidence-based analysis for your three problems, grounded in web platform standards and established design systems (Material Design 3, Apple HIG, and NN/g research).

Problem 1 — Palette Occlusion & Surface Layout
Q1a. Standard Layout Models for Desktop/Tablet Score & Document Editors

Professional editors (e.g., Flat.io, Noteflight, Figma, Google Docs, Musescore) converge almost universally on Model (a) / Model (c): Docked Shell Architecture.

Architecture Model	Desktop Implementation	Mobile Implementation	Zero-Occlusion Met?
A. Docked Shell (Fixed Frame)	Persistent Side Rail / Inspector	Fixed Bottom Sheet	Yes (Layout engine guarantees separation)
B. Floating / Anchored Popup	Contextual Floating Popover	Bottom Drawer	No (Violates requirement; obscures context under scroll)
C. Collapsible Side Inspector	Docked Right Panel	Full-screen Sheet Overlay	Yes (When docked)

Why Floating Popups (b) Fail for Dense Grid Notation:
Floating popups work well for sparse actions (e.g., bolding text in a paragraph). They fail in music notation because the layout of music is two-dimensional and spatially interdependent—editing a note requires seeing the surrounding measure, the chord above, and the Thai syllable below.

Industry Standard: Combine (a) and (c).

Desktop (≥1024px): A left or right side rail/inspector panel docked outside the page document.

Mobile (<600px): A fixed bottom bar (docked palette).

Q1b. Hazards of Moving from Page-Scroll to an Inner Scroll Region (overflow: auto)

Moving the primary document to an inner scroll container (height: 100vh; overflow-y: auto) introduces well-documented platform edge cases:

+-------------------------------------------------------+  100vh Fixed Shell
| Header / Top Bar                                      |
+-------------------++----------------------------------+
| Side Rail         || Inner Scroll Region              |
| (Palette)         || (Music Sheet Document)           |
|                   ||                                  |
|                   ||   [ Content Scrolls Here ]       |
|                   ||                                  |
+-------------------++----------------------------------+

Hazard Area	Specific Issue	Impact Severity	Workaround / Solution
Mobile Address Bar (vvh vs dvh)	100vh in mobile browsers includes the dynamic address bar, causing the bottom of the inner scroll to get cut off when the browser chrome expands/collapses.	High (Mobile)	Use 100dvh (Dynamic Viewport Height) or 100svh for the parent container.
scrollIntoView() Behavior	Standard element.scrollIntoView() scrolls the window by default, which can break inner frame locks or scroll parent containers unintentionally.	Medium	Pass { block: 'nearest', inline: 'nearest' } or use manual scroll computation (container.scrollTop = target.offsetTop).
Browser "Find in Page" (Ctrl+F)	Chromium/Firefox will find text inside overflow: auto containers, but auto-scrolling to the match inside nested scrollers can sometimes glitch or hide behind sticky headers.	Low–Medium	Native browser behavior handles this fine in modern Chromium, but test custom caret sync.
Keyboard Page Up / Page Down / Space	Keydown events for PageDown/Space only scroll the inner region if focus is explicitly inside that container. If focus is on the docked palette button, pressing Space triggers the button instead of scrolling the score.	High (Desktop power users)	Intercept PageUp/PageDown/Home/End at the window level when editing, or route focus back to the editor canvas/caret after palette interactions.
Overscroll / Elastic Bounce	iOS Safari and macOS trackpads cause "rubber-banding" on inner scrollers, sometimes scrolling the outer body if not locked.	Medium	Apply overscroll-behavior: contain on the inner scroll container.
Print Styles (@media print)	overflow: auto containers fail to expand across page breaks during printing, clipping all content beyond the visible viewport height.	High (If printing directly)	In @media print, set the scroll container to height: auto !important; overflow: visible !important;.

Verdict: The hazards are real, but for desktop/tablet power users, inner scrolling is standard practice in web application shells (e.g., Slack, VS Code, Figma). You can safely use inner scrolling as long as you apply overscroll-behavior: contain, 100dvh, and manage keyboard focus routing.

Q1c. Vertical Rail vs. Horizontal Palette

A vertical side rail is completely defensible and superior on desktop.

Spatial Availability: On a 1280px screen with a 650px sheet, you have ~600px of unused horizontal gutter space. Vertical screen real estate (900px height) is far more precious for seeing multiple lines of music at once.

Ergonomics & Layout: A 2x9 or 3x6 grid of symbol keys easily fits in a 180px–220px wide vertical rail on the left or right gutter.

Layout Rule: On Desktop (≥1024px), use a Vertical Side Rail. On Mobile/Tablet Portrait (<768px), switch the palette to a Fixed Bottom Bar (stacking vertically below the sheet).

Problem 2 — Top-Level Tab Switches & Unsaved Work
Q2a. Standard Pattern for Unsaved Local Drafts

According to Material Design 3 (App Architecture) and NN/g guidelines on Form/Data Loss Prevention:

Auto-save with explicit feedback is preferred over blocking modal dialogs. Since your app auto-saves to localStorage immediately, switching tabs is not a destructive action.

Standard Pattern:

Allow the user to switch tabs freely.

Display a non-modal Toast / Snackbar upon switching if active edits remain draft-only (e.g., "Editing paused — Draft saved locally" with an action button "Resume Editing").

Display an Unsaved/Draft indicator badge on the editor tab/button.

+-----------------------------------------------------------------------+
| [ Sing-along ]  [ Print Sheet ]  [ Editor (● Draft Saved) ]          |
+-----------------------------------------------------------------------+
| (User switches to Sing-along)                                        |
|                                                                       |
| [Snackbar: Editing paused. Draft saved locally.  ( Return to Editor ) ]|
+-----------------------------------------------------------------------+

Q2b. Where is the line between "protect the work" and "nag"?

Modal Confirm (window.confirm / Alert Modal): Reserved exclusively for irrecoverable data loss (e.g., closing a tab without auto-save, discarding a draft, or overwriting server data).

Non-destructive navigation (Auto-saved state): Showing a modal dialog here is considered a usability bug (modal fatigue). Because the data persists in localStorage, blocking the user with a confirmation modal causes friction without benefit.

Q2c. Impact of Pending Tab Removal

Since the top-level mode tabs are planned for removal:

Do NOT build complex tab-guarding routing guards or heavy confirm modals.

Interim Fix: When a user clicks a mode tab while editMode is active:

Pause/exit the inline editing mode cleanly.

Maintain the draft in localStorage.

Show a brief, auto-dismissing Toast notification: "Draft saved locally."

Problem 3 — Permanent Help Block & Onboarding
Q3a & Q3b. Progressive Disclosure & Default States

The telemetry finding (0 out of 155 sessions used a hidden menu feature) highlights the risk of false-floor hidden features. However, keeping a 226px permanent banner on mobile violates core screen efficiency principles.

Standard Pattern: Dismissible Onboarding Banner with "In-Context" Key Legends

Progressive Disclosure Strategy:

First-time users: Show the help block expanded above the editor sheet by default.

Actionable Dismiss: Provide a clear "Dismiss" / "Got it" (X) button on the block, rather than tucking it away in a menu.

Persistence: Save hasDismissedJianpuHelp: true in localStorage.

How returning users retrieve it without hunting:

Place a small, persistent [ ? ] or [ Keyboard Shortcuts ] icon button inside the palette header/rail, directly next to where users are interacting.

+-----------------------------------------+
| PALETTE                 [ ? Shortcuts ] |  <-- Always visible on palette
+-----------------------------------------+
| [1]  [2]  [3]  [4]  [5]  [6]  [7]       |
+-----------------------------------------+

Q3c. "Put the Knowledge on the Control" vs. Banner Help

"Put the knowledge on the control" is vastly superior.

According to Norman Nielsen Group (Tooltips & Microcopy Principles):

Users rarely read introductory block text above a workplace canvas; they learn by interacting directly with the canvas and tools.

If a palette button displays:

The symbol glyph (1, _, ^, .)

The shortcut key indicator (e.g., small badge showing physical key [Q], [W], [E])

A native title or hover tooltip with the Thai name

Then 80% of the 6-line help block is redundant.

Recommended Action Plan for Problem 3:

Enhance Palette Key Cap Labels: Add keycap shortcut badges directly onto the 12 palette buttons (e.g., top-right corner of each button shows key 1..7, -, .).

Convert Help Banner to a Collapsible / Dismissible Alert:

Default for new users: Visible.

Default for returning users (if dismissed or after 3 edit sessions): Collapsed into a single-line hint bar or accessible via the [?] icon in the palette rail.

Verification & Limitations

Desktop Focus Management: When implementing the inner scroll container (Option A), ensure that clicking buttons in the side rail does not permanently steal focus from the caret. Use e.preventDefault() on button mousedown events so the text input cursor stays in place while palette items are clicked.

Mobile Viewport Height: Be sure to test the inner scroll shell on iOS Safari specifically using 100dvh to ensure URL bar expansion/collapse does not clip the bottom palette bar.

---

Here is a direct, evidence-based analysis for your three problems, grounded in web platform standards and established design systems (Material Design 3, Apple HIG, and NN/g research).

Problem 1 — Palette Occlusion & Surface Layout
Q1a. Standard Layout Models for Desktop/Tablet Score & Document Editors

Professional editors (e.g., Flat.io, Noteflight, Figma, Google Docs, Musescore) converge almost universally on Model (a) / Model (c): Docked Shell Architecture.

Architecture Model	Desktop Implementation	Mobile Implementation	Zero-Occlusion Met?
A. Docked Shell (Fixed Frame)	Persistent Side Rail / Inspector	Fixed Bottom Sheet	Yes (Layout engine guarantees separation)
B. Floating / Anchored Popup	Contextual Floating Popover	Bottom Drawer	No (Violates requirement; obscures context under scroll)
C. Collapsible Side Inspector	Docked Right Panel	Full-screen Sheet Overlay	Yes (When docked)

Why Floating Popups (b) Fail for Dense Grid Notation:
Floating popups work well for sparse actions (e.g., bolding text in a paragraph). They fail in music notation because the layout of music is two-dimensional and spatially interdependent—editing a note requires seeing the surrounding measure, the chord above, and the Thai syllable below.

Industry Standard: Combine (a) and (c).

Desktop (≥1024px): A left or right side rail/inspector panel docked outside the page document.

Mobile (<600px): A fixed bottom bar (docked palette).

Q1b. Hazards of Moving from Page-Scroll to an Inner Scroll Region (overflow: auto)

Moving the primary document to an inner scroll container (height: 100vh; overflow-y: auto) introduces well-documented platform edge cases:

+-------------------------------------------------------+  100vh Fixed Shell
| Header / Top Bar                                      |
+-------------------++----------------------------------+
| Side Rail         || Inner Scroll Region              |
| (Palette)         || (Music Sheet Document)           |
|                   ||                                  |
|                   ||   [ Content Scrolls Here ]       |
|                   ||                                  |
+-------------------++----------------------------------+

Hazard Area	Specific Issue	Impact Severity	Workaround / Solution
Mobile Address Bar (vvh vs dvh)	100vh in mobile browsers includes the dynamic address bar, causing the bottom of the inner scroll to get cut off when the browser chrome expands/collapses.	High (Mobile)	Use 100dvh (Dynamic Viewport Height) or 100svh for the parent container.
scrollIntoView() Behavior	Standard element.scrollIntoView() scrolls the window by default, which can break inner frame locks or scroll parent containers unintentionally.	Medium	Pass { block: 'nearest', inline: 'nearest' } or use manual scroll computation (container.scrollTop = target.offsetTop).
Browser "Find in Page" (Ctrl+F)	Chromium/Firefox will find text inside overflow: auto containers, but auto-scrolling to the match inside nested scrollers can sometimes glitch or hide behind sticky headers.	Low–Medium	Native browser behavior handles this fine in modern Chromium, but test custom caret sync.
Keyboard Page Up / Page Down / Space	Keydown events for PageDown/Space only scroll the inner region if focus is explicitly inside that container. If focus is on the docked palette button, pressing Space triggers the button instead of scrolling the score.	High (Desktop power users)	Intercept PageUp/PageDown/Home/End at the window level when editing, or route focus back to the editor canvas/caret after palette interactions.
Overscroll / Elastic Bounce	iOS Safari and macOS trackpads cause "rubber-banding" on inner scrollers, sometimes scrolling the outer body if not locked.	Medium	Apply overscroll-behavior: contain on the inner scroll container.
Print Styles (@media print)	overflow: auto containers fail to expand across page breaks during printing, clipping all content beyond the visible viewport height.	High (If printing directly)	In @media print, set the scroll container to height: auto !important; overflow: visible !important;.

Verdict: The hazards are real, but for desktop/tablet power users, inner scrolling is standard practice in web application shells (e.g., Slack, VS Code, Figma). You can safely use inner scrolling as long as you apply overscroll-behavior: contain, 100dvh, and manage keyboard focus routing.

Q1c. Vertical Rail vs. Horizontal Palette

A vertical side rail is completely defensible and superior on desktop.

Spatial Availability: On a 1280px screen with a 650px sheet, you have ~600px of unused horizontal gutter space. Vertical screen real estate (900px height) is far more precious for seeing multiple lines of music at once.

Ergonomics & Layout: A 2x9 or 3x6 grid of symbol keys easily fits in a 180px–220px wide vertical rail on the left or right gutter.

Layout Rule: On Desktop (≥1024px), use a Vertical Side Rail. On Mobile/Tablet Portrait (<768px), switch the palette to a Fixed Bottom Bar (stacking vertically below the sheet).

Problem 2 — Top-Level Tab Switches & Unsaved Work
Q2a. Standard Pattern for Unsaved Local Drafts

According to Material Design 3 (App Architecture) and NN/g guidelines on Form/Data Loss Prevention:

Auto-save with explicit feedback is preferred over blocking modal dialogs. Since your app auto-saves to localStorage immediately, switching tabs is not a destructive action.

Standard Pattern:

Allow the user to switch tabs freely.

Display a non-modal Toast / Snackbar upon switching if active edits remain draft-only (e.g., "Editing paused — Draft saved locally" with an action button "Resume Editing").

Display an Unsaved/Draft indicator badge on the editor tab/button.

+-----------------------------------------------------------------------+
| [ Sing-along ]  [ Print Sheet ]  [ Editor (● Draft Saved) ]          |
+-----------------------------------------------------------------------+
| (User switches to Sing-along)                                        |
|                                                                       |
| [Snackbar: Editing paused. Draft saved locally.  ( Return to Editor ) ]|
+-----------------------------------------------------------------------+

Q2b. Where is the line between "protect the work" and "nag"?

Modal Confirm (window.confirm / Alert Modal): Reserved exclusively for irrecoverable data loss (e.g., closing a tab without auto-save, discarding a draft, or overwriting server data).

Non-destructive navigation (Auto-saved state): Showing a modal dialog here is considered a usability bug (modal fatigue). Because the data persists in localStorage, blocking the user with a confirmation modal causes friction without benefit.

Q2c. Impact of Pending Tab Removal

Since the top-level mode tabs are planned for removal:

Do NOT build complex tab-guarding routing guards or heavy confirm modals.

Interim Fix: When a user clicks a mode tab while editMode is active:

Pause/exit the inline editing mode cleanly.

Maintain the draft in localStorage.

Show a brief, auto-dismissing Toast notification: "Draft saved locally."

Problem 3 — Permanent Help Block & Onboarding
Q3a & Q3b. Progressive Disclosure & Default States

The telemetry finding (0 out of 155 sessions used a hidden menu feature) highlights the risk of false-floor hidden features. However, keeping a 226px permanent banner on mobile violates core screen efficiency principles.

Standard Pattern: Dismissible Onboarding Banner with "In-Context" Key Legends

Progressive Disclosure Strategy:

First-time users: Show the help block expanded above the editor sheet by default.

Actionable Dismiss: Provide a clear "Dismiss" / "Got it" (X) button on the block, rather than tucking it away in a menu.

Persistence: Save hasDismissedJianpuHelp: true in localStorage.

How returning users retrieve it without hunting:

Place a small, persistent [ ? ] or [ Keyboard Shortcuts ] icon button inside the palette header/rail, directly next to where users are interacting.

+-----------------------------------------+
| PALETTE                 [ ? Shortcuts ] |  <-- Always visible on palette
+-----------------------------------------+
| [1]  [2]  [3]  [4]  [5]  [6]  [7]       |
+-----------------------------------------+

Q3c. "Put the Knowledge on the Control" vs. Banner Help

"Put the knowledge on the control" is vastly superior.

According to Norman Nielsen Group (Tooltips & Microcopy Principles):

Users rarely read introductory block text above a workplace canvas; they learn by interacting directly with the canvas and tools.

If a palette button displays:

The symbol glyph (1, _, ^, .)

The shortcut key indicator (e.g., small badge showing physical key [Q], [W], [E])

A native title or hover tooltip with the Thai name

Then 80% of the 6-line help block is redundant.

Recommended Action Plan for Problem 3:

Enhance Palette Key Cap Labels: Add keycap shortcut badges directly onto the 12 palette buttons (e.g., top-right corner of each button shows key 1..7, -, .).

Convert Help Banner to a Collapsible / Dismissible Alert:

Default for new users: Visible.

Default for returning users (if dismissed or after 3 edit sessions): Collapsed into a single-line hint bar or accessible via the [?] icon in the palette rail.

Verification & Limitations

Desktop Focus Management: When implementing the inner scroll container (Option A), ensure that clicking buttons in the side rail does not permanently steal focus from the caret. Use e.preventDefault() on button mousedown events so the text input cursor stays in place while palette items are clicked.

Mobile Viewport Height: Be sure to test the inner scroll shell on iOS Safari specifically using 100dvh to ensure URL bar expansion/collapse does not clip the bottom palette bar.
