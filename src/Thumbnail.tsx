// YouTube thumbnail (1280x720): tilted flag map, huge headline, waving 3D flag, arrow and channel badge.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { EP, GOLD, INK, TITLE, BODY, segIndexAt, INTRO_END } from './lib/core';
import { MapLayer } from './scenes/MapLayer';
import { FlagWave, usePreload } from './scenes/Three';
import CH from '../channel.json';

const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => { Promise.all(['800 40px Montserrat', '700 40px Inter'].map((f) => document.fonts.load(f))).then(() => continueRender(h)).catch(() => continueRender(h)); }, [h]);
};

export const Thumbnail: React.FC = () => {
  useFonts();
  const ready = usePreload(['bm.jpg', 'flag.png']);
  const th = (EP as any).thumb ?? { top: 'EXPLAINED', big: EP.country.name.toUpperCase(), badge: '' };
  // a frame inside the first map segment, after the flag fill has landed
  const firstMap = EP.segments.find((s) => s.scene.view) ?? EP.segments[1];
  const t = Math.max(INTRO_END + 3.2, firstMap.start + 2.5);
  const i = segIndexAt(t);
  const S = 1280 / 1920;
  const v0 = (EP.segments.find((s) => s.scene.type === 'stats')?.scene.view ?? firstMap.scene.view) as any;
  const span = v0.span * 0.8;
  const focus = { lon: EP.country.lon - span * 0.17, lat: EP.country.lat - span * 0.02, span };
  return (
    <AbsoluteFill style={{ background: '#02050c', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${S})`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'saturate(1.35) contrast(1.12) brightness(1.08)' }}><MapLayer t={t} seg={{ ...EP.segments[i], scene: { type: 'map' } } as any} segIdx={i} view={focus} /></div>
      </div>
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(2,5,12,.95) 0%, rgba(2,5,12,.75) 34%, rgba(2,5,12,0) 56%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(255,190,60,.18), rgba(0,0,0,0) 55%)' }} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 160px rgba(0,0,0,.75)' }} />
      <div style={{ position: 'absolute', left: 54, top: 60, width: 640 }}>
        {th.top ? <div style={{ display: 'inline-block', fontFamily: TITLE, fontWeight: 800, fontSize: 56, color: INK, background: GOLD, padding: '6px 22px 10px', borderRadius: 14, transform: 'rotate(-2deg)', boxShadow: '0 10px 30px rgba(0,0,0,.6)' }}>{th.top}</div> : null}
        <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: th.big.length > 9 ? 124 : th.big.length > 6 ? 158 : 196, whiteSpace: 'nowrap', lineHeight: 0.95, color: '#fff', marginTop: 22, letterSpacing: 2,
          textShadow: '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 4px 0 #000, 0 -4px 0 #000, 4px 0 0 #000, -4px 0 0 #000, 0 14px 0 rgba(0,0,0,.55), 0 0 60px rgba(0,0,0,.8)' }}>{th.big}</div>
        {th.sub ? <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: Math.min(68, Math.round(700 / (th.sub.length * 0.66))), whiteSpace: 'nowrap', color: GOLD, marginTop: 14, textShadow: '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 4px 0 #000, 0 -4px 0 #000, 4px 0 0 #000, -4px 0 0 #000, 0 6px 0 #000, 0 0 40px rgba(0,0,0,.9)' }}>{th.sub}</div> : null}
        {th.badge ? <div style={{ display: 'inline-block', marginTop: 26, fontFamily: TITLE, fontWeight: 800, fontSize: 62, color: INK, background: GOLD, borderRadius: 22, padding: '4px 26px 10px',
          transform: 'rotate(-2deg)', boxShadow: '0 0 0 5px #000, 0 20px 50px rgba(0,0,0,.6)' }}>{th.badge}</div> : null}
      </div>
      {ready ? <div style={{ position: 'absolute', right: 24, top: 24, width: 300, height: 220, transform: 'rotate(6deg)', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.6))' }}><FlagWave t={1.3} w={300} h={220} /></div> : null}
      <svg width={260} height={160} viewBox="0 0 260 160" style={{ position: 'absolute', left: 600, top: 330, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.6))' }}>
        <path d="M10 120 C 80 130, 150 110, 205 55" fill="none" stroke="#ff3b30" strokeWidth="18" strokeLinecap="round" />
        <path d="M175 40 L232 30 L218 88 Z" fill="#ff3b30" />
      </svg>
      <div style={{ position: 'absolute', left: 54, bottom: 40, display: 'flex', alignItems: 'center', gap: 14, fontFamily: BODY, fontWeight: 700, fontSize: 28, color: '#fff', opacity: 0.9 }}>
        <div style={{ width: 14, height: 14, borderRadius: 14, background: '#ff3b30' }} />{CH.name.toUpperCase()}
      </div>
    </AbsoluteFill>
  );
};
