// One country episode: globe intro -> narrated map chapters with infographics -> outro. 1920x1080.
import React, { useEffect, useState } from 'react';
import { Icon } from './lib/Icon';
import { Street, Crowd } from './scenes/Story';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { EP, W, H, GOLD, INK, TITLE, BODY, cl, pr, eBack, eOut, eIO, segIndexAt, spokenAt, E, INTRO_END, INTRO_TYPE, MAP_STYLE, HIST } from './lib/core';
import { FlagIntro, HookIntro } from './scenes/Intros';
import { MapLayer } from './scenes/MapLayer';
import { Morph } from './scenes/Morph';
import { Globe, usePreload, DustLayer } from './scenes/Three';
import { ChapterHero, LightSweep, Progress, shake } from './scenes/Fx';
import { Stats, BigChips, Timeline, Cards, BigNum, Bars, Outro, Captions, Chapter, Steps, Checklist, Era, Split, Journey, Race } from './scenes/Panels';

const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(['800 40px Montserrat', '600 40px Montserrat', '500 40px Inter', '700 40px Inter'].map((f) => document.fonts.load(f)))
      .then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
};

const FIRST_MAP = { start: INTRO_END };

// countdown badge (#5 … #1) for list-style episodes: any segment with scene.rank
// Emoji pops: scene.pops [[cueWord, "fluent-emoji-flat:<name>"]] bounce in when the word is spoken
const SLOTS: [number, number][] = [[1560, 470], [180, 500], [1600, 270], [160, 290]];
const BURST = ['#FFD54A', '#FF5E7E', '#5EC8FF', '#7CFFB2', '#FFFFFF'];
const EmojiPops: React.FC<{ t: number }> = ({ t }) => {
  const i = segIndexAt(t), seg = EP.segments[i];
  const pops = ((seg?.scene as any)?.pops ?? []) as [string, string][];
  const leftOnly = ['bars', 'stats', 'bignum', 'checklist'].includes(seg.scene.type);
  return (<>{pops.map(([w, name], k) => {
    const at = spokenAt(seg, w) ?? seg.start + 1 + k * 2; const age = t - at + 0.1;
    if (age < 0 || age > 2.3) return null;
    const pin = eBack(cl(age / 0.35)), out = cl((age - 1.95) / 0.35);
    const [left, top] = leftOnly ? SLOTS[1 + 2 * (k % 2)] : SLOTS[(k + i) % 4];
    const big = name.startsWith('fluent-3d:') || name.startsWith('lib:') ? 230 : 190;
    return (<div key={k} style={{ position: 'absolute', left: left - (big - 190) / 2, top: top - (big - 190) / 2, width: big, height: big, transform: `translateY(${-age * 22}px) scale(${pin * (1 - out * 0.6)}) rotate(${(k % 2 ? -1 : 1) * (14 - pin * 10 + Math.sin(age * 6) * 4)}deg)`, opacity: 1 - out }}>
      <div style={{ position: 'absolute', inset: -40, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}55 0%, ${GOLD}00 65%)`, opacity: cl(1 - age / 0.9) }} />
      <div style={{ position: 'absolute', inset: -30, borderRadius: '50%', border: `6px solid ${GOLD}`, opacity: cl(1 - age / 0.6), transform: `scale(${0.6 + age * 1.4})` }} />
      {age < 0.75 ? Array.from({ length: 10 }, (_, j) => {
        const ang = (j / 10) * Math.PI * 2 + k, d = eOut(cl(age / 0.7)) * (big * 0.95), s2 = 18 * (1 - cl(age / 0.75));
        return <div key={j} style={{ position: 'absolute', left: big / 2 + Math.cos(ang) * d - s2 / 2, top: big / 2 + Math.sin(ang) * d - s2 / 2, width: s2, height: s2,
          borderRadius: j % 2 ? '50%' : 3, background: BURST[j % 5], transform: `rotate(${45 + age * 400}deg)`, boxShadow: `0 0 12px ${BURST[j % 5]}` }} />;
      }) : null}
      <Icon name={name} size={big} style={{ position: 'relative', filter: 'drop-shadow(0 16px 26px rgba(0,0,0,.6))' }} />
    </div>);
  })}</>);
};

// camera life on top of the map camera: breathing push-in, handheld drift, punch-ins on pops and whip pans between segments
const camFx = (t: number, i: number) => {
  const seg = EP.segments[i];
  const p = cl((t - seg.start) / Math.max(1, seg.end - seg.start));
  let z = 1.025 + 0.045 * eIO(p);
  const pops = ((seg.scene as any).pops ?? []) as [string, string][];
  for (const [w] of pops) { const at = spokenAt(seg, w); if (at !== null && t >= at - 0.05) z += 0.04 * Math.exp(-(t - at + 0.05) * 5); }
  const rot = 0.45 * Math.sin(t * 0.23) + 0.2 * Math.sin(t * 0.61);
  let x = 10 * Math.sin(t * 0.31), y = 7 * Math.sin(t * 0.27 + 1), blur = 0;
  if (i > 1 && TR_OF(i) === 'whip') { const d = t - seg.start, dir = i % 2 ? 1 : -1;
    if (d > -0.22 && d < 0.28) { const q = d < 0 ? -d / 0.22 : d / 0.28; const k2 = (1 - q) * (1 - q); x += dir * 170 * k2 * (d < 0 ? -1 : 1); blur = 9 * k2; } }
  return { transform: `translate(${x}px, ${y}px) scale(${z}) rotate(${rot}deg)`, filter: `${HIST ? 'saturate(1.08) contrast(1.04)' : 'saturate(1.25) contrast(1.07) brightness(1.03)'}${blur > 0.3 ? ` blur(${blur.toFixed(1)}px)` : ''}` };
};
// segment transitions rotate so cuts never feel the same: whip pan (camFx), a hard-edged accent flood, or blinds closing behind a scan line
const TRS = ['whip', 'flood', 'whip', 'blinds'];
const TR_OF = (i: number) => (i <= 1 || i >= EP.segments.length - 1 ? 'none' : TRS[(i + EP.id.length) % TRS.length]);
const Transition: React.FC<{ t: number; i: number }> = ({ t, i }) => {
  // look at the nearest boundary (the next segment may be about to start)
  const k = t > EP.segments[i].start + 0.4 && EP.segments[i + 1] ? i + 1 : i;
  const kind = TR_OF(k); if (kind === 'none' || kind === 'whip') return null;
  const d = t - (EP.segments[k].start - 0.05);
  if (d < -0.3 || d > 0.34) return null;
  if (kind === 'flood') {
    const R = 2300, cin = k % 2 ? [0, H] : [W, 0], cout = k % 2 ? [W, 0] : [0, H];
    const q = d < 0 ? 1 - Math.pow(cl(-d / 0.3), 2) : Math.pow(cl(d / 0.34), 1.6);
    const [cx, cy] = d < 0 ? cin : cout; const r = d < 0 ? R * q : R * (1 - q);
    return <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}><circle cx={cx} cy={cy} r={r} fill={GOLD} /><circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeWidth={10} /></svg>;
  }
  const N = 9, bh = H / N;
  return <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: N }, (_, j) => { const lag = j * 0.018; const q = d < 0 ? cl((d + 0.3 - lag) / 0.16) : 1 - cl((d - lag) / 0.16);
      return <rect key={j} x={0} y={j * bh + (bh * (1 - q)) / 2} width={W} height={bh * q + 1} fill={j % 2 ? GOLD : '#0B1220'} />; })}
    {d < 0.05 ? <rect x={0} y={cl((d + 0.3) / 0.35) * H - 3} width={W} height={6} fill="#fff" /> : null}
  </svg>;
};
// moving colour light leaks + a teal/orange grade so every frame feels warm and alive
const ColorLife: React.FC<{ t: number }> = ({ t }) => {
  const x1 = 50 + 45 * Math.sin(t * 0.17), y1 = 30 + 25 * Math.sin(t * 0.13 + 2), x2 = 50 + 45 * Math.sin(t * 0.11 + 3), y2 = 75 + 20 * Math.sin(t * 0.19);
  return (<>
    <AbsoluteFill style={{ background: HIST ? 'linear-gradient(160deg, rgba(255,190,90,.10), rgba(0,0,0,0) 45%, rgba(160,60,20,.12))' : 'linear-gradient(160deg, rgba(0,190,255,.14), rgba(0,0,0,0) 42%, rgba(255,120,40,.16))', mixBlendMode: 'overlay' }} />
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${x1}% ${y1}%, ${GOLD}2e, ${GOLD}00 38%), radial-gradient(circle at ${x2}% ${y2}%, rgba(255,80,140,.13), rgba(255,80,140,0) 34%)`, mixBlendMode: 'screen' }} />
  </>);
};

const RankBadge: React.FC<{ t: number }> = ({ t }) => {
  const k = EP.segments.findIndex((s, j) => s.scene.rank && t >= s.start - 0.3 && t < (EP.segments[j + 1]?.start ?? EP.duration) - 0.3);
  if (k < 0) return null;
  const s = EP.segments[k]; const p = pr(t, s.start - 0.3, 0.6, E('back.out(2.5)'));
  return (
    <div style={{ position: 'absolute', right: 70, top: 50, width: 200, height: 200, borderRadius: 200, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `scale(${p}) rotate(${(1 - p) * 90}deg)`, boxShadow: '0 0 0 8px rgba(0,0,0,.5), 0 20px 60px rgba(0,0,0,.5)' }}>
      <span style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 110, color: INK }}>#{s.scene.rank}</span>
    </div>
  );
};
const INTRO = EP.segments[0];
const DIM: Record<string, number> = { timeline: 0.55, cards: 0.55, bignum: 0.6, bars: 0.55, steps: 0.6, checklist: 0.6, era: 0.5, split: 0.55, journey: 0.55, crowd: 0.45, race: 0.75, morph: 0.62 };

// big year counter for map timelapses (scene.frames)
const YearTicker: React.FC<{ t: number; seg: any; i: number }> = ({ t, seg, i }) => {
  const fr = seg.scene.frames as [string, any[], string?][]; const n = fr.length;
  const times = fr.map((f, k) => (f[2] ? spokenAt(seg, f[2]) : null) ?? seg.start + 0.4 + (k * (seg.end - seg.start - 0.8)) / Math.max(1, n));
  if (t < seg.start - 0.3 || t > seg.end + 0.5) return null;
  let k = 0; times.forEach((tt, j) => { if (t >= tt - 0.1) k = j; });
  const p = pr(t, times[k] - 0.1, 0.4, eBack);
  return <div style={{ position: 'absolute', left: 0, right: 0, top: 110, display: 'flex', justifyContent: 'center' }}>
    <div style={{ fontFamily: MAP_STYLE === 'parchment' ? 'Cinzel, serif' : TITLE, fontWeight: 900, fontSize: 120, color: MAP_STYLE === 'parchment' ? '#8a1c10' : '#fff', background: MAP_STYLE === 'parchment' ? 'rgba(246,231,196,.92)' : 'rgba(5,10,20,.7)',
      border: `4px solid ${MAP_STYLE === 'parchment' ? '#6b4a22' : GOLD}`, borderRadius: 24, padding: '0 40px 8px', transform: `scale(${1 + 0.25 * (1 - p)})`, boxShadow: '0 20px 40px rgba(0,0,0,.4)' }}>{fr[k][0]}</div></div>;
};
const DIM_OF = (s: any) => (DIM[s.scene.type] ?? 0);
export const Episode: React.FC = () => {
  useFonts();
  const ready = usePreload(['bm.jpg', 'flag.png']);
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const i = segIndexAt(t); const seg = EP.segments[i];
  const mapIn = INTRO_TYPE === 'dive' ? 1 : pr(t, FIRST_MAP.start - 0.9, 1.0, (x) => x);
  const globeOn = INTRO_TYPE === 'globe' && t < FIRST_MAP.start + 0.3;
  // dim target follows the active scene type, eased across the boundary
  const prev = EP.segments[Math.max(0, i - 1)];
  const dimNow = DIM[seg.scene.type] ?? 0, dimPrev = DIM[prev.scene.type] ?? 0;
  const dim = dimPrev + (dimNow - dimPrev) * pr(t, seg.start - 0.35, 0.7);
  const titleAt = spokenAt(INTRO, EP.country.name) ?? INTRO.end - 1.2;
  const ti = pr(t, titleAt - 0.1, 0.9, eBack), to = pr(t, FIRST_MAP.start - 0.8, 0.6);
  const flash = Math.max(0, 1 - Math.abs(t - (FIRST_MAP.start - 0.4)) / 0.35) * 0.5;
  const last = EP.segments[EP.segments.length - 1];
  const sideShade = ['stats', 'map', 'cities'].includes(seg.scene.type) && (seg.scene.cards || seg.scene.big) ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: '#02050c', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: shake(t) }}>
      {t > FIRST_MAP.start - 1.2 || INTRO_TYPE === 'dive' ? <AbsoluteFill style={{ opacity: mapIn, ...(t > FIRST_MAP.start - 0.3 ? camFx(t, i) : {}) }}><MapLayer t={t} seg={seg} segIdx={i} /></AbsoluteFill> : null}
      {globeOn && ready ? <AbsoluteFill style={{ opacity: 1 - mapIn }}><Globe t={t} t0={0} t1={FIRST_MAP.start - 0.6} /></AbsoluteFill> : null}
      {INTRO_TYPE === 'flag' && ready && t < INTRO_END + 0.2 ? <FlagIntro t={t} /> : null}
      {INTRO_TYPE === 'hook' && t < INTRO_END + 0.2 ? <HookIntro t={t} /> : null}

      {MAP_STYLE === 'parchment' ? <>
        <AbsoluteFill style={{ mixBlendMode: 'multiply', opacity: 0.35 }}><svg width={W} height={H}><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.18  0 0 0 1.1 0" /></filter><rect width={W} height={H} filter="url(#paper)" /></svg></AbsoluteFill>
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(120,80,30,0) 50%, rgba(70,40,10,.55) 100%)' }} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: mapIn * (1 - DIM_OF(seg) * 1.2) }}>
          <rect x={22} y={22} width={W - 44} height={H - 44} fill="none" stroke="rgba(70,42,15,.75)" strokeWidth={5} />
          <rect x={34} y={34} width={W - 68} height={H - 68} fill="none" stroke="rgba(70,42,15,.55)" strokeWidth={2} />
          <g transform={`translate(150,${H - 190}) rotate(${Math.sin(t * 0.4) * 8})`} opacity={0.85}>
            <circle r={88} fill="rgba(245,228,190,.75)" stroke="#5a3a17" strokeWidth={3} /><circle r={70} fill="none" stroke="#5a3a17" strokeWidth={1.5} strokeDasharray="3 5" />
            {[0, 90, 180, 270].map((a) => <path key={a} d="M0 -80 L13 0 L0 13 L-13 0 Z" fill={a === 0 ? '#8a1c10' : '#5a3a17'} transform={`rotate(${a})`} />)}
            {[45, 135, 225, 315].map((a) => <path key={a} d="M0 -50 L8 0 L-8 0 Z" fill="#8a6232" transform={`rotate(${a})`} />)}
            <circle r={7} fill="#f3e2bb" stroke="#5a3a17" strokeWidth={2} />
            <text y={-94} textAnchor="middle" fontFamily="Cinzel, serif" fontWeight={900} fontSize={26} fill="#5a3a17">N</text>
          </g>
        </svg>
      </> : null}
      {/* grade */}
      <ColorLife t={t} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 72%, rgba(0,0,0,.55) 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(3,6,12,0) 45%, rgba(3,6,12,.55) 75%)', opacity: sideShade }} />
      <AbsoluteFill style={{ background: 'rgba(3,7,15,1)', opacity: dim }} />

      {/* intro title */}
      {t < FIRST_MAP.start + 0.2 && INTRO_TYPE !== 'hook' ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: cl(ti * 2) * (1 - to) }}>
          <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 210, letterSpacing: 40, color: '#fff', marginLeft: 40, transform: `scale(${0.8 + 0.2 * ti})`,
            textShadow: '0 20px 80px rgba(0,0,0,.8)' }}>{EP.country.name.toUpperCase()}</div>
          <div style={{ width: 600 * ti, height: 5, background: GOLD, borderRadius: 4, marginTop: 6 }} />
        </AbsoluteFill>
      ) : null}

      {EP.segments.map((s, k) => {
        if (Math.abs(k - i) > 1) return null;
        const ty = s.scene.type;
        return (
          <React.Fragment key={s.id}>
            {ty === 'stats' && ready ? <Stats t={t} seg={s} i={k} /> : null}
            {s.scene.big ? <BigChips t={t} seg={s} i={k} /> : null}
            {ty === 'timeline' ? <Timeline t={t} seg={s} i={k} /> : null}
            {ty === 'cards' ? <Cards t={t} seg={s} i={k} /> : null}
            {ty === 'bignum' ? <BigNum t={t} seg={s} i={k} /> : null}
            {ty === 'bars' ? <Bars t={t} seg={s} i={k} /> : null}
            {ty === 'steps' ? <Steps t={t} seg={s} i={k} /> : null}
            {ty === 'checklist' ? <Checklist t={t} seg={s} i={k} /> : null}
            {ty === 'era' ? <Era t={t} seg={s} i={k} /> : null}
            {ty === 'split' ? <Split t={t} seg={s} i={k} /> : null}
            {ty === 'journey' ? <Journey t={t} seg={s} i={k} /> : null}
            {ty === 'street' ? <Street t={t} seg={s} i={k} /> : null}
            {ty === 'race' ? <Race t={t} seg={s} i={k} /> : null}
            {ty === 'crowd' ? <Crowd t={t} seg={s} i={k} /> : null}
            {ty === 'morph' ? <Morph t={t} seg={s} i={k} /> : null}
            {s.scene.frames ? <YearTicker t={t} seg={s} i={k} /> : null}
            <Chapter t={t} seg={s} i={k} />
          </React.Fragment>
        );
      })}
      {ready ? <Outro t={t} seg={last} /> : null}
      <Transition t={t} i={i} />
      </AbsoluteFill>
      {ready && seg.scene.type !== 'street' ? <DustLayer t={t} burstAt={(spokenAt(last, 'subscribe') ?? last.start + 4) - 0.1} /> : null}
      <LightSweep t={t} />
      <ChapterHero t={t} />
      {INTRO_TYPE === 'hook' && t < INTRO_END ? null : <Captions t={t} />}
      <EmojiPops t={t} />
      <RankBadge t={t} />
      <Progress t={t} />
      <AbsoluteFill style={{ background: '#fff7e0', opacity: flash, mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ background: '#000', opacity: pr(t, EP.duration - 0.8, 0.8, (x) => x) }} />
    </AbsoluteFill>
  );
};
