// READ-ONLY snapshot of the live songs table, cached to disk so every rhythm
// diagnostic below runs against the exact same data. Never writes to the DB.
//   run: node tools/diag-rhythm-fetch.mjs <out.json>
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const SUPABASE_URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
const out = process.argv[2]
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const rows = []
for (let from = 0; ; from += 500) {
  const { data, error } = await sb
    .from('songs')
    .select('id,number,title_th,content,verified')
    .order('number')
    .range(from, from + 499)
  if (error) throw error
  rows.push(...data)
  if (data.length < 500) break
}
writeFileSync(out, JSON.stringify(rows))
console.log('songs:', rows.length)
