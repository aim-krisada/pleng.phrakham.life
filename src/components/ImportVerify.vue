<script setup>
// S10 — Import & Verify workspace (IA §2/§6 · HIG "modes for distinct tasks"). Batch task
// context, a different mental model than editing one song. Three helper groups:
//   1. คัดของเข้า (triage): queue · provenance · reject-whole · dedup/merge
//   2. ชี้จุดต้องดู (guided verify): diff vs source · risk flags + "jump to next risk" · confidence sort
//   3. ยืนยัน+ไหลต่อ (bulk flow): mark-verified · progress · resume · skip · mass-approve guardrail
// It does NOT build new edit tools — it reuses S5 (inline edit) + S4 (listen) per song.
//
// MOCKUP SCOPE: layout only. Queue/diff/flags are mock data; the real parser wiring +
// verify actions are step 4. Carries over to build as-is.
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const emit = defineEmits(['open-editor', 'close'])

// mock import queue (v2 JSON drafts from tools/parse_song.py)
const queue = ref([
  { id: 1, title: 'พระเจ้าทรงเลี้ยงดู', source: 'หนังสือเพลง-เล่ม2.pdf น.14', risks: 3, conf: 0.72, state: 'todo', dup: false },
  { id: 2, title: 'ในความรักของพระองค์', source: 'สแกน-ราชบุรี.pdf น.3', risks: 7, conf: 0.55, state: 'todo', dup: true },
  { id: 3, title: 'ขอบพระคุณพระเจ้า', source: 'หนังสือเพลง-เล่ม2.pdf น.15', risks: 0, conf: 0.94, state: 'verified', dup: false },
  { id: 4, title: '(อ่านไม่ออก — สแกนเบลอ)', source: 'สแกน-ราชบุรี.pdf น.9', risks: 18, conf: 0.21, state: 'todo', dup: false, broken: true },
])
const active = ref(queue.value[0])
const done = computed(() => queue.value.filter((s) => s.state === 'verified').length)

// mock risk flags for the active song (the "jump to risk" helper · guided verify)
const flags = [
  { id: 'f1', kind: 'จุด octave', where: 'ห้อง 2 · โน้ต 3', note: 'จุดบนอาจหลุด (สแกนเป็นฝุ่น)' },
  { id: 'f2', kind: 'ขีดใต้/ลากเสียง', where: 'ห้อง 4', note: '“-” อาจปนกับเส้นห้อง → จังหวะเพี้ยน' },
  { id: 'f3', kind: 'พยางค์ไทย', where: 'บรรทัด 2', note: 'ตัดพยางค์เลื่อน (ไทยไม่เว้นวรรค)' },
]
const flagIdx = ref(0)
function nextFlag() { flagIdx.value = (flagIdx.value + 1) % flags.length }
</script>

<template>
  <div class="iv-host">
    <header class="iv-head">
      <h2 class="iv-title"><Icon name="inbox" :size="20" /> นำเข้า + ตรวจสอบ</h2>
      <div class="iv-progress" role="status">
        ตรวจแล้ว {{ done }}/{{ queue.length }}
        <div class="iv-bar"><div class="iv-fill" :style="{ width: (done / queue.length * 100) + '%' }"></div></div>
      </div>
      <button class="iv-close" @click="emit('close')"><Icon name="arrow-left" :size="16" /> กลับไปหน้าแก้</button>
    </header>

    <div class="iv-body">
      <!-- LEFT: queue (triage) -->
      <aside class="iv-queue" aria-label="คิวรอตรวจ">
        <div class="iv-group-t">คิวรอตรวจ (batch)</div>
        <button
          v-for="s in queue" :key="s.id" class="iv-item"
          :class="{ on: active.id === s.id, verified: s.state === 'verified', broken: s.broken }"
          @click="active = s"
        >
          <div class="iv-item-top">
            <Icon :name="s.state === 'verified' ? 'check-circle-2' : 'circle'" :size="15" :class="s.state === 'verified' ? 'ok' : 'todo'" />
            <span class="iv-item-title">{{ s.title }}</span>
          </div>
          <div class="iv-item-src"><Icon name="file-text" :size="12" /> {{ s.source }}</div>
          <div class="iv-item-tags">
            <span v-if="s.dup" class="iv-tag dup">ซ้ำในคลัง</span>
            <span v-if="s.risks" class="iv-tag risk">{{ s.risks }} จุดเสี่ยง</span>
            <span class="iv-tag conf" :class="{ low: s.conf < 0.6 }">มั่นใจ {{ Math.round(s.conf * 100) }}%</span>
          </div>
        </button>
        <div class="iv-guard"><Icon name="shield-alert" :size="14" /> ยืนยันยกชุด — เตือนถ้ายังมีเพลงเสี่ยง/ยังไม่เปิดตรวจ</div>
      </aside>

      <!-- RIGHT: verify workspace for the active song -->
      <section class="iv-main">
        <div class="iv-main-head">
          <h3>{{ active.title }}</h3>
          <div class="iv-acts">
            <button v-if="active.dup" class="iv-btn warn"><Icon name="git-merge" :size="15" /> เพลงซ้ำ — สร้างใหม่ / ทับ / ยกเลิก</button>
            <button v-if="active.broken" class="iv-btn danger"><Icon name="trash-2" :size="15" /> ทิ้งทั้งเพลง (AI พังเกินกู้)</button>
            <button class="iv-btn ghost"><Icon name="skip-forward" :size="15" /> ข้ามไว้ก่อน</button>
          </div>
        </div>

        <!-- diff: source ↔ AI result -->
        <div class="iv-diff">
          <div class="iv-pane">
            <div class="iv-pane-t"><Icon name="scan-text" :size="14" /> ต้นฉบับ (provenance)</div>
            <div class="iv-pane-body src">[ ภาพสแกน / PDF ต้นฉบับ — เปิดควบคู่ ]</div>
          </div>
          <div class="iv-pane">
            <div class="iv-pane-t"><Icon name="music" :size="14" /> ผล AI (v2) — แก้ inline ได้</div>
            <div class="iv-pane-body">
              <button class="iv-edit" @click="emit('open-editor')"><Icon name="pencil" :size="14" /> เปิดแก้บนแผ่น (ยืมเครื่องมือแก้)</button>
              <button class="iv-edit ghost"><Icon name="volume-2" :size="14" /> ฟังผลที่แปลง (จับโน้ตเพี้ยนด้วยหู)</button>
            </div>
          </div>
        </div>

        <!-- risk flags + jump (guided verify — the heart) -->
        <div class="iv-flags">
          <div class="iv-flags-head">
            <span><Icon name="flag" :size="15" /> จุดที่ AI น่าจะพลาด</span>
            <button class="iv-next" @click="nextFlag"><Icon name="chevron-right" :size="14" /> ไปจุดเสี่ยงถัดไป</button>
          </div>
          <ul class="iv-flag-list">
            <li v-for="(f, i) in flags" :key="f.id" :class="{ cur: i === flagIdx }">
              <span class="iv-flag-kind">{{ f.kind }}</span>
              <span class="iv-flag-where">{{ f.where }}</span>
              <span class="iv-flag-note">{{ f.note }}</span>
            </li>
          </ul>
        </div>

        <div class="iv-confirm">
          <label class="iv-check"><input type="checkbox" :checked="active.state === 'verified'" /> ทำเครื่องหมาย “ตรวจแล้ว” → ส่งเข้า flow ส่งมอบ</label>
          <span class="iv-resume"><Icon name="history" :size="13" /> จำสถานะคิว — ปิด/เน็ตหลุด กลับมาตรวจต่อจุดเดิม</span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.iv-host { border: 1px solid var(--line); border-radius: 14px; background: #fff; overflow: hidden; }
.iv-head { display: flex; align-items: center; gap: var(--sp-4); flex-wrap: wrap; padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--line); background: var(--cream); }
.iv-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: var(--fs-lg); }
.iv-progress { font-size: var(--fs-sm); color: var(--muted); min-width: 160px; }
.iv-bar { height: 6px; background: var(--line); border-radius: 999px; margin-top: 4px; overflow: hidden; }
.iv-fill { height: 100%; background: var(--brand); border-radius: 999px; }
.iv-close { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 7px 12px; font: inherit; font-size: var(--fs-sm); color: var(--ink); cursor: pointer; min-height: 40px; }
.iv-close:hover { border-color: var(--brand); color: var(--brand); }
.iv-body { display: grid; grid-template-columns: 280px 1fr; gap: 0; }
.iv-queue { border-right: 1px solid var(--line); padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); background: #fff; }
.iv-group-t { font-size: var(--fs-xs); color: var(--muted); font-weight: 600; }
.iv-item { text-align: left; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: var(--sp-2); cursor: pointer; font: inherit; }
.iv-item.on { border-color: var(--brand); background: var(--cream); }
.iv-item.verified { opacity: 0.72; }
.iv-item.broken { border-color: var(--red); }
.iv-item-top { display: flex; align-items: center; gap: 6px; }
.iv-item-top .ok { color: #2e7d32; } .iv-item-top .todo { color: var(--muted); }
.iv-item-title { font-weight: 600; font-size: var(--fs-md); }
.iv-item-src { display: flex; align-items: center; gap: 4px; font-size: var(--fs-xs); color: var(--muted); margin: 3px 0; }
.iv-item-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.iv-tag { font-size: 11px; border-radius: 999px; padding: 1px 7px; border: 1px solid var(--line); color: var(--muted); }
.iv-tag.dup { color: #b45309; border-color: #b45309; }
.iv-tag.risk { color: var(--red); border-color: var(--red); }
.iv-tag.conf.low { color: var(--red); border-color: var(--red); }
.iv-guard { display: flex; align-items: flex-start; gap: 5px; font-size: var(--fs-xs); color: var(--muted); margin-top: auto; padding-top: var(--sp-2); border-top: 1px dashed var(--line); }
.iv-main { padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
.iv-main-head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-wrap: wrap; }
.iv-main-head h3 { margin: 0; }
.iv-acts { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.iv-btn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 7px 12px; font: inherit; font-size: var(--fs-sm); cursor: pointer; min-height: 40px; color: var(--ink); }
.iv-btn.warn { border-color: #b45309; color: #b45309; }
.iv-btn.danger { border-color: var(--red); color: var(--red); }
.iv-btn.ghost:hover, .iv-btn:hover { border-color: var(--brand); }
.iv-diff { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
.iv-pane { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.iv-pane-t { display: flex; align-items: center; gap: 6px; font-size: var(--fs-sm); font-weight: 600; padding: var(--sp-2) var(--sp-3); background: var(--cream); border-bottom: 1px solid var(--line); }
.iv-pane-body { padding: var(--sp-4); min-height: 96px; display: flex; flex-direction: column; gap: var(--sp-2); }
.iv-pane-body.src { align-items: center; justify-content: center; color: var(--muted); font-size: var(--fs-sm); text-align: center; }
.iv-edit { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--brand); background: var(--brand); color: #fff; border-radius: 10px; padding: 8px 12px; font: inherit; font-size: var(--fs-sm); cursor: pointer; min-height: 40px; }
.iv-edit.ghost { background: #fff; color: var(--brand); }
.iv-flags { border: 1px solid var(--line); border-radius: 12px; padding: var(--sp-3); }
.iv-flags-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); font-weight: 600; font-size: var(--fs-sm); }
.iv-flags-head > span { display: inline-flex; align-items: center; gap: 6px; }
.iv-next { display: inline-flex; align-items: center; gap: 3px; border: 1px solid var(--brand); background: #fff; color: var(--brand); border-radius: 999px; padding: 5px 12px; font: inherit; font-size: var(--fs-sm); cursor: pointer; min-height: 34px; }
.iv-flag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.iv-flag-list li { display: grid; grid-template-columns: 120px 110px 1fr; gap: var(--sp-2); align-items: center; padding: 7px 8px; border-radius: 8px; font-size: var(--fs-sm); }
.iv-flag-list li.cur { background: #fff4e6; outline: 1px solid #f0b667; }
.iv-flag-kind { font-weight: 600; color: var(--red); }
.iv-flag-where { color: var(--note-blue); }
.iv-flag-note { color: var(--muted); }
.iv-confirm { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-wrap: wrap; padding-top: var(--sp-2); border-top: 1px solid var(--line); }
.iv-check { display: inline-flex; align-items: center; gap: 8px; font-size: var(--fs-md); }
.iv-resume { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-xs); color: var(--muted); }

@media (max-width: 760px) {
  .iv-body { grid-template-columns: 1fr; }
  .iv-queue { border-right: none; border-bottom: 1px solid var(--line); }
  .iv-diff { grid-template-columns: 1fr; }
  .iv-flag-list li { grid-template-columns: 1fr; gap: 1px; }
}
</style>
