// พี่เอม 18 พ.ย. 2569 — "พี่เปาชอบมาก ... ทำให้ดีกว่านี้อีกได้ไหม": new and coming back, stars and shares,
// English / Chinese as a share of the songs that have them, one line of advice per section, and the
// summary to send on.
import { describe, it, expect } from 'vitest'
import { features, actions, visitors, featureSongs, advice, summaryText } from './gaStats.js'

const song = (id, number, title, lyrics) => [String(id), {
  id, number, title_th: title,
  content: { version: 2, stanzas: [{ id: 'A', lines: [] }], arrangement: [{ stanza: 'A', syllables: ['ก'], ...(lyrics ? { lyrics } : {}) }] },
}]
const SONGS = new Map([song('s1', 1, 'หนึ่ง', { en: ['One'] }), song('s2', 2, 'สอง'), song('s3', 3, 'สาม', { en: ['Three'], zh: ['三'] })])

describe('English / Chinese — out of the opens of songs that have that language', () => {
  it('a song without English does not pull the share down', () => {
    const b = { reports: {
      songs: [[['/song/s1', 'cur'], 20], [['/song/s2', 'cur'], 100], [['/song/s3', 'cur'], 20]],
      features: [[['lang_en'], 10], [['lang_zh'], 2]],
    } }
    const f = Object.fromEntries(features(b, SONGS).map((r) => [r.key, r]))
    expect(f.lang_en).toMatchObject({ n: 10, base: 40, pct: 25, low: false })
    expect(f.lang_zh).toMatchObject({ n: 2, base: 20, low: true })
  })
})

describe('actions and visitors', () => {
  const b = { reports: { features: [
    [['star'], 7], [['fav_send'], 2], [['fav_take'], 1], [['share_song'], 4], [['font_up'], 3],
    [['visit_new'], 12], [['visit_back'], 28], [['play'], 50],
  ] } }
  it('counts each action, buttons of a song open left out', () => {
    const a = actions(b)
    expect(a.total).toBe(17)
    expect(Object.fromEntries(a.rows.map((r) => [r.key, r.n]))).toEqual({
      star: 7, fav_send: 2, fav_take: 1, share_song: 4, share_site: 0, font_up: 3, font_down: 0,
    })
  })
  it('new devices and coming back', () => {
    expect(visitors(b)).toEqual({ fresh: 12, back: 28, total: 40, backPct: 70, low: false })
    expect(visitors({ reports: {} })).toMatchObject({ total: 0, low: true })
  })
  it('the songs behind a star — only once the per-song report is there', () => {
    expect(featureSongs(b, SONGS, 'star')).toBeNull()
    const withSongs = { reports: { featureSongs: [[['star', 's1'], 3], [['star', 's3'], 5], [['star', '(not set)'], 9], [['lang_en', 's1'], 4]] } }
    expect(featureSongs(withSongs, SONGS, 'star').map((r) => [r.id, r.n])).toEqual([['s3', 5], ['s1', 3]])
    expect(featureSongs(withSongs, SONGS, 'lang_en').map((r) => r.id)).toEqual(['s1'])
  })
})

describe('advice — one line per section', () => {
  it('says what to do, from the strongest signal', () => {
    const cards = {
      notFound: { rows: [{ term: 'ฟ้าใหม่', notFound: 4 }] },
      fix: [{ song: SONGS.get('s2'), missing: ['คอร์ด'] }],
      dead: { songs: [{ song: SONGS.get('s2'), n: 5, kinds: ['เปิดแผ่นเพลง แต่เพลงไม่มีคอร์ด'] }] },
      features: [],
      visitors: { total: 40, backPct: 70, low: false },
    }
    const t = advice({ ov: { change: -20, busiest: 'เช้า' }, cards, work: { pending: 3 } })
    expect(t.overview).toBe('คนใช้น้อยลง 20% ⇒ ลองส่งลิงก์เพลงที่ร้องสัปดาห์นี้ในกลุ่มไลน์ของโบสถ์')
    expect(t.songs).toContain('"ฟ้าใหม่" แล้วไม่เจอ 4 ครั้ง')
    expect(t.app).toContain('2. สอง มีคนเปิดแล้วติด 5 ครั้ง')
    expect(t.more).toContain('กลับมาใช้ซ้ำ 70%')
  })
  it('falls back to the next signal, and says nothing when there is nothing', () => {
    const t = advice({ ov: { change: 3, busiest: 'เย็น' }, cards: { notFound: { rows: [] }, fix: [], dead: { songs: [] }, features: [] }, work: { pending: 2 } })
    expect(t.overview).toBe('คนใช้มากที่สุดช่วงเย็น ⇒ ถ้าจะลงเพลงใหม่ ลงให้เสร็จก่อนช่วงนี้')
    expect(t.songs).toBe('มีงานรอตรวจ 2 เพลง ⇒ ตรวจให้เสร็จก่อนพิมพ์เพลงใหม่')
    expect(t.app).toBeNull()
    expect(advice({ ov: null, cards: null, work: null })).toEqual({ overview: null, songs: null, app: null, more: null })
  })
  it('a button almost nobody uses', () => {
    const features = [{ key: 'play', name: 'กดเล่นเสียง', pct: 40, low: false }, { key: 'print', name: 'พิมพ์', pct: 2, low: false }]
    expect(advice({ ov: null, cards: { features, dead: { songs: [] } }, work: null }).app).toBe('ปุ่ม "พิมพ์" แทบไม่มีคนใช้ (2%) ⇒ อาจหายาก หรือไม่มีใครต้องการ')
  })
})

describe('summary to send on', () => {
  it('the same numbers as the page, then what to do', () => {
    const text = summaryText({
      days: 7, label: '11–17 พ.ย. 2569 (7 วัน)',
      ov: { users: 1234, change: 12, appShare: 30 },
      cards: {
        top: [{ song: SONGS.get('s1') }, { song: null }],
        notFound: { rows: [{ term: 'ฟ้าใหม่' }] },
        visitors: { fresh: 5, back: 9, total: 14 },
        actions: { total: 3, rows: [{ key: 'star', n: 2 }, { key: 'share_song', n: 1 }, { key: 'fav_send', n: 0 }] },
      },
      work: { draft: 1, pending: 2 },
      tips: { overview: 'ก ⇒ ข', songs: null },
    })
    expect(text.split('\n')).toEqual([
      'สรุปการใช้เว็บเพลง 11–17 พ.ย. 2569 (7 วัน)',
      '- คนใช้ 1,234 คน (+12% จากช่วงก่อน) · เปิดจากแอป 30%',
      '- เพลงที่เปิดมากสุด: 1. หนึ่ง · เพลงที่ลบแล้ว',
      '- คำที่ค้นแล้วไม่เจอ: "ฟ้าใหม่"',
      '- เครื่องใหม่ 5 เครื่อง · กลับมาใช้ซ้ำ 9 ครั้ง',
      '- กดดาว 2 ครั้ง · ส่งลิงก์เพลง 1 ครั้ง · ส่งรายการเพลง 0 ครั้ง',
      '- งานค้าง: ร่าง 1 · รอตรวจ 2',
      'ควรทำต่อ:',
      '- ก ⇒ ข',
    ])
  })
})
