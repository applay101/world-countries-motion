// One country episode: globe intro -> narrated map chapters with infographics -> outro. 1920x1080.
import React, { useEffect, useState } from 'react';
import { Icon } from './lib/Icon';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { EP, W, H, GOLD, INK, TITLE, BODY, cl, pr, eBack, eOut, segIndexAt, spokenAt, E, INTRO_END, INTRO_TYPE, MAP_STYLE } from './lib/core';
import { FlagIntro, HookIntro } from './scenes/Intros';
import { MapLayer } from './scenes/MapLayer';
import { Globe, usePreload, DustLayer } from './scenes/Three';
import { ChapterHero, LightSweep, Progress, shake } from './scenes/Fx';
import { Stats, BigChips, Timeline, Cards, BigNum, Bars, Outro, Captions, Chapter, Steps, Checklist, Era, Split, Journey } from './scenes/Panels';

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
const EmojiPops: React.FC<{ t: number }> = ({ t }) => {
  const i = segIndexAt(t), seg = EP.segments[i];
  const pops = ((seg?.scene as any)?.pops ?? []) as [string, string][];
  return (<>{pops.map(([w, name], k) => {
    const at = spokenAt(seg, w) ?? seg.start + 1 + k * 2; const age = t - at + 0.1;
    if (age < 0 || age > 2.1) return null;
    const pin = eBack(cl(age / 0.35)), out = cl((age - 1.75) / 0.35);
    const side = ['bars', 'stats', 'bignum', 'checklist'].includes(seg.scene.type) ? 1 : k % 2; const left = side ? 200 : 1530, top = 560 - (k % 3) * 40;
    return (<div key={k} style={{ position: 'absolute', left, top, width: 190, height: 190, transform: `translateY(${-age * 24}px) scale(${pin * (1 - out * 0.6)}) rotate(${(k % 2 ? -1 : 1) * (14 - pin * 10 + Math.sin(age * 6) * 4)}deg)`, opacity: 1 - out }}>
      <div style={{ position: 'absolute', inset: -30, borderRadius: '50%', border: `6px solid ${GOLD}`, opacity: cl(1 - age / 0.6), transform: `scale(${0.6 + age * 1.4})` }} />
      <Icon name={name} size={190} style={{ filter: 'drop-shadow(0 14px 24px rgba(0,0,0,.55))' }} />
    </div>);
  })}</>);
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
const DIM: Record<string, number> = { timeline: 0.55, cards: 0.55, bignum: 0.6, bars: 0.55, steps: 0.6, checklist: 0.6, era: 0.5, split: 0.55, journey: 0.55 };

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
      {t > FIRST_MAP.start - 1.2 || INTRO_TYPE === 'dive' ? <AbsoluteFill style={{ opacity: mapIn }}><MapLayer t={t} seg={seg} segIdx={i} /></AbsoluteFill> : null}
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
            <Chapter t={t} seg={s} i={k} />
          </React.Fragment>
        );
      })}
      {ready ? <Outro t={t} seg={last} /> : null}
      </AbsoluteFill>
      {ready ? <DustLayer t={t} burstAt={(spokenAt(last, 'subscribe') ?? last.start + 4) - 0.1} /> : null}
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
