#!/usr/bin/env python
"""Build the 16 repeat/volta songs with auto-expanded arrangement (P'Aim option B).

Signal = STACKED LYRICS: a printed melody line with 2 lyric rows = sung twice. Per
marker-delimited block, the leading 2-row staves are the repeated lines and the trailing
1-row staves are the endings (volta). Expand to linear play order:
    round 1 = repeat-lines(row0) + ending1 ;  round 2 = repeat-lines(row1) + ending2
Verified vs the rendered image on 66 (simple) & 100 (volta). SIMPLE songs (1 repeat/block)
come out right; COMPLEX multi-repeat songs (e.g. 40) are best-effort — they keep the
`repeat` review flag for a human pass. verified stays false.

Emits per-song JSON (tools/samples/NNN.json) + a combined content-UPDATE (tools/repeat-16.sql).
Run:  python build_repeat_songs.py
"""
import sys, os, glob, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
from parse_song import (parse_pdf_melody, docx_structure, notes_to_line_items,
                        parse_title_meta, split_syls, align_syllables, strip_label)

SRC = 'C:/Users/aimkr/OneDrive/4 Personal/pleng.phrakham.life/song-data/OneDrive_2_7-9-2026'
REPEAT_16 = [2, 20, 25, 36, 40, 53, 61, 66, 69, 72, 73, 74, 80, 85, 88, 117]
# SIMPLE = 1 repeat line per block (auto reliable); the rest are best-effort.
SIMPLE = {2, 36, 66, 69, 74, 117}

def li(sysm, i, ts):
    it, _ = notes_to_line_items(sysm[i]['notes'], sysm[i]['chords'], sysm[i].get('bars_x', []), ts)
    return it

def ts_of(header):
    for h in header:
        m = re.search(r'(\d+\s*/\s*\d+)', h)
        if m: return m.group(1).replace(' ', '')
    return '4/4'

def key_of(sysm):
    def root(t):
        m = re.match(r'([A-G])([#b]?)', t); return (m.group(1) + m.group(2)) if m else None
    seq = [root(t) for s in sysm for _, t in s['chords'] if root(t)]
    return seq[-1] if seq else 'C'

def marker_blocks(staves, n):
    out, cur = [], None
    for i in range(n):
        s = staves[i] if i < len(staves) else []
        t = s[0].lstrip() if s else ''
        refr = t.startswith('(รับ)') or t.startswith('รับ') or t.startswith('(สร้อย)')
        verse = bool(re.match(r'\d+\.', t))
        if cur is None or refr or verse:
            cur = {'kind': 'refrain' if refr else 'verse', 'idx': []}; out.append(cur)
        cur['idx'].append(i)
    return out

def expand_block(sysm, staves, blk, ts):
    """Return (stanza_lines, words) for a block, expanding a repeat if present."""
    idx = blk['idx']
    reps = [i for i in idx if i < len(staves) and len(staves[i]) >= 2]   # 2-round lines
    ends = [i for i in idx if i not in reps]                             # 1-round endings
    def body(s): return strip_label(s)[1]
    if not reps:                                                          # plain (no repeat)
        lines = [li(sysm, i, ts) for i in idx if i < len(sysm)]
        words = ' '.join(body(staves[i][0]) for i in idx if i < len(staves) and staves[i])
        return lines, words
    r1 = [(i, 0) for i in reps] + ([(ends[0], 0)] if ends else [])
    r2 = [(i, 1) for i in reps] + ([(ends[1], 0)] if len(ends) > 1 else ([(ends[0], 0)] if ends else []))
    seqp = r1 + r2
    lines = [li(sysm, i, ts) for i, _ in seqp if i < len(sysm)]
    words = ' '.join(body(staves[i][row]) for i, row in seqp
                     if i < len(staves) and row < len(staves[i]))
    return lines, words

def build(number):
    f = glob.glob(f'{SRC}/{number} *.pdf')[0]; base = f[:-4]
    sysm = parse_pdf_melody(base + '.pdf'); header, staves, extra = docx_structure(base + '.docx')
    title, theme, refs, scripture = parse_title_meta(header)
    ts, key = ts_of(header), key_of(sysm)
    warns = ['เพลงมีเล่นซ้ำ/จบ 2 แบบ — กางอัตโนมัติ (best-effort) · ตรวจ/เกลาใน Studio']
    if number not in SIMPLE:
        warns.append('COMPLEX (repeat หลายอันในท่อน) — auto อาจไม่ตรง · ตั้ง repeat ในแอป')

    stanzas, mel_to_id, arrangement = [], {}, []
    def stanza_for(lines):
        k = json.dumps(lines, ensure_ascii=False)
        if k not in mel_to_id:
            sid = chr(ord('A') + len(stanzas)); mel_to_id[k] = sid
            stanzas.append({'id': sid, 'lines': lines})
        return mel_to_id[k]
    verse_stanza_id = None
    vno = 0
    for blk in marker_blocks(staves, len(sysm)):
        lines, words = expand_block(sysm, staves, blk, ts)
        if not lines: continue
        sid = stanza_for(lines)
        if blk['kind'] == 'verse' and verse_stanza_id is None: verse_stanza_id = sid
        flat = [it for ln in lines for it in ln]
        syl = align_syllables(flat, split_syls(words), blk['kind'], warns)
        if blk['kind'] == 'refrain':
            arrangement.append({'stanza': sid, 'label': 'รับ', 'syllables': syl})
        else:
            vno += 1; arrangement.append({'stanza': sid, 'label': f'ร้อง {vno}', 'syllables': syl})
    # extra lyric-only verses reuse the verse stanza (spelled-out melody)
    vs = verse_stanza_id or (stanzas[0]['id'] if stanzas else 'A')
    vs_flat = [it for ln in next(s['lines'] for s in stanzas if s['id'] == vs) for it in ln]
    for blk in extra:
        vno += 1
        w = ' '.join(strip_label(l)[1] if i == 0 else l for i, l in enumerate(blk['lines']))
        arrangement.append({'stanza': vs, 'label': f'ร้อง {vno}',
                            'syllables': align_syllables(vs_flat, split_syls(w), 'x', warns)})
    content = {'version': 2, 'key': key, 'timeSignature': ts, 'stanzas': stanzas, 'arrangement': arrangement}
    return {'number': number, 'title_th': title, 'title_en': None, 'theme': theme,
            'book_refs': refs, 'scripture': scripture, 'content': content, '_warnings': warns}

def main():
    upd = ['-- Auto-expanded repeat/volta content for the 16 repeat songs (P Aim option B).',
           '-- Run AFTER import-all-120.sql. Updates content only; verified stays false and',
           '-- review_flags keep "repeat" (พี่เปา eyeballs). SIMPLE 6 reliable; COMPLEX 10 best-effort.',
           '', 'begin;']
    for n in REPEAT_16:
        doc = build(n)
        json.dump(doc, open(f'tools/samples/{n:03d}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        j = json.dumps(doc['content'], ensure_ascii=False)
        upd.append(f"update public.songs set content = $json${j}$json$::jsonb "
                   f"where category = 'anuchon' and number = {n};")
        c = doc['content']
        print(f"#{n:3} {'SIMPLE ' if n in SIMPLE else 'complex'} st={len(c['stanzas'])} "
              f"arr={[a['label'] for a in c['arrangement']]}")
    upd.append('commit;')
    open('tools/repeat-16.sql', 'w', encoding='utf-8').write('\n'.join(upd) + '\n')
    print('\nwrote tools/repeat-16.sql (16 content updates)')

if __name__ == '__main__':
    main()
