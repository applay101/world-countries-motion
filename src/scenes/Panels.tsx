// Infographic overlays: stat cards, big numbers, timeline, culture cards, KPI + bar chart, outro, captions, chapter chip.
import React from 'react';
import { EP, W, H, GOLD, INK, TITLE, BODY, Seg, cl, pr, lerp, eOut, eBack, eExpo, cue, segWindow, fadeWin, fmtNum, E } from '../lib/core';
import { FlagWave } from './Three';
import CH from '../../channel.json';

const glass: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(20,32,52,.88), rgba(8,14,26,.9))', border: '1.5px solid rgba(255,201,74,.45)',
  borderRadius: 26, boxShadow: '0 30px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
};
const Count: React.FC<{ v: number; p: number; fmt?: string; prefix?: string; suffix?: string }> = ({ v, p, fmt, prefix = '', suffix = '' }) => (
  <span>{prefix}{fmtNum(v * E('power2.out')(cl(p)), fmt)}{suffix}</span>
);

// ---------- stats: flag + 3 cards on the right ----------
export const Stats: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.5, 0.45);
  if (vis <= 0) return null;
  const cards = seg.scene.cards as any[];
  const fp = pr(t, seg.start, 0.9, eBack);
  return (
    <div style={{ position: 'absolute', left: 1140, top: 120, width: 660, opacity: vis }}>
      <div style={{ ...glass, height: 300, padding: 0, overflow: 'hidden', transform: `translateX(${(1 - fp) * 300}px)`, opacity: cl(fp * 2), position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}><FlagWave t={t} w={660} h={300} /></div>
        <div style={{ position: 'absolute', left: 26, bottom: 18, fontFamily: TITLE, fontWeight: 800, fontSize: 44, color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,.8)', letterSpacing: 2 }}>{EP.country.name.toUpperCase()}</div>
      </div>
      {cards.map((c, k) => {
        const kw = c.label === 'Population' ? 'population' : c.label === 'Capital' ? (c.text as string) : 'covers';
        const at = Math.max(seg.start + 0.4 + k * 0.5, cue(seg, kw, k, cards.length) - 0.2);
        const p = pr(t, at, 0.8, eBack); const n = pr(t, at + 0.1, 1.8, (x) => x);
        return (
          <div key={k} style={{ ...glass, marginTop: 22, padding: '22px 30px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            transform: `translateX(${(1 - p) * 420}px)`, opacity: cl(p * 2) }}>
            <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 26, color: '#a9bcd6', letterSpacing: 2, textTransform: 'uppercase' }}>{c.label}</span>
            <span style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 52, color: GOLD }}>
              {c.text ? c.text : <Count v={c.value} p={n} fmt={c.fmt} suffix={c.suffix} />}
            </span>
          </div>
        );
      })}
      {cards.some((c) => c.note) ? <div style={{ marginTop: 12, textAlign: 'right', fontFamily: BODY, fontSize: 18, color: 'rgba(200,215,235,.6)' }}>Source: {cards.find((c) => c.note).note}</div> : null}
    </div>
  );
};

// ---------- big numbers chips (right column) ----------
export const BigChips: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.5, 0.45);
  const big = seg.scene.big as [string, string][];
  if (!big || vis <= 0) return null;
  return (
    <div style={{ position: 'absolute', right: 80, top: 160, width: 520, opacity: vis }}>
      {big.map(([n, label], k) => {
        const p = pr(t, seg.start + 0.3 + k * 0.9, 0.8, eBack);
        return (
          <div key={k} style={{ ...glass, padding: '26px 34px', marginBottom: 24, transform: `scale(${0.6 + 0.4 * p})`, opacity: cl(p * 2), transformOrigin: '100% 50%' }}>
            <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 96, color: GOLD, lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: '#dfe8f5', marginTop: 8 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- timeline ----------
export const Timeline: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.5, 0.45);
  if (vis <= 0) return null;
  const ev = seg.scene.events as [string, string][];
  const n = ev.length, x0 = 220, x1 = W - 220, y = 560;
  const d = seg.end - seg.start;
  const line = pr(t, seg.start, 1.2, eOut);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: vis }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <line x1={x0} y1={y} x2={lerp(x0, x1, line)} y2={y} stroke="rgba(255,201,74,.85)" strokeWidth={5} strokeLinecap="round" />
      </svg>
      {ev.map(([yr, label], k) => {
        const at = seg.start + 0.5 + (k * (d - 1.5)) / n;
        const p = pr(t, at, 0.8, eBack); const x = lerp(x0, x1, n === 1 ? 0.5 : k / (n - 1));
        const up = k % 2 === 0;
        return (
          <div key={k} style={{ position: 'absolute', left: x - 190, width: 380, top: up ? y - 300 : y + 40, height: 260, display: 'flex', flexDirection: 'column',
            justifyContent: up ? 'flex-end' : 'flex-start', alignItems: 'center', opacity: cl(p * 2), transform: `translateY(${(1 - p) * (up ? 40 : -40)}px)` }}>
            {!up ? <div style={{ width: 3, height: 40, background: GOLD }} /> : null}
            <div style={{ ...glass, padding: '18px 26px', textAlign: 'center', width: 340 }}>
              <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 58, color: GOLD, lineHeight: 1.05 }}>{yr}</div>
              <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 27, color: '#e6eef8', marginTop: 8 }}>{label}</div>
            </div>
            {up ? <div style={{ width: 3, height: 40, background: GOLD }} /> : null}
          </div>
        );
      })}
      {ev.map((_, k) => {
        const at = seg.start + 0.5 + (k * (d - 1.5)) / n; const p = pr(t, at, 0.6, eBack); const x = lerp(x0, x1, n === 1 ? 0.5 : k / (n - 1));
        return <div key={'d' + k} style={{ position: 'absolute', left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 32, background: GOLD, border: '5px solid #0a1424',
          transform: `scale(${p})`, boxShadow: '0 0 30px rgba(255,201,74,.8)' }} />;
      })}
    </div>
  );
};

// ---------- culture cards ----------
const ICON: Record<string, (s: number) => React.ReactNode> = {
  flamenco: (s) => <svg width={s} height={s} viewBox="0 0 64 64"><path d="M32 52 L8 22 A30 30 0 0 1 56 22 Z" fill={GOLD} /><path d="M32 52 L14 20 M32 52 L22 14 M32 52 L32 12 M32 52 L42 14 M32 52 L50 20" stroke="#3a2600" strokeWidth="2.5" /><circle cx="32" cy="52" r="4" fill="#3a2600" /></svg>,
  clock: (s) => <svg width={s} height={s} viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke={GOLD} strokeWidth="5" /><path d="M32 18 V32 L42 40" stroke={GOLD} strokeWidth="5" strokeLinecap="round" fill="none" /></svg>,
  bull: (s) => <svg width={s} height={s} viewBox="0 0 64 64"><path d="M6 16 C10 28 18 30 22 28 L24 44 C26 54 38 54 40 44 L42 28 C46 30 54 28 58 16 C52 22 46 22 42 20 L22 20 C18 22 12 22 6 16 Z" fill={GOLD} /><circle cx="27" cy="34" r="2.5" fill="#3a2600" /><circle cx="37" cy="34" r="2.5" fill="#3a2600" /></svg>,
  tomato: (s) => <svg width={s} height={s} viewBox="0 0 64 64"><circle cx="32" cy="36" r="20" fill="#ff5a3c" /><path d="M32 16 L26 10 M32 16 L38 10 M32 16 L32 8 M22 18 L42 18" stroke="#3ccf6b" strokeWidth="4" strokeLinecap="round" /><ellipse cx="25" cy="30" rx="5" ry="3" fill="rgba(255,255,255,.4)" /></svg>,
};
export const Cards: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.5, 0.45);
  if (vis <= 0) return null;
  const cards = seg.scene.cards as [string, string, string][];
  const kws = ['flamenco', 'dinner', 'running', 'tomatina'];
  return (
    <div style={{ position: 'absolute', left: 160, right: 160, top: 250, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30, opacity: vis }}>
      {cards.map(([icon, title, sub], k) => {
        const at = cue(seg, kws[k] ?? title, k, cards.length); const p = pr(t, at, 0.8, eBack);
        return (
          <div key={k} style={{ ...glass, height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 24,
            transform: `translateY(${(1 - p) * 120}px) rotate(${(1 - p) * (k % 2 ? 6 : -6)}deg)`, opacity: cl(p * 2) }}>
            <div style={{ width: 150, height: 150, borderRadius: 150, background: 'radial-gradient(circle, rgba(255,201,74,.18), rgba(255,201,74,0) 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ICON[icon]?.(110)}</div>
            <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 40, color: '#fff', textAlign: 'center' }}>{title}</div>
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 25, color: '#a9bcd6', textAlign: 'center' }}>{sub}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- big counter ----------
export const BigNum: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.5, 0.45);
  if (vis <= 0) return null;
  const sc = seg.scene; const at = cue(seg, 'six', 0, 1) - 0.3; const p = pr(t, at, 2.2, (x) => x); const s = pr(t, at - 0.2, 0.8, eBack);
  const chips = (sc.chips as string[]) ?? [];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: vis, paddingBottom: 120 }}>
      <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 210, color: GOLD, lineHeight: 1, transform: `scale(${0.6 + 0.4 * s})`, textShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
        <Count v={sc.value} p={p} suffix="" /><span style={{ fontSize: 90, color: '#fff' }}>{sc.suffix}</span>
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 44, color: '#e6eef8', marginTop: 10, opacity: cl(s * 2) }}>{sc.label}</div>
      <div style={{ display: 'flex', gap: 22, marginTop: 50 }}>
        {chips.map((c, k) => { const q = pr(t, cue(seg, c, k, chips.length), 0.6, eBack); return (
          <div key={k} style={{ ...glass, borderRadius: 60, padding: '14px 40px', fontFamily: TITLE, fontWeight: 600, fontSize: 34, color: '#fff', transform: `scale(${q})`, opacity: cl(q * 2) }}>{c}</div>); })}
      </div>
      {sc.note ? <div style={{ position: 'absolute', bottom: 210, fontFamily: BODY, fontSize: 20, color: 'rgba(200,215,235,.6)' }}>Source: {sc.note}</div> : null}
    </div>
  );
};

// ---------- KPIs + bar chart ----------
export const Bars: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.5, 0.45);
  if (vis <= 0) return null;
  const sc = seg.scene; const kpis = sc.kpis as any[]; const bars = sc.bars as { title: string; items: [string, number][] };
  const bt = cue(seg, 'tourism', 0, 1); const max = Math.max(...bars.items.map((x) => x[1]));
  return (
    <div style={{ position: 'absolute', left: 140, right: 140, top: 170, display: 'flex', gap: 60, opacity: vis }}>
      <div style={{ width: 560, display: 'flex', flexDirection: 'column', gap: 30 }}>
        {kpis.map((k, j) => { const at = cue(seg, j === 0 ? 'economy' : 'grew', j, kpis.length); const p = pr(t, at, 0.8, eBack); const n = pr(t, at, 1.8, (x) => x);
          return (<div key={j} style={{ ...glass, padding: '30px 36px', transform: `translateX(${(1 - p) * -300}px)`, opacity: cl(p * 2) }}>
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 26, color: '#a9bcd6', letterSpacing: 2, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 70, color: GOLD, lineHeight: 1.1, whiteSpace: 'nowrap' }}><Count v={k.value} p={n} fmt={k.fmt} prefix={k.prefix} suffix={k.suffix} /></div>
          </div>); })}
      </div>
      <div style={{ ...glass, flex: 1, padding: '34px 44px', opacity: cl(pr(t, bt - 0.3, 0.6) * 2), height: 600, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 32, color: '#fff' }}>{bars.title}</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 50, padding: '20px 20px 0' }}>
          {bars.items.map(([lab, v], j) => { const p = pr(t, bt + 0.2 + j * 0.45, 1.2, E('power3.out')); const last = j === bars.items.length - 1;
            return (<div key={j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 44, color: last ? GOLD : '#fff', opacity: cl(p * 2), marginBottom: 10 }}>{(v * p).toFixed(1)}</div>
              <div style={{ width: '100%', height: `${(v / max) * 74 * p}%`, borderRadius: '14px 14px 0 0', background: last ? `linear-gradient(180deg, #ffe08a, ${GOLD} 40%, #d9951a)` : 'linear-gradient(180deg, #7fd3ff, #2e7fc0)',
                boxShadow: last ? '0 0 40px rgba(255,201,74,.45)' : 'none' }} />
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 30, color: '#cfe0f4', marginTop: 14 }}>{lab}</div>
            </div>); })}
        </div>
        {sc.note ? <div style={{ fontFamily: BODY, fontSize: 18, color: 'rgba(200,215,235,.6)', marginTop: 12, textAlign: 'right' }}>Source: {sc.note}</div> : null}
      </div>
    </div>
  );
};

// ---------- outro ----------
export const Outro: React.FC<{ t: number; seg: Seg }> = ({ t, seg }) => {
  if (t < seg.start - 0.3) return null;
  const p = pr(t, seg.start, 1.0, eBack); const sub = cue(seg, 'subscribe', 0, 1); const q = pr(t, sub - 0.1, 0.8, E('elastic.out(1,0.5)'));
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 140 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(4,8,16,.35), rgba(2,4,10,.85) 75%)', opacity: pr(t, seg.start, 1.2) }} />
      <div style={{ position: 'relative', width: 420, height: 300, opacity: cl(p * 2), transform: `scale(${0.7 + 0.3 * p})` }}><FlagWave t={t} w={420} h={300} /></div>
      <div style={{ position: 'relative', fontFamily: TITLE, fontWeight: 800, fontSize: 150, letterSpacing: 18, color: '#fff', opacity: cl(p * 2), textShadow: '0 20px 60px rgba(0,0,0,.6)' }}>{EP.country.name.toUpperCase()}</div>
      <div style={{ position: 'relative', marginTop: 40, display: 'flex', alignItems: 'center', gap: 22, padding: '22px 56px', borderRadius: 80, background: 'linear-gradient(180deg,#ff4d4d,#d91a1a)',
        boxShadow: '0 20px 60px rgba(217,26,26,.45)', transform: `scale(${q})`, opacity: cl(q * 2) }}>
        <svg width={50} height={50} viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3.5a2 2 0 1 0-4 0v.8A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" fill="#fff" /></svg>
        <span style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 52, color: '#fff', letterSpacing: 3 }}>SUBSCRIBE</span>
      </div>
      <div style={{ position: 'relative', marginTop: 34, textAlign: 'center', opacity: cl(pr(t, sub + 0.5, 0.8) * 2) }}>
        <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 46, color: GOLD, letterSpacing: 6 }}>{CH.name.toUpperCase()}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: '#cfe0f4', marginTop: 6 }}>{CH.handle}</div>
      </div>
    </div>
  );
};

// ---------- captions: phrase chunks, active word highlighted ----------
type Chunk = { words: { w: string; t: number; e: number }[]; t0: number; t1: number };
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  EP.segments.forEach((s) => {
    let cur: any[] = [];
    s.words.forEach((w, k) => {
      cur.push(w);
      const end = /[.!?,;:]$/.test(w.w) && cur.length >= 3;
      if (cur.length >= 7 || end || k === s.words.length - 1) { out.push({ words: cur, t0: cur[0].t, t1: cur[cur.length - 1].e }); cur = []; }
    });
  });
  for (let i = 0; i < out.length; i++) out[i].t1 = Math.min(out[i].t1 + 0.35, i + 1 < out.length ? out[i + 1].t0 : 1e9);
  return out;
})();
export const Captions: React.FC<{ t: number }> = ({ t }) => {
  const c = CHUNKS.find((x) => t >= x.t0 - 0.12 && t < x.t1);
  if (!c) return null;
  const p = pr(t, c.t0 - 0.12, 0.25);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center', opacity: cl(p * 1.5) }}>
      <div style={{ padding: '12px 30px 16px', borderRadius: 18, background: 'rgba(4,8,16,.62)', display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1500 }}>
        {c.words.map((w, k) => { const on = t >= w.t - 0.04 && t < (k + 1 < c.words.length ? c.words[k + 1].t : c.t1);
          const seen = t >= w.t - 0.04;
          return <span key={k} style={{ fontFamily: BODY, fontWeight: 700, fontSize: 46, color: on ? GOLD : seen ? '#fff' : 'rgba(255,255,255,.45)', display: 'inline-block' }}>{w.w}</span>; })}
      </div>
    </div>
  );
};

// ---------- chapter chip ----------
export const Chapter: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const ch = seg.scene.chapter; if (!ch) return null;
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.4, 0.35); const p = pr(t, seg.start - 0.2, 0.7, eExpo);
  const num = EP.segments.filter((s, k) => k <= i && s.scene.chapter).length;
  return (
    <div style={{ position: 'absolute', left: 70, top: 60, display: 'flex', alignItems: 'center', gap: 18, opacity: vis, transform: `translateX(${(1 - p) * -200}px)` }}>
      <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 30, color: INK, background: GOLD, borderRadius: 12, padding: '8px 16px' }}>{String(num).padStart(2, '0')}</div>
      <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: 2, textShadow: '0 4px 20px rgba(0,0,0,.7)' }}>{ch}</div>
    </div>
  );
};
