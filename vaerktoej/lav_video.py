#!/usr/bin/env python3
"""Laver en hel TikTok-video (fotos + dansk voiceover + undertekster + lyd) ud fra en JSON-spec.
Lavet 2026-11-15 efter LAERING.md: lyst første billede, krog fra 0,0 s, billedskift hver ~2 s, dansk stemme, kort outro.

Brug:  python3 vaerktoej/lav_video.py spec.json videoer/<dato>-<emne>.mp4
Kræver: piper (motor + dansk stemme) i $PIPER_DIR (standard /home/user/piper: piper/piper + da.onnx), node + playwright, ffmpeg, numpy.

Spec (JSON):
{
  "seed": 3,
  "scenes": [
    {"foto": "videoer/fotos/x.jpg", "kredit": "Navn", "kicker": "LEASING", "overskrift": "Det her kan / *KOSTE* dig",
     "nr": 1, "stempel": "NEJ" | "JA" | "", "tale": "Det der bliver sagt i scenen.", "sfx": "spray"|"pop"|""}
  ],
  "outro": {"foto": "...", "kredit": "...", "tale": "Få en professionel bilplejer til det. Find din på find bilplejere punktum d k."}
}
- "/" i overskrift = linjeskift, *ord* = guld.
- Hold "tale" kort (max ~2,5 s). Er den længere, laver scenen et zoom-punch halvvejs, så billedet stadig skifter.
"""
import json, os, subprocess, sys, wave, html, re, shutil
import numpy as np

SPEC, OUT = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIPER = os.environ.get('PIPER_DIR', '/home/user/piper')
spec = json.load(open(SPEC))
work = os.path.join('/tmp', 'lv_' + os.path.basename(OUT).replace('.mp4', ''))
shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
SR = 22050
VOICE_FX = ('highpass=f=90,equalizer=f=200:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.5:g=2,'
            'acompressor=threshold=-18dB:ratio=3:attack=5:release=80,aecho=0.8:0.85:18:0.1')

def tts(text, path):
    # Mere menneskelig (Daniel 2026-11-16): lidt roligere tempo der varierer pr. scene, mere variation i tonefald,
    # pauser mellem sætninger, og bagefter EQ/kompressor/lille rum (se VOICE_FX).
    import random
    tempo = spec.get('tempo', 0.97) * random.Random(hash(text) % 9999).uniform(0.95, 1.05)
    raw = path.replace('.wav', '_raw.wav')
    subprocess.run([f'{PIPER}/piper/piper', '--model', f'{PIPER}/da.onnx', '--output_file', raw,
                    '--length_scale', f'{tempo:.3f}', '--noise_scale', '0.75', '--noise_w', '0.95',
                    '--sentence_silence', '0.3'],
                   input=text.encode(), check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', VOICE_FX, '-ar', '22050', '-ac', '1', path], check=True)
    with wave.open(path) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    # trim stilhed i enderne
    idx = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, idx[0] - 200): idx[-1] + 400] if len(idx) else a
    return a, sr

scenes = spec['scenes'] + [dict(spec['outro'], outro=True)]
voice_parts, t = [], 0.0
for i, s in enumerate(scenes):
    a, sr = tts(s['tale'], f'{work}/v{i}.wav')
    d = len(a) / sr
    s['vstart'] = t + (0.05 if i == 0 else 0.08)
    s['vdur'] = d
    s['start'] = t
    s['dur'] = max(1.5, d + 0.22) if not s.get('outro') else max(2.6, d + 0.5)
    voice_parts.append((s['vstart'], a, sr))
    t += s['dur']
D = round(t, 2)

# voice track
sr = voice_parts[0][2]
voice = np.zeros(int((D + 0.5) * sr))
for st, a, _ in voice_parts:
    i = int(st * sr); voice[i:i + len(a)] += a[:len(voice) - i]
voice = voice / max(1e-6, np.abs(voice).max()) * 0.9
import wave as _w
with _w.open(f'{work}/voice.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((voice * 32767).astype(np.int16).tobytes())

# undertekst-bidder (2-3 ord), tidsat efter bogstav-længde
def chunks(s):
    words = s['tale'].replace(' punktum d k', '.dk').split()
    out, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) == 3 or w[-1] in '.,?!:' or len(' '.join(cur)) > 11:
            out.append(' '.join(cur)); cur = []
    if cur: out.append(' '.join(cur))
    tot = sum(len(c) + 3 for c in out); acc = 0; res = []
    for c in out:
        a = s['vstart'] + s['vdur'] * acc / tot; acc += len(c) + 3
        res.append((round(a, 3), round(s['vstart'] + s['vdur'] * acc / tot, 3), c))
    return res

def head(txt):
    parts = []
    for line in txt.split('/'):
        ws = []
        for w in line.strip().split():
            g = w.startswith('*') and '*' in w[1:]
            w = html.escape(w.replace('*', ''))
            ws.append(f'<span class="w{" g" if g else ""}">{w}</span>')
        parts.append(' '.join(ws))
    return '<br>'.join(parts)

sc_html, sc_js = [], []
for i, s in enumerate(scenes):
    foto = os.path.relpath(os.path.join(ROOT, s['foto']), work)
    shutil.copy(os.path.join(ROOT, s['foto']), f'{work}/f{i}.jpg')
    inner = ''
    if s.get('outro'):
        inner = f'''<div class="ov2"></div>
 <div class="oline" id="ol">Få en professionel bilplejer<br>til at gøre arbejdet <span class="g">ordentligt</span></div>
 <div class="ofind" id="of">Find din bilplejer hos</div>
 <svg class="lens" viewBox="0 0 110 110"><circle id="lc" cx="46" cy="46" r="34" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="214" stroke-dashoffset="214"/><line id="ll" x1="71" y1="71" x2="100" y2="100" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="42" stroke-dashoffset="42"/><path id="lk" d="M31 47 L43 59 L63 36" fill="none" stroke="#B68B48" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="50" stroke-dashoffset="50"/></svg>
 <div class="brandw"><div class="brand" id="br"><span class="f">find</span><span class="b">bilplejere</span><span class="d">.dk</span></div></div>
 <div class="btn" id="btn">Link i bio 👆</div>'''
    else:
        if s.get('kicker'): inner += f'<div class="k">{html.escape(s["kicker"])}</div>'
        if s.get('nr'): inner += f'<div class="num">{s["nr"]}</div>'
        if s.get('overskrift'): inner += f'<div class="h">{head(s["overskrift"])}</div>'
        if s.get('stempel'):
            cls = 'ja' if s['stempel'] in ('JA', '✓') else 'nej'
            inner += f'<div class="stamp {cls}">{html.escape(s["stempel"])}</div>'
    sc_html.append(f'''<div class="sc" id="s{i}"><div class="bg" style="background-image:url(f{i}.jpg)"></div><div class="ov"></div><div class="shine"></div>{inner}
 <div class="cr">Foto: {html.escape(s.get("kredit", ""))} / Unsplash</div></div>''')
    sc_js.append(dict(a=s['start'], b=s['start'] + s['dur'], v=s['vstart'], vd=s['vdur'], outro=bool(s.get('outro')),
                      punch=s['dur'] > 2.7, st=bool(s.get('stempel'))))

subs = [c for s in scenes if not s.get('outro') for c in chunks(s)]
page = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:540px;height:960px;overflow:hidden;background:#131D2E;font-family:"Inter","Helvetica Neue",Arial,sans-serif;color:#fff}}
.sc{{position:absolute;inset:0;overflow:hidden;visibility:hidden}}
.bg{{position:absolute;inset:-6%;background-size:cover;background-position:center;transform-origin:50% 45%}}
.ov{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,29,46,0) 0,rgba(19,29,46,.62) 14%,rgba(19,29,46,.45) 30%,rgba(19,29,46,0) 44%,rgba(19,29,46,0) 52%,rgba(19,29,46,.35) 64%,rgba(19,29,46,0) 74%)}}
.ov2{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,29,46,.2) 0,rgba(19,29,46,.7) 15%,rgba(19,29,46,.6) 60%,rgba(19,29,46,.15) 75%)}}
.shine{{position:absolute;top:-20%;bottom:-20%;width:150px;background:linear-gradient(90deg,transparent,rgba(255,245,220,.30),transparent);transform:skewX(-18deg);mix-blend-mode:screen;opacity:0}}
.k{{position:absolute;top:158px;left:40px;right:90px;text-align:center;font-size:15px;letter-spacing:5px;color:#E2B566;font-weight:900;text-shadow:0 1px 6px rgba(0,0,0,.8)}}
.h{{position:absolute;top:186px;left:40px;right:90px;text-align:center;font-size:44px;font-weight:900;line-height:1.06;text-shadow:0 3px 14px rgba(0,0,0,.75),0 0 2px #000}}
.w{{display:inline-block}} .g{{color:#E2B566}}
.num{{position:absolute;top:150px;left:40px;width:54px;height:54px;border-radius:50%;background:#B68B48;color:#131D2E;font-weight:900;font-size:28px;display:flex;align-items:center;justify-content:center;z-index:3}}
.stamp{{position:absolute;top:370px;left:245px;font-size:58px;font-weight:900;letter-spacing:3px;padding:4px 22px;border:6px solid;border-radius:12px;transform:translateX(-50%);background:rgba(255,255,255,.9);box-shadow:0 4px 18px rgba(0,0,0,.5)}}
.stamp.nej{{color:#ff4d4d;border-color:#ff4d4d}} .stamp.ja{{color:#3fe08a;border-color:#3fe08a}}
.sub{{position:absolute;top:520px;left:40px;right:90px;text-align:center;font-size:31px;font-weight:900;color:#fff;-webkit-text-stroke:1.5px #000;paint-order:stroke fill;text-shadow:0 3px 0 #000,0 0 12px rgba(0,0,0,.7);z-index:40;line-height:1.1}}
.sub b{{color:#FFD769}}
.cr{{position:absolute;left:40px;top:628px;font-size:10px;color:rgba(255,255,255,.75);text-shadow:0 1px 3px #000}}
.oline{{position:absolute;top:170px;left:40px;right:90px;text-align:center;font-size:27px;font-weight:800;line-height:1.2}}
.ofind{{position:absolute;top:275px;left:40px;right:90px;text-align:center;font-size:20px;font-weight:600;color:#ddd}}
.lens{{position:absolute;left:205px;top:315px;width:80px;height:80px}}
.brandw{{position:absolute;top:410px;left:40px;right:90px;text-align:center;overflow:hidden;height:52px}}
.brand{{font-size:36px;letter-spacing:-.5px;white-space:nowrap}}.brand .f{{font-weight:400}}.brand .b{{font-weight:800}}.brand .d{{color:#B68B48;font-weight:800}}
.btn{{position:absolute;top:490px;left:245px;background:#B68B48;color:#131D2E;font-weight:800;font-size:23px;padding:13px 34px;border-radius:40px;white-space:nowrap}}
.flash{{position:absolute;inset:0;background:#fff;opacity:0;z-index:30;pointer-events:none}}
.bar{{position:absolute;top:150px;left:120px;right:170px;height:0}}
</style></head><body>
{"".join(sc_html)}
<div class="sub" id="sub"></div><div class="flash" id="fl"></div>
<script>
const S={json.dumps(sc_js)},SUB={json.dumps(subs, ensure_ascii=False)},D={D};
const cl=x=>x<0?0:x>1?1:x, eo=x=>1-Math.pow(1-cl(x),3), eb=x=>{{x=cl(x);const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)}}, eio=x=>{{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}};
window.render=t=>{{
 S.forEach((s,i)=>{{const el=document.getElementById('s'+i),on=t>=s.a&&(t<s.b||i==S.length-1);el.style.visibility=on?'visible':'hidden';if(!on)return;
  const lt=t-s.a,p=lt/(s.b-s.a);
  // punch-in ved start + langsom zoom; ekstra punch halvvejs i lange scener
  let sc=1.0+0.10*p+0.10*(1-eo(lt/.35));
  if(s.punch&&t>s.a+(s.b-s.a)/2){{const q=t-(s.a+(s.b-s.a)/2);sc+=0.12+0.08*(1-eo(q/.3))}}
  const dir=i%2?-1:1;el.querySelector('.bg').style.transform=`scale(${{sc}}) translate(${{dir*14*p}}px,${{-6*p}}px)`;
  el.querySelectorAll('.w').forEach((w,j)=>{{const q=(lt-0.02-j*.07)/.32,e=eb(q);if(i==0){{w.style.opacity=1;w.style.transform='none';return}}w.style.opacity=cl(q*3);w.style.transform=`translateY(${{(1-e)*30}}px) scale(${{.7+.3*e}})`}});
  const hh=el.querySelector('.h');if(hh&&i==0){{hh.style.transform=`scale(${{1+.05*Math.sin(Math.min(lt,1.2)*Math.PI/1.2)}})`}}
  const n=el.querySelector('.num');if(n){{const e=eb(lt/.35);n.style.transform=`scale(${{e}}) rotate(${{(1-e)*-120}}deg)`}}
  const k=el.querySelector('.k');if(k){{k.style.opacity=i==0?1:cl(lt/.2)}}
  const st=el.querySelector('.stamp');if(st){{const q=(lt-.55)/.25,e=cl(q);st.style.opacity=e;st.style.transform=`translateX(-50%) rotate(-8deg) scale(${{1+1.5*(1-eb(q))}})`}}
  const sh=el.querySelector('.shine');if(sh){{const q=(lt-.2)/1.1;sh.style.left=(-200+q*900)+'px';sh.style.opacity=q>0&&q<1?1:0}}
  if(s.outro){{[['lc',214,.35],['ll',42,.75],['lk',50,.9]].forEach(([id,L,d])=>document.getElementById(id).style.strokeDashoffset=L*(1-eio((lt-d)/.35)));
   document.getElementById('ol').style.opacity=cl(lt/.2);document.getElementById('of').style.opacity=cl((lt-.5)/.2);
   document.getElementById('br').style.transform=`translateY(${{(1-eo((lt-1.0)/.35))*60}}px)`;
   const bt=document.getElementById('btn');const e=eb((lt-1.3)/.35);const pu=lt>1.7?1+.05*Math.sin((lt-1.7)*7):1;bt.style.transform=`translateX(-50%) scale(${{e*pu}})`}}
 }});
 // hvidt blink ved sceneskift
 let f=0;S.slice(1).forEach(s=>{{const q=(t-s.a)/.12;if(q>=0&&q<1)f=Math.max(f,.55*(1-q))}});document.getElementById('fl').style.opacity=f;
 // undertekster
 const cur=SUB.find(c=>t>=c[0]-.05&&t<c[1]+.12);const sb=document.getElementById('sub');
 if(cur){{const e=eb((t-cur[0]+.05)/.18);sb.innerHTML=cur[2].replace(/(\\d+|NEJ|JA|FØRST|FORKERT)/g,'<b>$1</b>');sb.style.opacity=1;sb.style.transform=`scale(${{.85+.15*e}})`}}else sb.style.opacity=0;
}};
window.render(0);
</script></body></html>'''
open(f'{work}/index.html', 'w').write(page)

# render
subprocess.run(['node', os.path.join(ROOT, 'vaerktoej/render.js'), f'{work}/index.html', f'{work}/frames', str(D), '30'], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '30', '-i', f'{work}/frames/f%05d.jpg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', f'{work}/stum.mp4'], check=True)
# lyd: musik + effekter (lyd.py) under stemmen
wh = ','.join(f'{s["start"]:.2f}' for s in scenes[1:])
pops = ','.join(f'{s["start"] + .55:.2f}' for s in scenes if s.get('stempel')) or f'{scenes[1]["start"]:.2f}'
chime = f'{scenes[-1]["start"] + 1.0:.2f}'
subprocess.run(['python3', os.path.join(ROOT, 'vaerktoej/lyd.py'), str(D), f'{work}/musik.wav', '--whoosh', wh, '--pop', pops, '--chime', chime,
                '--seed', str(spec.get('seed', 5)), '--bpm', str(spec.get('bpm', 104))], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{work}/stum.mp4', '-i', f'{work}/voice.wav', '-i', f'{work}/musik.wav',
                '-filter_complex', '[1:a]aresample=44100,volume=1.6,highpass=f=90[v];[2:a]volume=0.32[m];[v][m]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[a]',
                '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], check=True)
print(json.dumps({'fil': OUT, 'sek': D, 'scener': [(round(s['start'], 2), s['tale']) for s in scenes]}, ensure_ascii=False, indent=1))
