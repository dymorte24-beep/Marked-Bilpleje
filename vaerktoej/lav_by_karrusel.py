#!/usr/bin/env python3
"""By-karrusel (Daniels idé 21/11): "Bor du i <by> eller omegn? Så kan de her bilplejere ordne din bil".
Slide 1 = spørgsmål på lyst foto. Én slide pr. bilplejer (logo + navn + område), kun bilplejere på findbilplejere.dk
inden for ca. 30 km af byen (ikke 'kun erhverv'). Sidste slide = findbilplejere.dk.
Brug: python3 vaerktoej/lav_by_karrusel.py spec.json karruseller/<dato>-by-<by>/
Spec: {"by":"Odense","foto":"videoer/fotos/x.jpg","kredit":"Navn",
       "bilplejere":[{"navn":"AC Detailing","omraade":"Odense SØ","logo":"karruseller/logoer/x.png","foto_logo":false}]}
kort_bg="#131D2E" bruges til hvide logoer. foto_logo=true betyder at billedet er et foto (ikke et logo) og vises som rundt billede.
"""
import json, os, sys, html, shutil, subprocess
SPEC, OUT = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(SPEC)); os.makedirs(OUT, exist_ok=True)
work = '/tmp/bykarrusel_' + os.path.basename(OUT.rstrip('/')); shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
e = html.escape
by = spec['by']; bp = spec['bilplejere']; n = len(bp) + 2
CSS = '''*{margin:0;padding:0;box-sizing:border-box}html,body{width:540px;height:960px;overflow:hidden;font-family:"Inter","Helvetica Neue",Arial,sans-serif;color:#131D2E}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,29,46,0) 0,rgba(19,29,46,.72) 14%,rgba(19,29,46,.6) 55%,rgba(19,29,46,.15) 72%,rgba(19,29,46,0) 80%)}
.q{position:absolute;top:175px;left:40px;right:90px;text-align:center;color:#fff;font-size:50px;font-weight:900;line-height:1.05;text-shadow:0 3px 14px rgba(0,0,0,.6)}
.g{color:#E2B566}
.a{position:absolute;top:400px;left:40px;right:90px;text-align:center;color:#fff;font-size:26px;font-weight:700;line-height:1.3;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.sw{position:absolute;top:545px;left:245px;transform:translateX(-50%);background:#B68B48;color:#131D2E;font-weight:900;font-size:22px;padding:12px 30px;border-radius:40px;white-space:nowrap}
.cr{position:absolute;left:40px;top:628px;font-size:10px;color:rgba(255,255,255,.75);text-shadow:0 1px 3px #000}
.light{position:absolute;inset:0;background:#F4F5F7;background-image:linear-gradient(#e3e6eb 1px,transparent 1px),linear-gradient(90deg,#e3e6eb 1px,transparent 1px);background-size:36px 36px}
.top{position:absolute;top:150px;left:40px;right:90px;text-align:center;font-size:15px;letter-spacing:4px;font-weight:900;color:#B68B48}
.card{position:absolute;top:185px;left:55px;width:380px;height:300px;background:#fff;border-radius:26px;box-shadow:0 10px 30px rgba(19,29,46,.15);display:flex;align-items:center;justify-content:center;padding:26px}
.card img{max-width:100%;max-height:100%;object-fit:contain}
.card img.rund{width:230px;height:230px;border-radius:50%;object-fit:cover}
.nm{position:absolute;top:505px;left:40px;right:90px;text-align:center;font-size:34px;font-weight:900;line-height:1.1}
.om{position:absolute;top:555px;left:40px;right:90px;text-align:center;font-size:20px;font-weight:600;color:#556}
.pill{position:absolute;top:595px;left:245px;transform:translateX(-50%);background:#131D2E;color:#fff;font-weight:800;font-size:16px;padding:9px 20px;border-radius:30px;white-space:nowrap}
.pg{position:absolute;top:640px;left:40px;right:90px;text-align:center;font-size:13px;font-weight:700;color:#889}
.dark{position:absolute;inset:0;background:#131D2E}
.ol{position:absolute;top:190px;left:40px;right:90px;text-align:center;color:#fff;font-size:30px;font-weight:800;line-height:1.2}
.lens{position:absolute;left:205px;top:330px;width:80px;height:80px}
.brand{position:absolute;top:425px;left:40px;right:90px;text-align:center;font-size:36px;white-space:nowrap;color:#fff}.brand b{font-weight:800}.brand .d{color:#B68B48;font-weight:800}
.btn{position:absolute;top:505px;left:245px;transform:translateX(-50%);background:#B68B48;color:#131D2E;font-weight:800;font-size:23px;padding:13px 34px;border-radius:40px;white-space:nowrap}'''
pages = []
shutil.copy(os.path.join(ROOT, spec['foto']), f'{work}/hook.jpg')
pages.append(f'''<div class="bg" style="background-image:url(hook.jpg)"></div><div class="ov"></div>
<div class="q">Bor du i<br><span class="g">{e(by)}</span><br>eller omegn?</div>
<div class="a">Så kan de her {len(bp)} bilplejere<br>ordne din bil 👇</div><div class="sw">Swipe ➡️</div>
<div class="cr">Foto: {e(spec.get("kredit",""))} / Unsplash</div>''')
for i, b in enumerate(bp):
    ext = os.path.splitext(b['logo'])[1]; shutil.copy(os.path.join(ROOT, b['logo']), f'{work}/l{i}{ext}')
    cls = ' class="rund"' if b.get('foto_logo') else ''
    pages.append(f'''<div class="light"></div><div class="top">BILPLEJER NÆR {e(by.upper())}</div>
<div class="card" style="background:{b.get('kort_bg','#fff')}"><img{cls} src="l{i}{ext}"></div><div class="nm">{e(b["navn"])}</div><div class="om">📍 {e(b["omraade"])}</div>
<div class="pill">Se profilen på findbilplejere.dk</div><div class="pg">{i + 2} / {n}</div>''')
pages.append(f'''<div class="dark"></div><div class="ol">Find flere bilplejere<br>nær <span class="g">{e(by)}</span> hos</div>
<svg class="lens" viewBox="0 0 110 110"><circle cx="46" cy="46" r="34" fill="none" stroke="#fff" stroke-width="8"/><line x1="71" y1="71" x2="100" y2="100" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M31 47 L43 59 L63 36" fill="none" stroke="#B68B48" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="brand">find<b>bilplejere</b><span class="d">.dk</span></div><div class="btn">Link i bio 👆</div>''')
for i, p in enumerate(pages):
    open(f'{work}/s{i}.html', 'w').write(f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{p}</body></html>')
js = f'''const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:540,height:960}},deviceScaleFactor:2}});
for(let i=0;i<{n};i++){{await p.goto('file://{work}/s'+i+'.html');await p.waitForTimeout(200);await p.screenshot({{path:'{os.path.abspath(OUT)}/'+String(i+1).padStart(2,'0')+'.jpg',type:'jpeg',quality:90}})}}await b.close()}})();'''
open(f'{work}/shot.js', 'w').write(js)
subprocess.run(['node', f'{work}/shot.js'], check=True)
print('OK', n, 'slides ->', OUT)
