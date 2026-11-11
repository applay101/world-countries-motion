// Transparent 1080x1920 overlay for the vertical Short: title band on top, call-to-action at the bottom.
// The full 16:9 episode frame is composited at y 598..1195 by pipeline/short.py. Everything important stays inside
// YouTube's Shorts safe zone: below the top icons (y > 150) and above the title/channel overlay (y < 1450).
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, staticFile } from 'remotion';
import { EP, GOLD, INK, TITLE, BODY } from './lib/core';
import CH from '../channel.json';
import { Icon } from './lib/Icon';

const OL = '4px 4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000, -4px -4px 0 #000, 0 6px 0 #000, 0 -5px 0 #000, 5px 0 0 #000, -5px 0 0 #000, 0 12px 30px rgba(0,0,0,.8)';
const fit = (s: string, maxW: number, max: number, k = 0.72) => Math.round(Math.min(max, maxW / Math.max(1, s.length * k)));

export const ShortFrame: React.FC = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => { Promise.all(['800 40px Montserrat', '700 40px Inter'].map((f) => document.fonts.load(f))).then(() => continueRender(h)).catch(() => continueRender(h)); }, [h]);
  const th = ((EP as any).thumb ?? {}) as { top?: string; big?: string; sub?: string; emoji?: string };
  const sh = ((EP as any).short ?? {}) as { title?: string; sub?: string };
  const big = (sh.title ?? th.big ?? EP.country.name).toUpperCase();
  const sub = sh.sub ?? th.sub ?? '';
  return (
    <AbsoluteFill style={{ background: 'transparent' }}>
      {/* top band */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 600, background: 'linear-gradient(180deg, rgba(3,5,11,.92) 0%, rgba(3,5,11,.82) 85%, rgba(3,5,11,0) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 175, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ borderRadius: '50%', boxShadow: '0 0 0 5px #fff, 0 0 0 9px #000' }}><Icon name={'circle-flags:' + EP.country.iso2} size={86} /></div>
          {th.top ? <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 52, color: INK, background: GOLD, padding: '4px 24px 9px', borderRadius: 14, transform: 'rotate(-2deg)', boxShadow: '0 0 0 4px #000' }}>{th.top}</div> : null}
        </div>
        <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: fit(big, 940, 150), lineHeight: 1, color: '#fff', marginTop: 28, textShadow: OL, whiteSpace: 'nowrap' }}>{big}</div>
        {sub ? <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: fit(sub, 980, 72, 0.62), color: GOLD, marginTop: 16, textShadow: OL, whiteSpace: 'nowrap' }}>{sub}</div> : null}
      </div>
      {th.emoji ? <div style={{ position: 'absolute', right: 30, top: 420, transform: 'rotate(12deg)', filter: 'drop-shadow(0 12px 20px rgba(0,0,0,.7))' }}><Icon name={th.emoji} size={130} /></div> : null}
      {/* bottom band */}
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1080, height: 740, background: 'linear-gradient(0deg, rgba(3,5,11,.95) 0%, rgba(3,5,11,.88) 75%, rgba(3,5,11,0) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1238, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontFamily: TITLE, fontWeight: 800, fontSize: 42, color: '#fff', background: '#ff2d2d', padding: '14px 32px 18px', borderRadius: 60, boxShadow: '0 0 0 5px #000, 0 16px 40px rgba(0,0,0,.6)' }}>
          <svg width={40} height={40} viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="#fff" /></svg>FULL VIDEO ON THE CHANNEL
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1350, textAlign: 'center', fontFamily: BODY, fontWeight: 700, fontSize: 36, color: '#fff', opacity: 0.9 }}>{CH.handle}</div>
    </AbsoluteFill>
  );
};
