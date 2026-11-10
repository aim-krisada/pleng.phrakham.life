// Make a new import key for db/014's import_draft() (ใบ v1#158).
//
//   node tools/make-import-key.mjs
//
// Prints two lines:
//   line 1 — the KEY  (64 hex chars). Keep it private: it goes ONLY into the PLENG_IMPORT_KEY
//            environment variable on the machine that imports. Never into the database,
//            never into git, never into a chat.
//   line 2 — its SHA-256 HASH. This is the only thing that goes into the database
//            (public.import_keys.key_hash — see the setup block at the bottom of db/014).
import { randomBytes, createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function makeImportKey() {
  const key = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(key, 'utf8').digest('hex')
  return { key, hash }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { key, hash } = makeImportKey()
  process.stdout.write(`${key}\n${hash}\n`)
}
