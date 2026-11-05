// ส่งเพลงที่ชอบเป็นลิงก์ — m1.wpa.24.fav.02 (ใบ v3/pleng#153)
import { describe, it, expect, beforeEach } from 'vitest'
import { favListLink, parseFavParam } from './favLink.js'
import { addFavorites, toggleFavorite, favorites, _reloadFavorites } from './favorites.js'

describe('favListLink', () => {
  it('AC 2 — one link, only the song ids, nothing else', () => {
    expect(favListLink(['a-1', 7], 'https://pleng.phrakham.life/')).toBe('https://pleng.phrakham.life/#/?fav=a-1,7')
    expect(favListLink(['x'], 'http://localhost:5173')).toBe('http://localhost:5173/#/?fav=x')
  })
})

describe('parseFavParam', () => {
  it('reads the ids back in order, without repeats', () => {
    expect(parseFavParam('b,a,b')).toEqual({ ok: true, ids: ['b', 'a'] })
  })
  it('round-trips a real uuid', () => {
    const id = '957c5c2f-7085-42cf-b91f-0a51e208ea3e'
    const url = favListLink([id], 'https://x/')
    expect(parseFavParam(url.split('fav=')[1]).ids).toEqual([id])
  })
  it('AC 7 — a broken or empty link carries nothing usable', () => {
    expect(parseFavParam('').ok).toBe(false)
    expect(parseFavParam(',,,').ok).toBe(false)
    expect(parseFavParam('<script>').ok).toBe(false)
    expect(parseFavParam(undefined).ok).toBe(false)
    expect(parseFavParam(null).ok).toBe(false)
  })
  it('damaged pieces are dropped, never guessed into a song', () => {
    expect(parseFavParam('a1,%%%,b2').ids).toEqual(['a1', 'b2'])
  })
})

describe('addFavorites', () => {
  beforeEach(() => {
    localStorage.clear()
    _reloadFavorites()
  })
  it('AC 4 — adds to what the device already has and never removes anything', () => {
    toggleFavorite('mine')
    expect(addFavorites(['mine', 'new1', 'new2'])).toBe(2)
    expect([...favorites.value]).toEqual(['mine', 'new1', 'new2'])
    expect(addFavorites([])).toBe(0)
    expect([...favorites.value]).toEqual(['mine', 'new1', 'new2'])
  })
})
