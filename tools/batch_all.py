#!/usr/bin/env python
"""
batch_all.py — parse ALL 120 YS-batch songs (PDF+DOCX) into v2 JSON seeds, and emit:
  * one JSON per song            -> <outdir>/json/NNN.json   (kept on OneDrive, not git)
  * one combined import SQL       -> tools/import-all-120.sql (upsert by number; in git)
  * a machine-readable risk index -> <outdir>/risk.json       (feeds the report table)

Run:  python batch_all.py "<source folder>" "<outdir>"
Uses build_song() from parse_song.py (same logic verified on the 5 pilots).
"""
import sys, os, re, glob, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_song import build_song, to_sql, schema_sql

def classify(doc):
    """Bucket a song's warnings into risk flags for the summary table."""
    ws = doc['_warnings']
    c = doc['content']
    flags = {
        'repeat_volta': sum('repeat/volta' in w for w in ws),
        'syl_mismatch': sum('syllables vs' in w for w in ws),
        'big_syl_gap': sum(1 for w in ws if (m := re.search(r'(\d+) syllables vs (\d+)', w)) and abs(int(m.group(1)) - int(m.group(2))) >= 4),
        'pairing_drift': any('systems' in w and '!=' in w for w in ws),
        'no_barline': sum('no printed barlines' in w for w in ws),
        'movable_do': any('movable-do' in w for w in ws),
        'no_chords': any('no chords' in w for w in ws),
        'empty_section': sum(1 for a in c['arrangement'] if not any(a['syllables'])),
    }
    heavy = (flags['repeat_volta'] > 0 or flags['big_syl_gap'] > 0 or
             flags['pairing_drift'] or flags['no_chords'] or flags['no_barline'] > 1)
    return flags, heavy

def main():
    src, outdir = sys.argv[1], sys.argv[2]
    sys.stdout.reconfigure(encoding='utf-8')
    os.makedirs(os.path.join(outdir, 'json'), exist_ok=True)
    pdfs = {}
    for f in glob.glob(os.path.join(src, '*.pdf')):
        m = re.match(r'^(\d+)\s', os.path.basename(f))
        if m: pdfs[int(m.group(1))] = f
    docxs = {}
    for f in glob.glob(os.path.join(src, '*.docx')):
        m = re.match(r'^(\d+)\s', os.path.basename(f))
        if m: docxs[int(m.group(1))] = f

    numbers = sorted(set(pdfs) & set(docxs))
    missing = sorted((set(pdfs) | set(docxs)) - set(numbers))
    sql_parts = [
        "-- ============================================================================\n"
        "-- IMPORT: all 120 songs (v2 seeds), category='anuchon' (อนุชน), verified=false.\n"
        "-- Upsert by (category, number) — OVERWRITES an existing anuchon song of that no.\n"
        "-- ⚠️  RUN tools/backup-songs.sql FIRST. This writes the LIVE DB → the website\n"
        "--     updates immediately. CONFIRM the Supabase project = vlpuvaofbzdawgjjpgfu.\n"
        "-- NOTE: after the ALTER, any pre-existing song with no category becomes 'anuchon'\n"
        "--       (correct if those were anuchon songs; if some belong to another category,\n"
        "--       fix them before/after — flag to P'Aim).\n"
        "-- Seeds: open each song in Studio afterward to repair the -- REVIEW spots.\n"
        "-- ============================================================================\n\n"
        "begin;\n\n" + schema_sql()
    ]
    risk = []
    errors = []
    for n in numbers:
        try:
            doc = build_song(pdfs[n], docxs[n])
        except Exception as e:
            errors.append((n, repr(e)))
            print(f'  #{n} ERROR {e!r}')
            continue
        json.dump(doc, open(os.path.join(outdir, 'json', f'{n:03d}.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        sql_parts.append(to_sql(doc) + '\n')
        flags, heavy = classify(doc)
        risk.append({'number': n, 'title': doc['title_th'], 'key': doc['content']['key'],
                     'ts': doc['content']['timeSignature'],
                     'stanzas': len(doc['content']['stanzas']),
                     'arrangement': len(doc['content']['arrangement']),
                     'warnings': len(doc['_warnings']), 'flags': flags, 'heavy': heavy})
    sql_parts.append("commit;\n")
    open('tools/import-all-120.sql', 'w', encoding='utf-8').write(''.join(sql_parts))
    json.dump({'risk': risk, 'errors': errors, 'missing': missing},
              open(os.path.join(outdir, 'risk.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    heavy = [r for r in risk if r['heavy']]
    print(f'\nparsed {len(risk)}/{len(numbers)} songs · errors {len(errors)} · missing pair {missing}')
    print(f'heavy-review songs: {len(heavy)} -> {[r["number"] for r in heavy]}')
    agg = collections.Counter()
    for r in risk:
        for k, v in r['flags'].items():
            if v: agg[k] += 1
    print('songs touched per flag:', dict(agg))
    print('wrote tools/import-all-120.sql +', os.path.join(outdir, 'json/*.json'), '+ risk.json')

if __name__ == '__main__':
    main()
