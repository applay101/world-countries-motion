// YouTube thumbnail (1280x720). Ten layouts, picked with thumb.style, so covers never look the same:
// classic, split, bignum, question, versus, flagfull, rank, spotlight, steps, headline.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { EP, GOLD, INK, TITLE, BODY, segIndexAt, INTRO_END } from './lib/core';
import { MapLayer } from './scenes/MapLayer';
import { FlagWave, usePreload } from './scenes/Three';
import CH from '../channel.json';
import { Icon } from './lib/Icon';

const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => { Promise.all(['800 40px Montserrat', '700 40px Inter'].map((f) => document.fonts.load(f))).then(() => continueRender(h)).catch(() => continueRender(h)); }, [h]);
};

type Th = { style?: string; emoji?: string; top?: string; big: string; sub?: string; badge?: string; rank?: string; question?: string;
  left?: { label: string; value: string }; right?: { label: string; value: string }; items?: string[] };

const YEL = '#FFD23F', RED = '#ff3b30';
const OL = (w = 4, glow = 0.8) => `${w}px ${w}px 0 #000, -${w}px ${w}px 0 #000, ${w}px -${w}px 0 #000, -${w}px -${w}px 0 #000, 0 ${w + 1}px 0 #000, 0 -${w + 1}px 0 #000, ${w + 1}px 0 0 #000, -${w + 1}px 0 0 #000, 0 9px 0 rgba(0,0,0,.55), 0 0 50px rgba(0,0,0,${glow})`;
const fit = (s: string, maxW: number, maxSize: number, k = 0.74) => Math.round(Math.min(maxSize, maxW / Math.max(1, s.length * k)));
const splitBadge = (b = '') => { const m = b.match(/^([$€£¥]?[\d.,]+\s?[A-Za-z%+]*)\s*(.*)$/); return m ? [m[1], m[2]] : [b, '']; };

const T: React.FC<{ size: number; color?: string; ol?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ size, color = '#fff', ol = 4, style, children }) => (
  <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: size, lineHeight: 0.98, color, whiteSpace: 'nowrap', letterSpacing: 1, textShadow: OL(ol), ...style }}>{children}</div>
);
const Tag: React.FC<{ size?: number; bg?: string; color?: string; rot?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ size = 52, bg = GOLD, color = INK, rot = -2, style, children }) => (
  <div style={{ display: 'inline-block', fontFamily: TITLE, fontWeight: 800, fontSize: size, color, background: bg, padding: '4px 22px 9px', borderRadius: 14, transform: `rotate(${rot}deg)`, boxShadow: '0 0 0 4px #000, 0 14px 34px rgba(0,0,0,.6)', whiteSpace: 'nowrap', ...style }}>{children}</div>
);
const Arrow: React.FC<{ x: number; y: number; rot?: number; s?: number; color?: string }> = ({ x, y, rot = 0, s = 1, color = RED }) => (
  <svg width={260} height={160} viewBox="0 0 260 160" style={{ position: 'absolute', left: x, top: y, transform: `rotate(${rot}deg) scale(${s})`, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.6))' }}>
    <path d="M10 120 C 80 130, 150 110, 205 55" fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" />
    <path d="M175 40 L232 30 L218 88 Z" fill={color} />
  </svg>
);
const Brand: React.FC<{ right?: boolean; top?: boolean }> = ({ right, top }) => (
  <div style={{ position: 'absolute', [right ? 'right' : 'left']: 46, [top ? 'top' : 'bottom']: 34, display: 'flex', alignItems: 'center', gap: 12, fontFamily: BODY, fontWeight: 700, fontSize: 24, color: '#fff', opacity: 0.85, textShadow: '0 2px 6px #000' } as any}>
    <div style={{ width: 12, height: 12, borderRadius: 12, background: RED }} />{CH.name.toUpperCase()}
  </div>
);

export const Thumbnail: React.FC = () => {
  useFonts();
  const ready = usePreload(['bm.jpg', 'flag.png']);
  const th = ((EP as any).thumb ?? { top: 'EXPLAINED', big: EP.country.name.toUpperCase(), badge: '' }) as Th;
  const style = th.style ?? 'classic';
  const firstMap = EP.segments.find((s) => s.scene.view) ?? EP.segments[1];
  const t = Math.max(INTRO_END + 3.2, firstMap.start + 2.5);
  const i = segIndexAt(t);
  const v0 = (EP.segments.find((s) => s.scene.type === 'stats')?.scene.view ?? firstMap.scene.view) as any;
  const C = EP.country;

  // the country sits at screen x = 0.5 + dx (fraction of width); z < 1 zooms in
  const Map: React.FC<{ dx?: number; z?: number; dy?: number; filter?: string }> = ({ dx = 0.17, z = 0.8, dy = 0.02, filter = 'saturate(1.35) contrast(1.12) brightness(1.08)' }) => {
    const span = v0.span * z;
    const view = { lon: C.lon - span * dx, lat: C.lat - span * dy, span };
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${1280 / 1920})`, transformOrigin: '0 0', filter }}>
        <MapLayer t={t} seg={{ ...EP.segments[i], scene: { type: 'map' } } as any} segIdx={i} view={view} />
      </div>
    );
  };
  const Flag: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; round?: boolean; amp?: number }> = ({ x, y, w, h, rot = 0, round, amp = 1 }) =>
    ready ? (
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, filter: 'drop-shadow(0 18px 28px rgba(0,0,0,.65))', ...(round ? { borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 8px #fff, 0 0 0 13px #000' } : {}) }}>
        <div style={round ? { position: 'absolute', left: -w * 0.35, top: -h * 0.3, width: w * 1.7, height: h * 1.6 } : {}}>
          <FlagWave t={1.3} w={round ? Math.round(w * 1.7) : w} h={round ? Math.round(h * 1.6) : h} amp={amp} />
        </div>
      </div>
    ) : null;
  const Vig: React.FC<{ a?: number }> = ({ a = 0.75 }) => <AbsoluteFill style={{ boxShadow: `inset 0 0 170px rgba(0,0,0,${a})` }} />;
  const [num, numLabel] = splitBadge(th.badge);

  let body: React.ReactNode;
  switch (style) {
    case 'split': // flag panel left, map right, giant name across the bottom
      body = (<>
        <Map dx={0.25} z={0.75} />
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, #02050c 0%, #02050c 40%, rgba(2,5,12,.4) 55%, rgba(2,5,12,0) 70%)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(2,5,12,.85) 0%, rgba(2,5,12,0) 45%)' }} />
        <Flag x={30} y={40} w={600} h={430} rot={-5} />
        {th.top ? <Tag style={{ position: 'absolute', right: 40, top: 40 }} rot={3}>{th.top}</Tag> : null}
        <T size={fit(th.big, 1180, 200)} style={{ position: 'absolute', left: 44, bottom: 120 }}>{th.big}</T>
        {th.sub ? <T size={fit(th.sub, 820, 58, 0.62)} color={GOLD} style={{ position: 'absolute', left: 50, bottom: 52 }}>{th.sub}</T> : null}
        {th.badge ? <Tag size={50} bg={YEL} style={{ position: 'absolute', right: 40, bottom: 52 }}>{th.badge}</Tag> : null}
      </>);
      break;
    case 'bignum': // one giant number in the middle
      body = (<>
        <Map dx={0} z={0.9} filter="saturate(1.2) brightness(.5) blur(1.5px)" />
        <Vig a={0.9} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {th.top ? <Tag size={44}>{th.top}</Tag> : null}
          <T size={fit(th.big, 1000, 120)} style={{ marginTop: 22 }}>{th.big}</T>
          <T size={fit(num, 1150, 250, 0.7)} color={GOLD} ol={6} style={{ marginTop: 4, transform: 'rotate(-3deg)' }}>{num}</T>
          {numLabel ? <T size={fit(numLabel.toUpperCase(), 900, 76)} style={{ marginTop: 6 }}>{numLabel.toUpperCase()}</T> : null}
        </div>
        <Flag x={1040} y={500} w={210} h={150} rot={8} />
        <Brand />
      </>);
      break;
    case 'question': { // a big question with a giant question mark
      const q = th.question ?? th.sub ?? `Why ${C.name}?`;
      body = (<>
        <Map dx={0.22} z={0.85} />
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(2,5,12,.96) 0%, rgba(2,5,12,.8) 45%, rgba(2,5,12,0) 68%)' }} />
        <Vig />
        <T size={560} color={GOLD} ol={8} style={{ position: 'absolute', right: 40, top: 40, transform: 'rotate(12deg)', opacity: 0.95 }}>?</T>
        <div style={{ position: 'absolute', left: 54, top: 54, width: 780 }}>
          <Tag size={56} bg="#fff" rot={-3}>{th.big}</Tag>
          <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: q.length > 26 ? 84 : 100, lineHeight: 1.02, color: '#fff', marginTop: 30, textShadow: OL(4), textTransform: 'uppercase' }}>{q}</div>
          {th.badge ? <Tag size={50} bg={YEL} style={{ marginTop: 30 }}>{th.badge}</Tag> : null}
        </div>
        <Brand right />
      </>);
      break;
    }
    case 'versus': { // then vs now, two cards with an arrow
      const L = th.left ?? { label: 'THEN', value: '?' }, R = th.right ?? { label: 'NOW', value: num || '?' };
      const card = (c: { label: string; value: string }, hot: boolean, rot: number) => (
        <div style={{ width: 440, padding: '26px 20px 32px', borderRadius: 30, background: hot ? GOLD : 'rgba(30,40,60,.92)', boxShadow: '0 0 0 6px #000, 0 30px 60px rgba(0,0,0,.6)', transform: `rotate(${rot}deg)`, textAlign: 'center' }}>
          <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 52, color: hot ? INK : '#aab6c8' }}>{c.label}</div>
          <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: fit(c.value, 430, 150, 0.68), lineHeight: 1, color: hot ? INK : '#fff', marginTop: 6 }}>{c.value}</div>
        </div>
      );
      body = (<>
        <Map dx={0} z={0.9} filter="saturate(1.2) brightness(.45) blur(2px)" />
        <Vig a={0.85} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 36, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26 }}>
          <T size={fit(th.big, 900, 130)}>{th.big}</T>
        </div>
        <Flag x={70} y={40} w={190} h={140} rot={-8} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 120 }}>
          {card(L, false, -3)}{card(R, true, 3)}
        </div>
        <svg width={110} height={90} viewBox="0 0 110 90" style={{ position: 'absolute', left: 585, top: 330, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.7))' }}><path d="M6 30 H60 V8 L104 45 L60 82 V60 H6 Z" fill={RED} stroke="#000" strokeWidth={6} strokeLinejoin="round" /></svg>
        {th.sub ? <T size={fit(th.sub, 1000, 54, 0.62)} color={GOLD} style={{ position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center' }}>{th.sub}</T> : null}
      </>);
      break;
    }
    case 'flagfull': // the whole frame is the waving flag
      body = (<>
        <AbsoluteFill style={{ background: '#05070d' }} />
        <Flag x={-560} y={-330} w={2400} h={1380} amp={1.3} />
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,.15) 0%, rgba(0,0,0,.7) 75%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {th.top ? <Tag size={52} bg="#fff">{th.top}</Tag> : null}
          <T size={fit(th.big, 1180, 250)} ol={7} style={{ marginTop: 26 }}>{th.big}</T>
          {th.sub ? <T size={fit(th.sub, 820, 70, 0.62)} color={YEL} ol={5} style={{ marginTop: 14 }}>{th.sub}</T> : null}
        </div>
        {th.badge ? <div style={{ position: 'absolute', right: 40, bottom: 36, width: 205, height: 205, borderRadius: '50%', background: YEL, boxShadow: '0 0 0 7px #000, 0 20px 40px rgba(0,0,0,.6)', transform: 'rotate(-10deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: TITLE, fontWeight: 800, color: INK, textAlign: 'center' }}>
          <div style={{ fontSize: fit(num, 175, 64, 0.66) }}>{num}</div><div style={{ fontSize: 26 }}>{numLabel}</div>
        </div> : null}
        <Brand />
      </>);
      break;
    case 'rank': { // a giant #rank on the left
      const r = th.rank ?? (th.top?.match(/#\s?\d+/)?.[0] ?? '#1');
      const top = th.rank ? th.top : th.top?.replace(/#\s?\d+/, '').trim();
      body = (<>
        <Map dx={-0.2} z={0.85} filter="saturate(1.3) brightness(.75)" />
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(2,5,12,.2) 0%, rgba(2,5,12,.85) 45%, rgba(2,5,12,.95) 100%)' }} />
        <Vig />
        <T size={r.length > 2 ? 330 : 420} color={GOLD} ol={9} style={{ position: 'absolute', left: 30, top: 110, transform: 'rotate(-8deg)', letterSpacing: -10 }}>{r}</T>
        <div style={{ position: 'absolute', left: 560, top: 90, width: 680 }}>
          {top ? <Tag size={58} bg="#fff" rot={2}>{top}</Tag> : null}
          <T size={fit(th.big, 680, 170)} style={{ marginTop: 22 }}>{th.big}</T>
          {th.sub ? <T size={fit(th.sub, 680, 60, 0.62)} color={GOLD} style={{ marginTop: 16 }}>{th.sub}</T> : null}
          {th.badge ? <Tag size={50} bg={YEL} style={{ marginTop: 28 }}>{th.badge}</Tag> : null}
        </div>
        <Flag x={1070} y={530} w={190} h={140} rot={6} />
        <Brand />
      </>);
      break;
    }
    case 'spotlight': // mirrored: country circled on the left, text on the right
      body = (<>
        <Map dx={-0.22} z={0.7} />
        <AbsoluteFill style={{ background: 'radial-gradient(circle at 27% 52%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 20%, rgba(2,5,12,.88) 34%)' }} />
        <svg width={1280} height={720} style={{ position: 'absolute', left: 0, top: 0 }}>
          <ellipse cx={345} cy={375} rx={265} ry={245} fill="none" stroke="#000" strokeWidth={22} transform="rotate(-8 345 375)" />
          <ellipse cx={345} cy={375} rx={265} ry={245} fill="none" stroke={RED} strokeWidth={13} transform="rotate(-8 345 375)" />
        </svg>
        <div style={{ position: 'absolute', right: 50, top: 70, width: 620, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
          {th.top ? <Tag rot={2}>{th.top}</Tag> : null}
          <T size={fit(th.big, 620, 170)} style={{ marginTop: 22 }}>{th.big}</T>
          {th.sub ? <T size={fit(th.sub, 620, 60, 0.62)} color={GOLD} style={{ marginTop: 14 }}>{th.sub}</T> : null}
          {th.badge ? <Tag size={50} bg={YEL} rot={2} style={{ marginTop: 28 }}>{th.badge}</Tag> : null}
        </div>
        <Arrow x={560} y={380} rot={180} s={-1} />
        <Flag x={40} y={30} w={170} h={125} rot={-8} />
        <Brand right />
      </>);
      break;
    case 'steps': { // tutorial: a checklist card
      const items = th.items ?? ['Documents', 'Book online', 'Done'];
      body = (<>
        <Map dx={0.3} z={1.1} filter="saturate(1.1) brightness(.5)" />
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(2,5,12,.97) 0%, rgba(2,5,12,.85) 50%, rgba(2,5,12,.3) 100%)' }} />
        <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', left: 54, top: 60, width: 640 }}>
          <Tag>{th.top ?? 'STEP BY STEP'}</Tag>
          <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: th.big.length > 12 ? 92 : 120, lineHeight: 1.0, color: '#fff', marginTop: 24, textShadow: OL(4) }}>{th.big}</div>
          {th.sub ? <T size={fit(th.sub, 640, 58, 0.62)} color={GOLD} style={{ marginTop: 18 }}>{th.sub}</T> : null}
        </div>
        <div style={{ position: 'absolute', right: 60, top: 110, width: 460, padding: '34px 30px', borderRadius: 26, background: '#fff', transform: 'rotate(4deg)', boxShadow: '0 0 0 6px #000, 0 30px 60px rgba(0,0,0,.6)' }}>
          {items.slice(0, 4).map((it, k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: k ? 26 : 0 }}>
              <div style={{ width: 66, height: 66, borderRadius: 33, background: '#22c55e', boxShadow: '0 0 0 4px #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={40} height={40} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: fit(it, 320, 44, 0.62), color: INK, whiteSpace: 'nowrap' }}>{it}</div>
            </div>
          ))}
        </div>
        <Flag x={1080} y={40} w={170} h={125} rot={12} />
        {th.badge ? <Tag size={46} bg={YEL} style={{ position: 'absolute', left: 54, bottom: 90 }}>{th.badge}</Tag> : null}
        <Brand />
      </>);
      break;
    }
    case 'headline': // centred map, highlighter headline at the bottom, round flag
      body = (<>
        <Map dx={0} z={0.75} dy={-0.08} />
        <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(2,5,12,.95) 0%, rgba(2,5,12,.6) 38%, rgba(2,5,12,0) 62%)' }} />
        <Vig a={0.6} />
        {th.top ? <Tag style={{ position: 'absolute', left: 46, top: 40 }}>{th.top}</Tag> : null}
        <div style={{ position: 'absolute', left: 1076, top: 30, borderRadius: '50%', boxShadow: '0 0 0 7px #fff, 0 0 0 12px #000, 0 16px 30px rgba(0,0,0,.6)' }}><Icon name={'circle-flags:' + C.iso2} size={160} /></div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <T size={fit(th.big, 1180, 190)}>{th.big}</T>
          {th.sub ? <div style={{ marginTop: 14, padding: '2px 28px 8px', background: YEL, transform: 'rotate(-2deg) skewX(-8deg)', boxShadow: '0 0 0 5px #000' }}>
            <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: fit(th.sub, 1000, 64, 0.62), color: INK, whiteSpace: 'nowrap', transform: 'skewX(8deg)' }}>{th.sub}</div>
          </div> : null}
        </div>
        {th.badge ? <Tag size={42} bg="#fff" rot={4} style={{ position: 'absolute', right: 46, top: 230 }}>{th.badge}</Tag> : null}
      </>);
      break;
    default: // classic: text left, country right, flag top-right, red arrow
      body = (<>
        <Map />
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(2,5,12,.95) 0%, rgba(2,5,12,.75) 34%, rgba(2,5,12,0) 56%)' }} />
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(255,190,60,.18), rgba(0,0,0,0) 55%)' }} />
        <Vig />
        <div style={{ position: 'absolute', left: 54, top: 60, width: 640 }}>
          {th.top ? <Tag size={56}>{th.top}</Tag> : null}
          <T size={th.big.length > 9 ? 124 : th.big.length > 6 ? 158 : 196} style={{ marginTop: 22 }}>{th.big}</T>
          {th.sub ? <T size={fit(th.sub, 700, 68, 0.66)} color={GOLD} style={{ marginTop: 14 }}>{th.sub}</T> : null}
          {th.badge ? <Tag size={62} bg={GOLD} style={{ marginTop: 26, borderRadius: 22 }}>{th.badge}</Tag> : null}
        </div>
        <Flag x={956} y={24} w={300} h={220} rot={6} />
        <Arrow x={600} y={330} />
        <Brand />
      </>);
  }
  const POS: Record<string, [number, number, number]> = { classic: [560, 470, -12], split: [470, 300, 12], bignum: [80, 470, -12], question: [690, 470, 10],
    versus: [1060, 520, 12], flagfull: [70, 70, -12], rank: [300, 505, 10], spotlight: [60, 520, -10], steps: [930, 520, 12], headline: [70, 220, -12] };
  const [ex, ey, er] = POS[style] ?? POS.classic;
  const sticker = th.emoji ? <div style={{ position: 'absolute', left: ex, top: ey, transform: `rotate(${er}deg)`, filter: 'drop-shadow(0 0 0 #000) drop-shadow(0 14px 22px rgba(0,0,0,.7))' }}>
    <Icon name={th.emoji} size={190} style={{ filter: 'drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff)' }} /></div> : null;
  return <AbsoluteFill style={{ background: '#02050c', overflow: 'hidden' }}>{body}{sticker}</AbsoluteFill>;
};
