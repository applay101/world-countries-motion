// Fallback for `rsvg-convert -w W -h H in.svg -o out.png` when apt is unavailable (uses @resvg/resvg-js, no system libs).
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
const a = process.argv.slice(2); let w, h, out, inp;
for (let i = 0; i < a.length; i++) { if (a[i] === '-w') w = +a[++i]; else if (a[i] === '-h') h = +a[++i]; else if (a[i] === '-o') out = a[++i]; else inp = a[i]; }
let svg = fs.readFileSync(inp, 'utf8');
if (w && h) svg = svg.replace(/<svg\b/, `<svg preserveAspectRatio="none"`);
const png = new Resvg(svg, { fitTo: w ? { mode: 'width', value: w } : { mode: 'original' } }).render().asPng();
fs.writeFileSync(out, png);
