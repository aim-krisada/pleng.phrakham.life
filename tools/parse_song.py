#!/usr/bin/env python
"""
parse_song.py — turn one YS-batch song (PDF + DOCX pair) into a v2 song-model JSON seed.

Source strategy (Step 1 decision — see docs/reports/da-import.md):
  * MELODY from the PDF via pdfplumber geometry. Note digits carry precise (x, y);
    octave dots are vector `curves` above/below a digit; eighth/sixteenth underlines
    are thin horizontal `rects`; chords are the letter row above. The PDF is the only
    source that renders octave dots positionally — 114/120 songs bury them in Word as
    free-floating drawing ovals that no text/format read can tie back to a note.
  * THAI LYRICS from the DOCX (the PDF drops every Thai glyph to punctuation).
    Syllables are read in order and aligned 1:1 to the melody's syllable-bearing notes.

Seed generator: it flags every uncertainty (beat mismatch, syllable/​note mismatch,
repeat/volta, low confidence) so a human repairs it in Studio. Never guesses silently.

Usage:  python parse_song.py "<pdf>" "<docx>" [-o out.json] [--debug]
"""
import sys, os, json, re
import pdfplumber
from docx import Document
from docx.oxml.ns import qn

THAI = lambda ch: '฀' <= ch <= '๿'
ACC = {'♯': '#', '♮': 'n', '♭': 'b'}
EXPECT = {'4/4': 4, '3/4': 3, '6/8': 3, '2/4': 2, '4/8': 2, '12/8': 6, '9/8': 4.5, '2/2': 4, '3/8': 1.5, '6/4': 6}

# ----------------------------------------------------------------- PDF melody

def cluster_rows(chars, tol=3):
    rows = []
    for c in sorted(chars, key=lambda c: (c['top'], c['x0'])):
        for r in rows:
            if abs(r['top'] - c['top']) <= tol:
                r['chars'].append(c); break
        else:
            rows.append({'top': c['top'], 'chars': [c]})
    for r in rows:
        r['chars'].sort(key=lambda c: c['x0'])
        r['top'] = min(c['top'] for c in r['chars'])
    return sorted(rows, key=lambda r: r['top'])

def is_note_row(row):
    txt = [c['text'] for c in row['chars']]
    return sum(t in '01234567' for t in txt) >= 4 and not any(THAI(t) for t in txt)

def octave_of(digit, curves):
    cx = (digit['x0'] + digit['x1']) / 2
    dt = digit['top']
    best = None
    for cu in curves:
        ccx = (cu['x0'] + cu['x1']) / 2
        if abs(ccx - cx) > 6:
            continue
        off = cu['top'] - dt                 # vertical offset from the digit's top
        if 13 <= off <= 30:   d = 'low'      # dot below the number
        elif -16 <= off <= -3: d = 'high'    # dot above the number
        else: continue
        dist = abs(ccx - cx)
        if best is None or dist < best[1]: best = (d, dist)
    return best[0] if best else None

def underline_count(digit, rects):
    tops = []
    for r in rects:
        if r['width'] > 4 and r['height'] < 2 and r['x0'] < digit['x1'] and r['x1'] > digit['x0']:
            off = r['top'] - digit['top']
            if 13 <= off <= 26:
                tops.append(round(r['top']))
    return min(len(set(tops)), 2)

def group_chords(chars):
    toks, cur = [], None
    for c in sorted(chars, key=lambda c: c['x0']):
        t = c['text']
        if t.isspace():
            cur = None; continue
        t = ACC.get(t, t)
        if cur and c['x0'] - cur['x1'] < 5:
            cur['text'] += t; cur['x1'] = c['x1']
        else:
            cur = {'x0': c['x0'], 'x1': c['x1'], 'text': t}; toks.append(cur)
    return [(tk['x0'], tk['text'].strip()) for tk in toks if re.match(r'^[A-G]', tk['text'].strip())]

def dur(tok):
    if tok == '-': return 1.0
    m = re.match(r"[.#bn]*\.?\d('*)(_*)(\.?)", tok)  # rough; compute from marks below
    u = tok.count('_'); base = 0.5 ** u
    if tok.endswith('.') and not tok.endswith("'."): base *= 1.5
    # a trailing '.' after digit/underline = augmentation; leading '.' = low octave (no dur effect)
    if re.search(r"\d'?_*\.$", tok): base = (0.5 ** u) * 1.5
    return base

def parse_pdf_melody(pdf_path, debug=False):
    systems = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            rows = cluster_rows(page.chars)
            for ri, row in enumerate(rows):
                if not is_note_row(row): continue
                top = row['top']; bottom = max(c['bottom'] for c in row['chars'])
                curves = [c for c in page.curves if top - 20 <= c['top'] <= bottom + 20]
                rects = page.rects
                notes, pending = [], ''
                markers = []
                for c in row['chars']:
                    t = c['text']
                    if t in ACC: pending = ACC[t]; continue
                    if t in '01234567':
                        oc = octave_of(c, curves); u = underline_count(c, rects)
                        tok = ('.' if oc == 'low' else '') + (pending) + t + ("'" if oc == 'high' else '') + '_' * u
                        pending = ''
                        notes.append({'x': c['x0'], 'x1': c['x1'], 'tok': tok})
                    elif t in '-–':
                        notes.append({'x': c['x0'], 'x1': c['x0'] + 6, 'tok': '-'})
                    elif t == '.':
                        if notes and notes[-1]['tok'] not in ('-',) and c['x0'] > notes[-1].get('x1', 0) - 2 and c['x0'] - notes[-1]['x'] < 12:
                            notes[-1]['tok'] += '.'
                    elif t in '║:':
                        markers.append((c['x0'], t))
                # chord row above
                chords = []
                for above in reversed(rows[:ri]):
                    if above['top'] <= top - 45: break
                    if any(c['text'] in 'ABCDEFG' for c in above['chars']):
                        chords = group_chords(above['chars']); break
                systems.append({'chords': chords, 'notes': notes, 'markers': markers,
                                'top': top, 'page': page.page_number})
                if debug:
                    print(f"[p{page.page_number} top={top:.0f}] " + ' '.join(n['tok'] for n in notes))
                    print("    chords:", [(round(x), t) for x, t in chords], "markers:", markers)
    return systems

# --------------------------------------------------------------- DOCX lyrics

def docx_blocks(path):
    """Ordered list of {note: <text>, lyrics: [lines]} — one per printed staff line."""
    doc = Document(path)
    NOTECHARS = set("01234567.-♯♮♭║:()0,~ \t")
    def txt(p):
        return ''.join((n.text or '') if n.tag == qn('w:t') else ('\t' if n.tag == qn('w:tab') else '')
                        for n in p._p.iter())
    def is_note(t):
        lo = [c for c in t if c not in NOTECHARS]
        return sum(c.isdigit() for c in t) >= 4 and len(lo) <= 1
    def is_chord(t):
        return bool(re.search(r'[A-G][#♯b♭m0-9/]', t)) and not any(THAI(c) for c in t)
    blocks, cur = [], None
    header = []
    for p in doc.paragraphs:
        t = txt(p).rstrip()
        if not t.strip(): continue
        if is_note(t):
            cur = {'note': t, 'lyrics': []}; blocks.append(cur)
        elif cur is not None and not is_chord(t) and any(THAI(c) for c in t):
            cur['lyrics'].append(t.strip())
        elif not blocks and not is_chord(t):
            header.append(t.strip())
    return header, blocks

def split_syls(lyric):
    """Segment a Thai lyric line into syllables aligned to notes.
    Respects the author's explicit spaces (word/phrase breaks) and hyphens (same-word
    syllable breaks, kept as a leading '-'); for an unspaced Thai chunk it falls back to
    the pythainlp dictionary syllable tokenizer. Commas are phrase punctuation, dropped."""
    from pythainlp import subword_tokenize
    out = []
    for chunk in lyric.replace(',', ' ').split():
        parts = chunk.split('-')                     # author's own syllable hyphens
        for pi, part in enumerate(parts):
            if not part: continue
            syls = subword_tokenize(part, engine='dict') or [part]
            for si, s in enumerate(syls):
                s = s.strip()
                if not s: continue
                # a leading '-' (visible hyphen) marks the author's OWN same-word split
                # (ส-ถิต); tokenizer-split syllables are space-joined like existing seeds.
                out.append('-' + s if (pi > 0 and si == 0) else s)
    return out

def strip_label(lyric):
    m = re.match(r'^\s*(\(รับ\)|\(สร้อย\)|\d+\.)\s*(.*)$', lyric)
    if m:
        lab = m.group(1)
        lab = 'รับ' if 'รับ' in lab or 'สร้อย' in lab else 'ร้อง ' + lab.rstrip('.')
        return lab, m.group(2)
    return '', lyric

# --------------------------------------------------------------- assemble v2

def notes_to_line_items(notes, chords, ts):
    """Split a system's notes into [{segment}|{bar}] items: chords by x, bars by beats."""
    exp = EXPECT.get(ts)
    # assign each note the chord whose x it is closest to at/after
    def chord_at(nx):
        best = None
        for cx, ct in chords:
            if cx <= nx + 8:
                if best is None or cx > best[0]: best = (cx, ct)
        return best[1] if best else ''
    items, seg, beats, warn = [], None, 0.0, []
    last_chord = None
    def flush_seg():
        nonlocal seg
        if seg and seg['note']:
            items.append({'type': 'segment', 'chord': seg['chord'], 'note': seg['note'].strip()})
        seg = None
    for i, n in enumerate(notes):
        ch = chord_at(n['x'])
        newchord = (ch != last_chord)
        if seg is None or newchord:
            flush_seg()
            seg = {'chord': ch if newchord else '', 'note': ''}
            last_chord = ch
        seg['note'] += ' ' + n['tok']
        beats += dur(n['tok'])
        if exp and abs(beats - exp) < 0.01:
            flush_seg(); items.append({'type': 'bar'}); beats = 0.0
            last_chord = ch  # keep chord across bar unless it changes
    flush_seg()
    if exp and beats > 0.01:
        warn.append(f'last bar {round(beats,2)} beats (expected {exp})')
    return items, warn

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    pdf, docx = args[0], args[1]
    out = None
    if '-o' in sys.argv: out = sys.argv[sys.argv.index('-o') + 1]
    debug = '--debug' in sys.argv
    sys.stdout.reconfigure(encoding='utf-8')

    systems = parse_pdf_melody(pdf, debug=debug)
    header, blocks = docx_blocks(docx)

    # metadata from docx header
    warnings = []
    title = re.sub(r'^\d+\s+', '', header[0]) if header else os.path.basename(docx)
    number = int(re.match(r'^(\d+)', os.path.basename(docx)).group(1))
    key, ts = None, None
    for h in header:
        mk = re.search(r'([A-G][#♯b♭]?)\s*(?:Major|major|Maj|เมเจอร์)', h)
        if mk and key is None: key = mk.group(1).replace('♯', '#').replace('♭', 'b')
        mt = re.search(r'(\d+\s*/\s*\d+)', h)
        if mt and ts is None: ts = mt.group(1).replace(' ', '')
    if ts is None: ts = '4/4'; warnings.append('time signature not found — defaulted 4/4')
    if key is None: key = 'C'; warnings.append('key not found in header — defaulted C')

    # movable-do check: numbers reference `key`, but printed guitar chords may be in a
    # different sounding key. Flag when the chord roots imply a key the header didn't state.
    chord_roots = {t[0] for s in systems for _, t in s['chords']}
    if chord_roots and key and key not in chord_roots and not any(key in t for s in systems for _, t in s['chords']):
        warnings.append(f'key "{key}" (from header) not among chord roots {sorted(chord_roots)} — likely movable-do (numbers=do reference, chords in sounding key); confirm which key to store')
    if len(systems) != len(blocks):
        warnings.append(f'PDF systems ({len(systems)}) != DOCX staff lines ({len(blocks)}) — pairing by order may drift')

    # build stanzas (dedup identical melody) + arrangement rows
    stanzas, key_to_id, arrangement = [], {}, []
    next_id = ord('A')
    for i, sysm in enumerate(systems):
        items, w = notes_to_line_items(sysm['notes'], sysm['chords'], ts)
        for msg in w: warnings.append(f'system {i+1}: {msg}')
        if sysm['markers']:
            warnings.append(f"system {i+1}: repeat/volta markers {sysm['markers']} — NEEDS manual repeat/volta")
        melody_key = json.dumps(items, ensure_ascii=False)
        if melody_key not in key_to_id:
            sid = chr(next_id); next_id += 1
            key_to_id[melody_key] = sid
            stanzas.append({'id': sid, 'lines': [items]})
        sid = key_to_id[melody_key]
        lyric_lines = blocks[i]['lyrics'] if i < len(blocks) else []
        if not lyric_lines: lyric_lines = ['']
        for ll in lyric_lines:
            label, body = strip_label(ll)
            syls = align_syllables(items, split_syls(body), i + 1, warnings)
            arrangement.append({'stanza': sid, 'label': label, 'syllables': syls})

    content = {'version': 2, 'key': key, 'timeSignature': ts,
               'stanzas': stanzas, 'arrangement': arrangement}
    doc_out = {'number': number, 'title_th': title, 'title_en': None,
               'content': content, '_warnings': warnings}
    text = json.dumps(doc_out, ensure_ascii=False, indent=2)
    if out:
        open(out, 'w', encoding='utf-8').write(text)
        print('wrote', out)
    else:
        print(text)
    if warnings:
        print('\n--- WARNINGS ---', file=sys.stderr)
        for w in warnings: print(' *', w, file=sys.stderr)

def align_syllables(items, syls, sysno, warnings):
    """Place syllables onto syllable-bearing note boxes (attack=word, held/rest=blank)."""
    from subprocess import run
    # replicate notation.noteBoxKinds in python (attack/held/struct)
    out, w = [], 0
    attacks = 0
    prev = None; slur = False
    def kind(box):
        nonlocal prev, slur
        if box in ('(', ')'): slur = (box == '('); prev = None; return 'struct'
        if box in ('{', '}'): prev = None; return 'struct'
        if box in ('-', '–'): return 'held'
        m = re.match(r"([#bn]?)(\.*)([0-7])('*)", box)
        if not m: prev = None; return 'struct'
        acc, low, pitch, high = m.groups()
        if pitch == '0': prev = None; return 'held'
        k = acc + pitch + str(len(high) - len(low))
        held = (slur and prev == k)
        prev = k
        return 'held' if held else 'attack'
    boxes = []
    for it in items:
        if it['type'] == 'segment':
            boxes += it['note'].split()
    for b in boxes:
        kd = kind(b)
        if kd == 'struct': continue
        if kd == 'attack':
            out.append(syls[w] if w < len(syls) else '')
            w += 1; attacks += 1
        else:
            out.append('')
    if syls and w != len(syls):
        warnings.append(f'system {sysno}: {len(syls)} syllables vs {attacks} attack notes')
    return out

if __name__ == '__main__':
    main()
