// editor-section-ux — the "โครงเพลง" rail redesign: one list of ท่อน (arrangement rows)
// with inline rename, drag/▲▼ reorder, a canvas section header, melody as a background
// group, and the bottom "ลำดับเพลง" block removed. These assert the NEW shell only; the
// note/word/beat editor is covered by the other EditorMode suites (SX7 regression gate).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

// two melodies (A, B) and two ท่อน so rename / reorder / melody-reuse are all exercisable
const SONG = {
  id: 's1',
  number: 5,
  title_th: 'เพลงทดสอบโครงเพลง',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] },
      { id: 'B', lines: [[{ type: 'segment', chord: 'G', note: '5 6 5 3' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: [] },
      { stanza: 'A', label: 'ร้อง 2', syllables: [] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  // jsdom has no scrollIntoView; railSelectRow scrolls after selecting a ท่อน
  Element.prototype.scrollIntoView = () => {}
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const arrOf = (w) => w.emitted('change').at(-1)[0].content.arrangement

describe('editor-section-ux — โครงเพลง rail shell', () => {
  it('SX1: renders ONE list of ท่อน rows (.srow), no old 3-group / bottom block', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.findAll('.srow').length).toBe(2) // one row per arrangement entry
    expect(w.findAll('.arr-row').length).toBe(0) // bottom "📜 ลำดับเพลง" block is cut
    // the "ขั้นสูง" label + a standalone "ลำดับเพลง" rail button are gone
    expect(w.find('.rail').text()).not.toContain('ขั้นสูง')
    expect(w.find('.rail').text()).toContain('โครงเพลง')
  })

  it('SX1: melody is a secondary group, collapsed by default, labelled "ทำนอง X"', async () => {
    const w = mountEd()
    await nextTick()
    // collapsed → the per-stanza rows are not rendered yet
    expect(w.findAll('.rail-rowwrap.mel').length).toBe(0)
    const toggle = w.findAll('.rg-toggle').find((b) => b.text().includes('ทำนอง (โน้ต)'))
    expect(toggle).toBeTruthy()
    await toggle.trigger('click')
    const mel = w.findAll('.rail-rowwrap.mel')
    expect(mel.length).toBe(2)
    // label renamed ท่อน A → ทำนอง A (P'Aim: melody is "ทำนอง", the ท่อน word is the section)
    expect(mel[0].text()).toContain('ทำนอง A')
    expect(mel[1].text()).toContain('ทำนอง B')
  })

  it('ui-standards §2: a ท่อน row is one flat line — name · ♪ pill · ▲▼ (2 siblings, not stacked) · del', async () => {
    const w = mountEd()
    await nextTick()
    const row = w.find('.srow')
    // ♪ is a compact static pill (span), not a heavy inline dropdown crammed in the narrow rail
    const chip = row.find('.mchip')
    expect(chip.exists()).toBe(true)
    expect(chip.element.tagName).toBe('SPAN')
    expect(chip.text()).toMatch(/^♪/)
    // exactly one name element and one .updown holding TWO sibling ▲▼ buttons (side-by-side markup)
    expect(row.findAll('.sname, .snameinp').length).toBe(1)
    const updowns = row.findAll('.updown')
    expect(updowns.length).toBe(1)
    expect(updowns[0].findAll('button').length).toBe(2)
  })

  it('SX2: click a ท่อน name → inline input; Enter commits row.label everywhere', async () => {
    const w = mountEd()
    await nextTick()
    const name = w.findAll('.srow .sname')[0]
    expect(name.text()).toBe('ร้อง 1')
    await name.trigger('click')
    const inp = w.find('.srow .snameinp')
    expect(inp.exists()).toBe(true)
    await inp.setValue('ท่อนขึ้น')
    await inp.trigger('keydown.enter')
    await nextTick()
    // the input collapses back to a span showing the new name
    expect(w.find('.srow .snameinp').exists()).toBe(false)
    expect(w.findAll('.srow .sname')[0].text()).toBe('ท่อนขึ้น')
    // and the model carries it (single source of truth: row.label)
    expect(arrOf(w)[0].label).toBe('ท่อนขึ้น')
  })

  it('SX2: Esc cancels a rename and restores the original label', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('.srow .sname')[0].trigger('click')
    const inp = w.find('.srow .snameinp')
    await inp.setValue('อย่าเก็บชื่อนี้')
    await inp.trigger('keydown.esc')
    await nextTick()
    expect(w.findAll('.srow .sname')[0].text()).toBe('ร้อง 1')
    expect(arrOf(w)[0].label).toBe('ร้อง 1')
  })

  it('SX3: ▲▼ reorders the arrangement (moved row keeps selection)', async () => {
    const w = mountEd()
    await nextTick()
    // row 0's ▼ (second button of its .updown) moves "ร้อง 1" down
    const down = w.findAll('.srow')[0].findAll('.updown button')[1]
    await down.trigger('click')
    await nextTick()
    expect(arrOf(w).map((r) => r.label)).toEqual(['ร้อง 2', 'ร้อง 1'])
  })

  it('SX3: top row ▲ is disabled, last row ▼ is disabled (edge guards)', async () => {
    const w = mountEd()
    await nextTick()
    const rows = w.findAll('.srow')
    expect(rows[0].findAll('.updown button')[0].attributes('disabled')).toBeDefined() // ▲ on first
    expect(rows[1].findAll('.updown button')[1].attributes('disabled')).toBeDefined() // ▼ on last
  })

  it('SX3: drag (dragstart → drop) reorders too (mouse path)', async () => {
    const w = mountEd()
    await nextTick()
    const rows = w.findAll('.srow')
    await rows[0].trigger('dragstart')
    await rows[1].trigger('drop')
    await nextTick()
    expect(arrOf(w).map((r) => r.label)).toEqual(['ร้อง 2', 'ร้อง 1'])
  })

  it('SX3: an aria-live region announces the new order after a move (WCAG 2.5.7)', async () => {
    const w = mountEd()
    await nextTick()
    const live = w.find('[aria-live="polite"]')
    expect(live.exists()).toBe(true)
    await w.findAll('.srow')[0].findAll('.updown button')[1].trigger('click')
    await nextTick()
    expect(live.text()).toContain('ร้อง 1') // names the moved ท่อน
  })

  it('SX2/SX4: the canvas header shows the selected ท่อน; renaming there syncs to the rail', async () => {
    const w = mountEd()
    await nextTick()
    // on load the first row is the lens → the canvas header is present
    const head = w.find('.cshead')
    expect(head.exists()).toBe(true)
    expect(head.find('.cs-name').text()).toBe('ร้อง 1')
    // rename via the canvas header → the rail row name updates too (one source of truth)
    await head.find('.cs-name').trigger('click')
    const inp = w.find('.cshead .cs-name-inp')
    expect(inp.exists()).toBe(true)
    await inp.setValue('ท่อนรับ')
    await inp.trigger('keydown.enter')
    await nextTick()
    expect(w.find('.cshead .cs-name').text()).toBe('ท่อนรับ')
    expect(w.findAll('.srow .sname')[0].text()).toBe('ท่อนรับ')
    expect(arrOf(w)[0].label).toBe('ท่อนรับ')
  })

  it('SX4: selecting a ท่อน sets the lens so its words show (never -1 hidden)', async () => {
    const w = mountEd()
    await nextTick()
    // click the SECOND ท่อน row → it becomes the lens (selected)
    await w.findAll('.srow')[1].trigger('click')
    await nextTick()
    expect(w.findAll('.srow')[1].classes()).toContain('sel')
    // lens active → the canvas header reflects the second verse
    expect(w.find('.cshead .cs-name').text()).toBe('ร้อง 2')
  })

  it('SX5: เพิ่มท่อน inherits the previous row\'s melody and jumps selection to it', async () => {
    // last row uses melody B → a new ท่อน should default to B (ท่อน 2 มักทำนองเดียวกับก่อนหน้า)
    const song = JSON.parse(JSON.stringify(SONG))
    song.content.arrangement = [
      { stanza: 'A', label: 'ร้อง 1', syllables: [] },
      { stanza: 'B', label: 'รับ', syllables: [] },
    ]
    const w = mountEd(song)
    await nextTick()
    const add = w.findAll('.addsec').find((b) => b.text().includes('เพิ่มท่อน'))
    await add.trigger('click')
    await nextTick()
    const arr = arrOf(w)
    expect(arr.length).toBe(3)
    expect(arr[2].stanza).toBe('B') // inherited from the previous row
    // the new row is now the selected lens (ready to type immediately — P8)
    expect(w.findAll('.srow')[2].classes()).toContain('sel')
  })
})

// tablet-rail-drawer — on tablet the 288px side rail becomes the EXISTING slide-in drawer
// (breakpoint raised 760 → 900) and "โครงเพลง" gets a collapse toggle (default OPEN, unlike
// "ทำนอง" which stays default closed). These assert the shell behaviour only.
// Fake matchMedia so isMobileView()/toggleCatalog resolve for a chosen viewport width — jsdom
// has no layout, so the drawer-vs-collapse decision (which is JS, driven by matchMedia) is what
// we test here; the CSS breakpoint itself is verified live in docs/reports/tablet-rail-drawer.md.
function fakeViewport(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    const max = m ? Number(m[1]) : Infinity
    return {
      matches: px <= max,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false },
    }
  }
}
const mainToggle = (w) => w.findAll('.rg-toggle.rg-main').find((b) => b.text().includes('โครงเพลง'))

describe('tablet-rail-drawer — rail → drawer on tablet + "โครงเพลง" collapse', () => {
  const realMM = window.matchMedia
  afterEach(() => { window.matchMedia = realMM })

  it('TRD1: ≤900 (768/834/900 tablet) — breadcrumb OPENS the drawer (rail gets .open, not desktop collapse)', async () => {
    for (const px of [768, 834, 900]) {
      fakeViewport(px)
      const w = mountEd()
      await nextTick()
      expect(w.find('.rail').classes(), `px=${px} start closed`).not.toContain('open')
      await w.find('.ed-crumb').trigger('click')
      await nextTick()
      expect(w.find('.rail').classes(), `px=${px} drawer open`).toContain('open')
      expect(w.find('.studio-app').classes(), `px=${px} not collapse`).not.toContain('rail-hidden')
      w.unmount()
    }
  })

  it('TRD2: ≥901 (901/1024/1280 desktop) — breadcrumb COLLAPSES the side rail, never a drawer', async () => {
    for (const px of [901, 1024, 1280]) {
      fakeViewport(px)
      const w = mountEd()
      await nextTick()
      await w.find('.ed-crumb').trigger('click')
      await nextTick()
      expect(w.find('.studio-app').classes(), `px=${px} desktop collapse`).toContain('rail-hidden')
      expect(w.find('.rail').classes(), `px=${px} no drawer`).not.toContain('open')
      w.unmount()
    }
  })

  it('TRD3: phone ≤760 unchanged — breadcrumb opens the drawer, the ✕ (rail-x) closes it', async () => {
    fakeViewport(375)
    const w = mountEd()
    await nextTick()
    await w.find('.ed-crumb').trigger('click')
    await nextTick()
    expect(w.find('.rail').classes()).toContain('open')
    await w.find('.rail-x').trigger('click') // rail-mhead close button → closeDrawer()
    await nextTick()
    expect(w.find('.rail').classes()).not.toContain('open')
  })

  it('TRD4: "โครงเพลง" has a ▾ toggle, DEFAULT OPEN (aria-expanded=true, rows render without a click)', async () => {
    const w = mountEd()
    await nextTick()
    const main = mainToggle(w)
    expect(main).toBeTruthy()
    expect(main.attributes('aria-expanded')).toBe('true') // primary section — open by default
    expect(w.findAll('.srow').length).toBe(2)
  })

  it('TRD5: clicking "โครงเพลง" collapses then expands its rows', async () => {
    const w = mountEd()
    await nextTick()
    await mainToggle(w).trigger('click') // collapse
    await nextTick()
    expect(mainToggle(w).attributes('aria-expanded')).toBe('false')
    expect(w.findAll('.srow').length).toBe(0)
    await mainToggle(w).trigger('click') // expand
    await nextTick()
    expect(mainToggle(w).attributes('aria-expanded')).toBe('true')
    expect(w.findAll('.srow').length).toBe(2)
  })

  it('TRD6: "ทำนอง (โน้ต)" stays DEFAULT CLOSED (regression guard — different default from โครงเพลง)', async () => {
    const w = mountEd()
    await nextTick()
    const mel = w.findAll('.rg-toggle').find((b) => b.text().includes('ทำนอง (โน้ต)'))
    expect(mel.attributes('aria-expanded')).toBe('false')
    expect(w.findAll('.rail-rowwrap.mel').length).toBe(0)
  })
})
