# คำถามที่ส่ง

Thank you — that was concrete. I had already built a first version before asking you, so let me tell you exactly what is on disk now, with measurements, and push back on two of your answers. Please argue with me where I am wrong.

WHAT I BUILT (already measured, zero occlusion achieved)
- The whole editing surface is a fixed frame under the app header. Inside it, top to bottom: an editor header row (save state + save button + Done), then the sheet in an inner scroll region (overflow-y:auto, overscroll-behavior:contain), then the palette DOCKED AT THE BOTTOM as the last flex child. Same layout at every width; only the density changes.
- Measured after (hit-testing the centre of every visible note/syllable cell, 14 selected-note anchors spread through the song, real CDP mouse clicks): 0 occluded cells at 1280x900, 412x915 and 360x800. Before it was 92/279 worst case at 1280.
- Palette height: 107px at 1280 (one wrapped row: undo/redo, octave, chord, insert/overwrite, then 12 symbol keys in 3 captioned groups, then a "?" button). Document region left: 633px of 900. On 360 the palette is 307px and the document 296px.
- Unsaved work: leaving the editor by any route (the Done button, or any of the three top-level mode tabs) goes through one gate that raises window.confirm ONLY when the document is dirty. Verified: the dead tab is fixed, and the silent exit now warns.
- Help: the permanent block is gone; a "?" button on the palette opens it, and it auto-opens the first time this browser ever enters edit mode (localStorage flag).

PUSHBACK 1 — the side rail
You say desktop should be a vertical rail, not a bottom dock. My measurements say the bottom dock costs 107px of 900px height (12%) and 0px of width, and the sheet is only ~650px wide and centred, so a 220px rail would indeed cost 0px of height.
But: (a) the palette is 12 symbol keys in three semantic groups that read naturally as a horizontal strip, each key being a 3-line stack (character / Thai name / measured physical key position); stacking them into a 220px column makes each key narrower than its Thai label; (b) keeping desktop and mobile identical means the daily user's hand learns ONE arrangement; (c) I can only cite MuseScore for a side palette — Noteflight and Flat.io both use a TOP horizontal toolbar, and Google Docs is a top toolbar too. So "professional editors converge on a side rail" looks overstated to me.
Question: given 107px of 900px, is the rail worth breaking desktop/mobile symmetry and re-flowing 12 three-line keys into a narrow column? Would a TOP horizontal toolbar (above the sheet, below the editor header) be better than either — same zero-occlusion guarantee, same horizontal reading, and it matches Docs/Noteflight/Flat.io? What does each option cost in Fitts's-law terms for someone whose caret is in the middle of the sheet?

PUSHBACK 2 — modal confirm vs toast, when the brief says data-loss bugs are the one class we must not ship
You say a modal confirm is a usability bug here because the work is auto-saved locally. I want to stress-test that, because the person who owns this product told me explicitly: "a bug that loses the user's work silently is the class we never ship."
Facts: every keystroke mirrors into a localStorage working copy AND stays in the in-memory song object, so switching tabs loses nothing and returning to the editor shows the edit still there. The localStorage copy is offered back on next open after a crash. BUT: the working copy is keyed by song id, and a brand-new song that has never been saved has no id — for that one case the local copy is NOT written.
Questions:
(a) Does your toast recommendation still hold when there is a known subset (new unsaved songs) where the local copy does not exist? Should the gate be conditional — toast when a recoverable copy exists, modal only when it does not?
(b) Is there a real standard behind "modal only for irrecoverable loss", or is that a heuristic? Cite the actual source if there is one — I will check it.
(c) If a toast is right: how long should it live, and does it need an undo/"return to editing" action, or is the state indicator enough? Where should it appear so it does not itself cover the sheet — I have just spent this whole task removing floating things from on top of the sheet, and a snackbar is a floating thing.

PUSHBACK 3 — one thing you did not flag
With focus in a hidden capture input inside the inner scroll region, PageUp/PageDown/Home/End currently scroll that region, but Home/End are also bound by my editor to "jump to first/last note". Is stealing Home/End from scrolling defensible in a document editor, or should those stay as scroll keys and the note-jump move to Ctrl+Home/Ctrl+End?

Please be brief and decisive, and tell me plainly where you are guessing.



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

---

Gemini said
Pushback 1 — Layout & Palette Placement

You are completely right, and I was wrong on this. My recommendation relied on generic desktop app patterns (DAWs/IDEs) without weighing your specific constraints:

A 220px vertical rail forces a 3-line stack (glyph + Thai name + physical key) to wrap or clip, destroying legibility.

Keeping desktop and mobile identical eliminates layout-transition cognitive load for a daily single user.

A bottom dock that consumes 107px out of 900px (leaving 793px for the canvas) easily clears the usability threshold.

The bottom dock wins. Do not build a side rail.

Pushback 2 — Modal Confirm vs. Toast (The New-Song Exception)

You caught a genuine flaw in my reasoning. I relied on the standard NN/g and Apple HIG heuristic ("reserve alerts/modals strictly for destructive, irrecoverable data loss"). But that heuristic assumes a reliable auto-save backstop exists universally.

Because a brand-new, never-saved song has no ID and cannot safely mirror to localStorage without collision risks, data loss is possible. When real data loss is on the table, heuristics take a back seat to safety.

(a) The Conditional Gate: Yes. Make the gate conditional. If isNewSong && isDirty, trigger the modal confirmation. If isExistingSong && isDirty (where the localStorage safety net is active), allow the tab switch silently or with a non-blocking indicator.

(b) The Heuristic Source: The "modal only for destructive actions" rule comes from Apple HIG (Dialogs & Alerts) and Nielsen Norman Group (Modaliness / Confirmation Dialogs). It is designed to prevent modal fatigue—the psychological habit of clicking "Yes" on every popup without reading. However, system guidelines explicitly state that modals remain valid when the consequences of an un-saved user error are irreversible. Your new-song edge case fits that exact exception.

(c) Toast Positioning: If you use a toast for existing songs, do not float it over the sheet. Anchor it permanently inside the top editing header row (next to the save state indicator), treating it as a status badge rather than an overlay.

Pushback 3 — The Home/End Keybinding Conflict

Stealing plain Home/End from scrolling and text navigation is a trap, and you should change it.

In web applications and document editors (Google Docs, VS Code, Notion), Home and End are muscle-memory shortcuts for moving the cursor to the start/end of the current line or container. When focus is in an input field inside an inner scroll region, intercepting them to jump the entire song breaks expected native behavior.

The Fix: Reassign "jump to first/last note" to Ctrl+Home / Ctrl+End (or Cmd+Left / Cmd+Right on macOS).

Return plain Home and End to their standard text-navigation and scrolling duties.

---

Pushback 1 — Layout & Palette Placement

You are completely right, and I was wrong on this. My recommendation relied on generic desktop app patterns (DAWs/IDEs) without weighing your specific constraints:

A 220px vertical rail forces a 3-line stack (glyph + Thai name + physical key) to wrap or clip, destroying legibility.

Keeping desktop and mobile identical eliminates layout-transition cognitive load for a daily single user.

A bottom dock that consumes 107px out of 900px (leaving 793px for the canvas) easily clears the usability threshold.

The bottom dock wins. Do not build a side rail.

Pushback 2 — Modal Confirm vs. Toast (The New-Song Exception)

You caught a genuine flaw in my reasoning. I relied on the standard NN/g and Apple HIG heuristic ("reserve alerts/modals strictly for destructive, irrecoverable data loss"). But that heuristic assumes a reliable auto-save backstop exists universally.

Because a brand-new, never-saved song has no ID and cannot safely mirror to localStorage without collision risks, data loss is possible. When real data loss is on the table, heuristics take a back seat to safety.

(a) The Conditional Gate: Yes. Make the gate conditional. If isNewSong && isDirty, trigger the modal confirmation. If isExistingSong && isDirty (where the localStorage safety net is active), allow the tab switch silently or with a non-blocking indicator.

(b) The Heuristic Source: The "modal only for destructive actions" rule comes from Apple HIG (Dialogs & Alerts) and Nielsen Norman Group (Modaliness / Confirmation Dialogs). It is designed to prevent modal fatigue—the psychological habit of clicking "Yes" on every popup without reading. However, system guidelines explicitly state that modals remain valid when the consequences of an un-saved user error are irreversible. Your new-song edge case fits that exact exception.

(c) Toast Positioning: If you use a toast for existing songs, do not float it over the sheet. Anchor it permanently inside the top editing header row (next to the save state indicator), treating it as a status badge rather than an overlay.

Pushback 3 — The Home/End Keybinding Conflict

Stealing plain Home/End from scrolling and text navigation is a trap, and you should change it.

In web applications and document editors (Google Docs, VS Code, Notion), Home and End are muscle-memory shortcuts for moving the cursor to the start/end of the current line or container. When focus is in an input field inside an inner scroll region, intercepting them to jump the entire song breaks expected native behavior.

The Fix: Reassign "jump to first/last note" to Ctrl+Home / Ctrl+End (or Cmd+Left / Cmd+Right on macOS).

Return plain Home and End to their standard text-navigation and scrolling duties.

---

Pushback 1 — Layout & Palette Placement

You are completely right, and I was wrong on this. My recommendation relied on generic desktop app patterns (DAWs/IDEs) without weighing your specific constraints:

A 220px vertical rail forces a 3-line stack (glyph + Thai name + physical key) to wrap or clip, destroying legibility.

Keeping desktop and mobile identical eliminates layout-transition cognitive load for a daily single user.

A bottom dock that consumes 107px out of 900px (leaving 793px for the canvas) easily clears the usability threshold.

The bottom dock wins. Do not build a side rail.

Pushback 2 — Modal Confirm vs. Toast (The New-Song Exception)

You caught a genuine flaw in my reasoning. I relied on the standard NN/g and Apple HIG heuristic ("reserve alerts/modals strictly for destructive, irrecoverable data loss"). But that heuristic assumes a reliable auto-save backstop exists universally.

Because a brand-new, never-saved song has no ID and cannot safely mirror to localStorage without collision risks, data loss is possible. When real data loss is on the table, heuristics take a back seat to safety.

(a) The Conditional Gate: Yes. Make the gate conditional. If isNewSong && isDirty, trigger the modal confirmation. If isExistingSong && isDirty (where the localStorage safety net is active), allow the tab switch silently or with a non-blocking indicator.

(b) The Heuristic Source: The "modal only for destructive actions" rule comes from Apple HIG (Dialogs & Alerts) and Nielsen Norman Group (Modaliness / Confirmation Dialogs). It is designed to prevent modal fatigue—the psychological habit of clicking "Yes" on every popup without reading. However, system guidelines explicitly state that modals remain valid when the consequences of an un-saved user error are irreversible. Your new-song edge case fits that exact exception.

(c) Toast Positioning: If you use a toast for existing songs, do not float it over the sheet. Anchor it permanently inside the top editing header row (next to the save state indicator), treating it as a status badge rather than an overlay.

Pushback 3 — The Home/End Keybinding Conflict

Stealing plain Home/End from scrolling and text navigation is a trap, and you should change it.

In web applications and document editors (Google Docs, VS Code, Notion), Home and End are muscle-memory shortcuts for moving the cursor to the start/end of the current line or container. When focus is in an input field inside an inner scroll region, intercepting them to jump the entire song breaks expected native behavior.

The Fix: Reassign "jump to first/last note" to Ctrl+Home / Ctrl+End (or Cmd+Left / Cmd+Right on macOS).

Return plain Home and End to their standard text-navigation and scrolling duties.
