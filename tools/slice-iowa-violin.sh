#!/usr/bin/env bash
# slice-iowa-violin.sh — source + slice the University of Iowa MIS solo violin into per-note ogg
# for the multi-dynamic (pp/mf/ff) violin candidate (B107 P2, violin quality upgrade).
#
# WHY: the launch violin (VSCO-2 CC0) is ONE dynamic → scaling gain can't change timbre → flat.
# Iowa MIS is Public Domain and recorded at THREE dynamics (pp/mf/ff), the same idea that made the
# Grand sing (5 velocity layers). This script fetches the arco set and cuts clean single notes.
#
# SOURCE: https://theremin.music.uiowa.edu/MIS.html  (Violin 2012 set · Public Domain, free of any
#   restriction since 1997). Files are chromatic RUNS per string/dynamic (many notes + silence gaps),
#   so we slice. This spike takes the reliable FIRST note of each file (its start pitch is exact from
#   the filename) → 8 anchor pitches × 3 dynamics; a pitch-shifting sampler covers the gaps.
# PRODUCTION NOTE: for the full library, extend to every note (silence-split each run + map ascending),
#   and consider the STEREO 16/44.1 set (150MB) or 24/96 (652MB) for more width; mono (68MB) used here.
#
# REQUIRES: curl, unzip, ffmpeg.  OUTPUT: notes/{pp,mf,ff}/<midi>.ogg  (RMS-normalized, mono, q5)

set -euo pipefail
BASE="https://theremin.music.uiowa.edu/sound%20files/MIS/Strings/violin2012"
ZIP="Violin.arco.mono.1644.1.zip"           # mono 16/44.1 arco (~68MB)
WORK="${1:-./iowa-violin}"; mkdir -p "$WORK"; cd "$WORK"

[ -f "$ZIP" ] || { echo "downloading $ZIP (~68MB)…"; curl -s -o "$ZIP" "$BASE/$ZIP"; }
rm -rf arco notes; unzip -oq "$ZIP" -x "__MACOSX/*" -d arco

# midi ← the pitch a file's first note begins on (from its sul<string>.<startPitch>… name)
slice () { # <aif> <midi> <dyn>
  local inf="$1" midi="$2" dyn="$3"; mkdir -p "notes/$dyn"
  ffmpeg -hide_banner -loglevel error -y -i "$inf" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.03:detection=peak,atrim=0:2.0" -ac 1 tmp.wav
  local mean gain
  mean=$(ffmpeg -hide_banner -nostats -i tmp.wav -af volumedetect -f null - 2>&1 | grep -oE "mean_volume: [-0-9.]+" | grep -oE "[-0-9.]+" | head -1)
  gain=$(awk -v m="$mean" 'BEGIN{printf "%.2f", -18.0 - m}')   # RMS-normalize to mean -18dB (even body loudness)
  ffmpeg -hide_banner -loglevel error -y -i tmp.wav \
    -af "volume=${gain}dB,alimiter=limit=0.89,afade=t=in:st=0:d=0.012,afade=t=out:st=1.82:d=0.18" \
    -ac 1 -c:a libvorbis -q:a 5 "notes/$dyn/$midi.ogg"
}
for dyn in pp mf ff; do
  slice "$(ls arco/Violin.arco.$dyn.sulG.G3B3.mono.aif)" 55 "$dyn"   # G3
  slice "$(ls arco/Violin.arco.$dyn.sulG.C4B*.mono.aif)" 60 "$dyn"   # C4
  slice "$(ls arco/Violin.arco.$dyn.sulD.D4B4.mono.aif)" 62 "$dyn"   # D4
  slice "$(ls arco/Violin.arco.$dyn.sulA.A4B4.mono.aif)" 69 "$dyn"   # A4
  slice "$(ls arco/Violin.arco.$dyn.sulA.C5B5.mono.aif)" 72 "$dyn"   # C5
  slice "$(ls arco/Violin.arco.$dyn.sulE.E5B5.mono.aif)" 76 "$dyn"   # E5
  slice "$(ls arco/Violin.arco.$dyn.sulA.C6*.mono.aif)"  84 "$dyn"   # C6
  slice "$(ls arco/Violin.arco.$dyn.sulE.C7E7.mono.aif)" 96 "$dyn"   # C7
done
rm -f tmp.wav
echo "done → $WORK/notes/{pp,mf,ff}/<midi>.ogg  ($(find notes -name '*.ogg' | wc -l) files)"
