// US/DS editor-orientation phase 1 — "ห้ามเลือดไหล".
//
// The whole point: identity comes from DATA, never from which door the user walked in
// through. Before this, `reviewingDraft` was a ref that only loadDraft() ever set, so พี่เปา
// opening a song from the picker (or a URL, or a refresh) that had โม's draft waiting saw a
// screen identical to a plain song — and the biggest button on it said "เผยแพร่", which
// overwrote `songs` and left โม's draft stranded as pending with nobody the wiser.
//
// These drive the REAL routes (loadSong / loadDraft) against a stubbed song_drafts table and
// assert what the screen says, so a regression to a door-driven identity turns them red.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const H = vi.hoisted(() => ({ drafts: [], songUpdates: [], rpc: null }))

// song_drafts.select().order() → H.drafts · songs.select().eq().single() → the song row.
vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = { _table: table }
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'delete', 'limit']) q[m] = () => q
    q.update = (row) => {
      if (table === 'songs') H.songUpdates.push(row)
      return q
    }
    q.single = () => Promise.resolve({ data: table === 'songs' ? SONG : null, error: null })
    q.then = (res) =>
      Promise.resolve({ data: table === 'song_drafts' ? H.drafts : [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (t) => makeQuery(t),
      rpc: (name, args) => {
        H.rpc = { name, args }
        return Promise.resolve({ data: 'published-song-1', error: null })
      },
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session, legacy } from '../store.js'

const CONTENT = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
  arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
}
const SONG = { id: 'song-21', number: 21, title_th: 'เพลงที่โมส่งร่างมา', title_en: '', content: CONTENT }
// โม's draft, waiting for review on SONG
const MO_DRAFT = { id: 'draft-mo', song_id: 'song-21', author_id: 'mo-1', status: 'pending', title_th: SONG.title_th, content: CONTENT }
// พี่เปา's own draft, also pending (he is the approver in these tests)
const OWN_DRAFT = { id: 'draft-own', song_id: 'song-21', author_id: 'pao-1', status: 'pending', title_th: SONG.title_th, content: CONTENT }

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'pao-1', email: 'pao@x.com' } }
  legacy.value = false
  H.drafts = []
  H.songUpdates = []
  H.rpc = null
  vi.restoreAllMocks()
})

const mountEd = (tier = 'approver') =>
  mount(EditorMode, {
    props: { song: null, tier, active: true },
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, ComboSelect: true } },
  })

// walk in through a door and let the drafts load, as the live app does
async function open(w, how) {
  await w.vm.loadDrafts()
  await how()
  await nextTick()
  await nextTick()
}

describe('D3 — identity is derived from data, not from the door (US AC-1)', () => {
  it('opening the song via the picker (not the drafts box) still shows โม has a draft waiting', async () => {
    H.drafts = [MO_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))

    // the old code cleared reviewingDraft here and said nothing at all
    expect(w.vm.pendingForThisSong).toEqual(MO_DRAFT)
    expect(w.vm.pendingAlert).toEqual(MO_DRAFT)
    expect(w.text()).toContain('ส่งร่างของเพลงนี้มารอตรวจ')
  })

  it('the drafts box door gives the SAME answer as the picker door', async () => {
    H.drafts = [MO_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadDraft(MO_DRAFT))

    expect(w.vm.reviewingDraft).toEqual(MO_DRAFT) // reviewing โม's work
    expect(w.text()).toContain('กำลังตรวจฉบับร่างของ')
    // ...and it does not also nag about the very draft on screen
    expect(w.vm.pendingAlert).toBeNull()
  })

  it('drafts that land AFTER the song is open still surface (loadDrafts resolves late)', async () => {
    const w = mountEd()
    await w.vm.loadSong('song-21')
    await nextTick()
    expect(w.vm.pendingAlert).toBeNull() // nothing known yet

    H.drafts = [MO_DRAFT] // the login-time draft fetch comes back
    await w.vm.loadDrafts()
    await nextTick()

    expect(w.vm.pendingAlert).toEqual(MO_DRAFT)
  })

  it('a pending draft on a DIFFERENT song never bleeds into this one', async () => {
    H.drafts = [{ ...MO_DRAFT, song_id: 'song-99' }]
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))

    expect(w.vm.pendingAlert).toBeNull()
    expect(w.vm.saveLabel).toBe('เผยแพร่ทับ')
  })

  it('an approver opening their OWN pending draft is not told they are reviewing themselves', async () => {
    H.drafts = [OWN_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadDraft(OWN_DRAFT))

    expect(w.vm.reviewingDraft).toBeNull() // US §9 edge bug #5
    expect(w.text()).not.toContain('กำลังตรวจฉบับร่างของ')
    expect(w.vm.openPendingDraft).toEqual(OWN_DRAFT) // still publishes via the RPC (B028)
  })
})

describe('D2 — the primary button says what it does, and to whose work (US AC-2)', () => {
  const label = async (setup, tier = 'approver') => {
    const w = mountEd(tier)
    await open(w, setup(w))
    return w
  }

  it('reviewing โม → the accessible name states approve + โม, face stays compact (no bare "อนุมัติ" alone would lie about publishing fresh)', async () => {
    H.drafts = [MO_DRAFT]
    const w = await label((w) => () => w.vm.loadDraft(MO_DRAFT))
    w.vm.profilesMap['mo-1'] = 'โม'
    await nextTick()

    expect(w.vm.saveLabel).toBe('อนุมัติร่าง') // face: about approving a DRAFT, not publishing new
    expect(w.vm.saveName).toContain('โม') // full accessible name carries whose work
    expect(w.vm.saveName).toContain('อนุมัติ')
  })

  it('song with โม’s draft waiting → the button warns instead of saying plain "เผยแพร่"', async () => {
    H.drafts = [MO_DRAFT]
    const w = await label((w) => () => w.vm.loadSong('song-21'))
    w.vm.profilesMap['mo-1'] = 'โม'
    await nextTick()

    expect(w.vm.saveLabel).toBe('⚠️ เผยแพร่ทับ')
    expect(w.vm.saveLabel).not.toBe('เผยแพร่') // the whole point: not the same word as a safe publish
    expect(w.vm.saveName).toContain('รอตรวจ')
    expect(w.vm.saveName).toContain('โม')
  })

  it('plain published song → says it overwrites (face compact, full sentence in the accessible name)', async () => {
    const w = await label((w) => () => w.vm.loadSong('song-21'))
    expect(w.vm.saveLabel).toBe('เผยแพร่ทับ')
    expect(w.vm.saveName).toBe('เผยแพร่ทับฉบับปัจจุบัน')
  })

  it('a brand-new song does not claim to overwrite anything', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.vm.editingId).toBeNull()
    expect(w.vm.saveLabel).toBe('เผยแพร่')
  })

  it('an editor (not approver) still just sends for review', async () => {
    H.drafts = [MO_DRAFT]
    const w = await label((w) => () => w.vm.loadSong('song-21'), 'editor')
    expect(w.vm.saveLabel).toBe('ส่งตรวจ')
  })

  // US AC-9 / feedback_verify_mobile_real_width — the D2 labels are longer than the old
  // "เผยแพร่", and the prime button rides row 2 next to ฟังทั้งเพลง at 360px. jsdom has no
  // layout so this can't measure the real DOM (that trap is called out in the brief); instead
  // it caps the label CHARACTER length, the one thing that drives width from EditorMode. The
  // real-pixel budget (≤174px face @ 13px/600, whole row ≤360) was measured live in the browser
  // — every face here is ≤14 Thai chars, well under that. Owner names never reach the face.
  it('no face label is long enough to overflow the 360px dock row (owner stays off the face)', async () => {
    const faces = ['เผยแพร่', 'เผยแพร่ทับ', '⚠️ เผยแพร่ทับ', 'เผยแพร่ร่างฉัน', 'อนุมัติร่าง', 'ส่งตรวจ']
    for (const f of faces) expect([...f].length).toBeLessThanOrEqual(14)
  })
})

describe('D4 — nothing gets overwritten silently (US AC-6)', () => {
  it('publishing over a song with a draft waiting asks first, and names who is affected', async () => {
    H.drafts = [MO_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))
    w.vm.profilesMap['mo-1'] = 'โม'
    await nextTick()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await w.vm.primaryAction()

    expect(confirm).toHaveBeenCalledOnce()
    const asked = confirm.mock.calls[0][0]
    expect(asked).toContain('โม') // whose work
    expect(asked).toContain('รอตรวจ') // what happens to it
    expect(H.songUpdates).toHaveLength(0) // said no → the song is untouched
  })

  it('saying yes lets the publish through', async () => {
    H.drafts = [MO_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await w.vm.primaryAction()

    expect(H.songUpdates).toHaveLength(1)
  })

  it('a song with no draft waiting publishes with no interruption', async () => {
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await w.vm.primaryAction()

    expect(confirm).not.toHaveBeenCalled()
    expect(H.songUpdates).toHaveLength(1)
  })

  it('dismissing the banner hides it but does NOT disarm the confirm', async () => {
    H.drafts = [MO_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))
    expect(w.vm.pendingAlert).toEqual(MO_DRAFT)

    await w.find('.pa-actions button:last-child').trigger('click')
    await nextTick()

    expect(w.vm.pendingAlert).toBeNull() // banner gone
    expect(w.vm.saveLabel).toBe('⚠️ เผยแพร่ทับ') // warning still on the button
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await w.vm.primaryAction()
    expect(confirm).toHaveBeenCalledOnce() // still guarded
    expect(H.songUpdates).toHaveLength(0)
  })

  it('"ดูร่างของโม" opens โม’s draft for review', async () => {
    H.drafts = [MO_DRAFT]
    const w = mountEd()
    await open(w, () => w.vm.loadSong('song-21'))

    await w.find('.pa-actions .pa-go').trigger('click')
    await nextTick()

    expect(w.vm.reviewingDraft).toEqual(MO_DRAFT)
    expect(w.vm.currentDraftId).toBe('draft-mo')
  })
})
