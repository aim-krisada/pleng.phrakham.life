<script setup>
// A playlist someone shared by link/QR (/#/list?d=<encoded>). Shows it READ-ONLY (a stranger's
// link must never silently overwrite this device's own playlists) until the reader taps
// "บันทึกลงเครื่องนี้", which copies it into local playlists (lib/playlists.js · no account).
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { session } from '../store.js'
import { visibleSongs } from '../lib/bookshelf.js'
import { decodeList, saveSharedList } from '../lib/playlists.js'
import { t } from '../i18n/index.js'

const route = useRoute()
const router = useRouter()

const decoded = computed(() => decodeList(route.query.d || ''))
const songs = ref([])
const loading = ref(true)
const saved = ref(false)

const loggedIn = computed(() => !!session.value)
const byId = computed(() => {
  const m = new Map()
  for (const s of visibleSongs(songs.value, loggedIn.value)) m.set(String(s.id), s)
  return m
})
// resolve the shared ids → song rows (in the shared order); unknown ids kept as placeholders
const items = computed(() => {
  if (!decoded.value) return []
  return decoded.value.songIds.map((id) => ({ id, song: byId.value.get(String(id)) || null }))
})
const foundCount = computed(() => items.value.filter((i) => i.song).length)

function save() {
  if (!decoded.value) return
  saveSharedList(decoded.value)
  saved.value = true
}

onMounted(async () => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, number, title_th, content, verified, category')
    .order('number', { ascending: true })
  songs.value = error || !data || !data.length ? SAMPLE_SONGS : data
  loading.value = false
})
</script>

<template>
  <div>
    <p v-if="!decoded" class="muted empty" aria-live="polite">{{ t('list.sharedBad') }}</p>

    <section v-else>
      <div class="level-head">
        <h2>🎵 {{ decoded.name }}</h2>
        <span class="count muted">{{ t('list.countSongs', { n: decoded.songIds.length }) }}</span>
      </div>

      <p class="muted">{{ t('list.sharedIntro') }}</p>

      <div class="sl-actions no-print">
        <button type="button" class="sl-save" :disabled="saved" @click="save">
          {{ saved ? t('list.savedDone') : t('list.saveHere') }}
        </button>
        <router-link to="/" class="sl-home">{{ t('list.backHome') }}</router-link>
      </div>

      <p v-if="loading" class="muted">{{ t('list.loading') }}</p>
      <template v-else>
        <div class="song-list">
          <template v-for="(it, i) in items" :key="i">
            <router-link v-if="it.song" :to="`/song/${it.song.id}`" class="song-row">
              <span class="no">{{ it.song.number != null ? it.song.number : '–' }}</span>
              <span class="ttl">{{ it.song.title_th }}</span>
              <span v-if="it.song.content && it.song.content.key" class="key">{{ t('list.key', { k: it.song.content.key }) }}</span>
            </router-link>
            <div v-else class="song-row missing">
              <span class="no">–</span>
              <span class="ttl muted">{{ t('list.songMissing') }}</span>
            </div>
          </template>
        </div>
        <p v-if="foundCount < decoded.songIds.length" class="muted sl-note">
          {{ t('list.someMissing', { found: foundCount, total: decoded.songIds.length }) }}
        </p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.level-head { display: flex; align-items: baseline; gap: var(--sp-3); flex-wrap: wrap; margin: 0 0 var(--sp-3); }
.level-head h2 { font-size: var(--fs-xl); color: var(--brand); }
.level-head .count { font-size: var(--fs-sm); }
.sl-actions { display: flex; gap: var(--sp-3); align-items: center; flex-wrap: wrap; margin: var(--sp-3) 0 var(--sp-5); }
.sl-save {
  min-height: var(--touch-min); border: none; border-radius: 10px; background: var(--accent);
  color: var(--ink); font: inherit; font-weight: 700; padding: 0 var(--sp-5); cursor: pointer;
}
.sl-save:disabled { background: var(--cream); color: var(--muted); cursor: default; }
@media (hover: hover) { .sl-save:not(:disabled):hover { background: var(--accent-hover); } }
.sl-home { color: var(--brand); }
.song-list { display: flex; flex-direction: column; gap: var(--sp-2); width: 100%; }
.song-row {
  display: flex; align-items: flex-start; gap: var(--sp-3);
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
  padding: var(--sp-3) var(--sp-4); color: var(--ink); text-decoration: none; min-height: var(--touch-min);
}
.song-row.missing { background: var(--cream); }
.song-row .no { min-width: 2.4em; text-align: right; color: var(--brand); font-weight: 700; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.song-row .ttl { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.song-row .key { color: var(--muted); font-size: var(--fs-xs); border: 1px solid var(--line); border-radius: 12px; padding: 1px var(--sp-2); white-space: nowrap; flex: 0 0 auto; }
.sl-note { margin-top: var(--sp-3); }
.empty { padding: var(--sp-6) 0; }
</style>
