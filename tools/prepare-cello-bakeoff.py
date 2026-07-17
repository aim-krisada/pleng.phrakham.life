#!/usr/bin/env py -3.14
"""prepare-cello-bakeoff.py — build the 3 cello sample mirrors for the bake-off spike.

SPIKE TOOL (brief docs/pm/brief-cello-bakeoff.md). Repo tools are normally .mjs; this one is Python
because it MEASURES each sample's true pitch and loudness (needs numpy/scipy), and those measurements
are what make the bake-off fair. Run with the 3.14-64 interpreter that has numpy/scipy + ffmpeg on PATH:

    py -3.14 tools/prepare-cello-bakeoff.py

Output -> public/samples/_spike/{karoryfer,sso,iowa}/<midi>.ogg + preset.json   (GITIGNORED: the SSO
samples are CC Sampling Plus 1.0 = local experiment only, must NOT be committed. See the report.)

WHY MEASURE INSTEAD OF TRUSTING FILENAMES
  The shipped public/samples/CC0/cello preset declares pitch=24..72 for files whose real fundamentals
  are 36..84 — a whole octave out (Karoryfer names its low C "C1"; the prep script mapped C1->24).
  Trusting a filename is how that shipped. So every sample here is measured:
    * centre pitch  = MEDIAN of frame-wise autocorrelation f0 over the sustain (median, so the
      vibrato in the SSO/Iowa recordings averages out instead of reading as detuning)
    * loudness      = absolute RMS over the whole file (NOT peak-normalised)
  Validation that the method is sound: the cents it measures for SSO match SSO's OWN hand-authored
  sfz `tune=` values (fs4 -> measured +20.0 / author wrote -22; a5 -> +18.5 / -21; c5 -> +6.1 / -6).

FAIRNESS (the whole point — P'Aim's ear decides, so only the cello audio may differ)
  * per-region `detune` cancels each sample's measured cents error -> all 3 play in tune with the
    piano. Intonation is objective correctness, not taste; leaving Iowa ~38 cents sharp would sink it
    for a reason that has nothing to do with its timbre. The spike page has a toggle to hear it raw.
  * a per-library makeup gain matches the 3 libraries' MEAN RMS to a common target, so none wins by
    being louder. Loudness spread WITHIN a library is left alone (that is a real library property).
"""
import json, math, os, re, subprocess, sys, glob
from pathlib import Path

import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "samples" / "_spike"
FF = os.environ.get("FFMPEG", "ffmpeg")
Q = "5"  # libvorbis ~160 kbps — same setting tools/prepare-samples-cc0.mjs uses

# Sources. Karoryfer = P'Aim's local download; SSO = fetched by tools/fetch-sso-cello (see report);
# Iowa = extracted from the Canon spike branch (git show claude/dreamy-lumiere-68292a:...).
KARORYFER = Path(os.environ.get("KARORYFER", r"C:\Users\aimkr\Downloads\karoryfer-bigcat.cello-master")) / "Samples" / "sus"
SSO = Path(os.environ.get("SSO_SRC", ""))    # dir of cello-*.wav/flac
IOWA = Path(os.environ.get("IOWA_SRC", ""))  # dir of <midi>.ogg (cello-iowa/mf)

CELLO_LO, CELLO_HI = 36, 84   # real cello range: open C (36) .. high register
TARGET_RMS_DB = -20.0         # common loudness target for all 3 libraries

# Karoryfer names its lowest note "C1", but that note MEASURES as MIDI 36 (C2, the open C string —
# MIDI 24 is below a double bass and no cello can play it). So the naive `C1 -> 24` reading of the
# filename is a whole octave low; +12 corrects it. This is NOT a guess from the name: every one of the
# 17 pitches measured exactly +12 from the naive reading, and the physics agrees. It's used only as a
# PRIOR to keep the f0 search near the right note (see measure()); the pitch is still measured, and a
# file that lands outside the window is flagged rather than trusted.
OCTAVE_FIX = 12

# The 17 pitches Karoryfer records (minor thirds, C/Eb/Gb/A across the cello's range). Any Karoryfer-
# derived set MUST land on exactly these; anything else means files were missed by a glob.
KARORYFER_PITCHES = [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84]


# ---------- measurement ----------------------------------------------------------------------
def decode(path):
    out = subprocess.run([FF, "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", "44100", "-f", "wav", "-"],
                         capture_output=True).stdout
    sr, x = wavfile.read(__import__("io").BytesIO(out))
    if x.dtype == np.int16:   x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32: x = x.astype(np.float64) / 2147483648.0
    else:                     x = x.astype(np.float64)
    if x.ndim > 1: x = x.mean(axis=1)
    return sr, x


def frame_f0(seg, sr, f_lo=25.0, f_hi=1200.0):
    """Autocorrelation f0 within [f_lo, f_hi].

    The window matters: on a SOFT bow the fundamental is weak and an upper harmonic can dominate, so
    an unconstrained search locks onto it. Real case (16 ก.ค.): C2_p_d.wav is MIDI 48 (f0 130.8 Hz)
    but its 3rd harmonic at 392.5 Hz is ~19 dB stronger, and 392.5 Hz reads as MIDI 67 — every frame
    agreed, so taking the median could not save it. That produced a phantom region at pitch 67 which
    played a C2 sample ~19 semitones below the written note = a note that never speaks. Callers pass a
    window around the expected pitch to make that impossible.
    """
    s = seg - seg.mean()
    if np.sqrt((s ** 2).mean()) < 1e-4: return None
    n = len(s)
    ac = np.correlate(s, s, mode="full")[n - 1:]
    if ac[0] <= 0: return None
    ac /= ac[0]
    lo, hi = int(sr / f_hi), min(int(sr / f_lo), len(ac) - 1)
    if hi <= lo: return None
    k = int(np.argmax(ac[lo:hi])) + lo
    if ac[k] < 0.3: return None
    if 0 < k < len(ac) - 1:                      # parabolic refine
        a, b, c = ac[k - 1], ac[k], ac[k + 1]
        d = a - 2 * b + c
        if d != 0: k = k + 0.5 * (a - c) / d
    return sr / k


def midi_to_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def attack_ms(x, sr, frac=0.5):
    """Time until the RMS envelope first reaches `frac` of its sustain plateau, in ms.

    Feeds the NEGATIVE DELAY (PM, 16 ก.ค. · docs/pm/audio-round2-techniques.md): a bowed note's energy
    ramps up, so firing it ON the beat makes it arrive LATE against the piano's instant attack — every
    clip equally. Left uncompensated P'Aim could reject all three cellos for OUR timing error rather
    than for their sound (a false negative that would close the project for the wrong reason).

    frac=0.5 (the half-power point) is used as the perceptual onset: t_peak is far too late to shift by
    (the plateau is reached hundreds of ms in), while the very start of the ramp is inaudibly quiet.
    Per the spec the value is MEASURED per sample-set — never the advisor's generic "30-80ms".
    """
    FRAME_MS = 5.0        # 5 ms frames: at 10 ms the quantisation error was itself ~20 ms on the
    w = max(1, int(sr * FRAME_MS / 1000))             # fastest set (Karoryfer read 40 ms; really ~20)
    n = len(x) // w
    if n < 5: return 0.0
    e = np.array([np.sqrt((x[i*w:(i+1)*w] ** 2).mean()) for i in range(n)])
    a, b = int(n*0.15), int(n*0.6)
    plateau = float(np.median(e[a:b])) if b > a else float(e.max())
    idx = np.where(e >= max(plateau, 1e-9) * frac)[0]
    return round(float(idx[0]) * FRAME_MS, 1) if len(idx) else 0.0


def quietest_100ms_db(x, sr):
    """Level of the quietest 100 ms in the file.

    ⚠️ NOT a noise floor for these libraries, and must not be reported as one. It only equals the
    noise floor if the file CONTAINS silence. Karoryfer's samples are trimmed to start right at the
    attack (measured: sound present at 0 ms) and are cut while still ringing, so the quietest frame is
    the note's own DECAY TAIL — which made the naive "SNR" read 11 dB for p and 6 dB for mf, i.e.
    backwards and far too low for real recordings (Iowa reads 40 dB only because it has silent
    padding). Kept for the record; the honest statement about hiss risk is the MAKEUP DELTA
    (p needs ~10 dB more gain than mf), plus P'Aim's ear.
    """
    w = max(1, int(sr * 0.1))
    n = len(x) // w
    if n < 2: return -120.0
    frames = [float(np.sqrt((x[i*w:(i+1)*w] ** 2).mean())) for i in range(n)]
    return round(20 * math.log10(max(min(frames), 1e-9)), 2)


def timbre(x, sr):
    """(centroid_hz, hf_ratio_db) on the sustain, NORMALISED to unit RMS.

    Loudness-matched on purpose: it answers "is this layer a DARKER TIMBRE" rather than "is it
    quieter". Verified claim (16 ก.ค.): p vs mf at equal loudness = -167 Hz centroid, -5.7 dB above
    2 kHz -> the soft layers really are a different bow tone, not a turned-down mf.
    """
    a = int(0.35*sr); b = min(len(x), a + int(1.5*sr))
    if b - a < sr//4: a, b = 0, len(x)
    seg = x[a:b]
    r = np.sqrt((seg**2).mean())
    if r < 1e-6: return 0.0, -120.0
    w = (seg/r) * np.hanning(len(seg))
    S = np.abs(np.fft.rfft(w, 1 << 17)) ** 2
    f = np.fft.rfftfreq(1 << 17, 1/sr)
    band = (f >= 40) & (f <= 12000)
    cen = float((f[band]*S[band]).sum() / max(S[band].sum(), 1e-30))
    hf = S[(f > 2000) & (f <= 12000)].sum() / max(S[band].sum(), 1e-30)
    return round(cen, 1), round(float(10*np.log10(max(hf, 1e-12))), 2)


def measure(path, expect_midi=None):
    """-> dict(midi, cents_off, vibrato_cents, rms_db, peak_db, dur, attack_ms, ...) — MEDIAN pitch.

    `expect_midi` (from the filename, via a convention that was itself ESTABLISHED by measurement —
    see karoryfer_note) narrows the f0 search to +-4 semitones. This is not "trusting the filename":
    the pitch is still measured, the returned cents error is still whatever the audio says, and a file
    that genuinely sits outside the window is FLAGGED rather than silently accepted. It only removes
    the detector's freedom to lock onto a harmonic 19 semitones up.
    """
    sr, x = decode(path)
    peak, rms = float(np.max(np.abs(x))), float(np.sqrt((x ** 2).mean()))
    atk = attack_ms(x, sr)
    nf = quietest_100ms_db(x, sr)
    cen, hf = timbre(x, sr)
    if expect_midi is not None:
        f_lo, f_hi = midi_to_hz(expect_midi - 4), midi_to_hz(expect_midi + 4)
    else:
        f_lo, f_hi = 25.0, 1200.0
    a = int(0.30 * sr); b = min(len(x), a + int(2.5 * sr))
    if b - a < sr // 3: a, b = 0, len(x)
    W, H = int(0.06 * sr), int(0.02 * sr)
    f0s = [f for i in range(a, b - W, H) if (f := frame_f0(x[i:i + W], sr, f_lo, f_hi))]
    if len(f0s) < 5: raise RuntimeError(f"cannot measure pitch: {path}")
    f0s = np.array(f0s)
    med = float(np.median(f0s))
    f0s = f0s[(f0s > med * 0.8) & (f0s < med * 1.25)]      # drop octave-jump outliers
    med = float(np.median(f0s))
    midi_f = 69 + 12 * math.log2(med / 440.0)
    midi = int(round(midi_f))
    lo_p, hi_p = np.percentile(f0s, 5), np.percentile(f0s, 95)
    # a file whose measured pitch escapes the expected window is a REAL anomaly, not a detector
    # artefact -> surface it instead of quietly mapping a wrong sample onto a key.
    mismatch = expect_midi is not None and abs(midi - expect_midi) > 1
    return dict(midi=midi, cents_off=round((midi_f - midi) * 100, 1),
                vibrato_cents=round(1200 * math.log2(hi_p / lo_p), 1),
                rms_db=round(20 * math.log10(rms or 1e-9), 2),
                peak_db=round(20 * math.log10(peak or 1e-9), 2), dur=round(len(x) / sr, 3),
                attack_ms=atk, quietest_100ms_db=nf, centroid_hz=cen, hf_ratio_db=hf,
                expect_midi=expect_midi, mismatch=mismatch)


# ---------- SSO loop points (shipped by the library, parsed from its own sfz) ------------------
def sso_loops(sfz_path):
    """{sample_basename: (loop_start_sec, loop_end_sec)} — SSO ships loop points so a held note can
    sustain. Karoryfer/Iowa are one-shot by design; see the report's 'not a like-for-like' note."""
    if not sfz_path or not Path(sfz_path).exists(): return {}
    txt = Path(sfz_path).read_text()
    out = {}
    for blk in txt.split("<region>")[1:]:
        s = re.search(r"sample=.*[\\/]([^\\/\n\r]+)", blk)
        ls, le = re.search(r"loop_start=(\d+)", blk), re.search(r"loop_end=(\d+)", blk)
        if s and ls and le:
            out[s.group(1).strip()] = (int(ls.group(1)) / 44100.0, int(le.group(1)) / 44100.0)
    return out


# ---------- build ------------------------------------------------------------------------------
def convert(src, dst, gain_db, stereo):
    dst.parent.mkdir(parents=True, exist_ok=True)
    af = f"volume={gain_db:.2f}dB" if abs(gain_db) > 0.01 else "anull"
    cmd = [FF, "-v", "error", "-y", "-i", str(src), "-af", af,
           "-ac", "2" if stereo else "1", "-c:a", "libvorbis", "-q:a", Q, str(dst)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: raise RuntimeError(f"ffmpeg failed for {src}: {r.stderr}")


def spread_key_ranges(pitches):
    """Each sample covers up to the midpoint to its neighbours; the edges stretch to the cello range."""
    ps = sorted(pitches)
    ranges = {}
    for i, p in enumerate(ps):
        lo = CELLO_LO if i == 0 else int(math.floor((ps[i - 1] + p) / 2)) + 1
        hi = CELLO_HI if i == len(ps) - 1 else int(math.floor((p + ps[i + 1]) / 2))
        ranges[p] = [lo, hi]
    return ranges


def build(lib, files, expect_of, stereo=False, loops=None, naive_of=None, expect_pitches=None):
    print(f"\n### {lib}")
    rows = []
    for f in files:
        # expected pitch per THIS library's own convention (Karoryfer needs +12; Iowa's filenames are
        # already honest MIDI). Only a search prior — the pitch is still measured, and anything that
        # lands outside the window is flagged, not trusted.
        expect = expect_of(Path(f).name)
        m = measure(f, expect_midi=expect)
        m["src"] = str(f); m["file"] = Path(f).name
        naive = naive_of(Path(f).name) if naive_of else None
        if naive is not None and naive != m["midi"]:
            print(f"  ! {Path(f).name:18s} filename says MIDI {naive} but MEASURES {m['midi']} "
                  f"({m['midi']-naive:+d} semitones)")
        if m.get("mismatch"):
            print(f"  🔴 {Path(f).name:18s} measured {m['midi']} but expected ~{expect} — INVESTIGATE")
        rows.append(m)

    # one sample per pitch (drop dupes, keep the loudest)
    by_pitch = {}
    for r in rows:
        if r["midi"] not in by_pitch or r["rms_db"] > by_pitch[r["midi"]]["rms_db"]:
            by_pitch[r["midi"]] = r

    if expect_pitches and sorted(by_pitch) != sorted(expect_pitches):
        missing = [p for p in expect_pitches if p not in by_pitch]
        extra = [p for p in by_pitch if p not in expect_pitches]
        print(f"  🔴 {lib}: got {len(by_pitch)} pitches, expected {len(expect_pitches)}"
              f" · missing {missing} · unexpected {extra}")
        raise SystemExit(f"{lib}: incomplete pitch set — a missing pitch is silently faked by "
                         f"stretching a neighbour = wrong notes. Fix the source glob.")
    mean_rms = sum(r["rms_db"] for r in by_pitch.values()) / len(by_pitch)
    makeup_db = TARGET_RMS_DB - mean_rms
    print(f"  {len(by_pitch)} pitches {min(by_pitch)}..{max(by_pitch)} | mean RMS {mean_rms:+.2f} dB "
          f"-> makeup {makeup_db:+.2f} dB | median vibrato "
          f"{sorted(r['vibrato_cents'] for r in by_pitch.values())[len(by_pitch)//2]:.1f} cents")

    ranges = spread_key_ranges(by_pitch.keys())
    regions = []
    outdir = OUT / lib
    # wipe stale output first: a re-run after fixing a pitch bug leaves the OLD (wrongly named) .ogg
    # behind — e.g. the phantom `67.ogg` survived the fix as an orphan. Harmless only until someone
    # reads the folder and believes it.
    if outdir.exists():
        for old in outdir.glob("*.ogg"): old.unlink()
    for p, r in sorted(by_pitch.items()):
        convert(r["src"], outdir / f"{p}.ogg", makeup_db, stereo)
        reg = {"sample": str(p), "keyRange": ranges[p], "pitch": p,
               # cancel the measured error -> plays in tune with the piano
               "detune": round(-r["cents_off"], 1)}
        lp = (loops or {}).get(r["file"])
        if lp:
            reg.update({"loop": True, "loopStart": round(lp[0], 4), "loopEnd": round(lp[1], 4)})
        regions.append(reg)

    # median attack across the set -> how far EARLY this library's cello must fire (negative delay).
    # Re-measured PER LAYER: a light bow blooms slower than a heavy one, so p != mf.
    atk = float(np.median([r["attack_ms"] for r in by_pitch.values()]))
    cen = float(np.median([r["centroid_hz"] for r in by_pitch.values()]))
    hf = float(np.median([r["hf_ratio_db"] for r in by_pitch.values()]))
    print(f"  attack (median time to 50% of sustain) = {atk:.0f} ms -> negative delay {-atk:.0f} ms")
    print(f"  timbre @ equal loudness: centroid {cen:.0f} Hz · hf@2k+ {hf:+.2f} dB")

    preset = {"name": f"cello-{lib}", "samples": {"baseUrl": "", "formats": ["ogg"]},
              "groups": [{"regions": regions}],
              # not an smplr field — read by src/spikes/celloBakeoff.js so the delay is DERIVED from
              # this library's own measured attack instead of a number typed into the code.
              "plengMeta": {"attackMs": round(atk, 1)}}
    (outdir / "preset.json").write_text(json.dumps(preset, indent=1))
    meta = {"lib": lib, "makeup_db": round(makeup_db, 2), "mean_rms_db": round(mean_rms, 2),
            "target_rms_db": TARGET_RMS_DB, "stereo": stereo, "looped": bool(loops),
            "attack_ms_median": round(atk, 1), "centroid_hz_median": round(cen, 1),
            "hf_ratio_db_median": round(hf, 2),
            "samples": sorted(by_pitch.values(), key=lambda r: r["midi"])}
    (outdir / "measured.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    return meta


SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def karoryfer_note(name):
    """Karoryfer's own naming, e.g. 'C1_mf_d.wav' -> the value the SHIPPED prep tool assumed (C1=24).
    Returned only so build() can print the octave discrepancy it causes."""
    m = re.match(r"([A-G])(b|#)?(\d+)_", name)
    if not m: return None
    s = SEMI[m.group(1)] + (-1 if m.group(2) == "b" else 1 if m.group(2) == "#" else 0)
    return s + (int(m.group(3)) + 1) * 12


# Karoryfer's sus set is 17 pitches x 4 dynamics (p/mp/mf/f) x 2 bow strokes (_d/_g) = 136 files, but
# only `*_mf_d.wav` was ever shipped (prepare-samples-cc0.mjs:33 "one dyn/take") = every note in the
# song bowed at the same medium-hard weight = the leading suspect for P'Aim's "แสบแก้วหู".
#
# Each dynamic is built as its OWN mirror -> loaded as a SEPARATE smplr instrument with a FULL
# velRange. Never as velRange groups inside one preset: smplr scales velocity RELATIVE to the matched
# group, so a combined preset resets loudness at every layer boundary (memory
# pleng-smplr-vellayer-relative). `_d` (down-bow) only, per the brief — raw sus, no legato maps.
#
# All FOUR are built even though step 1 only asks P'Aim to compare p/mp/mf: P'Aim confirmed the end
# state is the 4 layers assembled per the intensity of the phrase (17 pitches x 4 = the 68 files he
# approved), and the brief requires the DATA STRUCTURE to support every layer from the start — step 1
# merely doesn't USE them all yet. `f` costs nothing to build now and stops this being throwaway.
# The `_d`/`_g` bow-stroke axis stays out (P'Aim: doubles the size for little realism).
DYNAMICS = ["p", "mp", "mf", "f"]

# ── MARCATO (P'Aim's own design, 17 ก.ค.) ─────────────────────────────────────────────────────
# P'Aim: "mp mf สั้น ๆ มากๆ แล้วลากด้วย p · คนเล่นจริงลากยาวเน้นตลอดไม่ได้โดยธรรมชาติ · การแสบน่าจะเกิดตอน
# ช่วงแรกของการเริ่มสีขึ้นหรือลง" — i.e. the harshness lives in the START of the bow stroke, so use a
# SHORT hard attack and let a soft p carry the body.
#
# That is exactly what the people who recorded this cello built. Their readme: "a scripted marcato
# which uses staccato attacks layered on top of sustained notes", and `vc_arco_marcato_map.sfz` does
# it with `ampeg_hold=0.200` (200 ms head) + `ampeg_sustain_oncc103=0` (the head then gets out of the
# way) + `amplitude_oncc110=100` = a "Marcato Strength" knob. So attack strength being a KNOB rather
# than a number we pick is the library's own design decision too — and SA cannot hear "how hard is
# right", so P'Aim turns it (memory pleng-aesthetic-audio-needs-ear).
#
# `_1` take only for now: the set ships 4 round-robin takes (`_1.._4`, seq_length=4) which would stop
# repeated notes sounding machine-gunned, but PM's rule is one new variable at a time — RR is reported
# as available, not switched on here.
STACCATO_DYNAMICS = ["mp", "mf"]   # the two P'Aim named for the head
STACCATO_RR = "1"

# Bow round-robin for the BODY only (P'Aim asked for a button to try it, 17 ก.ค.). The sus set has
# two bow strokes per pitch — `_d` (down) and `_g` (up) — which the recordist maps as a plain
# round-robin (seq_length=2), not chosen by musical stress. Alternating them stops the same file
# replaying back-to-back. Only `p` is built: the body is the only thing that sustains, and the head
# sits at 5% where PM is right that it is inaudible.
#
# Measured need (5 real songs): ~31% of melody notes replay the SAME source file as the note before,
# and 4-27 per song are "invisible" repeats where the melody moves but the file doesn't (only 5-7 of
# the 17 samples ever get used, because worship melodies sit in a narrow range).
# Measured ceiling: 2 takes only halves it (~31% -> ~15%). Honest limit, stated on the page.
BODY_RR_DYNAMIC = "p"
# ⚠️ the staccato set names its takes INCONSISTENTLY: 11 pitches are `A1_mp_1.wav` but 6 (Eb2/Eb3/Eb4/
# Gb2/Gb3/Gb4) are `Eb2_mp1.wav` with no separator. Globbing one form silently yields 11 of 17 pitches
# — and the missing ones get faked by stretching a neighbouring sample, i.e. WRONG PITCHES, the same
# class of defect as the phantom-67 bug. Both forms are matched, and build() hard-checks the count.
STACCATO_GLOBS = ["*_{dyn}_{rr}.wav", "*_{dyn}{rr}.wav"]


def karoryfer_expect(name):
    """Expected MIDI for a Karoryfer filename = its note name + the library's verified octave offset."""
    n = karoryfer_note(name)
    return None if n is None else n + OCTAVE_FIX


SSO_RE = re.compile(r"cello-([acdf][s#]?)(\d)", re.I)


def sso_expect(name):
    """SSO names its samples at CONCERT pitch (cello-c2 measures MIDI 36), so no offset."""
    m = SSO_RE.match(Path(name).stem)
    if not m: return None
    letter = m.group(1)[0].upper()
    sharp = len(m.group(1)) > 1
    return SEMI[letter] + (1 if sharp else 0) + (int(m.group(2)) + 1) * 12


def staccato_expect(name):
    """Staccato uses the same note naming as sus -> same verified +12 convention."""
    m = re.match(r"([A-G])(b|#)?(\d+)_", name)
    if not m: return None
    semi = SEMI[m.group(1)] + (-1 if m.group(2) == "b" else 1 if m.group(2) == "#" else 0)
    return semi + (int(m.group(3)) + 1) * 12 + OCTAVE_FIX


def main():
    summary = {}
    if KARORYFER.exists():
        for dyn in DYNAMICS:
            files = sorted(glob.glob(str(KARORYFER / f"*_{dyn}_d.wav")))
            if files:
                summary[f"karoryfer-{dyn}"] = build(f"karoryfer-{dyn}", files, karoryfer_expect,
                                                    stereo=False, naive_of=karoryfer_note,
                                                    expect_pitches=KARORYFER_PITCHES)
        # up-bow take of the body, for the round-robin button (down-bow is the `karoryfer-p` above)
        gfiles = sorted(glob.glob(str(KARORYFER / f"*_{BODY_RR_DYNAMIC}_g.wav")))
        if gfiles:
            summary[f"karoryfer-{BODY_RR_DYNAMIC}-g"] = build(
                f"karoryfer-{BODY_RR_DYNAMIC}-g", gfiles, karoryfer_expect, stereo=False,
                naive_of=karoryfer_note, expect_pitches=KARORYFER_PITCHES)
        # marcato heads: a short staccato attack that sits ON TOP of the p sustain (P'Aim's design)
        for dyn in STACCATO_DYNAMICS:
            sdir = KARORYFER.parent / "staccato"
            sfiles = sorted({f for g in STACCATO_GLOBS
                             for f in glob.glob(str(sdir / g.format(dyn=dyn, rr=STACCATO_RR)))})
            if sfiles:
                summary[f"staccato-{dyn}"] = build(f"staccato-{dyn}", sfiles, staccato_expect,
                                                   stereo=False, naive_of=karoryfer_note,
                                                   expect_pitches=KARORYFER_PITCHES)
        # kept so the bake-off page (mf = what P'Aim already judged) still resolves
        files = sorted(glob.glob(str(KARORYFER / "*_mf_d.wav")))
        summary["karoryfer"] = build("karoryfer", files, karoryfer_expect, stereo=False,
                                    naive_of=karoryfer_note, expect_pitches=KARORYFER_PITCHES)
    else:
        print(f"skip karoryfer (not found: {KARORYFER})")

    if SSO and SSO.exists():
        files = sorted(glob.glob(str(SSO / "cello-[acdf]*")))
        files = [f for f in files if "hrm" not in Path(f).name]
        loops = sso_loops(os.environ.get("SSO_SFZ", ""))
        summary["sso"] = build("sso", files, sso_expect, stereo=True, loops=loops)
    else:
        print(f"skip sso (set SSO_SRC=<dir of cello-*.wav>)")

    if IOWA and IOWA.exists():
        files = sorted(glob.glob(str(IOWA / "*.ogg")))
        # Iowa's filenames ARE the MIDI number (verified: 36.ogg really measures 36)
        summary["iowa"] = build("iowa", files, lambda n: int(Path(n).stem), stereo=False)
    else:
        print(f"skip iowa (set IOWA_SRC=<dir of <midi>.ogg>)")

    (OUT / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False))
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
