// ใบ v3/pleng#133 — pressing ย้อนมาเวอร์ชันนี้ must TELL you what happened.
// ใบ v3/pleng#134 — and ดูก่อน must show what that version holds, before anything is written.
//
// พี่เปา 21 ต.ค. 2569: she pressed ย้อน, the song really was rolled back (the row's updated_at
// moved), and she saw nothing at all — the panel covers the editor's status line. Then: "มีแค่
// ปุ่มให้เอา version นั้น ๆ ควรมีปุ่ม preview ว่าถ้าเอาจะได้อะไร".
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('../lib/auditLog.js', async () => {
  const actual = await vi.importActual('../lib/auditLog.js')
  return { ...actual, loadSongHistory: () => Promise.resolve(globalThis.__entries ?? []) }
})

import RevisionHistory from './RevisionHistory.vue'

const EDITOR_SRC = fs.readFileSync(path.resolve(__dirname, 'EditorMode.vue'), 'utf8')

const seg = (note, syl) => ({ type: 'segment', chord: 'C', note, lyric: syl })
// a v1 snapshot (the old shape) and a v2 one — the panel must read both
const v1Row = (lines) => ({ number: 66, title_th: 'หว่านมากเกี่ยวเก็บมาก', content: { key: 'C', timeSignature: '4/4', lines } })
const v2Row = (parts) => ({
  number: 66,
  title_th: 'หว่านมากเกี่ยวเก็บมาก',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[seg('1 2 3 4')], [seg('5 4 3 2')]] }],
    arrangement: parts,
  },
})
const entry = (id, row, extra = {}) => ({
  id, event: 'edit_published', hand: 'approver', actor_name: 'เปา',
  created_at: '2026-10-21T10:36:02.000Z', after: row, ...extra,
})

const mountPanel = async (entries, props = {}) => {
  globalThis.__entries = entries
  const w = mount(RevisionHistory, {
    props: { songId: 'song-1', canRestore: true, ...props },
    global: { stubs: { Icon: true, SongSheet: { name: 'SongSheet', props: ['content'], template: '<div class="stub-sheet" />' } } },
  })
  await nextTick(); await nextTick(); await nextTick()
  return w
}

describe('ใบ#133 — the panel can say what just happened', () => {
  it('shows the notice it is given, at the top where the reader is looking', async () => {
    const w = await mountPanel([entry('e1', v1Row([[seg('1 2', 'ก')]]))], { notice: '❌ ย้อนไม่สำเร็จ — เสียงดัง' })
    expect(w.find('.rev-notice').exists()).toBe(true)
    expect(w.find('.rev-notice').text()).toContain('ย้อนไม่สำเร็จ')
    expect(w.find('.rev-notice').attributes('role')).toBe('status')
  })

  it('no notice, no empty box', async () => {
    const w = await mountPanel([entry('e1', v1Row([[seg('1 2', 'ก')]]))])
    expect(w.find('.rev-notice').exists()).toBe(false)
  })
})

// The rollback itself lives in EditorMode; jsdom cannot press through a Supabase round trip,
// so the ORDER of the three things it must do is held at the source — that order is the bug.
describe('ใบ#133 — a successful rollback closes the panel and names the version', () => {
  const fn = EDITOR_SRC.slice(EDITOR_SRC.indexOf('async function restore(rev)'))
  const body = fn.slice(0, fn.indexOf('\n}\n'))

  it('closes the panel, so the status line behind it is no longer covered', () => {
    expect(body).toContain('closePanel()')
  })

  it('says WHICH version it rolled back to, not just that it did', () => {
    expect(body).toMatch(/ย้อนมาเป็นรุ่นของ/)
    expect(body).toMatch(/revTime\(rev\.created_at\)/)
  })

  it('a failure keeps the panel open and shows the reason inside it', () => {
    const at = body.indexOf('if (error) {')
    expect(at).toBeGreaterThan(-1)
    const fail = body.slice(at, body.indexOf('return', at)) // the error branch, up to its exit
    expect(fail).toMatch(/restoreNotice\.value\s*=/)
    expect(fail).not.toContain('closePanel()')
  })

  it('the panel is handed that notice, and opening it again clears the last failure', () => {
    expect(EDITOR_SRC).toMatch(/:notice="restoreNotice"/)
    expect(EDITOR_SRC).toMatch(/if \(p === 'history'\) restoreNotice\.value = ''/)
  })
})

describe('ใบ#134 — ดูก่อน shows what a version holds', () => {
  it('each row offers it, and it opens and closes', async () => {
    const w = await mountPanel([entry('e1', v2Row([{ stanza: 'A', label: 'ร้อง 1', syllables: ['ก', 'ข', 'ค'] }]))])
    const peek = w.find('.rev-peek')
    expect(peek.exists()).toBe(true)
    expect(peek.text()).toContain('ดูก่อน')
    expect(w.find('.rev-preview').exists()).toBe(false)

    await peek.trigger('click')
    expect(w.find('.rev-preview').exists()).toBe(true)
    expect(w.find('.rev-peek').text()).toContain('ปิดตัวอย่าง')

    await w.find('.rev-peek').trigger('click')
    expect(w.find('.rev-preview').exists()).toBe(false)
  })

  it('the numbers are the ones you compare versions by — ท่อน, บรรทัด, คำ', async () => {
    const full = entry('full', v2Row([
      { stanza: 'A', label: 'ร้อง 1', syllables: ['ก', 'ข', 'ค', 'ง'] },
      { stanza: 'A', label: 'ร้อง 2', syllables: ['จ', 'ฉ', 'ช', 'ซ'] },
    ]))
    const w = await mountPanel([full])
    await w.find('.rev-peek').trigger('click')
    const sum = w.find('.rev-preview-sum').text()
    expect(sum).toContain('66. หว่านมากเกี่ยวเก็บมาก')
    expect(sum).toContain('2 ท่อน')
    expect(sum).toContain('ทำนอง 2 บรรทัด')
    expect(sum).toContain('8 คำ')
  })

  it('a blank syllable slot is not a word — a held note must not inflate the count', async () => {
    const w = await mountPanel([entry('e1', v2Row([{ stanza: 'A', label: 'ร้อง 1', syllables: ['ก', '', '  ', null, 'ข'] }]))])
    await w.find('.rev-peek').trigger('click')
    expect(w.find('.rev-preview-sum').text()).toContain('2 คำ')
  })

  it('the version is really drawn, not only counted', async () => {
    const w = await mountPanel([entry('e1', v2Row([{ stanza: 'A', label: 'ร้อง 1', syllables: ['ก'] }]))])
    await w.find('.rev-peek').trigger('click')
    expect(w.find('.rev-preview-sheet .stub-sheet').exists()).toBe(true)
  })

  it('an old-shape snapshot works too — the hunt reaches back past the migration', async () => {
    const w = await mountPanel([entry('e1', v1Row([[seg('1 2 3 4', 'ก ข ค ง')], [seg('5 4', 'จ ฉ')]]))])
    await w.find('.rev-peek').trigger('click')
    const sum = w.find('.rev-preview-sum').text()
    expect(sum).toContain('ทำนอง 2 บรรทัด')
    expect(sum).toMatch(/\d+ คำ/)
  })

  it('a row with no snapshot offers no preview instead of an empty one', async () => {
    const w = await mountPanel([{ id: 'e0', event: 'edit', hand: 'editor', created_at: '2026-10-21T09:00:00.000Z' }])
    expect(w.find('.rev-peek').exists()).toBe(false)
  })

  it('unreadable content is skipped, never thrown', async () => {
    const w = await mountPanel([entry('e1', { number: 1, title_th: 'พัง', content: { version: 2, stanzas: 'ไม่ใช่รายการ' } })])
    expect(w.find('.rev-preview').exists()).toBe(false)
  })

  it('only one preview is open at a time — opening another closes the first', async () => {
    const w = await mountPanel([
      entry('a', v2Row([{ stanza: 'A', label: 'ร้อง 1', syllables: ['ก'] }])),
      entry('b', v2Row([{ stanza: 'A', label: 'ร้อง 1', syllables: ['ข'] }])),
    ])
    const peeks = w.findAll('.rev-peek')
    await peeks[0].trigger('click')
    expect(w.findAll('.rev-preview').length).toBe(1)
    await w.findAll('.rev-peek')[1].trigger('click')
    expect(w.findAll('.rev-preview').length).toBe(1)
  })
})
