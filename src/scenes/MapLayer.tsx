// Vector world map (Natural Earth 1:50m via world-atlas) projected per frame with d3-geo.
// The focus country is filled with its flag and outlined in gold; scene labels / markers are synced to the narration.
import React, { useMemo } from 'react';
import { staticFile } from 'remotion';
import { geoMercator, geoPath, geoGraticule10, geoArea, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
import { EP, W, H, GOLD, TITLE, BODY, Seg, View, cl, pr, lerp, eExpoIO, eBack, eOut, cue, segWindow, fadeWin, INTRO_END, spokenAt, MAP_STYLE, INTRO_TYPE, HIST, DISPLAY } from '../lib/core';
import { SvgIcon } from '../lib/Icon';

const FC: any = feature(world as any, (world as any).objects.countries);
const FEATS: any[] = FC.features;
const TARGET = FEATS.find((f) => String(f.id).padStart(3, '0') === EP.country.isoNum);
// largest polygon of the target (mainland) -> where the flag image is anchored
const MAIN: any = (() => {
  if (!TARGET) return null;
  const g = TARGET.geometry;
  if (g.type !== 'MultiPolygon') return TARGET;
  let best = null as any, ba = -1;
  for (const c of g.coordinates) { const f = { type: 'Feature', geometry: { type: 'Polygon', coordinates: c } }; const a = geoArea(f as any); if (a > ba) { ba = a; best = f; } }
  return best;
})();
const GRAT = geoGraticule10();
// map looks: ocean (centre/mid/edge), land (top/bottom), borders, graticule
const THEMES: Record<string, { o: [string, string, string]; l: [string, string]; b: string; g: string }> = {
  navy: { o: ['#0f3a66', '#0a2546', '#050f20'], l: ['#4a6380', '#33495f'], b: 'rgba(200,220,240,.45)', g: 'rgba(140,190,255,.08)' },
  night: { o: ['#0b1426', '#060a14', '#020306'], l: ['#1b2433', '#121926'], b: 'rgba(94,200,255,.55)', g: 'rgba(94,200,255,.07)' },
  sand: { o: ['#1d6f86', '#155a70', '#0b3444'], l: ['#d8c39a', '#b89f72'], b: 'rgba(90,60,30,.45)', g: 'rgba(255,255,255,.08)' },
  emerald: { o: ['#0c3b3a', '#082a2a', '#041615'], l: ['#3c5e4a', '#2a4434'], b: 'rgba(190,240,210,.4)', g: 'rgba(160,255,210,.07)' },
  parchment: { o: ['#a9926a', '#8e7853', '#5e4d33'], l: ['#efe0bb', '#dcc697'], b: 'rgba(90,58,25,.6)', g: 'rgba(80,50,20,.14)' },
};
const MT = THEMES[MAP_STYLE] ?? THEMES.navy;
const FLAG_ON_MAP = (EP as any).flagOnMap !== false; // history episodes: plain accent fill instead of today's flag
const DIMMED = new Set(['timeline', 'cards', 'bignum', 'bars', 'steps', 'checklist', 'era', 'split', 'journey', 'crowd', 'street', 'race']);

// ---------- camera: shot list built from the narration ----------
// Each map segment opens on its view, then the camera flies in to every place as it is spoken, and pulls back out.
type Key = { t: number; v: View; d: number };
const SHOT_TYPES = new Set(['map', 'cities']);
const KEYS: Key[] = (() => {
  const ks: Key[] = [];
  const first = EP.segments.find((s) => s.scene.view)?.scene.view as View | undefined ?? { lon: EP.country.lon, lat: EP.country.lat, span: 30 };
  if (INTRO_TYPE === 'dive') {
    ks.push({ t: -10, v: { lon: first.lon - 40, lat: first.lat - 10, span: 260 }, d: 0.01 });
    ks.push({ t: 0, v: first, d: Math.max(3, INTRO_END - 0.5) });
  } else {
    ks.push({ t: -10, v: { ...first, span: first.span * 3.4, lon: first.lon + 6 }, d: 0.01 });
    ks.push({ t: INTRO_END - 1.0, v: first, d: 2.2 });
  }
  EP.segments.forEach((s) => {
    const base = s.scene.view as View | undefined; if (!base) return;
    ks.push({ t: s.start - 0.55, v: base, d: 1.5 });
    if (!SHOT_TYPES.has(s.scene.type) || s.scene.arcs || s.scene.bubbles || s.scene.columns || s.scene.frames) return; // data maps keep the whole view
    const pts = ((s.scene.markers ?? []) as any[]).concat(s.scene.cities ?? []).map((m) => ({ name: m[0] as string, lon: m[1] as number, lat: m[2] as number }));
    let last = -1;
    pts.map((m) => ({ ...m, at: cueTime(s, m.name) })).filter((m) => m.at !== null).sort((a, b) => a.at! - b.at!).forEach((m) => {
      const at = m.at!; if (at < last + 1.2) return;
      ks.push({ t: at - 0.45, v: { lon: m.lon, lat: m.lat, span: Math.max(3, base.span * 0.45) }, d: 1.1 });
      last = at;
    });
    if (last > 0 && last + 2.0 < s.end) ks.push({ t: last + 1.9, v: base, d: 1.3 });
  });
  return ks.sort((a, b) => a.t - b.t);
})();
function cueTime(s: Seg, name: string): number | null { const sp = spokenAt(s, name); return sp === null ? null : sp - 0.15; }
const mixV = (a: View, b: View, p: number): View => ({ lon: lerp(a.lon, b.lon, p), lat: lerp(a.lat, b.lat, p), span: Math.exp(lerp(Math.log(a.span), Math.log(b.span), p)) });
export const camera = (t: number): View => {
  let cur = KEYS[0].v;
  for (let i = 1; i < KEYS.length; i++) {
    const k = KEYS[i]; if (t < k.t) break;
    const nextT = i + 1 < KEYS.length ? Math.min(KEYS[i + 1].t, t) : t;
    // state at the moment this transition is interrupted (or now)
    const p = eExpoIO(cl((nextT - k.t) / k.d));
    cur = mixV(cur, k.v, p);
  }
  // living camera: drift, breathing zoom, punch-in at every segment change, slow pull-back in the outro
  let span = cur.span * (1 + 0.035 * Math.sin(t * 0.45));
  for (const s of EP.segments) { const d = t - s.start + 0.35; if (d > 0 && d < 0.7) span *= 1 - 0.1 * Math.sin((Math.PI * d) / 0.7); }
  const outro = EP.segments[EP.segments.length - 1];
  if (t > outro.start) span *= 1 + 0.6 * eExpoIO(cl((t - outro.start) / 7));
  return { lon: cur.lon + span * 0.012 * Math.sin(t * 0.21), lat: cur.lat + span * 0.006 * Math.cos(t * 0.17), span };
};

// the SVG canvas is larger than the frame so the 3D tilt never shows an edge
export const CW = 2600, CH = 1700;
const proj = (v: View) => geoMercator().center([v.lon, v.lat]).scale(W / ((v.span * Math.PI) / 180)).translate([CW / 2, CH / 2]).clipExtent([[-60, -60], [CW + 60, CH + 60]]);

type Mk = [string, number, number, string?];
const Marker: React.FC<{ x: number; y: number; name: string; kind: string; p: number; side?: number }> = ({ x, y, name, kind, p, side = 1 }) => {
  if (p <= 0) return null;
  const s = eBack(cl(p));
  const lib = kind === 'battle' ? 'fluent-emoji-flat:crossed-swords' : kind.includes(':') ? kind : null;
  const icon = lib ? (
    <g><circle r={34} fill={HIST ? 'rgba(250,236,205,.92)' : 'rgba(10,16,30,.85)'} stroke={GOLD} strokeWidth={3} /><SvgIcon name={lib} x={0} y={0} size={46} /></g>
  ) : kind === 'peak' ? (
    <path d="M-16 10 L0 -16 L16 10 Z" fill={GOLD} stroke="#3a2a00" strokeWidth={2} />
  ) : kind === 'star' ? (
    <path d="M0 -15 L4.4 -4.6 L15 -4.6 L6.5 2 L9.5 13 L0 6.5 L-9.5 13 L-6.5 2 L-15 -4.6 L-4.4 -4.6 Z" fill={GOLD} stroke="#3a2a00" strokeWidth={1.5} />
  ) : kind === 'pin' ? (
    <g><path d="M0 0 C-12 -16 -14 -22 -14 -28 A14 14 0 1 1 14 -28 C14 -22 12 -16 0 0Z" fill={GOLD} /><circle cy={-28} r={5.5} fill="#1a1200" /></g>
  ) : kind === 'capital' ? (
    <g><circle r={13} fill="none" stroke={GOLD} strokeWidth={3} /><circle r={6} fill={GOLD} /></g>
  ) : (
    <g><circle r={9} fill={GOLD} stroke="#fff" strokeWidth={3} /></g>
  );
  const lx = side * 26;
  return (
    <g transform={`translate(${x},${y})`} opacity={cl(p * 3)}>
      <circle r={22 + 30 * cl(p)} fill="none" stroke={GOLD} strokeWidth={2} opacity={0.6 * (1 - cl(p))} />
      <g transform={`scale(${s})`}>{icon}</g>
      <g transform={`translate(${lx},${kind === 'pin' ? -28 : 0})`} opacity={cl((p - 0.15) * 3)}>
        <text x={lib ? side * 18 : 0} y={9} textAnchor={side > 0 ? 'start' : 'end'} fontFamily={HIST ? DISPLAY : TITLE} fontWeight={HIST ? 700 : 600} fontSize={HIST ? 30 : 27} fill={HIST ? '#2a1708' : '#fff'}
          stroke={HIST ? 'rgba(248,234,204,.95)' : 'rgba(5,10,20,.85)'} strokeWidth={HIST ? 8 : 7} paintOrder="stroke" style={{ letterSpacing: 0.5 }}>{name}</text>
      </g>
    </g>
  );
};

export const MapLayer: React.FC<{ t: number; seg: Seg; segIdx: number; view?: View }> = ({ t, seg, segIdx, view }) => {
  const v = view ?? camera(t);
  const P = proj(v);
  const path = geoPath(P);
  const land = useMemo(() => FEATS, []);
  const tgtD = TARGET ? path(TARGET) || '' : '';
  const mb = MAIN ? path.bounds(MAIN) : [[0, 0], [0, 0]];
  const fw = mb[1][0] - mb[0][0], fh = mb[1][1] - mb[0][1];
  const fillP = INTRO_TYPE === 'dive' ? pr(t, INTRO_END - 2.0, 1.4, eOut) : pr(t, INTRO_END + 0.6, 1.4, eOut);
  const glow = 0.55 + 0.2 * Math.sin(t * 2.4);
  const tiltBase = seg.scene.columns ? 4 : seg.scene.type === 'stats' ? 14 : DIMMED.has(seg.scene.type) ? 30 : 24;
  const tilt = tiltBase + 4 * Math.sin(t * 0.13) - 14 * (1 - pr(t, INTRO_TYPE === 'dive' ? 0 : INTRO_END - 0.4, INTRO_TYPE === 'dive' ? INTRO_END : 2.4));
  const rz = 1.4 * Math.sin(t * 0.09);
  let blur = 0; for (const s of EP.segments) { const d = t - s.start + 0.35; if (d > 0 && d < 0.5) blur = Math.max(blur, 7 * Math.sin((Math.PI * d) / 0.5)); }
  const draw = INTRO_TYPE === 'dive' ? pr(t, INTRO_END - 2.6, 2.2, eOut) : pr(t, INTRO_END - 0.3, 2.2, eOut);

  // overlays from the active segment (labels, markers, river) + capital
  const sc = seg.scene;
  const [w0, w1] = segWindow(segIdx);
  const vis = fadeWin(t, w0, w1, 0.4, 0.45);
  const items: React.ReactNode[] = [];
  const pt = (lon: number, lat: number) => P([lon, lat]) as [number, number];
  (sc.labels as Mk[] | undefined)?.forEach(([name, lon, lat, kind], i, arr) => {
    const c = cue(seg, name, i, arr.length); const p = pr(t, c, 0.6) * vis; const [x, y] = pt(lon, lat);
    if (p <= 0) return;
    const sea = kind === 'sea';
    items.push(<text key={'l' + i} x={x} y={y} textAnchor="middle" fontFamily={sea ? BODY : TITLE} fontStyle={sea ? 'italic' : 'normal'} fontWeight={sea ? 500 : 600}
      fontSize={sea ? 26 : 30} fill={sea ? '#9fd4ff' : '#fff'} opacity={p * (sea ? 0.85 : 0.95)} letterSpacing={sea ? 3 : 4}
      stroke="rgba(5,10,20,.7)" strokeWidth={6} paintOrder="stroke" transform={`translate(0,${(1 - p) * 14})`}>{sea ? name : name.toUpperCase()}</text>);
  });
  const mks = ((sc.markers as Mk[] | undefined) ?? []).concat(sc.cities ? (sc.cities as Mk[]).map((c) => [c[0], c[1], c[2], 'dot'] as Mk) : []);
  mks.forEach(([name, lon, lat, kind], i, arr) => {
    const c = cue(seg, name, i, arr.length); const p = pr(t, c, 0.7, (x) => x) * vis; const [x, y] = pt(lon, lat);
    items.push(<Marker key={'m' + i} x={x} y={y} name={name} kind={kind ?? 'dot'} p={p} side={x > CW / 2 + W * 0.28 ? -1 : 1} />);
  });
  // arcs: glowing curved flight/trade lines between two points with a travelling light
  ((sc.arcs as { from: [number, number]; to: [number, number]; label?: string; cue?: string; color?: string }[] | undefined) ?? []).forEach((r, ri, arr) => {
    const c = cue(seg, r.cue ?? r.label ?? '', ri, arr.length); const p = pr(t, c - 0.1, 1.4, eOut) * vis;
    if (p <= 0) return;
    const [x0, y0] = pt(r.from[0], r.from[1]), [x1, y1] = pt(r.to[0], r.to[1]); const dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy);
    const cx = (x0 + x1) / 2 - (dy / dist) * dist * 0.28 - 0, cy = (y0 + y1) / 2 + (dx / dist) * dist * 0.28 * (dx > 0 ? -1 : 1) - dist * 0.12;
    const col = r.color ?? GOLD; const d = `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
    const q = (t * 0.45 + ri * 0.3) % 1; const bx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * cx + q * q * x1, by = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * cy + q * q * y1;
    items.push(<g key={'arc' + ri}>
      <path d={d} fill="none" stroke={col} strokeWidth={14} opacity={0.25} pathLength={1000} strokeDasharray={`${1000 * p} 1000`} filter="url(#soft)" />
      <path d={d} fill="none" stroke={col} strokeWidth={4} pathLength={1000} strokeDasharray={`${1000 * p} 1000`} strokeLinecap="round" />
      {p > 0.98 ? <><circle cx={bx} cy={by} r={9} fill="#fff" /><circle cx={bx} cy={by} r={22} fill={col} opacity={0.35} filter="url(#soft)" /></> : null}
      {[[x0, y0], [x1, y1]].map(([px, py], k) => <g key={k}><circle cx={px} cy={py} r={8} fill={col} stroke="#fff" strokeWidth={3} /><circle cx={px} cy={py} r={14 + ((t * 30 + k * 10) % 30)} fill="none" stroke={col} strokeWidth={2} opacity={1 - ((t * 30 + k * 10) % 30) / 30} /></g>)}
      {r.label ? <text x={cx} y={cy + (y0 + y1) / 2 * 0 + 0} dy={((y0 + y1) / 2 - cy) * 0.45} textAnchor="middle" fontFamily={HIST ? DISPLAY : TITLE} fontWeight={700} fontSize={28} fill="#fff" stroke="rgba(5,10,20,.85)" strokeWidth={7} paintOrder="stroke" opacity={cl((p - 0.5) * 3)}>{r.label}</text> : null}
    </g>);
  });
  // bubbles: countries as round flags sized by a value ("countries resized by population")
  { const bs = (sc.bubbles as [string, number, number, number, string?, string?][] | undefined) ?? []; const mx = Math.max(1, ...bs.map((b) => b[3]));
    // place circles at their countries, then push overlapping ones apart (a quick Dorling-style relaxation)
    const P = bs.map(([, lon, lat, val]) => { const [x, y] = pt(lon, lat); return { x, y, r: 30 + 150 * Math.sqrt(val / mx) }; });
    for (let it = 0; it < 80; it++) for (let m = 0; m < P.length; m++) for (let n = m + 1; n < P.length; n++) {
      const dx = P[n].x - P[m].x, dy = P[n].y - P[m].y, d = Math.hypot(dx, dy) || 1, need = P[m].r + P[n].r + 95;
      if (d < need) { const push = (need - d) / 2, ux = dx / d, uy = dy / d; P[m].x -= ux * push; P[m].y -= uy * push; P[n].x += ux * push; P[n].y += uy * push; } }
    bs.forEach(([name, lon, lat, val, iso, cw], bi) => { const c = cue(seg, cw ?? name, bi, bs.length); const p = pr(t, c - 0.1, 0.7, eBack) * vis; if (p <= 0) return;
      const { x, y, r } = P[bi];
      items.push(<g key={'b' + bi} transform={`translate(${x},${y}) scale(${p})`}>
        <circle r={r + 8} fill="rgba(0,0,0,.35)" filter="url(#soft)" /><circle r={r + 5} fill="#fff" />
        {iso ? <SvgIcon name={'circle-flags:' + iso} x={0} y={0} size={r * 2} /> : <circle r={r} fill={GOLD} />}
        <text y={r + 40} textAnchor="middle" fontFamily={TITLE} fontWeight={800} fontSize={Math.max(24, r * 0.32)} fill="#fff" stroke="rgba(5,10,20,.85)" strokeWidth={7} paintOrder="stroke">{name}</text>
        <text y={r + 40 + Math.max(24, r * 0.32)} textAnchor="middle" fontFamily={TITLE} fontWeight={800} fontSize={Math.max(22, r * 0.26)} fill={GOLD} stroke="rgba(5,10,20,.85)" strokeWidth={7} paintOrder="stroke">{(sc.bubbleFmt ?? '{v}').replace('{v}', String(val))}</text>
      </g>); }); }
  // columns: 3D bars rising out of the map at each place
  { const cs = (sc.columns as [string, number, number, number, string?][] | undefined) ?? []; const mx = Math.max(1, ...cs.map((b) => b[3]));
    cs.forEach(([name, lon, lat, val, lab], ci) => { const c = cue(seg, name, ci, cs.length); const p = pr(t, c - 0.1, 1.1, eOut) * vis; if (p <= 0) return;
      const [x, y] = pt(lon, lat); const h = (50 + 320 * (val / mx)) * p; const w = 52, dd = 20;
      items.push(<g key={'c' + ci}>
        <ellipse cx={x + dd / 2} cy={y} rx={w * 0.9} ry={14} fill="rgba(0,0,0,.35)" filter="url(#soft)" />
        <path d={`M${x - w / 2} ${y} L${x - w / 2} ${y - h} L${x + w / 2} ${y - h} L${x + w / 2} ${y} Z`} fill={GOLD} />
        <path d={`M${x + w / 2} ${y} L${x + w / 2} ${y - h} L${x + w / 2 + dd} ${y - h - dd * 0.6} L${x + w / 2 + dd} ${y - dd * 0.6} Z`} fill={GOLD} style={{ filter: 'brightness(.7)' }} opacity={0.85} />
        <path d={`M${x - w / 2} ${y - h} L${x - w / 2 + dd} ${y - h - dd * 0.6} L${x + w / 2 + dd} ${y - h - dd * 0.6} L${x + w / 2} ${y - h} Z`} fill="#fff" opacity={0.55} />
        <rect x={x - w / 2} y={y - h} width={10} height={h} fill="#fff" opacity={0.25} />
        <text x={x + dd / 2} y={y - h - 30} textAnchor="middle" fontFamily={TITLE} fontWeight={800} fontSize={34} fill="#fff" stroke="rgba(5,10,20,.85)" strokeWidth={7} paintOrder="stroke" opacity={cl(p * 2)}>{lab ?? String(val)}</text>
        <text x={x} y={y + 40} textAnchor="middle" fontFamily={TITLE} fontWeight={700} fontSize={26} fill="#fff" stroke="rgba(5,10,20,.85)" strokeWidth={6} paintOrder="stroke" opacity={cl(p * 2)}>{name}</text>
      </g>); }); }
  // neighbouring / mentioned countries: filled with their own flag, glowing outline and a round-flag badge when their name is spoken
  ((sc._countries as { name: string; id: string; iso2: string }[] | undefined) ?? []).forEach((cn, ci, arr) => {
    const c = cue(seg, cn.name, ci, arr.length); const p = pr(t, c - 0.15, 0.9, eOut) * vis; if (p <= 0) return;
    const f = FEATS.find((x) => String(x.id).padStart(3, '0') === cn.id); if (!f) return;
    const d = path(f) || ''; const mainF = f.geometry.type === 'MultiPolygon'
      ? { ...f, geometry: { type: 'Polygon', coordinates: f.geometry.coordinates.reduce((a: any, b: any) => (geoArea({ type: 'Polygon', coordinates: b } as any) > geoArea({ type: 'Polygon', coordinates: a } as any) ? b : a)) } } : f;
    const bb = path.bounds(mainF); const bw = bb[1][0] - bb[0][0], bh = bb[1][1] - bb[0][1]; const [cx, cy] = path.centroid(mainF);
    const pop = pr(t, c + 0.2, 0.6, eBack); const flash = Math.max(0, 1 - (t - c) / 0.5);
    items.unshift(<g key={'cn' + ci}>
      <clipPath id={'cnc' + ci}><path d={d} /></clipPath>
      <path d={d} fill="none" stroke={GOLD} strokeWidth={14} opacity={(0.5 + 0.2 * Math.sin(t * 3)) * p} filter="url(#glow)" />
      <g clipPath={`url(#cnc${ci})`} opacity={p}>
        <image href={staticFile(`flags/${cn.iso2}.svg`)} x={bb[0][0] - bw * 0.05} y={bb[0][1] - bh * 0.05} width={bw * 1.1} height={bh * 1.1} preserveAspectRatio="xMidYMid slice" />
        <rect x={bb[0][0] - bw} y={bb[0][1] - bh} width={bw * 3} height={bh * 3} fill="#fff" opacity={0.6 * flash} />
      </g>
      <path d={d} fill="none" stroke="#fff" strokeWidth={3} strokeLinejoin="round" pathLength={1000} strokeDasharray={`${1000 * p} 1000`} />
      {bw > 40 ? <g transform={`translate(${cx},${cy - Math.min(bh * 0.25, 60)}) scale(${pop})`}>
        <circle r={36} fill="#fff" /><SvgIcon name={'circle-flags:' + cn.iso2} x={0} y={0} size={64} />
      </g> : null}
    </g>);
  });
  // routes: a dashed journey/conquest/trade line that draws itself, with an icon travelling at its head
  ((sc.routes as { points: [number, number][]; label?: string; cue?: string; icon?: string; color?: string }[] | undefined) ?? []).forEach((r, ri, arr) => {
    const c = cue(seg, r.cue ?? r.label ?? '', ri, arr.length); const p = pr(t, c - 0.1, 2.6, (x) => 1 - Math.pow(1 - x, 2)) * vis;
    if (p <= 0) return;
    const pts = r.points.map(([lo, la]) => pt(lo, la)); const col = r.color ?? (HIST ? '#7a1f12' : GOLD);
    const segs = pts.slice(1).map((q, k) => Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1])); const len = segs.reduce((a, b) => a + b, 0);
    let rem = len * p, hx = pts[0][0], hy = pts[0][1], ang = 0;
    for (let k = 0; k < segs.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1]; ang = Math.atan2(by - ay, bx - ax);
      if (rem <= segs[k]) { const f = segs[k] ? rem / segs[k] : 0; hx = ax + (bx - ax) * f; hy = ay + (by - ay) * f; break; } rem -= segs[k]; hx = bx; hy = by; }
    const d = 'M' + pts.map((q) => q.join(',')).join('L');
    items.push(<g key={'r' + ri}>
      <defs><mask id={'rm' + ri}><path d={d} fill="none" stroke="#fff" strokeWidth={14} strokeDasharray={`${len * p} ${len}`} strokeLinecap="round" strokeLinejoin="round" /></mask></defs>
      <path d={d} fill="none" stroke={HIST ? 'rgba(250,236,205,.8)' : 'rgba(5,10,20,.6)'} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" mask={`url(#rm${ri})`} />
      <path d={d} fill="none" stroke={col} strokeWidth={5.5} strokeDasharray="18 12" strokeDashoffset={-t * 30} strokeLinecap="round" strokeLinejoin="round" mask={`url(#rm${ri})`} />
      {r.icon ? <SvgIcon name={r.icon} x={hx} y={hy - 6} size={64} rotate={0} opacity={cl(p * 5) * (p > 0.98 ? 1 : 1)} /> :
        <path d="M-14 -10 L12 0 L-14 10 Z" fill={col} transform={`translate(${hx},${hy}) rotate(${(ang * 180) / Math.PI})`} />}
      {r.label ? <text x={pts[Math.floor(pts.length / 2)][0]} y={pts[Math.floor(pts.length / 2)][1] - 26} textAnchor="middle" fontFamily={HIST ? DISPLAY : TITLE} fontWeight={700} fontSize={30}
        fill={HIST ? '#5a1408' : '#fff'} stroke={HIST ? 'rgba(248,234,204,.95)' : 'rgba(5,10,20,.85)'} strokeWidth={8} paintOrder="stroke" fontStyle="italic" opacity={cl((p - 0.3) * 3)}>{r.label}</text> : null}
    </g>);
  });
  // areas: territories made of modern countries, e.g. an empire's approximate extent
  const areaEls: React.ReactNode[] = [];
  let areaList = (sc.areas as { ids: string[]; label?: string; cue?: string; color?: string; labelAt?: [number, number] }[] | undefined) ?? [];
  let frameAt = -1;
  if (sc.frames) { const fr = sc.frames as [string, any[], string?][]; const n = fr.length;
    const times = fr.map((f, k) => (f[2] ? spokenAt(seg, f[2]) : null) ?? seg.start + 0.4 + (k * (seg.end - seg.start - 0.8)) / Math.max(1, n));
    let k = 0; times.forEach((tt, j) => { if (t >= tt - 0.1) k = j; }); areaList = fr[k][1]; frameAt = times[k]; }
  areaList.forEach((a, ai, arr) => {
    const c = frameAt >= 0 ? frameAt : cue(seg, a.cue ?? a.label ?? '', ai, arr.length); const p = pr(t, c - 0.1, frameAt >= 0 ? 0.6 : 1.6, eOut) * vis;
    if (p <= 0) return;
    const col = a.color ?? GOLD; const fs = FEATS.filter((f) => a.ids.includes(String(f.id).padStart(3, '0')));
    let big: any = null, bigA = -1;
    fs.forEach((f) => { const ar = path.area(f); if (ar > bigA) { bigA = ar; big = f; } });
    areaEls.push(<g key={'a' + ai}>
      {fs.map((f, k) => { const q = cl(p * 1.6 - k * 0.12); return <path key={k} d={path(f) || ''} fill={col} fillOpacity={0.55 * q} stroke={col} strokeWidth={3} strokeOpacity={0.9 * q} />; })}
    </g>);
    if (a.label && big) { const [x, y] = a.labelAt ? pt(a.labelAt[0], a.labelAt[1]) : path.centroid(big);
      areaEls.push(<text key={'al' + ai} x={x} y={y} textAnchor="middle" fontFamily={DISPLAY} fontWeight={HIST ? 900 : 800} fontSize={HIST ? 46 : 40} fill={HIST ? '#fff8e6' : '#fff'} stroke="rgba(60,25,8,.9)" strokeWidth={9} paintOrder="stroke"
        letterSpacing={3} opacity={cl((p - 0.35) * 2)}>{a.label.toUpperCase()}</text>); }
  });
  if (sc.capital) {
    const [name, lon, lat] = sc.capital as Mk; const c = cue(seg, name, 0, 1); const [x, y] = pt(lon, lat);
    items.push(<Marker key="cap" x={x} y={y} name={`${name} · capital`} kind="capital" p={pr(t, c, 0.7, (x) => x) * vis} />);
  }
  if (sc.river) {
    const pts = (sc.river as [number, number][]).map(([lo, la]) => pt(lo, la));
    const c = cue(seg, sc.riverLabel ?? '', 0, 1); const p = pr(t, c, 2.2, eOut) * vis;
    const d = 'M' + pts.map((q) => q.join(',')).join('L');
    const len = pts.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), 0);
    items.push(<g key="river" opacity={cl(p * 4)}>
      <path d={d} fill="none" stroke="#5EC8FF" strokeWidth={10} opacity={0.35} strokeLinecap="round" strokeLinejoin="round" filter="url(#soft)" />
      <path d={d} fill="none" stroke="#8fe0ff" strokeWidth={4.5} strokeDasharray={`${len * p} ${len}`} strokeLinecap="round" strokeLinejoin="round" />
      <text x={pts[Math.floor(pts.length / 2)][0]} y={pts[Math.floor(pts.length / 2)][1] - 18} textAnchor="middle" fontFamily={BODY} fontStyle="italic" fontWeight={700} fontSize={28} fill="#bfefff"
        stroke="rgba(5,10,20,.8)" strokeWidth={6} paintOrder="stroke" opacity={cl((p - 0.4) * 3)}>{sc.riverLabel}</text>
    </g>);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: '50% 30%' }}>
    <div style={{ position: 'absolute', left: (W - CW) / 2, top: (H - CH) / 2 + 40, width: CW, height: CH, transformOrigin: '50% 55%',
      transform: `rotateX(${tilt}deg) rotateZ(${rz}deg)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
    <svg width={CW} height={CH} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="ocean" cx="50%" cy="45%" r="75%"><stop offset="0" stopColor={MT.o[0]} /><stop offset="0.6" stopColor={MT.o[1]} /><stop offset="1" stopColor={MT.o[2]} /></radialGradient>
        <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={MT.l[0]} /><stop offset="1" stopColor={MT.l[1]} /></linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="soft"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.55" /></filter>
        <clipPath id="tgt"><path d={tgtD} /></clipPath>
      </defs>
      <rect width={CW} height={CH} fill="url(#ocean)" />
      <path d={path(GRAT) || ''} fill="none" stroke={MT.g} strokeWidth={1} />
      <g filter="url(#shadow)">
        {land.map((f, i) => (f === TARGET ? null : <path key={i} d={path(f) || ''} fill="url(#land)" stroke={MT.b} strokeWidth={1.1} />))}
      </g>
      {TARGET ? (
        <g>
          <path d={tgtD} fill="none" stroke={GOLD} strokeWidth={16} opacity={glow * fillP} filter="url(#glow)" />
          <path d={tgtD} fill="#3a4f63" />
          <g clipPath="url(#tgt)" opacity={fillP}>
            {FLAG_ON_MAP ? <image href={staticFile('flag.svg')} x={mb[0][0] - fw * 0.04} y={mb[0][1] - fh * 0.04} width={fw * 1.08} height={fh * 1.08} preserveAspectRatio="xMidYMid slice" />
              : <rect x={0} y={0} width={CW} height={CH} fill={GOLD} opacity={0.75} />}
            <rect x={0} y={0} width={CW} height={CH} fill="url(#ocean)" opacity={0.12} />
          </g>
          <path d={tgtD} fill="none" stroke="#FFE6A0" strokeWidth={3} strokeLinejoin="round" pathLength={1000} strokeDasharray={`${1000 * draw} 1000`} />
          <path d={tgtD} fill="none" stroke="#fff" strokeWidth={4} strokeLinejoin="round" pathLength={1000} strokeDasharray="60 940" strokeDashoffset={-((t * 140) % 1000)} opacity={0.75 * fillP} filter="url(#soft)" />
        </g>
      ) : null}
      {areaEls}
      {items}
    </svg>
    </div>
    </div>
  );
};
