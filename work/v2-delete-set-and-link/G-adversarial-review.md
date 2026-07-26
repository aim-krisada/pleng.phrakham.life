# G consult — session v2-delete-set-and-link

- when: 2026-07-26 23:30:42
- url: https://gemini.google.com/app/98fb5513a801002e
- attached file: g-payload.md

## Q
Adversarial code review — the full brief and the diff are in the attached file g-payload.md. Follow it exactly: attack the change, cite exact lines, rank by severity, and say plainly if a listed concern is a non-issue.

## A
Here is the adversarial code review attacking the changes in the diff against the specific points raised and general implementation correctness.

1. [High Severity] Unsaved/Newly-Created Lyric Sets Break Share Link Generation Entirely

Location: src/views/Studio.vue, line 69 (shareTarget computed property)

Code attacked:

JavaScript
const setId = lyricSetCount(s.content) ? lyricSetIdAt(s.content, viewSet.value) : ''


Trigger/State:

A user adds a new lyric set in the editor by clicking ＋ เพิ่มชุด.

The new set object is initialized as {} in content.lyricSets (as noted in the brief: "Sets created in the editor start as {} with no id until saved").

Before saving the song to the server, the user clicks the Share button to share the link while viewing this new set (or while viewing set index 0 when lyricSets.length > 1).

Wrong Result:
lyricSetIdAt(s.content, viewSet.value) returns "" because the newly added set does not have an id field yet (mintLyricSetIds has not been called by a save operation). As a result, buildSongUrl generates a clean URL without a ?set= parameter (#/song/123?key=G).
When another user opens this link, route.query.set is empty, so startSet defaults to 0. However, when the song is subsequently loaded from the database, the database version also does not have the unsaved set. But worse: if set 0 was being viewed when unsaved sets existed, or if set 1 was newly added and shared, the link behaves as a set-less link, completely breaking Requirement B ("The share link must ALWAYS carry ?set= when the song has >1 set").

2. [High Severity] Early Return in Key-Handling Watcher Silently Skips ?set= Processing

Location: src/views/Studio.vue, lines 585–599 (Watcher in Studio.vue)

Code attacked:

JavaScript
if (linkSetPending && (s.number != null || (s.title_th || '').trim())) {
  const i = lyricSetIndexById(s.content, linkSetId)
  startSet.value = i
  viewSet.value = i
  ...
  linkSetPending = false
}
if (linkKeyPending && (s.number != null || (s.title_th || '').trim())) {
  ...
  return // <--- Early return skips subsequent code or future reactive executions
}


Trigger/State:
A incoming URL contains both ?set=xyz and ?key=G.
On the initial watch execution (when s satisfies s.number != null ...):

linkSetPending is true. The set block executes and sets linkSetPending = false.

linkKeyPending is true. The key block executes, applies the key, and executes return.

If s.content or liveSong updates in a subsequent tick before the component settles (e.g., async resolution/hydration of s.content), linkSetPending is now false, so the ?set= block is bypassed. More critically, if linkSetPending was initially true but s.content.lyricSets had not loaded yet on the very first execution pass (e.g., partial metadata loaded first), lyricSetIndexById evaluates against an empty/incomplete object, resolves to index 0, sets linkSetPending = false, and freezes the state permanently without waiting for full content resolution.

3. [Medium Severity] linkSetMissing False Positives on Initial Load & Stale Notice on Song Switch

Location: src/views/Studio.vue, lines 594–595 & lines 888–892

Code attacked:

JavaScript
const sets = Array.isArray(s.content?.lyricSets) ? s.content.lyricSets : []
linkSetMissing.value = !sets.some((x) => x?.id === linkSetId)


Trigger/State:

Ordinary songs (0 sets): When a user opens a link like #/song/123?set=deleted_id for a song that currently has no lyricSets array (or lyricSets was collapsed to undefined), sets is []. linkSetMissing.value becomes true. This correctly triggers the banner.

False Positive / Timing Issue: If linkSetId is present in the URL, but the initial reactive trigger of liveSong fires when s is loaded without its full JSONB content payload (or content.lyricSets is still loading/migrating), sets evaluates to []. linkSetMissing.value is set to true prematurely, displaying a false warning banner to the user even though the set exists on the complete payload.

Stale Banner on Route/Song Change: linkSetMissing is a top-level ref(false) in Studio.vue. If the user navigates to another song within the same mounted Studio.vue shell (e.g., via search or sidebar navigation), linkSetMissing is never reset to false anywhere in the route/song change handlers. The missing-set warning banner remains visible at the top of the new song sheet indefinitely until manually closed.

4. [Medium Severity] Accessibility Non-Compliance: Tab Trapping in Confirmation Modal

Location: src/components/SongViewer.vue, lines 320–324 & 2898–2900

Code attacked:

JavaScript
function cycleConfirmFocus() {
  const el = document.activeElement === cancelDelBtn.value ? okDelBtn.value : cancelDelBtn.value
  el?.focus()
}

HTML
<div
  v-if="confirmDelSet >= 0"
  class="lset-confirm-scrim"
  @click.self="cancelDeleteLyricSet"
  @keydown.esc.stop="cancelDeleteLyricSet"
  @keydown.tab.prevent="cycleConfirmFocus"
>


Trigger/State:
The modal is active (confirmDelSet >= 0). The user uses keyboard navigation (Tab or Shift+Tab) or focus lands inside the dialog.

Wrong Result:

Shift+Tab failure: The function cycleConfirmFocus ignores the direction of navigation (e.shiftKey). Tabbing backward from "ยกเลิก" simply toggles focus to "ลบชุดนี้" instead of moving focus appropriately.

Focus drift vulnerability: If focus somehow lands on the modal container (.lset-confirm) or text elements (e.g., via browser reader click or screen-reader virtual cursor), document.activeElement is neither cancelDelBtn.value nor okDelBtn.value. Pressing Tab evaluates document.activeElement === cancelDelBtn.value to false, which forcibly moves focus to cancelDelBtn.value regardless of where the user was trying to navigate.

Lack of focus containment (DOM leak): Because @keydown.tab.prevent is attached to the scrim container, if screen reader virtual focus moves outside the scrim or into an iframe/browser toolbar, native tabbing behavior is interrupted unpredictably. A standard focus trap loop checking for focus within .lset-confirm is required for true WCAG modal compliance.

5. [Low Severity / Non-Issue Verification]

Question 4 (ActiveSet Clamping / Race Condition): NON-ISSUE.
Setting activeSet.value = Math.min(Math.max(0, i - 1), left - 1) synchronously in doDeleteLyricSet immediately beforeVue re-renders the DOM correctly prevents the flash of an out-of-bounds set index. Vue updates reactive dependencies in the same tick. The separate clamp watcher serves as a safe fallback for external content updates.

Question 6 (aria-live Region outside v-if): NON-ISSUE.
Placing <p class="sv-sr-only" aria-live="polite">{{ setMsg }}</p> outside the tab strip container is technically sound and necessary. When deleting down to 1 set, the tab strip unmounts. If the aria-live element were inside the unmounted container, browser DOM nodes for the live region would be destroyed before screen readers could announce setMsg.

Question 7 (Thai i18n Strings): NON-ISSUE.
The Thai strings in th.js use standard church terminology (e.g., "เนื้อร้อง", "ทำนอง", "ชุดเนื้อร้อง"). Phrasing like ลบ “{name}” ? and เนื้อร้องชุดนี้จะหายทั้งหมด · ทำนองยังอยู่ is clear, natural, and accurately communicates destructive consequences to Thai church volunteers.

Summary Table
Rank	Severity	Issue	File
1	High	Unsaved lyric sets produce set-less URLs, violating share requirements	Studio.vue
2	High	Watcher timing / premature clearing of pending set resolution	Studio.vue
3	Medium	linkSetMissing leaks across song transitions & risks initial false positives	Studio.vue
4	Medium	Incomplete focus trap implementation breaking Shift+Tab a11y	SongViewer.vue
