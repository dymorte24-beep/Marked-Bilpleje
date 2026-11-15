#!/usr/bin/env python3
"""Laver en TikTok foto-karrusel (1080x1920 jpg-slides) ud fra en JSON-spec. Lavet 2026-11-15 (Daniel valgte daglige karruseller).
Brug:  python3 vaerktoej/lav_karrusel.py spec.json karruseller/<dato>-<emne>/
Spec: {"slides":[{"foto":"videoer/fotos/x.jpg","kredit":"Navn","kicker":"...","overskrift":"Linje / *guld*","tekst":"Kort forklaring","nr":1}],
       "outro":{"foto":"...","kredit":"..."}}
Første slide = krog (lyst foto, påstand) + "Swipe ➡️". Sidste slide = fast outro. Planlæg i Metricool med tiktokData.autoAddMusic true.
"""
import json, os, sys, html, shutil, subprocess
SPEC, OUT = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(SPEC)); os.makedirs(OUT, exist_ok=True)
work = '/tmp/karrusel_' + os.path.basename(OUT.rstrip('/')); shutil.rmtree(work, ignore_errors=True); os.makedirs(work)

def head(txt):
    out = []
    for line in txt.split('/'):
        ws = []
        for w in line.strip().split():
            g = w.startswith('*') and '*' in w[1:]; w = html.escape(w.replace('*', ''))
            ws.append(f'<span class="g">{w}</span>' if g else w)
        out.append(' '.join(ws))
    return '<br>'.join(out)

slides = spec['slides'] + [dict(spec['outro'], outro=True)]
n = len(slides)
CSS = '''*{margin:0;padding:0;box-sizing:border-box}html,body{width:540px;height:960px;overflow:hidden;font-family:"Inter","Helvetica Neue",Arial,sans-serif;color:#fff;background:#131D2E}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,29,46,0) 0,rgba(19,29,46,.7) 15%,rgba(19,29,46,.55) 42%,rgba(19,29,46,.75) 58%,rgba(19,29,46,.2) 70%,rgba(19,29,46,0) 78%)}
.ov2{position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,29,46,.2) 0,rgba(19,29,46,.78) 15%,rgba(19,29,46,.7) 62%,rgba(19,29,46,.15) 75%)}
.k{position:absolute;top:160px;left:40px;right:90px;text-align:center;font-size:15px;letter-spacing:5px;color:#E2B566;font-weight:900}
.h{position:absolute;top:190px;left:40px;right:90px;text-align:center;font-size:44px;font-weight:900;line-height:1.07;text-shadow:0 3px 14px rgba(0,0,0,.7)}
.g{color:#E2B566}
.t{position:absolute;top:410px;left:40px;right:90px;text-align:center;font-size:23px;font-weight:600;line-height:1.35;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.num{position:absolute;top:150px;left:40px;width:54px;height:54px;border-radius:50%;background:#B68B48;color:#131D2E;font-weight:900;font-size:28px;display:flex;align-items:center;justify-content:center}
.sw{position:absolute;top:560px;left:245px;transform:translateX(-50%);background:#B68B48;color:#131D2E;font-weight:900;font-size:22px;padding:12px 30px;border-radius:40px;white-space:nowrap}
.pg{position:absolute;top:600px;left:40px;right:90px;text-align:center;font-size:14px;font-weight:700;color:rgba(255,255,255,.8)}
.cr{position:absolute;left:40px;top:628px;font-size:10px;color:rgba(255,255,255,.75);text-shadow:0 1px 3px #000}
.oline{position:absolute;top:175px;left:40px;right:90px;text-align:center;font-size:28px;font-weight:800;line-height:1.2}
.ofind{position:absolute;top:290px;left:40px;right:90px;text-align:center;font-size:21px;color:#ddd}
.lens{position:absolute;left:205px;top:330px;width:80px;height:80px}
.brand{position:absolute;top:425px;left:40px;right:90px;text-align:center;font-size:36px;white-space:nowrap}.brand b{font-weight:800}.brand .d{color:#B68B48;font-weight:800}
.btn{position:absolute;top:505px;left:245px;transform:translateX(-50%);background:#B68B48;color:#131D2E;font-weight:800;font-size:23px;padding:13px 34px;border-radius:40px;white-space:nowrap}'''
pages = []
for i, s in enumerate(slides):
    shutil.copy(os.path.join(ROOT, s['foto']), f'{work}/f{i}.jpg')
    if s.get('outro'):
        body = '''<div class="ov2"></div><div class="oline">Få en professionel bilplejer<br>til at gøre arbejdet <span class="g">ordentligt</span></div>
<div class="ofind">Find din bilplejer hos</div>
<svg class="lens" viewBox="0 0 110 110"><circle cx="46" cy="46" r="34" fill="none" stroke="#fff" stroke-width="8"/><line x1="71" y1="71" x2="100" y2="100" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M31 47 L43 59 L63 36" fill="none" stroke="#B68B48" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="brand">find<b>bilplejere</b><span class="d">.dk</span></div><div class="btn">Link i bio 👆</div>'''
    else:
        body = '<div class="ov"></div>'
        if s.get('kicker'): body += f'<div class="k">{html.escape(s["kicker"])}</div>'
        if s.get('nr'): body += f'<div class="num">{s["nr"]}</div>'
        body += f'<div class="h">{head(s["overskrift"])}</div>'
        if s.get('tekst'): body += f'<div class="t">{html.escape(s["tekst"])}</div>'
        if i == 0: body += '<div class="sw">Swipe ➡️</div>'
        else: body += f'<div class="pg">{i + 1} / {n}</div>'
    pages.append(f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="bg" style="background-image:url(f{i}.jpg)"></div>{body}<div class="cr">Foto: {html.escape(s.get("kredit",""))} / Unsplash</div></body></html>')
for i, p in enumerate(pages): open(f'{work}/s{i}.html', 'w').write(p)
js = f'''const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:540,height:960}},deviceScaleFactor:2}});
for(let i=0;i<{n};i++){{await p.goto('file://{work}/s'+i+'.html');await p.waitForTimeout(150);await p.screenshot({{path:'{os.path.abspath(OUT)}/'+String(i+1).padStart(2,'0')+'.jpg',type:'jpeg',quality:90}})}}await b.close()}})();'''
open(f'{work}/shot.js', 'w').write(js)
subprocess.run(['node', f'{work}/shot.js'], check=True)
print('OK', n, 'slides ->', OUT)
