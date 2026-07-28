// Soft-delete (db/012) — mounts the REAL editor and proves the UI wiring end to end:
//   * "ลบเพลง" opens a styled confirm (does NOT delete on the first click)
//   * confirming calls the soft_delete_song RPC (never a hard from('songs').delete())
//   * an undo snackbar appears and "เลิกทำ" calls restore_song
//   * จัดการ ▸ ถังขยะ lists trashed songs and "กู้คืน" calls restore_song
// The DB half (permission/guard/read-filter/purge) is proven separately against the real
// migration in db/012-soft-delete-songs.test.js. This asserts on the exact Supabase calls,
// because the behaviour that matters is which RPC the button reaches.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const calls = vi.hoisted(() => [])
const trashRows = vi.hoisted(() => ({ value: [] }))

vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = { _not: false }
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) {
      q[m] = (...args) => {
        calls.push({ table, verb: m, args })
        if (m === 'not') q._not = true // the trash query is the one that uses .not('deleted_at', ...)
        return q
      }
    }
    q.single = () => Promise.resolve({ data: null, error: null })
    // awaited list queries resolve here; the trash list gets its rows, everything else []
    q.then = (res) =>
      Promise.resolve({ data: q._not ? trashRows.value : [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (table) => makeQuery(table),
      rpc: (name, args) => {
        calls.push({ table: 'rpc:' + name, verb: 'rpc', args: [args] })
        return Promise.resolve({ data: null, error: null })
      },
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

const SONG = {
  id: 'song-1',
  number: 12,
  title_th: 'พระเจ้าเป็นความรัก',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ'] }],
  },
}

const rpcNames = () => calls.filter((c) => c.verb === 'rpc').map((c) => c.table)
const lastRpc = (name) => [...calls].reverse().find((c) => c.table === 'rpc:' + name)

// click a button matched by a CSS selector, from anywhere in the document (covers teleported
// menu items and in-tree dialogs alike)
async function click(sel, filter) {
  const els = [...document.querySelectorAll(sel)].filter((e) => !filter || filter(e))
  if (!els.length) throw new Error('no element for ' + sel + (filter ? ' (filtered)' : ''))
  els[0].click()
  await flushPromises() // drain the RPC/query microtasks so the DOM settles
  await nextTick()
}
const openManageMenu = () => click('.sb-menu button.sb-text', (b) => b.textContent.includes('จัดการ'))

let wrapper
beforeEach(async () => {
  calls.length = 0
  trashRows.value = []
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  wrapper = mount(EditorMode, {
    attachTo: document.body,
    props: { tier: 'approver', song: SONG, active: true },
  })
  await nextTick()
  await nextTick()
})

describe('soft-delete — the delete button', () => {
  it('first click only opens a confirm — nothing is deleted yet', async () => {
    await openManageMenu()
    await click('[role=menuitem].sb-danger') // "ลบเพลง"
    expect(document.querySelector('.del-song-box')).toBeTruthy() // confirm dialog is up
    expect(rpcNames()).not.toContain('rpc:soft_delete_song') // no delete on the ask
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'delete')).toBe(false) // never hard-delete
  })

  it('confirming calls soft_delete_song with the song id, then shows an undo snackbar', async () => {
    await openManageMenu()
    await click('[role=menuitem].sb-danger')
    await click('.eset-confirm-del') // "ลบเพลง" inside the dialog
    const rpc = lastRpc('soft_delete_song')
    expect(rpc).toBeTruthy()
    expect(rpc.args[0]).toEqual({ p_song_id: 'song-1' })
    expect(document.querySelector('.undo-snack')).toBeTruthy() // undo offered
  })

  it('"เลิกทำ" on the snackbar calls restore_song for that song', async () => {
    await openManageMenu()
    await click('[role=menuitem].sb-danger')
    await click('.eset-confirm-del')
    await click('.undo-btn') // "เลิกทำ"
    const rpc = lastRpc('restore_song')
    expect(rpc).toBeTruthy()
    expect(rpc.args[0]).toEqual({ p_song_id: 'song-1' })
  })
})

describe('trash panel', () => {
  it('lists trashed songs and "กู้คืน" restores one via restore_song', async () => {
    trashRows.value = [{ id: 'song-9', number: 9, title_th: 'เพลงที่ลบ', deleted_at: '2026-07-28T00:00:00Z' }]
    await openManageMenu()
    await click('[role=menuitem]', (b) => b.textContent.includes('ถังขยะ'))
    // the trash query filters on deleted_at IS NOT NULL
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'not' && c.args[0] === 'deleted_at')).toBe(true)
    const names = [...document.querySelectorAll('.trash-name')].map((e) => e.textContent)
    expect(names.some((t) => t.includes('เพลงที่ลบ'))).toBe(true) // the row is shown

    await click('.trash-restore')
    const rpc = lastRpc('restore_song')
    expect(rpc).toBeTruthy()
    expect(rpc.args[0]).toEqual({ p_song_id: 'song-9' })
  })
})

describe('read filter', () => {
  it('the song list query excludes trashed rows (deleted_at IS NULL)', () => {
    // loadSongList runs on mount
    expect(
      calls.some((c) => c.table === 'songs' && c.verb === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)
    ).toBe(true)
  })
})
