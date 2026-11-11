// High-energy layer: full-screen chapter title hits, light sweeps, camera shake and a chapter progress bar.
import React from 'react';
import { EP, W, H, GOLD, INK, TITLE, BODY, cl, pr, lerp, eExpo, eOut, E, INTRO_END , DISPLAY, HIST } from '../lib/core';

const CHAPTERS = EP.segments.map((s, i) => ({ s, i })).filter(({ s }) => s.scene.chapter && s.start > INTRO_END - 0.5);

// big title hit at every chapter start (~1.3 s), then the corner chip takes over
export const ChapterHero: React.FC<{ t: number }> = ({ t }) => {
  const c = CHAPTERS.find(({ s }) => t >= s.start - 0.45 && t < s.start + 1.0);
  if (!c) return null;
  const a = c.s.start - 0.45, d = t - a;
  const inP = eExpo(cl(d / 0.4)), out = E('power3.in')(cl((d - 1.0) / 0.4));
  const num = CHAPTERS.findIndex((x) => x.i === c.i) + 1;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - 120, height: 240, background: 'linear-gradient(90deg, rgba(4,8,16,0) 0%, rgba(4,8,16,.82) 18%, rgba(4,8,16,.82) 82%, rgba(4,8,16,0) 100%)',
        transform: `scaleY(${inP * (1 - out)})`, opacity: 1 - out }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - 120, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34,
        transform: `translateX(${(1 - inP) * -260 + out * 420}px)`, opacity: cl(inP * 1.5) * (1 - out) }}>
        <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 64, color: INK, background: GOLD, borderRadius: 18, padding: '10px 24px' }}>{String(num).padStart(2, '0')}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: HIST ? 900 : 800, fontSize: 104, color: '#fff', letterSpacing: 3, textShadow: '0 10px 40px rgba(0,0,0,.7)', whiteSpace: 'nowrap' }}>{c.s.scene.chapter}</div>
      </div>
      <div style={{ position: 'absolute', top: H / 2 + 92, left: W / 2 - 300, width: 600, height: 6, borderRadius: 4, background: GOLD, transform: `scaleX(${inP * (1 - out)})` }} />
    </div>
  );
};

// diagonal light sweep at chapter changes and at the title
export const LightSweep: React.FC<{ t: number }> = ({ t }) => {
  const c = EP.segments.find((s, i) => i > 0 && t >= s.start - 0.4 && t < s.start + 0.6);
  if (!c) return null;
  const p = cl((t - (c.start - 0.4)) / 1.0);
  return <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', pointerEvents: 'none',
    background: `linear-gradient(115deg, rgba(255,220,150,0) ${lerp(-40, 120, p) - 18}%, rgba(255,226,170,.38) ${lerp(-40, 120, p)}%, rgba(255,220,150,0) ${lerp(-40, 120, p) + 18}%)` }} />;
};

// small decaying shake right after each chapter hit
export const shake = (t: number) => {
  let x = 0, y = 0;
  for (const { s } of CHAPTERS) {
    const d = t - (s.start - 0.05);
    if (d > 0 && d < 0.5) { const a = 9 * (1 - d / 0.5); x += a * Math.sin(d * 83); y += a * Math.cos(d * 71); }
  }
  return `translate(${x}px, ${y}px)`;
};

// chapter progress bar along the bottom edge
export const Progress: React.FC<{ t: number }> = ({ t }) => {
  const p = cl(t / EP.voiceDuration);
  if (t < INTRO_END) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,255,255,.12)', opacity: pr(t, INTRO_END, 0.6) }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: `linear-gradient(90deg, #ffb300, ${GOLD})`, boxShadow: '0 0 14px rgba(255,201,74,.8)' }} />
      {CHAPTERS.map(({ s }, k) => <div key={k} style={{ position: 'absolute', left: `${(s.start / EP.voiceDuration) * 100}%`, top: -4, width: 4, height: 16, background: t >= s.start ? '#fff' : 'rgba(255,255,255,.4)' }} />)}
    </div>
  );
};
export { eOut, BODY };
