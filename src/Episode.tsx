// One country episode: globe intro -> narrated map chapters with infographics -> outro. 1920x1080.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { EP, W, H, GOLD, INK, TITLE, BODY, cl, pr, eBack, eOut, segIndexAt, spokenAt, E, INTRO_END, INTRO_TYPE } from './lib/core';
import { FlagIntro, HookIntro } from './scenes/Intros';
import { MapLayer } from './scenes/MapLayer';
import { Globe, usePreload, DustLayer } from './scenes/Three';
import { ChapterHero, LightSweep, Progress, shake } from './scenes/Fx';
import { Stats, BigChips, Timeline, Cards, BigNum, Bars, Outro, Captions, Chapter, Steps, Checklist } from './scenes/Panels';

const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(['800 40px Montserrat', '600 40px Montserrat', '500 40px Inter', '700 40px Inter'].map((f) => document.fonts.load(f)))
      .then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
};

const FIRST_MAP = { start: INTRO_END };

// countdown badge (#5 … #1) for list-style episodes: any segment with scene.rank
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
const DIM: Record<string, number> = { timeline: 0.55, cards: 0.55, bignum: 0.6, bars: 0.55, steps: 0.6, checklist: 0.6 };

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
      <RankBadge t={t} />
      <Progress t={t} />
      <AbsoluteFill style={{ background: '#fff7e0', opacity: flash, mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ background: '#000', opacity: pr(t, EP.duration - 0.8, 0.8, (x) => x) }} />
    </AbsoluteFill>
  );
};
