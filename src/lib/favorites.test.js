// ★ เพลงที่ชอบ — m1.wpa.24.fav.01 (ใบ v3/pleng#152): the store behind every star.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { favorites, toggleFavorite, isFavorite, favoriteSongs, storageOk, FAV_KEY, _reloadFavorites } from './favorites.js'

beforeEach(() => {
  localStorage.clear()
  _reloadFavorites()
})

describe('favorites store', () => {
  it('AC 2 — a tap stars the song, a second tap takes it off again', () => {
    expect(isFavorite('a1')).toBe(false)
    expect(toggleFavorite('a1')).toBe(true)
    expect(isFavorite('a1')).toBe(true)
    expect(toggleFavorite('a1')).toBe(false)
    expect(isFavorite('a1')).toBe(false)
  })

  it('AC 4 — survives a reload on the same device (kept in this browser only)', () => {
    toggleFavorite('a1')
    toggleFavorite(7)
    expect(JSON.parse(localStorage.getItem(FAV_KEY))).toEqual(['a1', '7'])
    favorites.value = new Set() // forget the in-memory copy, as a fresh page would
    _reloadFavorites()
    expect(isFavorite('a1')).toBe(true)
    expect(isFavorite(7)).toBe(true)
  })

  it('a number id and the same id as text are one song (route params are always text)', () => {
    toggleFavorite(7)
    expect(isFavorite('7')).toBe(true)
  })

  it('a broken saved value starts an empty list instead of crashing', () => {
    localStorage.setItem(FAV_KEY, '{not json')
    _reloadFavorites()
    expect(favorites.value.size).toBe(0)
  })

  it('AC 7 — a starred song that is no longer in the catalog is simply not listed; the rest sort by Thai title', () => {
    toggleFavorite('b')
    toggleFavorite('gone')
    toggleFavorite('a')
    const songs = [
      { id: 'a', title_th: 'พระเจ้าทรงดี' },
      { id: 'b', title_th: 'กางเขน' },
      { id: 'c', title_th: 'ไม่ได้ติดดาว' },
    ]
    expect(favoriteSongs(songs).map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('AC 8 — a device that blocks storage still toggles this visit, and the store says it cannot remember', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    _reloadFavorites()
    expect(storageOk.value).toBe(false)
    expect(toggleFavorite('x')).toBe(true)
    expect(isFavorite('x')).toBe(true)
    spy.mockRestore()
  })
})
