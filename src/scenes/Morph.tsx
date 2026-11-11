// `morph` scene: one big country silhouette that MORPHS into the next country as each name is spoken
// (countdowns, "guess the country", rankings). scene.shapes: [[name, isoNum, iso2, label?, cueWord?], ...] (2–6).
// Silhouettes are the mainland outline of each country (world-atlas), each fitted to the same box (not to scale).
import React from 'react';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
import { interpolate } from 'flubber';
import { EP, GOLD, TITLE, BODY, Seg, cl, pr, eBack, eExpoIO, segWindow, fadeWin, spokenAt } from '../lib/core';
import { Icon } from '../lib/Icon';

const BOX = 640;
let FEATS: any[] | null = null;
const mainland = (isoNum: string) => {
  FEATS = FEATS ?? (feature(world as any, (world as any).objects.countries) as any).features;
  const f = FEATS!.find((x) => String(x.id).padStart(3, '0') === String(isoNum).padStart(3, '0'));
  if (!f) return null;
  if (f.geometry.type !== 'MultiPolygon') return f;
  let best: any = null, ba = -1;
  for (const c of f.geometry.coordinates) { const g = { type: 'Feature', geometry: { type: 'Polygon', coordinates: c } }; const a = geoArea(g as any); if (a > ba) { ba = a; best = g; } }
  return best;
};
const outline = (isoNum: string) => {
  const f = mainland(isoNum); if (!f) return 'M0 0 Z';
  const p = geoMercator().fitExtent([[20, 20], [BOX - 20, BOX - 20]], f);
  const d = geoPath(p)(f) ?? 'M0 0 Z';
  return d.split(/(?=M)/)[0]; // one ring keeps the morph clean
};

// built once per segment and cached (flubber is the slow part)
const CACHE: Record<string, { paths: string[]; lerps: ((p: number) => string)[] }> = {};
const build = (seg: Seg) => {
  if (CACHE[seg.id]) return CACHE[seg.id];
  const shapes = seg.scene.shapes as any[];
  const paths = shapes.map((s) => outline(s[1]));
  const lerps = paths.map((d, k) => (k === 0 ? () => d : interpolate(paths[k - 1], d, { maxSegmentLength: 6 })));
  return (CACHE[seg.id] = { paths, lerps });
};

export const Morph: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.45, 0.4);
  if (vis <= 0) return null;
  const shapes = seg.scene.shapes as [string, string, string, string?, string?][];
  const { lerps } = build(seg);
  const n = shapes.length;
  const times = shapes.map((s, k) => spokenAt(seg, s[4] ?? s[0]) ?? seg.start + 1.6 + (k * (seg.end - seg.start - 2.2)) / n);
  let k = 0; times.forEach((tt, j) => { if (t >= tt - 0.35) k = j; });
  const m = eExpoIO(cl((t - (times[k] - 0.35)) / 0.7));
  const d = lerps[k](k === 0 ? 1 : m);
  const pop = k === 0 ? pr(t, times[0] - 0.4, 0.6, eBack) : 1;
  const nameIn = pr(t, times[k] - 0.15, 0.5, eBack);
  const [name, , iso2, label] = shapes[k];
  const hue = k % 2 ? '#ffffff' : GOLD;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: vis }}>
      <svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`} style={{ position: 'absolute', left: 230, top: 200, overflow: 'visible', transform: `scale(${pop}) rotate(${(1 - m) * (k ? -4 : 0)}deg)` }}>
        <defs>
          <linearGradient id={`mg${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={GOLD} /><stop offset="1" stopColor="#ff6a3d" /></linearGradient>
        </defs>
        <path d={d} transform="translate(14,18)" fill="rgba(0,0,0,.45)" />
        <path d={d} fill={`url(#mg${i})`} stroke={hue} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      <div style={{ position: 'absolute', left: 1010, top: 330, width: 820, transform: `translateX(${(1 - nameIn) * 80}px)`, opacity: cl(nameIn * 2) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <Icon name={`circle-flags:${iso2}`} size={120} style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,.5))' }} />
          <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: name.length > 11 ? 82 : 110, color: '#fff', lineHeight: 1, textShadow: '0 12px 40px rgba(0,0,0,.6)' }}>{name.toUpperCase()}</div>
        </div>
        {label ? <div style={{ marginTop: 26, display: 'inline-block', background: GOLD, color: '#0B1220', fontFamily: TITLE, fontWeight: 800, fontSize: 46, padding: '8px 28px', borderRadius: 14 }}>{label}</div> : null}
        <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
          {shapes.map((_, j) => <div key={j} style={{ width: j === k ? 54 : 18, height: 18, borderRadius: 9, background: j <= k ? GOLD : 'rgba(255,255,255,.3)' }} />)}
        </div>
      </div>
      {seg.scene.note ? <div style={{ position: 'absolute', bottom: 200, left: 230, fontFamily: BODY, fontSize: 20, color: 'rgba(200,215,235,.6)' }}>Source: {seg.scene.note} · outlines not to scale</div> : null}
    </div>
  );
};
