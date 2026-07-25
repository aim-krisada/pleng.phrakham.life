# ปรึกษา G — 3 จุดเจ็บประจำวันในหน้าแก้เพลง (24 ก.ค. 2569)

ชื่อแชต Gemini: `pleng-editor-daily-pain-2026-07-24`

Transcript เต็ม (คำถามที่ส่ง + คำตอบเต็ม) อยู่ท้ายไฟล์นี้.

---

## คำถามที่ส่ง (รอบ 1)

> (ภาษาอังกฤษ — ส่งตามนี้ทุกตัวอักษร)

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
|---|---|---|---|
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

---

## คำตอบ G (รอบ 1)

_(รอ)_
