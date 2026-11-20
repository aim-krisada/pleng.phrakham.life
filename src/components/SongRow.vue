<script setup>
// ONE song row — พี่เอม 18 พ.ย. 2569: "ถ้าทำที่เดียวกันมันก็จะต้องเปลี่ยนที่เดียวและทุกที่ได้หมด".
// Every list of songs on the home page uses this: the songs in a เล่ม, เพลงที่ชอบ, and a list someone
// sent (ใบ v3/pleng#152 · #153 · #158). Change the row here and all of them change together.
//
// ★ and ✏️ are SIBLINGS of the row link, never inside it (a button inside a link is the nesting
// this list avoids — a screen reader announces both, and a tap would also open the song).
import { useRouter } from 'vue-router'
import FavStar from './FavStar.vue'
import { showVerifiedBadge, showUnverifiedBadge } from '../lib/bookshelf.js'
import { songRefLabels } from '../lib/bookCodes.js'
import { songLangNames } from '../lib/songLangNames.js'
import { WORK_WORDS as W } from '../i18n/workWords.js'
import { noteOpenFrom } from '../lib/analytics.js'

const props = defineProps({
  song: { type: Object, required: true },
  loggedIn: { type: Boolean, default: false },
  // where the song was opened from, for the stats page ('book' | 'fav')
  from: { type: String, default: 'book' },
})

const router = useRouter()
// ✏️ → open this song straight in the editor (no stop at the practice page first)
function openEdit() {
  router.push(`/song/${props.song.id}?mode=edit`)
}
</script>

<template>
  <div class="song-row-wrap has-star">
    <FavStar :id="song.id" :title="song.title_th" class="in-card" />
    <router-link :to="`/song/${song.id}`" class="song-row" @click="noteOpenFrom(from)">
      <span class="no">{{ song.number != null ? song.number : '–' }}</span>
      <span class="ttl">{{ song.title_th }}</span>
      <span v-if="showVerifiedBadge(song, loggedIn)" class="badge ok row-status" :title="W.done">✓ {{ W.done }}</span>
      <span v-else-if="showUnverifiedBadge(song, loggedIn)" class="badge pending row-status" :title="W.unfinished">{{ W.unfinished }}</span>
      <!-- book_refs = reference tag ("เล่มเล็ก 282"). Kept title-first: shown only where
           the row is wide enough (≥640px) so it never crushes the title into a sliver on
           a phone. Full list also lives on the search card + the song page. -->
      <span
        v-if="songRefLabels(song).length"
        class="ref"
        :title="'อ้างอิง: ' + songRefLabels(song).join(' · ')"
      >{{ songRefLabels(song).join(' · ') }}</span>
      <!-- a phone row is narrow: short names there so the title is not squeezed (ui-standards: list row) -->
      <span v-if="songLangNames(song)" class="lang" :aria-label="'ภาษา ' + songLangNames(song)" :title="songLangNames(song)"
        ><span class="lang-full" aria-hidden="true">{{ songLangNames(song) }}</span
        ><span class="lang-short" aria-hidden="true">{{ songLangNames(song, true) }}</span></span>
      <span v-if="song.content && song.content.key" class="key">คีย์ {{ song.content.key }}</span>
    </router-link>
    <!-- เห็นเฉพาะเมื่อล็อกอิน · เปิดเพลงนี้ในหน้าแก้ไขทันที (ไม่ต้องแวะหน้าฝึกร้อง)
         ป้ายชื่อบอกชื่อเพลงด้วย เพราะในรายการมีปุ่มนี้เป็นสิบ ๆ ปุ่มที่หน้าตาเหมือนกัน
         ⛔ ไม่ซ่อนด้วย @media (hover) — เครื่องพี่เอมเป็นจอสัมผัสที่ต่อเมาส์ ปุ่มจะหายไป -->
    <button
      v-if="loggedIn"
      type="button"
      class="row-edit"
      :aria-label="`แก้ไข ${song.title_th}`"
      :title="`แก้ไข ${song.title_th}`"
      @click="openEdit"
    ><span aria-hidden="true">✏️</span></button>
  </div>
</template>

<style>
/* NOT scoped on purpose: the รอตรวจ draft rows on the home page (SongList .draft-pick) reuse
   .song-row so they look the same — one look for every row of songs, defined here only. */
/* ★ sits on the left edge of the row, inside its frame (พี่เอม 5 พ.ย. 2569) — still a sibling of the link */
.song-row-wrap > .in-card { position: absolute; left: 2px; top: 5px; z-index: 1; }
.song-row-wrap > .song-row { padding-left: calc(var(--touch-min) + 2px); }
/* ห่อ "ลิงก์แถว + ปุ่มแก้ไข" ให้เป็นพี่น้องกัน ⛔ ไม่ใช่ปุ่มซ้อนในลิงก์ (โครงที่ผิดกติกา).
   ตัวห่อไม่มีหน้าตาของตัวเอง — กรอบและพื้นยังเป็นของ .song-row เหมือนเดิมทุกประการ */
.song-row-wrap { position: relative; display: flex; align-items: center; gap: var(--sp-2); width: 100%; min-width: 0; }
.song-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  flex: 1 1 auto;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: var(--sp-3) var(--sp-4);
  cursor: pointer;
  color: var(--ink);
  text-decoration: none;
  min-height: var(--touch-min);
}
.song-row:hover { background: var(--cream-hover); }
/* ✏️ เปิดเพลงนี้ในหน้าแก้ไขทันที (ล็อกอินแล้วเท่านั้น).
   กว้าง 44px สูงเท่าแถว — เกินขั้นบังคับ WCAG 2.2 · 2.5.8 (AA = 24px · 44px คือขั้น AAA).
   ⛔ ไม่ซ่อนด้วย @media (hover: hover) — เครื่องพี่เอมเป็นจอสัมผัสที่ต่อเมาส์แล้วรายงานว่า
   hover:none ⇒ ปุ่มจะหายไปทั้งที่มีเมาส์อยู่ (บทเรียนเดิมของโปรเจกต์นี้) */
.row-edit {
  flex: 0 0 auto;
  width: var(--touch-min);
  /* ความสูงคงที่ ⛔ ไม่ยืดตามความสูงแถว — แถวที่ชื่อยาวจะสูงถึง 400px ที่จอ 360px และปุ่มดินสอ
     ที่สูง 400px อ่านไม่ออกว่าเป็นปุ่ม (G ท้วงข้อเดียวกันนี้ไว้รอบก่อน) · วัดจริงแล้วที่ 360px:
     ยืดได้ = สูง 84-400px · ล็อกไว้ = 44px ทุกแถว */
  height: var(--touch-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-base);
  cursor: pointer;
}
.row-edit:hover { background: var(--cream-hover); border-color: var(--brand); }
/* number/key/status hold the FIRST line when a long title wraps (2c) */
.song-row .no,
.song-row .ref,
.song-row .lang,
.song-row .key,
.song-row .row-status { align-self: flex-start; }
.song-row .no {
  min-width: 2.4em;
  text-align: right;
  color: var(--brand);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
}
.song-row .ttl {
  flex: 1 1 auto;
  min-width: 0;
  white-space: normal;      /* was nowrap — show the whole name, wrap instead of clip (2c) */
  overflow-wrap: anywhere;  /* an over-long unbroken token wraps rather than pushing width */
}
/* book_refs reference tag ("เล่มเล็ก 282") — the paper-book number people know. Secondary
   to the title: hidden on phones (would crush the title into a sliver — the ref is on the
   search card + song page there) and shown from 640px up, where the row is wide enough. */
.song-row .ref { display: none; }
.song-row .lang-full { display: none; }
@media (min-width: 640px) {
  .song-row .lang-full { display: inline; }
  .song-row .lang-short { display: none; }
}
@media (min-width: 640px) {
  .song-row .ref {
    display: inline;
    flex: 0 4 auto;
    min-width: 0;
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: var(--fs-xs);
  }
}
.song-row .lang,
.song-row .key {
  color: var(--muted);
  font-size: var(--fs-xs);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1px var(--sp-2);
  white-space: nowrap;
  flex: 0 0 auto;
}
/* ป้ายสถานะในแถวเพลง (ทีมเท่านั้น · v-if loggedIn) — ซ่อนบนจอแคบ แสดงตั้งแต่ 640px ขึ้นไป
   ตามแบบเดียวกับป้ายอ้างอิง .ref ข้างบน ("แสดงเฉพาะที่แถวกว้างพอ").
   ⭐ ทำไมต้องซ่อน — วัดจริงที่จอ 360px เล่มใหญ่ 152 เพลง (ความสูงรวมของรายการ):
      ของเดิมวันนี้ (มีป้าย ไม่มีปุ่ม ✏️)      = 17,744px
      ใส่ปุ่ม ✏️ เข้าไปโดยยังคงป้ายไว้           = 33,381px  (ยาวขึ้นเกือบเท่าตัว ⛔)
      ใส่ปุ่ม ✏️ แล้วซ่อนป้ายบนจอแคบ (แบบนี้)  = 14,922px  (สั้นกว่าของเดิม)
   เหตุ: ปุ่มกินความกว้างแถวไป 52px จาก 336 เหลือ 284 ⇒ ชื่อเพลงตัดบรรทัดถี่ขึ้นมาก.
   ข้อมูลที่หายไปบนจอแคบยังหาได้: เลข "ยังทำไม่เสร็จ N" ต่อเล่มที่หน้าแรก ซึ่งเป็นสิ่งที่
   พี่เปาขอไว้ตรง ๆ (บรรทัด 227) และป้ายกลับมาเองตั้งแต่ 640px ขึ้นไป. */
.song-row .row-status { display: none; }
@media (min-width: 640px) {
  .song-row .row-status { display: inline; flex: 0 0 auto; }
}
/* ป้าย "✓ ตรวจแล้ว" สีเขียว · "ยังทำไม่เสร็จ" สีเทา — ต้องอยู่ที่นี่ ⛔ ไม่ใช่ที่หน้าแรกอย่างเดียว:
   สีของป้ายในหน้าแรกเป็นแบบ scoped จึงไม่ถึงแถวที่ย้ายมาเป็นชิ้นนี้ (ใบ v3/pleng#158, 18 พ.ย. 2569)
   ⇒ ป้ายในแถวขึ้นเป็นตัวดำไม่มีพื้น พี่เปาทัก 20 พ.ย. 2569 ว่าอยากได้สีเขียวเหมือนเดิม.
   สีชุดเดียวกับป้ายบนการ์ดค้นหาในหน้าแรก (.badge.ok / .badge.pending) */
.song-row .badge {
  border-radius: 12px;
  padding: 1px var(--sp-2);
  font-size: var(--fs-xs);
  white-space: nowrap;
}
.song-row .badge.ok { background: #e7f4e9; color: #2e6b3b; border: 1px solid #b7ddbf; }
.song-row .badge.pending { background: #eef0f2; color: #4a4f57; border: 1px solid #cfd4da; }

</style>
