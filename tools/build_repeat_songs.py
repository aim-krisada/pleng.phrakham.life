"""Hand-build repeat+volta songs (99, 100) by spelling out the play order:
   line1(round1) -> ending1 -> line1(round2) -> ending2   (verse and refrain).
The v2 render can't show 2 different word-sets over one repeated line, so we expand
the repeat into linear play order (P'Aim: 'กาง 2 รอบตามเนื้อ')."""
import sys, glob, json
sys.path.insert(0, 'C:/gl/krisada/pleng.phrakham.life/.claude/worktrees/agitated-ptolemy-19d6ea/tools')
sys.stdout.reconfigure(encoding='utf-8')
from parse_song import (parse_pdf_melody, docx_structure, notes_to_line_items,
                        parse_title_meta, split_syls, align_syllables, strip_label, DEFAULT_CATEGORY)
import re, os

SRC = 'C:/Users/aimkr/OneDrive/4 Personal/pleng.phrakham.life/song-data/OneDrive_2_7-9-2026'

def line_items(sysm, i, ts):
    it, _ = notes_to_line_items(sysm[i]['notes'], sysm[i]['chords'], sysm[i].get('bars_x', []), ts)
    return it

def section(sysm, staves, l1, e1, e2, r1_ly, e1_ly, r2_ly, e2_ly, ts, warns, tag):
    """One repeat+volta section (verse or refrain), spelled out to 4 lines."""
    lines = [line_items(sysm, l1, ts), line_items(sysm, e1, ts),
             line_items(sysm, l1, ts), line_items(sysm, e2, ts)]
    flat = [it for ln in lines for it in ln]
    def body(s): return strip_label(s)[1]
    words = ' '.join([body(r1_ly), body(e1_ly), body(r2_ly), body(e2_ly)])
    syl = align_syllables(flat, split_syls(words), tag, warns)
    return lines, syl

def build(number, ts):
    f = glob.glob(f'{SRC}/{number} *.pdf')[0]; base = f[:-4]
    sysm = parse_pdf_melody(base + '.pdf')
    header, staves, extra = docx_structure(base + '.docx')
    title, theme, refs, scripture = parse_title_meta(header)
    # chord-derived key
    def root(t):
        m = re.match(r'([A-G])([#b]?)', t); return (m.group(1)+m.group(2)) if m else None
    seq = [root(t) for s in sysm for _, t in s['chords'] if root(t)]
    key = seq[-1] if seq else 'C'
    warns = []
    # VERSE: staves 0,1,2 (line1 has 2 rounds)
    v_lines, v_syl = section(sysm, staves, 0, 1, 2,
                             staves[0][0], staves[1][0], staves[0][1], staves[2][0], ts, warns, 'verse')
    # REFRAIN: staves 3,4,5 (line1 has 2 rounds)
    r_lines, r_syl = section(sysm, staves, 3, 4, 5,
                             staves[3][0], staves[4][0], staves[3][1], staves[5][0], ts, warns, 'refrain')
    stanzas = [{'id': 'A', 'lines': v_lines}, {'id': 'B', 'lines': r_lines}]
    arrangement = [{'stanza': 'A', 'label': 'ร้อง 1', 'syllables': v_syl},
                   {'stanza': 'B', 'label': 'รับ', 'syllables': r_syl}]
    # extra verses (2,3) reuse the verse (spelled-out) melody, best-effort
    vno = 1
    for blk in extra:
        vno += 1
        flat = [it for ln in v_lines for it in ln]
        syl = align_syllables(flat, split_syls(' '.join(strip_label(l)[1] if i == 0 else l for i, l in enumerate(blk['lines']))), f'ร้อง{vno}', warns)
        arrangement.append({'stanza': 'A', 'label': f'ร้อง {vno}', 'syllables': syl})
    warns.append('repeat + 1st/2nd ending (volta) spelled out to linear play order — verify')
    content = {'version': 2, 'key': key, 'timeSignature': ts, 'stanzas': stanzas, 'arrangement': arrangement}
    return {'number': number, 'title_th': title, 'title_en': None, 'theme': theme,
            'book_refs': refs, 'scripture': scripture, 'content': content, '_warnings': warns}

for n, ts in [(100, '4/4'), (99, '4/4')]:
    d = build(n, ts)
    json.dump(d, open(f'C:/gl/krisada/pleng.phrakham.life/.claude/worktrees/agitated-ptolemy-19d6ea/tools/samples/{n:03d}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    c = d['content']
    print(f"#{n} st={len(c['stanzas'])} arr={[(a['label'],a['stanza'],len([x for x in a['syllables'] if x])) for a in c['arrangement']]}")
