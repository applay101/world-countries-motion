// Quick preview stills: node pipeline/stills.mjs <scale> <seconds...>  -> out/s_<sec>.png
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const scale = Number(process.argv[2]); const secs = process.argv.slice(3).map(Number);
const serveUrl = await bundle({ entryPoint: './src/index.ts' });
const opts = { serveUrl, id: process.env.COMP || 'Episode', chromiumOptions: { gl: 'swangle' }, ...(process.env.CHROME ? { browserExecutable: process.env.CHROME } : {}) };
const composition = await selectComposition(opts);
for (const s of secs) {
  const t0 = Date.now();
  await renderStill({ ...opts, composition, frame: Math.round(s * 30), output: `out/s_${s}.png`, scale });
  console.log(s, Date.now() - t0, 'ms');
}
