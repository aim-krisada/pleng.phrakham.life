#!/usr/bin/env python3
# Numerical expression analysis of a violin recording (why does ours sound "organ"?).
# Decodes via ffmpeg (no soundfile/librosa needed) -> numpy. Measures the things that separate
# an expressive bowed violin from a static "organ" tone:
#   - vibrato rate (Hz) + depth (cents peak-to-peak), from the f0 contour
#   - within-note dynamic swell: RMS envelope modulation (organ = flat)
#   - brightness (spectral centroid) + whether it MOVES with loudness (expressive = louder->brighter)
#   - note-to-note motion (portamento hint): fraction of time f0 is gliding vs stable
import sys, json, subprocess
import numpy as np

def load(path, start, dur, sr=22050):
    cmd = ['ffmpeg','-v','error','-ss',str(start),'-t',str(dur),'-i',path,'-ac','1','-ar',str(sr),'-f','f32le','-']
    raw = subprocess.run(cmd, capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return x, sr

def frames(x, frame, hop):
    n = len(x)
    idx = range(0, max(1, n-frame), hop)
    return np.array([x[i:i+frame] for i in idx]), np.array([i for i in idx])

def f0_autocorr(fr, sr, fmin=175, fmax=3200):
    win = np.hanning(len(fr))
    x = fr*win
    rms = np.sqrt(np.mean(x**2))
    if rms < 3e-3: return 0.0, rms
    ac = np.correlate(x, x, 'full')[len(x)-1:]
    tmin, tmax = int(sr/fmax), int(sr/fmin)
    if tmax >= len(ac): tmax = len(ac)-1
    seg = ac[tmin:tmax]
    if len(seg) < 3 or ac[0] <= 0: return 0.0, rms
    p = int(np.argmax(seg)) + tmin
    if ac[p] < 0.30*ac[0]: return 0.0, rms      # weak periodicity -> unvoiced
    a,b,c = ac[p-1], ac[p], ac[p+1]
    den = a - 2*b + c
    shift = 0.5*(a-c)/den if den != 0 else 0.0
    per = p + shift
    return (sr/per if per > 0 else 0.0), rms

def centroid(fr, sr):
    win = np.hanning(len(fr)); X = np.abs(np.fft.rfft(fr*win))
    f = np.fft.rfftfreq(len(fr), 1/sr)
    s = X.sum()
    return float((f*X).sum()/s) if s > 0 else 0.0

def analyze(path, start, dur, label):
    sr = 22050
    x, sr = load(path, start, dur, sr)
    if len(x) < sr: return {'label': label, 'error': 'no audio'}
    x = x/ (np.max(np.abs(x))+1e-9)
    frame, hop = 2048, 256                       # ~11.6 ms hop -> resolves 4-9 Hz vibrato
    frs, pos = frames(x, frame, hop)
    fh = sr/hop
    f0 = np.zeros(len(frs)); rms = np.zeros(len(frs)); cen = np.zeros(len(frs))
    for i, fr in enumerate(frs):
        f0[i], rms[i] = f0_autocorr(fr, sr)
        cen[i] = centroid(fr, sr)
    voiced = f0 > 0
    # ---- cents contour on voiced frames ----
    cents = np.where(voiced, 1200*np.log2(np.maximum(f0,1e-6)/440.0), np.nan)
    # local pitch center = median filter ~250 ms; residual = vibrato
    w = int(0.25*fh) | 1
    center = np.full_like(cents, np.nan)
    for i in range(len(cents)):
        lo,hi = max(0,i-w//2), min(len(cents),i+w//2+1)
        seg = cents[lo:hi][~np.isnan(cents[lo:hi])]
        if len(seg): center[i] = np.median(seg)
    resid = cents - center
    # sustained = voiced & note-center stable (|d center| small) -> where vibrato lives
    dcenter = np.abs(np.gradient(np.nan_to_num(center)))
    sustained = voiced & (~np.isnan(resid)) & (dcenter < 6)   # very stable center = a held note
    r = resid[sustained]
    r = r[np.isfinite(r)]
    r = r[np.abs(r) < 80]                                     # clip: physical vibrato is <±~60 cents
    # vibrato depth = robust peak-to-peak of the residual within held notes
    vib_depth = float(np.percentile(r,90)-np.percentile(r,10)) if len(r)>20 else 0.0
    # vibrato rate = dominant freq of residual (FFT) in 3-9 Hz
    vib_rate = 0.0
    if len(r) > 64:
        rr = np.nan_to_num(resid[voiced]); rr = rr - np.mean(rr)
        sp = np.abs(np.fft.rfft(rr*np.hanning(len(rr))))
        fr_ax = np.fft.rfftfreq(len(rr), 1/fh)
        band = (fr_ax>=3)&(fr_ax<=9)
        if band.any(): vib_rate = float(fr_ax[band][np.argmax(sp[band])])
    # ---- within-note dynamic swell: RMS modulation on voiced parts ----
    rv = rms[voiced]
    rms_cov = float(np.std(rv)/(np.mean(rv)+1e-9)) if len(rv) else 0.0   # coeff of variation
    rms_db_range = float(20*np.log10((np.percentile(rv,95)+1e-9)/(np.percentile(rv,10)+1e-9))) if len(rv)>10 else 0.0
    # ---- brightness + coupling to loudness ----
    cv = cen[voiced]
    cen_mean = float(np.mean(cv)) if len(cv) else 0.0
    # correlation centroid<->rms (expressive: louder=brighter -> positive)
    if len(cv) > 20:
        cc = np.corrcoef(cv, rv)[0,1]; cen_rms_corr = float(cc if np.isfinite(cc) else 0.0)
    else: cen_rms_corr = 0.0
    # ---- portamento/motion: fraction of voiced time the center pitch is gliding ----
    glide = float(np.mean((dcenter[voiced] > 6) & (dcenter[voiced] < 40))) if voiced.any() else 0.0
    return {
        'label': label, 'window': f'{start:.0f}-{start+dur:.0f}s',
        'voiced_frac': round(float(np.mean(voiced)),2),
        'vibrato_rate_hz': round(vib_rate,2),
        'vibrato_depth_cents_p2p': round(vib_depth,1),
        'rms_cov': round(rms_cov,3),
        'rms_db_range_p10_95': round(rms_db_range,1),
        'centroid_hz_mean': round(cen_mean,0),
        'centroid_rms_corr': round(cen_rms_corr,2),
        'glide_frac': round(glide,2),
    }

if __name__ == '__main__':
    jobs = json.loads(sys.argv[1])
    out = [analyze(j['path'], j['start'], j['dur'], j['label']) for j in jobs]
    print(json.dumps(out, ensure_ascii=False, indent=2))
