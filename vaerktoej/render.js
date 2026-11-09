const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const [,, html, outDir, dur, fps] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(html));
  const n = Math.round(+dur * +fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.render(t), i / +fps);
    await p.screenshot({ path: `${outDir}/f${String(i).padStart(5,'0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
