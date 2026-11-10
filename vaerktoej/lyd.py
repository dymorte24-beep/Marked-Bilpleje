#!/usr/bin/env python3
"""Laver et royalty-frit lydspor (egen syntetiseret musik + lydeffekter) til TikTok-videoerne.
Brug: python3 vaerktoej/lyd.py <sekunder> <ud.wav> [--whoosh 3.4,7.6,...] [--pop 3.6,8,...] [--chime 25.5] [--seed 1] [--bpm 96]
- whoosh: ved sceneskift/wipes. pop: når et tal/trin eller ord dukker op. chime: når logoet vises i outroen.
- seed skifter akkordrækkefølge/lyd, så videoerne ikke lyder ens.
Mux: ffmpeg -i video.mp4 -i lyd.wav -c:v copy -c:a aac -b:a 160k -shortest ud.mp4
Kræver kun numpy (pip install numpy)."""
import sys, wave, argparse
import numpy as np
SR = 44100
ap = argparse.ArgumentParser()
ap.add_argument('dur', type=float); ap.add_argument('out')
ap.add_argument('--whoosh', default=''); ap.add_argument('--pop', default=''); ap.add_argument('--chime', default='')
ap.add_argument('--seed', type=int, default=1); ap.add_argument('--bpm', type=float, default=96)
a = ap.parse_args()
rng = np.random.default_rng(a.seed)
N = int(a.dur * SR); t = np.arange(N) / SR
mix = np.zeros(N)
def note(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, fc):
    al = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += al * (x[i] - s); y[i] = s
    return y
def env(n, a_, r):
    e = np.ones(n); ai = int(a_ * SR); ri = int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri)
    return e
def add(sig, start):
    i = int(start * SR)
    if i >= N: return
    sig = sig.copy(); f = min(len(sig)//4, int(.006*SR))
    if f > 1: sig[:f] *= np.linspace(0, 1, f); sig[-f:] *= np.linspace(1, 0, f)  # ingen klik
    j = min(N, i + len(sig)); mix[i:j] += sig[:j - i]
progs = [[57, 53, 60, 55], [60, 55, 57, 53], [50, 53, 57, 55], [57, 60, 53, 55]]
prog = progs[a.seed % len(progs)]
beat = 60 / a.bpm; bar = 4 * beat
# pad + bass
nb = int(np.ceil(a.dur / bar)) + 1
for b in range(nb):
    root = prog[b % 4]; st = b * bar
    n = int(bar * SR) + int(.3 * SR); tt = np.arange(n) / SR
    chord = [root, root + (3 if root in (57, 50) else 4), root + 7, root + 12]
    pad = sum(np.sin(2*np.pi*note(m)*tt) + .5*np.sin(2*np.pi*note(m)*1.003*tt) for m in chord)
    add(pad * env(n, .4, .5) * .06, st)
    for k in range(4):  # bas på hvert slag, sidechain-agtig
        bn = int(beat * SR); bt = np.arange(bn) / SR
        bass = np.sin(2*np.pi*note(root-24)*bt) * np.exp(-bt*3) * .22
        add(bass, st + k*beat)
# trommer (starter efter krogen ~ 1 takt)
start_dr = min(bar, a.dur)
k = 0
while start_dr + k*beat < a.dur - .5:
    ts = start_dr + k*beat
    kn = int(.25*SR); kt = np.arange(kn)/SR
    kick = np.sin(2*np.pi*(50 + 90*np.exp(-kt*30))*kt) * np.exp(-kt*12) * .5
    add(kick, ts)
    hn = int(.05*SR); hat = rng.standard_normal(hn) * np.exp(-np.arange(hn)/SR*80) * .03
    hat = hat - lp(hat, 6000)
    add(hat, ts + beat/2)
    if k % 2 == 1:
        sn = int(.2*SR); snt = np.arange(sn)/SR
        snare = (rng.standard_normal(sn)*.6 + np.sin(2*np.pi*190*snt)) * np.exp(-snt*18) * .07
        add(snare, ts)
    k += 1
def cues(s): return [float(x) for x in s.split(',') if x.strip()]
for c in cues(a.whoosh):
    n = int(.7*SR); x = rng.standard_normal(n); tt = np.arange(n)/SR
    fc = 300 + 5000*np.sin(np.pi*tt/.7)**2
    y = np.empty(n); s = 0.0
    for i in range(n):
        al = 1-np.exp(-2*np.pi*fc[i]/SR); s += al*(x[i]-s); y[i] = s
    add(y*np.sin(np.pi*tt/.7)**2*.35, c-.35)
for c in cues(a.pop):
    n = int(.15*SR); tt = np.arange(n)/SR
    add(np.sin(2*np.pi*(900+600*np.exp(-tt*40))*tt)*np.exp(-tt*30)*.25, c)
for c in cues(a.chime):
    n = int(2*SR); tt = np.arange(n)/SR
    ch = sum(np.sin(2*np.pi*note(m)*tt)*np.exp(-tt*(2+i)) for i, m in enumerate([84, 88, 91, 96]))
    add(ch*.08, c)
# fade ind/ud + normalisering
mix *= env(N, .3, 1.2)
mix = np.tanh(mix * 1.4)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * .85
st = np.stack([mix, np.roll(mix, int(.012*SR))], 1)
with wave.open(a.out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
