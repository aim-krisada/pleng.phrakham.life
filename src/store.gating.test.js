// US-02 / DS-02 — permission tiers are a single source of truth in the store.
// These assert the three getters return the right values for the three login states,
// so every mode can gate off store.tier / store.canStore / store.canApprove.
import { describe, it, expect, beforeEach, vi } from 'vitest'

// store.js imports supabase at module load — stub it so nothing hits the network.
vi.mock('./supabase.js', () => ({
  supabase: { auth: {}, from: () => ({}) },
}))

import { session, profile, legacy, tier, canStore, canApprove } from './store.js'

beforeEach(() => {
  session.value = null
  profile.value = null
  legacy.value = false
})

describe('store gating (DS-02)', () => {
  it('anon — not logged in: no store, no approve', () => {
    expect(tier.value).toBe('anon')
    expect(canStore.value).toBe(false)
    expect(canApprove.value).toBe(false)
  })

  it('editor — logged in, plain role: may store, may not approve', () => {
    session.value = { user: { id: 'u1' } }
    profile.value = { role: 'editor' }
    expect(tier.value).toBe('editor')
    expect(canStore.value).toBe(true)
    expect(canApprove.value).toBe(false)
  })

  it('approver — logged in with approver role: may store and approve', () => {
    session.value = { user: { id: 'u2' } }
    profile.value = { role: 'approver' }
    expect(tier.value).toBe('approver')
    expect(canStore.value).toBe(true)
    expect(canApprove.value).toBe(true)
  })

  it('legacy — draft tables absent: treated as approver (bare Supabase still publishes)', () => {
    session.value = { user: { id: 'u3' } }
    legacy.value = true
    expect(tier.value).toBe('approver')
    expect(canStore.value).toBe(true)
    expect(canApprove.value).toBe(true)
  })
})
