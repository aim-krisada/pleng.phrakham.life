// B060 (พี่เปา, 9 ก.ค.) — ตั้งค่าเพลง inside the ✏️ inline editor: เลขเพลง · ชื่อไทย ·
// ชื่ออังกฤษ · คีย์ · จังหวะ · ความเร็ว · ธีม · หมวด, without leaving the sheet for the old
// grid editor. This drives the REAL SongViewer + SongSettings through the REAL Studio shell,
// because the thing that has burned this project is the WIRING between them: `number`/`theme`/
// `title_en` have been wiped library-wide once already (B108), so the round-trip — set → save →
// reopen → every field still there, and everything untouched byte-for-byte — is the whole test.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const h = vi.hoisted(() => ({ route: null, push: null, songRow: null, inserted: [], updated: [] }))

vi.mock('vue-router', () => ({
  useRoute: () => h.route,
  useRouter: () => ({ push: h.push }),
  onBeforeRouteLeave: () => {},
}))

vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: () => {},
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))

// Supabase stub that RECORDS what the shell writes — the draft row is the payload พี่เปา's
// work actually lives in, so the test reads it rather than trusting the UI.
vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = { _table: table, _payload: null }
    for (const m of ['select', 'order', 'eq', 'in', 'limit', 'delete']) q[m] = () => q
    q.insert = (row) => { q._payload = row; if (table === 'song_drafts') h.inserted.push(row); return q }
    q.update = (row) => { q._payload = row; if (table === 'song_drafts') h.updated.push(row); return q }
    q.single = () =>
      Promise.resolve(
        q._payload ? { data: { id: 'draft-1' }, error: null } : { data: table === 'songs' ? h.songRow : null, error: null },
      )
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (t) => makeQuery(t),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import Studio from './Studio.vue'
import SongSettings from '../components/SongSettings.vue'
import ComboSelect from '../components/ComboSelect.vue'
import { session, legacy } from '../store.js'

// The song carries what the editor does NOT model — a marker id the verse's flow points at, a
// `holds` field, a repeat with times, an unknown top-level key. That is the control group:
// after a settings-only edit they must come back untouched.
const CONTENT = () => ({
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  bpm: 92,
  futureThing: { keep: 'me' },
  stanzas: [
    {
      id: 'A',
      lines: [
        [
          { type: 'marker', label: '***', id: 'mk1' },
          { type: 'segment', note: '1 2', chord: 'C', holds: [1] },
          { type: 'bar' },
          { type: 'segment', note: '3 -', chord: 'G' },
          { type: 'repeat-end', id: 'r1', times: 3 },
        ],
      ],
    },
  ],
  arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['ก', 'ข', 'ค'], flow: { skip: ['r1'] } }],
})
const ROW = () => ({
  id: 'song-1',
  number: 141,
  title_th: 'โอ พระเยซู',
  title_en: null,
  category: 'anuchon',
  theme: 'ประสบการณ์',
  content: CONTENT(),
})

// EditorMode is mounted alongside (v-show) and hands its BLANK draft up on mount, exactly as
// in production — the shell must survive that and still show the routed song's settings.
const stubs = {
  EditorMode: {
    name: 'EditorMode',
    props: ['song', 'tier', 'active'],
    emits: ['change', 'save'],
    template: '<div class="stub-editor" />',
    mounted() { this.$emit('change', { id: null, number: null, title_th: '', title_en: '', content: { version: 2, key: 'C', stanzas: [], arrangement: [] } }) },
  },
  SongSheet: { name: 'SongSheet', props: ['content', 'displayKey'], template: '<div class="stub-sheet" />' },
  SingTransport: { name: 'SingTransport', template: '<div class="stub-dock" />' },
  NoteInputBar: { name: 'NoteInputBar', template: '<div class="stub-inputbar" />' },
}

async function openSettings() {
  const w = mount(Studio, { global: { stubs } })
  await nextTick(); await nextTick(); await nextTick()
  await w.find('.sv-fab').trigger('click') // ✏️ — enter the inline editor
  await nextTick()
  await w.find('.sv-settings-btn').trigger('click') // ⚙ ตั้งค่าเพลง
  await nextTick()
  return w
}
const panel = (w) => w.findComponent(SongSettings)
const inputs = (w) => panel(w).findAll('.ss-input') // เลขเพลง · ไทย · อังกฤษ · BPM
const combos = (w) => panel(w).findAllComponents(ComboSelect) // คีย์ · จังหวะ · ธีม · หมวด

beforeEach(() => {
  h.route = reactive({ params: { id: 'song-1' }, query: {} })
  h.push = vi.fn()
  h.songRow = ROW()
  h.inserted = []
  h.updated = []
  session.value = { user: { id: 'u1' } } // logged in → บันทึกร่าง writes to the server
  legacy.value = true // → approver tier
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  window.matchMedia = window.matchMedia || (() => ({ matches: false }))
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
})

describe('B060 — ตั้งค่าเพลง lives in the inline editor', () => {
  it('the ⚙ button shows only while ✏️ is on (it is an editing action)', async () => {
    const w = mount(Studio, { global: { stubs } })
    await nextTick(); await nextTick(); await nextTick()
    expect(w.find('.sv-settings-btn').exists()).toBe(false)
    await w.find('.sv-fab').trigger('click')
    await nextTick()
    expect(w.find('.sv-settings-btn').exists()).toBe(true)
    expect(panel(w).exists()).toBe(true)
    expect(panel(w).find('.ss-panel').exists()).toBe(false) // closed until asked for
  })

  it('opens with EVERY field the old editor has, filled from the song', async () => {
    const w = await openSettings()
    expect(panel(w).find('.ss-panel').exists()).toBe(true)
    const [num, th, en, bpm] = inputs(w).map((i) => i.element.value)
    expect(num).toBe('141')
    expect(th).toBe('โอ พระเยซู')
    expect(en).toBe('')
    expect(bpm).toBe('92')
    expect(combos(w).map((c) => c.props('modelValue'))).toEqual(['C', '4/4', 'ประสบการณ์', 'anuchon'])
  })

  it('🔴 round-trip: set every field → บันทึกร่าง → the saved row carries them all', async () => {
    const w = await openSettings()
    await inputs(w)[0].setValue('222')
    await inputs(w)[1].setValue('ชื่อไทยใหม่')
    await inputs(w)[2].setValue('New English')
    await inputs(w)[3].setValue('120')
    combos(w)[0].vm.$emit('update:modelValue', 'D') // คีย์
    combos(w)[1].vm.$emit('update:modelValue', '3/4') // จังหวะ
    combos(w)[2].vm.$emit('update:modelValue', 'กิตติคุณ') // ธีม
    combos(w)[3].vm.$emit('update:modelValue', 'lem-yai') // หมวด
    await nextTick()

    expect(w.find('.sv-save-state').text()).toContain('ยังไม่บันทึก') // settings count as work
    await w.find('.sv-save-btn').trigger('click')
    await nextTick(); await nextTick(); await nextTick()

    expect(h.inserted).toHaveLength(1)
    const row = h.inserted[0]
    expect(row.song_id).toBe('song-1')
    expect(row.number).toBe(222)
    expect(row.title_th).toBe('ชื่อไทยใหม่')
    expect(row.title_en).toBe('New English')
    expect(row.theme).toBe('กิตติคุณ')
    expect(row.category).toBe('lem-yai')
    expect(row.content.key).toBe('D')
    expect(row.content.timeSignature).toBe('3/4')
    expect(row.content.bpm).toBe(120)
  })

  it('🔴 a settings edit moves NOTHING else — chords transpose, everything else byte-for-byte', async () => {
    const w = await openSettings()
    combos(w)[0].vm.$emit('update:modelValue', 'D')
    await nextTick()
    await w.find('.sv-save-btn').trigger('click')
    await nextTick(); await nextTick(); await nextTick()

    const saved = h.inserted[0].content
    const expected = CONTENT()
    expected.key = 'D'
    expected.stanzas[0].lines[0][1].chord = 'D' // C  → D
    expected.stanzas[0].lines[0][3].chord = 'A' // G  → A
    expect(saved).toEqual(expected) // flow · marker id · holds · repeat times · unknown key intact
  })

  it('🔴 reopening the saved song shows every field again (the other half of the round-trip)', async () => {
    const w = await openSettings()
    await inputs(w)[0].setValue('222')
    await inputs(w)[1].setValue('ชื่อไทยใหม่')
    await inputs(w)[2].setValue('New English')
    await inputs(w)[3].setValue('120')
    combos(w)[0].vm.$emit('update:modelValue', 'D')
    combos(w)[1].vm.$emit('update:modelValue', '3/4')
    combos(w)[2].vm.$emit('update:modelValue', 'กิตติคุณ')
    combos(w)[3].vm.$emit('update:modelValue', 'lem-yai')
    await nextTick()
    await w.find('.sv-save-btn').trigger('click')
    await nextTick(); await nextTick(); await nextTick()
    w.unmount()

    // publish = the saved draft becomes the song row; reopen the surface on it
    const saved = h.inserted[0]
    h.songRow = { id: 'song-1', number: saved.number, title_th: saved.title_th, title_en: saved.title_en,
      category: saved.category, theme: saved.theme, content: saved.content }
    const w2 = await openSettings()
    expect(inputs(w2).map((i) => i.element.value)).toEqual(['222', 'ชื่อไทยใหม่', 'New English', '120'])
    expect(combos(w2).map((c) => c.props('modelValue'))).toEqual(['D', '3/4', 'กิตติคุณ', 'lem-yai'])
  })

  it('B108 — a หมวด/ธีม nobody established is NOT written (an omitted field ≠ a guess)', async () => {
    h.songRow = { ...ROW(), category: null, theme: null }
    const w = await openSettings()
    await inputs(w)[1].setValue('แค่เปลี่ยนชื่อ')
    await nextTick()
    await w.find('.sv-save-btn').trigger('click')
    await nextTick(); await nextTick(); await nextTick()
    const row = h.inserted[0]
    expect('category' in row).toBe(false)
    expect('theme' in row).toBe(false)
    expect(row.title_th).toBe('แค่เปลี่ยนชื่อ')
  })

  it('the settings close with the pencil — they are part of the editor, not the reader', async () => {
    const w = await openSettings()
    expect(panel(w).find('.ss-panel').exists()).toBe(true)
    await w.find('.sv-fab').trigger('click') // ✓ เสร็จ
    await nextTick()
    expect(panel(w).exists()).toBe(false)
  })
})

// The panel and its trigger are only useful if a real pointer can reach them. Both were
// measured COVERED on the live app before this ordering was set (the note popup sat on the
// save bar at 1280; the save bar + note bar cut across the full-screen panel at 412), so the
// ladder is pinned here — a future re-shuffle has to break this test first.
describe('B060 — the settings surface must out-rank the editing overlays', () => {
  const read = (p) => readFileSync(join(process.cwd(), 'src', p), 'utf8')
  const tier = (name) => Number(new RegExp(`${name}:\\s*(\\d+)`).exec(read('styles.css'))[1])

  it('save bar (⚙ trigger) sits above the anchored note popup', () => {
    expect(read('components/SongViewer.vue')).toContain('z-index: var(--z-editbar')
    expect(tier('--z-editbar')).toBeGreaterThan(tier('--z-popover'))
  })

  it('the panel itself sits above the save bar (it is full-screen on a phone)', () => {
    expect(read('components/SongSettings.vue')).toContain('z-index: var(--z-drawer')
    expect(tier('--z-drawer')).toBeGreaterThan(tier('--z-editbar'))
  })
})
