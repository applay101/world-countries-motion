// Vector world map (Natural Earth 1:50m via world-atlas) projected per frame with d3-geo.
// The focus country is filled with its flag and outlined in gold; scene labels / markers are synced to the narration.
import React, { useMemo } from 'react';
import { staticFile } from 'remotion';
import { geoMercator, geoPath, geoGraticule10, geoArea, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
import { EP, W, H, GOLD, TITLE, BODY, Seg, View, cl, pr, lerp, eExpoIO, eBack, eOut, cue, segWindow, fadeWin } from '../lib/core';

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

// ---------- camera ----------
const VIEWS: { t: number; v: View }[] = [];
EP.segments.forEach((s) => { if (s.scene.view) VIEWS.push({ t: s.start - 0.6, v: s.scene.view }); });
const FIRST: View = VIEWS[0]?.v ?? { lon: EP.country.lon, lat: EP.country.lat, span: 30 };
export const camera = (t: number): View => {
  if (!VIEWS.length) return FIRST;
  // intro: arrive from a wide view
  if (t < VIEWS[0].t + 1.6) {
    const p = eExpoIO(cl((t - (VIEWS[0].t - 0.4)) / 2.0));
    return { lon: lerp(FIRST.lon + 4, FIRST.lon, p), lat: FIRST.lat, span: Math.exp(lerp(Math.log(FIRST.span * 3.2), Math.log(FIRST.span), p)) };
  }
  let k = 0; for (let i = 0; i < VIEWS.length; i++) if (t >= VIEWS[i].t) k = i;
  const a = VIEWS[Math.max(0, k - 1)].v, b = VIEWS[k].v;
  const p = k === 0 ? 1 : eExpoIO(cl((t - VIEWS[k].t) / 1.8));
  // slow drift so the map never feels frozen
  const d = t - VIEWS[k].t;
  const outro = EP.segments[EP.segments.length - 1];
  let span = Math.exp(lerp(Math.log(a.span), Math.log(b.span), p)) * (1 - 0.0035 * Math.min(d, 20));
  if (t > outro.start) span *= 1 + 0.5 * eExpoIO(cl((t - outro.start) / 6));
  return { lon: lerp(a.lon, b.lon, p) + 0.02 * d, lat: lerp(a.lat, b.lat, p), span };
};

const proj = (v: View) => geoMercator().center([v.lon, v.lat]).scale(W / ((v.span * Math.PI) / 180)).translate([W / 2, H / 2]).clipExtent([[-60, -60], [W + 60, H + 60]]);

type Mk = [string, number, number, string?];
const Marker: React.FC<{ x: number; y: number; name: string; kind: string; p: number; side?: number }> = ({ x, y, name, kind, p, side = 1 }) => {
  if (p <= 0) return null;
  const s = eBack(cl(p));
  const icon = kind === 'peak' ? (
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
        <text x={0} y={9} textAnchor={side > 0 ? 'start' : 'end'} fontFamily={TITLE} fontWeight={600} fontSize={27} fill="#fff"
          stroke="rgba(5,10,20,.85)" strokeWidth={7} paintOrder="stroke" style={{ letterSpacing: 0.5 }}>{name}</text>
      </g>
    </g>
  );
};

export const MapLayer: React.FC<{ t: number; seg: Seg; segIdx: number }> = ({ t, seg, segIdx }) => {
  const v = camera(t);
  const P = proj(v);
  const path = geoPath(P);
  const land = useMemo(() => FEATS, []);
  const tgtD = TARGET ? path(TARGET) || '' : '';
  const mb = MAIN ? path.bounds(MAIN) : [[0, 0], [0, 0]];
  const fw = mb[1][0] - mb[0][0], fh = mb[1][1] - mb[0][1];
  const firstMap = EP.segments.find((s) => s.scene.view);
  const fillP = firstMap ? pr(t, firstMap.start + 0.6, 1.4, eOut) : 1;
  const glow = 0.55 + 0.2 * Math.sin(t * 2.4);

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
    items.push(<Marker key={'m' + i} x={x} y={y} name={name} kind={kind ?? 'dot'} p={p} side={x > W * 0.78 ? -1 : 1} />);
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
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="ocean" cx="50%" cy="45%" r="75%"><stop offset="0" stopColor="#0f3a66" /><stop offset="0.6" stopColor="#0a2546" /><stop offset="1" stopColor="#050f20" /></radialGradient>
        <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a6380" /><stop offset="1" stopColor="#33495f" /></linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="soft"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.55" /></filter>
        <clipPath id="tgt"><path d={tgtD} /></clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#ocean)" />
      <path d={path(GRAT) || ''} fill="none" stroke="rgba(140,190,255,.08)" strokeWidth={1} />
      <g filter="url(#shadow)">
        {land.map((f, i) => (f === TARGET ? null : <path key={i} d={path(f) || ''} fill="url(#land)" stroke="rgba(200,220,240,.45)" strokeWidth={1.1} />))}
      </g>
      {TARGET ? (
        <g>
          <path d={tgtD} fill="none" stroke={GOLD} strokeWidth={16} opacity={glow * fillP} filter="url(#glow)" />
          <path d={tgtD} fill="#3a4f63" />
          <g clipPath="url(#tgt)" opacity={fillP}>
            <image href={staticFile('flag.svg')} x={mb[0][0] - fw * 0.04} y={mb[0][1] - fh * 0.04} width={fw * 1.08} height={fh * 1.08} preserveAspectRatio="xMidYMid slice" />
            <rect x={0} y={0} width={W} height={H} fill="url(#ocean)" opacity={0.12} />
          </g>
          <path d={tgtD} fill="none" stroke="#FFE6A0" strokeWidth={2.6} opacity={fillP} strokeLinejoin="round" />
        </g>
      ) : null}
      {items}
    </svg>
  );
};
