// Alternative cold opens, so episodes don't all start the same way.
//  flag: a huge waving flag with light rays;  hook: kinetic headline words on an animated grid.
import React from 'react';
import { EP, W, H, GOLD, TITLE, cl, pr, lerp, eBack, eOut, INTRO_END, spokenAt } from '../lib/core';
import { FlagWave } from './Three';

export const FlagIntro: React.FC<{ t: number }> = ({ t }) => {
  const p = pr(t, 0.1, 1.6, eOut);
  const out = pr(t, INTRO_END - 0.9, 0.9);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, background: 'radial-gradient(ellipse at 50% 45%, #1a2a48 0%, #070b16 60%, #02040a 100%)', overflow: 'hidden' }}>
      {[...Array(14)].map((_, k) => (
        <div key={k} style={{ position: 'absolute', left: W / 2 - 4, top: H / 2 - 900, width: 8, height: 1800, transformOrigin: '50% 50%',
          transform: `rotate(${k * (180 / 14) + t * 6}deg)`, background: `linear-gradient(180deg, rgba(255,210,120,0), rgba(255,210,120,${0.07 * p}), rgba(255,210,120,0))` }} />
      ))}
      <div style={{ position: 'absolute', left: W / 2 - 560, top: H / 2 - 400, width: 1120, height: 800, transform: `scale(${0.6 + 0.4 * p + 0.05 * t / INTRO_END}) rotate(${(1 - p) * -8}deg)`,
        opacity: cl(p * 1.6), filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.6))' }}>
        <FlagWave t={t} w={1120} h={800} amp={1.2} />
      </div>
    </div>
  );
};

export const HookIntro: React.FC<{ t: number }> = ({ t }) => {
  const seg = EP.segments[0];
  const out = pr(t, INTRO_END - 0.6, 0.6);
  // display lines: scene.lines [[TEXT, cueWord]] from the script, else 3-word chunks of the narration
  const sl = (seg.scene as any).lines as [string, string][] | undefined;
  let lines: { text: string; t: number }[];
  if (sl?.length) {
    lines = sl.map(([text, cw], k) => ({ text, t: spokenAt(seg, cw) ?? lerp(seg.start + 0.3, INTRO_END - 1.5, k / Math.max(1, sl.length - 1)) }));
  } else {
    lines = []; let cur: string[] = []; let ct = 0;
    seg.words.forEach((w, k) => { if (!cur.length) ct = w.t; cur.push(w.w); if (/[.!?,]$/.test(w.w) || cur.length >= 3 || k === seg.words.length - 1) { lines.push({ text: cur.join(' '), t: ct }); cur = []; } });
  }
  lines.sort((a, b) => a.t - b.t);
  const ci = Math.max(0, lines.map((l) => t >= l.t - 0.1).lastIndexOf(true));
  const L = lines[ci], prev = ci > 0 ? lines[ci - 1] : null;
  const age = t - (L.t - 0.1);
  const name = EP.country.name.toUpperCase();
  const style = (text: string) => {
    const clean = text.replace(/[^\w]/g, '').toUpperCase();
    const isName = clean === name.replace(/[^\w]/g, '');
    const isNum = /\d/.test(text);
    const base = isName ? 330 : isNum ? 250 : 160;
    const size = Math.min(base, (W - 220) / Math.max(1, text.length * 0.74));
    return { isName, isNum, size };
  };
  const st = style(L.text);
  const q = pr(t, L.t - 0.1, 0.32, eBack);
  const hit = Math.exp(-age * 5);
  const sx = Math.sin(t * 90) * hit * 16, sy = Math.cos(t * 77) * hit * 16;
  const ring = pr(t, L.t - 0.1, 1.0, eOut);
  // perspective grid (floor + ceiling) toward a vanishing point in the centre
  const vx = W / 2, vy = H / 2, grid: React.ReactNode[] = [];
  const scroll = (t * 0.9) % 1;
  for (const dir of [1, -1]) {
    for (let k = 0; k < 14; k++) { const z = 14 - k - scroll; if (z <= 0.2) continue; const y = vy + dir * 520 / z; if (Math.abs(y - vy) > H) continue;
      grid.push(<line key={`h${dir}${k}`} x1={0} x2={W} y1={y} y2={y} stroke={GOLD} strokeWidth={2} strokeOpacity={cl(0.75 - z / 20)} />); }
    for (let k = -14; k <= 14; k++) grid.push(<line key={`v${dir}${k}`} x1={vx + k * 18} y1={vy + dir * 10} x2={vx + k * 260} y2={vy + dir * H} stroke={GOLD} strokeWidth={2} strokeOpacity={0.35} />);
  }
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, background: '#03050b', overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs><linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#03050b" stopOpacity="0" /><stop offset="0.5" stopColor="#03050b" stopOpacity="1" /><stop offset="1" stopColor="#03050b" stopOpacity="0" /></linearGradient></defs>
        <g opacity={0.8}>{grid}</g>
        <rect x={0} y={vy - 170} width={W} height={340} fill="url(#hz)" />
        <circle cx={vx} cy={vy} r={lerp(60, 1300, ring)} fill="none" stroke={GOLD} strokeWidth={lerp(26, 2, ring)} opacity={(1 - ring) * 0.85} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${GOLD}${Math.round(30 + 90 * hit).toString(16).padStart(2, '0')} 0%, rgba(3,5,11,0) 42%)` }} />
      {prev && age < 0.5 ? (() => { const ps = style(prev.text); const o = pr(t, L.t - 0.1, 0.35, eOut);
        return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${-o * 320}px) scale(${1 - o * 0.5})`, opacity: 1 - o }}>
          <span style={{ fontFamily: TITLE, fontWeight: 800, fontSize: ps.size, color: ps.isNum || ps.isName ? GOLD : '#fff', whiteSpace: 'nowrap' }}>{prev.text}</span></div>; })() : null}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate(${sx}px, ${sy}px) scale(${1 + 0.04 * age})` }}>
        <span style={{ fontFamily: TITLE, fontWeight: 800, fontSize: st.size, lineHeight: 1, letterSpacing: st.isName ? 30 : 0, whiteSpace: 'nowrap',
          color: st.isNum || st.isName ? GOLD : '#fff', opacity: cl(q * 2), transform: `translateY(${(1 - q) * 140}px) scale(${lerp(st.isName ? 2.4 : 1.7, 1, q)})`, display: 'inline-block',
          textShadow: st.isNum || st.isName ? `0 0 70px ${GOLD}, 0 14px 40px rgba(0,0,0,.9)` : '0 14px 40px rgba(0,0,0,.9)' }}>{L.text}</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: Math.exp(-age * 14) * 0.3 }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 260px rgba(0,0,0,.95)' }} />
    </div>
  );
};
