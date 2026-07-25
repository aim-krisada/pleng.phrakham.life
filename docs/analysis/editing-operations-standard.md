# Editing operations to the world standard — note · lyric · bar · line · verse · melody

Design analysis for the pleng inline editor. **Analysis only — no code changed.**

Answers P'Aim's two questions (21 Jul): *how do world-class programs handle
create/update/delete/copy/move/paste of notes, lyrics, bars, lines, verses and melodies,
and do they use a per-note "popup insert" like ours?* Then proposes one operation model on
the existing v2 data model so B1 / B2 / C are just the **input surface** of that model —
not six ad-hoc features.

Reference programs surveyed: **MuseScore 4, Dorico, Finale, Sibelius** (desktop pro);
**Flat.io, Noteflight, Soundslice** (web); **DomiSol, jianpu-ly** (jianpu-native). Sources at
the end.

---

## 0. Why this doc exists — the real blocker

The blocker for P'Pao is **not** "type a number to change a note" (that is one keystroke).
It is the *operation model underneath*: what happens to everything else when you insert,
delete, copy, move or paste — a note, a whole bar, a line, a verse, or a melody. Every
professional editor treats these as **two or three primitives applied uniformly** to every
level of the document. If we build B1 (typing pitches) before locking that model, B1 will be
reworked the moment insert/delete/paste behaviour is decided. So this is the foundation, and
it is worth getting right first.

---

## 1. Direct answers to P'Aim's two questions

**Q1 — How do world-class programs handle these operations?**
They do **not** have a separate feature per operation per entity. Every editor reduces the
whole set to a tiny number of rules that apply the same way to a note, a bar, a range, or a
whole section:

1. **Select, then act.** You select the target (a note, or a range of bars/lines), then type
   or press a command. Typing a pitch onto a selected note *changes* it; there is no "open a
   box to edit this note" step.
2. **Two write-modes: overwrite (default) and insert/ripple (a toggle).** In *overwrite*,
   changing or deleting a note keeps the timeline length fixed (a deleted note becomes a
   rest). In *insert mode*, adding a note pushes everything after it to the right, and
   removing one pulls everything back to the left — the "ripple" P'Aim describes. **This is a
   mode you turn on, not the permanent behaviour.** (Flat.io, MuseScore, Dorico all do this.)
3. **Two deletes.** Plain delete = leave a rest (timeline unchanged). Range-delete
   (Ctrl+Del / "remove selected range") = close the gap and shorten the music. Same two
   operations at note level and at measure level.
4. **Copy / paste is range-based and overwrites the destination**, with an optional
   **selection filter** to copy only certain layers (e.g. lyrics only, notes only).

**Q2 — Do they use a per-note "popup insert" like ours?**
**No — not for the frequent operations.** This is the most important finding for our UI:

- **The high-frequency inputs** (pitch, duration, advance, delete) are **direct**: physical
  keyboard on desktop, and on touch a **persistent input bar docked at the bottom of the
  screen** — never a popup you open and close per note. Soundslice's tablet editor is the
  clearest model: a piano-key bar pinned at the bottom; tap a key → the selected note's pitch
  changes; an **"auto-advance"** toggle moves the cursor on after each entry; a "chord mode"
  toggle adds instead of replaces. No per-note dialog.
- **Popups / popovers are reserved for the rare, hard-to-type symbols** — accidentals, octave
  marks, chord symbols, section labels. Dorico's popovers (Shift+L for lyrics, etc.) appear
  *at* the note but are opened by a keystroke and typed into; they are transient helpers, not
  the main input path.

**Verdict for pleng:** our popup is **correct for the rare symbols (the C spec — chord /
accidental / octave dot / manage), especially on mobile** where the phone keyboard has no
`#` or octave dot. But the **frequent** operations — type 1–7 = pitch, space = advance,
backspace = delete — must be **direct** (real keyboard on desktop; a persistent bottom input
bar on mobile, Soundslice-style), **not** behind a popup. Gating pitch entry behind a popup
would be slower than every reference tool. So: keep the popup for symbols/chords; make
pitch/advance/delete direct.

---

## 2. The two primitives every editor shares (and our v2 equivalents)

| World-standard operation | What it does | pleng v2 primitive (to confirm in `songModel.js`) |
|---|---|---|
| Change note in place (overwrite) | replace pitch/duration, timeline length fixed | `setSyl` / set-note on the slot |
| Insert note (ripple-right) | push subsequent slots right | `pushSlot` |
| Delete → rest (overwrite-delete) | clear the slot, keep the position | set slot empty (no shift) |
| Delete → close gap (ripple-delete) | remove the slot, pull rest left | `pullSlot` |
| Advance cursor | move to next slot (auto-advance) | cursor index++ |

**Ripple is insert-mode, and insert-mode is a toggle.** P'Aim's "ripple เกิดเองเหมือนพิมพ์
ข้อความ" (task.md line 21) is exactly a word-processor: typing in the middle of a word pushes
the rest right, backspace pulls it left. That word-processor feel = **insert mode left ON**.
The world default is overwrite, but for a *lyrics-first songbook* where P'Pao types words and
melody together, **insert/ripple-on by default is the more natural choice** — we just must
still expose overwrite (e.g. to fix one wrong note without shifting the line) and both
deletes. Recommend: **ripple-on by default, with a clear overwrite affordance**, not
ripple-only.

---

## 3. Lyrics — our B2 spec is *already* the world standard (validation)

P'Aim's B2 (task.md line): *"พิมพ์ไทย = แก้คำ + `-` แยกคำข้ามโน้ต + `~`/`_` เอื้อน."* This is
**letter-for-letter the convention in MuseScore, Dorico, Finale and Sibelius** — it is not
something we invented, it is the engraving standard for lyric entry:

- **Space** → advance to the next note, start a new **word**.
- **Hyphen `-`** → advance to the next note and draw a **hyphen** between the two syllables =
  one word split across notes (e.g. "สรร-เส-ริญ").
- **Underscore `_`** → draw a **melisma / extender line**: one syllable held over several
  notes = P'Aim's *เอื้อน*. (Our `~` tie maps to the same held-syllable idea; keep `_` as the
  explicit melisma key to match the standard, and `~` for the sung tie.)
- **Verses (ข้อ)** stack: type `1.` + space before the first syllable for verse 1, `2.` for
  verse 2, etc. DomiSol (jianpu-native) does the same — *"multiple lyric verses stacked under
  one part, so you write all the stanzas, not just verse 1."* This matches v2's design
  (verses/refrains linked to one stanza/melody).

**Implication:** B2 needs no redesign. Implement the four keys (space / `-` / `_` / `~`)
against the existing per-syllable slot model and it will behave exactly like a pro editor.
This is a strong signal our v2 model is aimed correctly.

---

## 4. The input surface — one rule

**High-frequency = direct. Rare = popup.**

- **Desktop:** physical keyboard is the primary surface. Selected note + `1`–`7` = pitch;
  `space` / arrows = move; `backspace` = delete; duration keys; `Ctrl+↑/↓` = octave (as
  Soundslice). Popovers for chord/section on a keystroke.
- **Mobile / touch:** a **persistent bottom input bar** (Soundslice model) carrying the
  number pad 1–7, duration, advance, backspace, and an **auto-advance** toggle. The **popup
  (C spec: note · symbol · manage tabs)** is the *secondary* surface for the rare symbols the
  soft keyboard can't produce (`#`, octave dot, chord, verse label). Never put pitch entry
  only inside the popup.

This keeps us world-class on both platforms (the project's standing requirement) and directly
answers "ใช้ popup insert แบบเราไหม": **partly — popup for rare symbols yes, for pitch/advance
no.**

---

## 5. Operation matrix — CRUD + copy/move/paste × six entities

The whole request ("create update delete copy move paste — โน้ต เนื้อ ห้อง บรรทัด ข้อ ทำนอง")
collapses onto the primitives from §2 applied at six scopes. **Same two write-modes, same two
deletes, at every level.** v2 mapping is provisional — confirm names against
`src/lib/songModel.js` before building.

| Entity | Create | Update | Delete | Copy / Move / Paste |
|---|---|---|---|---|
| **โน้ต note** | type 1–7 at cursor (ripple-on = insert; off = overwrite rest) | select + retype pitch/duration | backspace: ripple-delete (close gap) OR delete→rest | select note(s) → copy → paste overwrites target run; move = ripple-delete + paste |
| **เนื้อ lyric** | type Thai on selected slot | retype syllable; `-`/`_`/`~` change join | backspace clears syllable (word ripples via §3 keys) | copy lyrics-only (selection filter) → paste onto a note run, notes untouched |
| **ห้อง bar** | insert `|` (splits a bar) / append bar | change bar's contents | delete `|` (merge) OR remove-range (drop the bar, close gap) | select bar range → copy → paste overwrites N bars from target; move = remove-range + paste |
| **บรรทัด line** | line-break at cursor (new authored phrase) | edit its notes/lyrics | join to previous line, or remove-range | copy a line (a phrase) → paste as a new line; move = reorder lines within stanza |
| **ข้อ verse** | add verse `2.` stacked on the stanza | edit that verse's words only | remove one verse layer (melody kept) | duplicate a verse as a starting point; paste words from another verse |
| **ทำนอง melody (stanza)** | new stanza (note sequence) | edit the stanza's notes (all verses follow) | delete stanza (and its verses) | **copy a whole stanza + verses** → paste as new song section; move = reorder stanzas |

Two structural rules that fall out of v2 (melody separated from words) and that pros enforce:

1. **Editing the melody (stanza notes) reflows every verse attached to it** — because verses
   are linked to one stanza. This is the payoff of v2 and must hold: fix a note once, all
   verses update. (Confirm `resolveContent` re-expands all linked verses.)
2. **Paste requires valid anchors.** MuseScore: *"valid note or rest anchors are required at
   the destination when pasting lyrics."* So lyric paste must land on an existing note run;
   pasting a melody creates the anchors first. Enforce this or paste silently drops syllables.

---

## 6. How B1 / B2 / C become the input surface of this model

- **B1** = the *note* row of §5 on desktop keyboard + the mobile bottom bar of §4, with
  ripple driven by `pushSlot`/`pullSlot`. It is not a standalone feature; it is "the note
  column of the operation matrix, entered directly."
- **B2** = the *lyric* row of §5, i.e. the four standard keys of §3 (`space` `-` `_` `~`) on
  the per-syllable slots.
- **C** = the *popup* of §4 — the rare-symbol surface (chord / accidental / octave dot /
  section / verse label / manage). The "manage" tab is where the **bar / line / verse /
  stanza** structural operations (insert bar, add verse, copy stanza) live on mobile, since
  they are infrequent and need labels.

So the three already-agreed pieces map cleanly onto one model; no new top-level features.

---

## 7. Recommended build order (stepwise — stop for P'Aim each step)

The order that unblocks P'Pao fastest while respecting "one step, then stop":

1. **Cursor + selection + direct pitch (B1 core, overwrite first).** Select a note, type 1–7
   to change it, space/arrows to move. **No ripple yet** — prove the cursor + WYSIWYG typing
   on real code. → stop, show P'Aim.
2. **Insert/ripple toggle (`pushSlot`/`pullSlot`) + the two deletes.** Turn on the
   word-processor feel; verify ripple-right on insert and ripple-left on close-gap delete, and
   that lyrics ride along. → stop.
3. **Lyric keys (B2): `space` / `-` / `_` / `~`** on the syllable slots (the §3 standard). →
   stop.
4. **Mobile bottom input bar (§4)** + auto-advance toggle, so it works one-handed on a phone.
   → stop.
5. **Popup / C (rare symbols + manage tab)** — chord, accidental, octave dot, and the
   bar/line/verse/stanza structural ops. → stop.
6. **Copy / move / paste (range + selection filter, §5)** across all six scopes. → stop.

**Gaps stay a separate track (per earlier decision "ค"):** D.C./Segno → compact display →
ปุ่มลัด(รับ) → MusicXML export. None of them block steps 1–6; they are display / export, not
editing. Justify (the 4 open questions in `justify-line-standard.md`) is also independent —
it can be answered any time and does not gate the editor.

---

## 8. Open questions for P'Aim (decision-worthy only)

1. **Ripple on by default?** Recommend **yes** (word-processor feel he asked for), with a
   visible overwrite affordance for fixing a single note without shifting the line. OK?
2. **Two deletes** — backspace = close the gap (ripple-left) as the default, with a separate
   "clear to rest" for when he wants to keep the timing. Agree, or should backspace clear to
   rest by default?
3. **Copy/paste scope for launch** — is step 6 (full copy/move/paste of bars/verses/stanzas)
   needed to unblock P'Pao now, or is single-song entry (steps 1–5) enough for this push and
   copy/paste follows? (This decides how much of tonight goes to entry vs. reuse.)

Everything else (the input keys, the lyric convention, the popup-for-symbols split) follows
the world standard and needs no ruling — we implement to the standard.

---

## Sources

- MuseScore — [Entering notes and rests](https://handbook.musescore.org/basics/entering-notes-and-rests), [Editing notes and rests](https://handbook.musescore.org/basics/editing-notes-and-rests), [Using insert mode](https://musescore.org/en/node/326267), [Remove selected range](https://musescore.org/en/node/306950), [Lyrics](https://handbook.musescore.org/text/lyrics), [Copy and paste](https://handbook.musescore.org/basics/copy-and-paste), [Selection Filter](https://musescore.org/en/node/32096).
- Dorico — [Inputting lyrics (Shift+L popover)](https://www.steinberg.help/r/dorico-pro/6.1/en/dorico/topics/write_mode/write_mode_notations_input/write_mode_lyrics_inputting_t.html); [Dorico from A to Z (popovers)](https://www.scoringnotes.com/tips/dorico-from-a-to-z/).
- Flat.io — [Inputting your first notes](https://help.flat.io/en/music-notation-software/inputting-your-first-notes/), [Insert mode](https://help.flat.io/en/music-notation-software/insert-mode/).
- Soundslice — [Note entry](https://www.soundslice.com/help/en/creating/basics/81/note-entry/), [Tablet interface](https://www.soundslice.com/help/en/creating/basics/255/tablet-interface/).
- Noteflight — [Keyboard shortcuts](https://support.noteflight.com/hc/en-us/articles/360020463271-Keyboard-Shortcuts).
- Jianpu-native — [DomiSol: best tools for writing jianpu](https://domisol.app/blog/best-tools-for-writing-jianpu/); [jianpu-ly](https://github.com/ssb22/jianpu-ly).
