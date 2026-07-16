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


def frame_f0(seg, sr):
    s = seg - seg.mean()
    if np.sqrt((s ** 2).mean()) < 1e-4: return None
    n = len(s)
    ac = np.correlate(s, s, mode="full")[n - 1:]
    if ac[0] <= 0: return None
    ac /= ac[0]
    lo, hi = int(sr / 1200), min(int(sr / 25), len(ac) - 1)
    if hi <= lo: return None
    k = int(np.argmax(ac[lo:hi])) + lo
    if ac[k] < 0.3: return None
    if 0 < k < len(ac) - 1:                      # parabolic refine
        a, b, c = ac[k - 1], ac[k], ac[k + 1]
        d = a - 2 * b + c
        if d != 0: k = k + 0.5 * (a - c) / d
    return sr / k


def measure(path):
    """-> dict(midi, cents_off, vibrato_cents, rms_db, peak_db, dur) using the MEDIAN frame pitch."""
    sr, x = decode(path)
    peak, rms = float(np.max(np.abs(x))), float(np.sqrt((x ** 2).mean()))
    a = int(0.30 * sr); b = min(len(x), a + int(2.5 * sr))
    if b - a < sr // 3: a, b = 0, len(x)
    W, H = int(0.06 * sr), int(0.02 * sr)
    f0s = [f for i in range(a, b - W, H) if (f := frame_f0(x[i:i + W], sr))]
    if len(f0s) < 5: raise RuntimeError(f"cannot measure pitch: {path}")
    f0s = np.array(f0s)
    med = float(np.median(f0s))
    f0s = f0s[(f0s > med * 0.8) & (f0s < med * 1.25)]      # drop octave-jump outliers
    med = float(np.median(f0s))
    midi_f = 69 + 12 * math.log2(med / 440.0)
    midi = int(round(midi_f))
    lo_p, hi_p = np.percentile(f0s, 5), np.percentile(f0s, 95)
    return dict(midi=midi, cents_off=round((midi_f - midi) * 100, 1),
                vibrato_cents=round(1200 * math.log2(hi_p / lo_p), 1),
                rms_db=round(20 * math.log10(rms or 1e-9), 2),
                peak_db=round(20 * math.log10(peak or 1e-9), 2), dur=round(len(x) / sr, 3))


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


def build(lib, files, note_of, stereo=False, loops=None):
    print(f"\n### {lib}")
    rows = []
    for f in files:
        m = measure(f)
        m["src"] = str(f); m["file"] = Path(f).name
        declared = note_of(Path(f).name)
        if declared is not None and declared != m["midi"]:
            print(f"  ! {Path(f).name:18s} filename says MIDI {declared} but MEASURES {m['midi']} "
                  f"({m['midi']-declared:+d} semitones)")
        rows.append(m)

    # one sample per pitch (drop dupes, keep the loudest)
    by_pitch = {}
    for r in rows:
        if r["midi"] not in by_pitch or r["rms_db"] > by_pitch[r["midi"]]["rms_db"]:
            by_pitch[r["midi"]] = r

    mean_rms = sum(r["rms_db"] for r in by_pitch.values()) / len(by_pitch)
    makeup_db = TARGET_RMS_DB - mean_rms
    print(f"  {len(by_pitch)} pitches {min(by_pitch)}..{max(by_pitch)} | mean RMS {mean_rms:+.2f} dB "
          f"-> makeup {makeup_db:+.2f} dB | median vibrato "
          f"{sorted(r['vibrato_cents'] for r in by_pitch.values())[len(by_pitch)//2]:.1f} cents")

    ranges = spread_key_ranges(by_pitch.keys())
    regions = []
    outdir = OUT / lib
    for p, r in sorted(by_pitch.items()):
        convert(r["src"], outdir / f"{p}.ogg", makeup_db, stereo)
        reg = {"sample": str(p), "keyRange": ranges[p], "pitch": p,
               # cancel the measured error -> plays in tune with the piano
               "detune": round(-r["cents_off"], 1)}
        lp = (loops or {}).get(r["file"])
        if lp:
            reg.update({"loop": True, "loopStart": round(lp[0], 4), "loopEnd": round(lp[1], 4)})
        regions.append(reg)

    preset = {"name": f"cello-{lib}", "samples": {"baseUrl": "", "formats": ["ogg"]},
              "groups": [{"regions": regions}]}
    (outdir / "preset.json").write_text(json.dumps(preset, indent=1))
    meta = {"lib": lib, "makeup_db": round(makeup_db, 2), "mean_rms_db": round(mean_rms, 2),
            "target_rms_db": TARGET_RMS_DB, "stereo": stereo, "looped": bool(loops),
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


def main():
    summary = {}
    if KARORYFER.exists():
        files = sorted(glob.glob(str(KARORYFER / "*_mf_d.wav")))
        summary["karoryfer"] = build("karoryfer", files, karoryfer_note, stereo=False)
    else:
        print(f"skip karoryfer (not found: {KARORYFER})")

    if SSO and SSO.exists():
        files = sorted(glob.glob(str(SSO / "cello-[acdf]*")))
        files = [f for f in files if "hrm" not in Path(f).name]
        loops = sso_loops(os.environ.get("SSO_SFZ", ""))
        summary["sso"] = build("sso", files, lambda n: None, stereo=True, loops=loops)
    else:
        print(f"skip sso (set SSO_SRC=<dir of cello-*.wav>)")

    if IOWA and IOWA.exists():
        files = sorted(glob.glob(str(IOWA / "*.ogg")))
        summary["iowa"] = build("iowa", files, lambda n: int(Path(n).stem), stereo=False)
    else:
        print(f"skip iowa (set IOWA_SRC=<dir of <midi>.ogg>)")

    (OUT / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False))
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
