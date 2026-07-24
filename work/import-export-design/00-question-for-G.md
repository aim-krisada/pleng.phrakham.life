# Design consult for Gemini — import/export inside a song editor

You are a senior product designer. Help me pressure-test a design. Answer each numbered
question directly with a recommendation (not a menu), and name the platform pattern or
standard you're leaning on (Material, Apple HIG, WCAG, Google Docs/Sheets, etc.).

## Product in one paragraph
A free Thai worship-song web app (mobile-first, no login required). A song = lyrics +
guitar chords + numeric-notation melody (jianpu / "โน้ตตัวเลข"). There is one screen that
shows a song; a pencil (✏️) turns it into an inline WYSIWYG editor (edit the sheet in
place, like editing a Google Doc). We are folding two existing features — **import** (open
a song JSON file) and **export** (download the song as a JSON file) — into this new inline
editor so they feel native, not bolted on.

## Who uses import/export, and why it matters
- **Everyone can edit** a song (even anonymous visitors). The permission line is only "can
  you SAVE to the central library?" — anonymous users keep their work as their own JSON
  **file** (download); logged-in team members save to the server.
- **Song creators** (several people, not one) keep adding songs from a big printed hymnal
  ("เล่มใหญ่"). Today their loop is: run a local Python tool that reads the hymnal
  DOCX/PDF and emits a song JSON → upload that JSON into the app → fix/verify it in the
  editor → hand it off (email to the team for approval, or the team saves it). So
  **import → edit → export/submit** is a real, repeated production workflow, not a rare action.
- A known hazard: the converter (and older JSON files) sometimes encode **repeat / navigation
  marks** (repeat bars |: :|, 1st/2nd endings, D.C./D.S., Segno/Coda, "back to refrain")
  in a shape the current app doesn't render or play correctly — so an imported song can look
  fine but play back wrong. We just locked ONE canonical data shape for these marks.

## Current state (what exists today, to improve — not to copy if it's below standard)
- Export: a "download JSON" button in the top navbar, plus the editor's Save button doubles
  as "download JSON" for anonymous users, plus a dock "Export" tool that bundles PDF / JSON / MP3.
- Import: an "upload JSON" item in a "manage" menu; it opens the file on-demand and never
  writes to the database; bad files show a friendly Thai reason and don't crash.
- Email-submit: spec'd — download the JSON, then open a pre-filled mailto to the team asking
  them to attach the file (mailto can't auto-attach).
- Menu philosophy: "Google-Docs-clean" — show frequent actions, hide set-once actions in a
  left drawer. Import/export are treated as flat action rows ("📥 download") in a Tools section.

## Design goal
Fold import/export into the inline editor so it's **at least as capable as today and clearly
better**: one coherent "File" story, smooth for the repeated creator loop, safe against the
broken-repeat hazard, WCAG 2.2 AA, and great on a phone.

## Questions (answer each with a clear recommendation + the pattern you cite)
1. **Placement of IMPORT.** Opening a foreign JSON file mid-edit could clobber unsaved work.
   Where should "open a JSON file" live — only at the song-list/library level, only inside the
   editor's menu, or both? How do you protect unsaved edits when a user imports?
2. **Placement of EXPORT.** Is folding "download JSON" into the editor's Save affordance (for
   anonymous users) the right call, or should "download JSON" always be its own explicit item
   separate from Save? How do you keep Save vs Download vs "submit for approval" from confusing
   a first-time creator?
3. **The creator loop (parse → import → edit → export/submit).** The DOCX/PDF parse step is a
   local Python tool using page-geometry (not feasible in the browser). Given that, what is the
   smoothest realistic in-app loop? Should the app accept only JSON, or attempt to accept the
   raw DOCX/PDF too? How would you make the "fix the freshly-imported song, then hand it off"
   path feel like one continuous task?
4. **The broken-repeat hazard on import.** When an imported file has repeat/navigation marks in
   a shape we can't safely map, what's the right behavior — silently auto-normalize, auto-normalize
   **and** show a review summary of what changed / what needs a human, or refuse to open until the
   marks are fixed? How should that review be presented so a non-technical creator understands and
   acts, without a scary wall of errors?
5. **Multiple songs.** Creators add many hymnal songs. Today it's one-file-one-song. Is batch
   import (many songs at once) worth designing for now, or is one-at-a-time with a fast loop
   better for quality control given each imported song needs human verification?
6. **Export payload.** The JSON today carries {number, title, content}. For sharing and for
   email-submit-for-approval, is that enough, or should the exported file also carry key / theme /
   category metadata? Any risk in including more?
7. **Mobile.** On a phone, the file picker + a post-import review + a download all have to work in
   a full-screen drawer. Any mobile-specific pitfalls or patterns we should design around
   (iOS Safari file input quirks, download behavior, drawer vs sheet)?

Keep each answer tight. If you think our framing is wrong on any point, say so.
