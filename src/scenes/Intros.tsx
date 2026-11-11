// Alternative cold opens, so episodes don't all start the same way.
//  flag: a huge waving flag with light rays;  hook: kinetic headline words on an animated grid.
import React from 'react';
import { EP, W, H, GOLD, TITLE, cl, pr, lerp, eBack, eOut, INTRO_END } from '../lib/core';
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
  const out = pr(t, INTRO_END - 0.7, 0.7);
  // phrase chunks from the intro narration, shown big one after another
  const chunks: { w: string; t: number }[][] = [];
  let cur: { w: string; t: number }[] = [];
  seg.words.forEach((w, k) => { cur.push(w); if (/[.!?,]$/.test(w.w) || cur.length >= 4 || k === seg.words.length - 1) { chunks.push(cur); cur = []; } });
  const c = [...chunks].reverse().find((ch) => t >= ch[0].t - 0.1) ?? chunks[0];
  const isName = c.some((w) => w.w.replace(/[^\w]/g, '').toLowerCase() === EP.country.name.toLowerCase());
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, background: '#04070f', overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        {[...Array(25)].map((_, k) => <line key={'v' + k} x1={k * 80 - ((t * 40) % 80)} y1={0} x2={k * 80 - ((t * 40) % 80)} y2={H} stroke={GOLD} strokeOpacity={0.12} />)}
        {[...Array(15)].map((_, k) => <line key={'h' + k} x1={0} y1={k * 80} x2={W} y2={k * 80} stroke={GOLD} strokeOpacity={0.12} />)}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0 34px', flexWrap: 'wrap', padding: '0 160px' }}>
        {c.map((w, k) => {
          const q = pr(t, w.t - 0.06, 0.32, eBack);
          return <span key={w.t} style={{ fontFamily: TITLE, fontWeight: 800, fontSize: isName ? 200 : 128, lineHeight: 1.1, letterSpacing: isName ? 24 : 1,
            color: isName || k === c.length - 1 ? GOLD : '#fff', opacity: cl(q * 2), transform: `translateY(${(1 - q) * 80}px) scale(${lerp(1.4, 1, q)})`, display: 'inline-block',
            textShadow: '0 10px 40px rgba(0,0,0,.8)' }}>{isName ? w.w.replace(/[^\w]/g, '').toUpperCase() : w.w}</span>;
        })}
      </div>
    </div>
  );
};
