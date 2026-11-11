// Story scenes: cartoon characters (people of any era) and streets/towns from ancient to future.
//  `street` scene: {era, time?, title, sub?, people: [role | [role, skin?]], cue?}
//  Character roles: king, queen, soldier, merchant, farmer, scholar, explorer, sailor, worker, tourist, business, student, chef, doctor, kid, elder.
import React from 'react';
import { EP, W, H, GOLD, BODY, Seg, cl, pr, lerp, eBack, eOut, cue, segWindow, fadeWin, HIST, DISPLAY } from '../lib/core';

const SKIN = ['#f5d0b0', '#e8b48c', '#c98b5e', '#9c6440', '#6e4428'];
type Look = { top: string; bottom: string; hat?: string; acc?: string; hair: string };
const ROLE: Record<string, Look> = {
  king: { top: '#8a1c2a', bottom: '#5a1020', hat: 'crown', acc: 'cape', hair: '#4a3020' },
  queen: { top: '#6a2a8a', bottom: '#4a1a6a', hat: 'tiara', acc: 'gown', hair: '#2a1a10' },
  soldier: { top: '#6a6f5a', bottom: '#4a4f3a', hat: 'helmet', acc: 'shield', hair: '#2a1a10' },
  merchant: { top: '#c47a2a', bottom: '#7a4a1a', hat: 'turban', acc: 'bag', hair: '#2a1a10' },
  farmer: { top: '#5a7a3a', bottom: '#6a4a2a', hat: 'straw', acc: 'basket', hair: '#5a3a1a' },
  scholar: { top: '#2a4a7a', bottom: '#1a2a4a', hat: 'cap', acc: 'scroll', hair: '#ddd' },
  explorer: { top: '#b89a5a', bottom: '#6a5a3a', hat: 'pith', acc: 'map', hair: '#5a3a1a' },
  sailor: { top: '#f4f4f4', bottom: '#1a3a6a', hat: 'sailor', acc: 'stripes', hair: '#3a2a1a' },
  worker: { top: '#2a5a9a', bottom: '#2a3a5a', hat: 'hardhat', acc: 'wrench', hair: '#3a2a1a' },
  tourist: { top: '#ff7a59', bottom: '#3a6ab0', hat: 'capb', acc: 'camera', hair: '#3a2a1a' },
  business: { top: '#2a2f3a', bottom: '#1a1f2a', acc: 'tie', hair: '#2a1a10' },
  student: { top: '#3ab07a', bottom: '#2a3a5a', acc: 'backpack', hair: '#1a1a1a' },
  chef: { top: '#ffffff', bottom: '#2a2a2a', hat: 'chef', hair: '#3a2a1a' },
  doctor: { top: '#ffffff', bottom: '#3a6a8a', acc: 'stetho', hair: '#2a1a10' },
  kid: { top: '#ffcc33', bottom: '#3a7ad0', hair: '#5a3a1a' },
  elder: { top: '#8a7a6a', bottom: '#5a4a3a', acc: 'cane', hair: '#e8e8e8' },
};

// One cartoon person, ~260 px tall at s=1, standing on (0,0). Animated: walk/bob, blink, talking mouth, waving arm.
export const Person: React.FC<{ role: string; skin?: number; t: number; s?: number; walk?: boolean; wave?: boolean; talk?: boolean; flip?: boolean; seed?: number }> = ({ role, skin = 1, t, s = 1, walk, wave, talk = true, flip, seed = 0 }) => {
  const L = ROLE[role] ?? ROLE.tourist; const sk = SKIN[skin % SKIN.length];
  const ph = t * (walk ? 7 : 2) + seed; const bob = walk ? Math.abs(Math.sin(ph)) * 8 : Math.sin(ph) * 2;
  const leg = walk ? Math.sin(ph) * 22 : 0; const arm = walk ? -Math.sin(ph) * 25 : wave ? -120 + Math.sin(t * 9 + seed) * 25 : Math.sin(t * 1.5 + seed) * 4;
  const blink = (t * 0.7 + seed * 0.37) % 3.2 < 0.12; const mouth = talk ? 2 + Math.abs(Math.sin(t * 11 + seed)) * 6 : 2;
  const small = role === 'kid' ? 0.75 : 1; const elder = role === 'elder';
  const ink = '#1a120c';
  return (
    <g transform={`scale(${s * small * (flip ? -1 : 1)},${s * small}) translate(0,${-bob})`}>
      <ellipse cx={0} cy={bob + 2} rx={48} ry={9} fill="rgba(0,0,0,.18)" />
      {/* legs */}
      <g stroke={ink} strokeWidth={5} strokeLinecap="round">
        <line x1={-12} y1={-80} x2={-12 + Math.sin((leg * Math.PI) / 180) * 50} y2={-2} />
        <line x1={12} y1={-80} x2={12 - Math.sin((leg * Math.PI) / 180) * 50} y2={-2} />
      </g>
      <rect x={-30} y={-96} width={60} height={34} rx={10} fill={L.bottom} stroke={ink} strokeWidth={4} />
      {L.acc === 'gown' || L.acc === 'cape' ? <path d="M-34 -150 L-52 -40 L52 -40 L34 -150 Z" fill={L.bottom} stroke={ink} strokeWidth={4} /> : null}
      {/* body */}
      <rect x={-34} y={-160} width={68} height={82} rx={22} fill={L.top} stroke={ink} strokeWidth={4} />
      {L.acc === 'stripes' ? [0, 1, 2].map((k) => <line key={k} x1={-30} x2={30} y1={-140 + k * 18} y2={-140 + k * 18} stroke="#1a3a6a" strokeWidth={5} />) : null}
      {L.acc === 'tie' ? <path d="M0 -158 L7 -146 L3 -110 L0 -104 L-3 -110 L-7 -146 Z" fill="#c0392b" stroke={ink} strokeWidth={2} /> : null}
      {L.acc === 'stetho' ? <path d="M-16 -158 Q-18 -125 0 -122 Q18 -125 16 -158" fill="none" stroke="#3a3a3a" strokeWidth={4} /> : null}
      {L.acc === 'backpack' ? <rect x={-48} y={-150} width={16} height={56} rx={6} fill="#c0392b" stroke={ink} strokeWidth={3} /> : null}
      {/* back arm */}
      <g transform={`translate(-30,-150) rotate(${-arm * 0.6 + 8})`}><line x1={0} y1={0} x2={0} y2={62} stroke={ink} strokeWidth={10} strokeLinecap="round" /><line x1={0} y1={0} x2={0} y2={62} stroke={L.top} strokeWidth={5} strokeLinecap="round" /><circle cy={66} r={8} fill={sk} stroke={ink} strokeWidth={3} /></g>
      {/* front arm (+ accessory) */}
      <g transform={`translate(30,-150) rotate(${arm - 8})`}>
        <line x1={0} y1={0} x2={0} y2={62} stroke={ink} strokeWidth={10} strokeLinecap="round" /><line x1={0} y1={0} x2={0} y2={62} stroke={L.top} strokeWidth={5} strokeLinecap="round" />
        <circle cy={66} r={8} fill={sk} stroke={ink} strokeWidth={3} />
        {L.acc === 'scroll' ? <rect x={-6} y={60} width={34} height={14} rx={7} fill="#f3e2bb" stroke={ink} strokeWidth={3} /> : null}
        {L.acc === 'bag' ? <rect x={-14} y={70} width={28} height={30} rx={6} fill="#8a5a2a" stroke={ink} strokeWidth={3} /> : null}
        {L.acc === 'basket' ? <path d="M-18 70 h36 l-6 26 h-24 Z" fill="#c8a25a" stroke={ink} strokeWidth={3} /> : null}
        {L.acc === 'map' ? <rect x={-4} y={56} width={36} height={26} fill="#f3e2bb" stroke={ink} strokeWidth={3} /> : null}
        {L.acc === 'camera' ? <rect x={-12} y={62} width={30} height={20} rx={4} fill="#333" stroke={ink} strokeWidth={3} /> : null}
        {L.acc === 'wrench' ? <line x1={0} y1={66} x2={0} y2={100} stroke="#888" strokeWidth={7} strokeLinecap="round" /> : null}
        {L.acc === 'cane' ? <line x1={0} y1={66} x2={-4} y2={150} stroke="#6a4a2a" strokeWidth={6} strokeLinecap="round" /> : null}
      </g>
      {L.acc === 'shield' ? <path d="M-58 -150 h36 v40 q-18 22 -36 0 Z" fill="#a8842a" stroke={ink} strokeWidth={4} /> : null}
      {/* head */}
      <g transform={`translate(0,-205) rotate(${elder ? 4 : Math.sin(t * 1.3 + seed) * 3})`}>
        <circle r={44} fill={sk} stroke={ink} strokeWidth={4} />
        <path d={`M-44 -6 Q-40 -46 0 -46 Q40 -46 44 -6 Q30 -26 0 -28 Q-30 -26 -44 -6 Z`} fill={L.hair} stroke={ink} strokeWidth={3} />
        {blink ? <><line x1={-20} x2={-8} y1={-4} y2={-4} stroke={ink} strokeWidth={4} /><line x1={8} x2={20} y1={-4} y2={-4} stroke={ink} strokeWidth={4} /></>
          : <><circle cx={-14} cy={-4} r={5.5} fill={ink} /><circle cx={14} cy={-4} r={5.5} fill={ink} /><circle cx={-12} cy={-6} r={1.8} fill="#fff" /><circle cx={16} cy={-6} r={1.8} fill="#fff" /></>}
        <ellipse cx={0} cy={20} rx={9} ry={mouth / 2 + 1} fill="#7a2a1a" stroke={ink} strokeWidth={3} />
        <circle cx={-26} cy={10} r={6} fill="#ff9a8a" opacity={0.5} /><circle cx={26} cy={10} r={6} fill="#ff9a8a" opacity={0.5} />
        {elder ? <path d="M-24 22 Q0 52 24 22" fill="#e8e8e8" stroke={ink} strokeWidth={3} /> : null}
        {L.hat === 'crown' ? <path d="M-30 -40 L-30 -72 L-15 -54 L0 -78 L15 -54 L30 -72 L30 -40 Z" fill={GOLD} stroke={ink} strokeWidth={4} /> : null}
        {L.hat === 'tiara' ? <path d="M-24 -42 Q0 -66 24 -42" fill="none" stroke={GOLD} strokeWidth={8} /> : null}
        {L.hat === 'helmet' ? <path d="M-48 -8 Q-48 -56 0 -58 Q48 -56 48 -8 Z" fill="#8a8f7a" stroke={ink} strokeWidth={4} /> : null}
        {L.hat === 'turban' ? <ellipse cx={0} cy={-40} rx={46} ry={24} fill="#f0e6d0" stroke={ink} strokeWidth={4} /> : null}
        {L.hat === 'straw' ? <><ellipse cx={0} cy={-36} rx={70} ry={12} fill="#e8c86a" stroke={ink} strokeWidth={4} /><path d="M-30 -36 Q0 -76 30 -36" fill="#e8c86a" stroke={ink} strokeWidth={4} /></> : null}
        {L.hat === 'cap' ? <><rect x={-34} y={-62} width={68} height={10} fill="#1a1a1a" /><path d="M-26 -52 Q0 -40 26 -52 L26 -44 Q0 -32 -26 -44 Z" fill="#1a1a1a" /></> : null}
        {L.hat === 'pith' ? <><ellipse cx={0} cy={-36} rx={62} ry={11} fill="#d8c08a" stroke={ink} strokeWidth={4} /><path d="M-36 -36 Q0 -84 36 -36" fill="#d8c08a" stroke={ink} strokeWidth={4} /></> : null}
        {L.hat === 'sailor' ? <path d="M-34 -40 Q0 -64 34 -40 L30 -30 Q0 -44 -30 -30 Z" fill="#fff" stroke={ink} strokeWidth={4} /> : null}
        {L.hat === 'hardhat' ? <path d="M-46 -24 Q-44 -64 0 -64 Q44 -64 46 -24 Z" fill="#ffc72a" stroke={ink} strokeWidth={4} /> : null}
        {L.hat === 'capb' ? <path d="M-40 -30 Q-38 -62 0 -62 Q38 -62 40 -30 L70 -26 L40 -22 Z" fill="#2a6ab0" stroke={ink} strokeWidth={4} /> : null}
        {L.hat === 'chef' ? <path d="M-30 -36 L-30 -64 Q-44 -92 -14 -86 Q0 -110 14 -86 Q44 -92 30 -64 L30 -36 Z" fill="#fff" stroke={ink} strokeWidth={4} /> : null}
      </g>
    </g>
  );
};

// ---------- buildings by era ----------
const rnd = (k: number) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const Building: React.FC<{ era: string; x: number; w: number; h: number; k: number; t: number; night: boolean }> = ({ era, x, w, h, k, t, night }) => {
  const ink = '#1a120c'; const lit = (i: number) => night && rnd(k * 31 + i) > 0.35;
  const win = (wx: number, wy: number, ww: number, wh: number, i: number) => <rect key={i} x={wx} y={wy} width={ww} height={wh} rx={2} fill={lit(i) ? '#ffd86a' : night ? '#2a3550' : '#bfe0f0'} stroke={ink} strokeWidth={2} />;
  const y = -h;
  if (era === 'ancient') { const c = ['#e8d4a8', '#dcc394', '#f0dcb0'][k % 3];
    return <g transform={`translate(${x},0)`}><rect x={0} y={y} width={w} height={h} fill={c} stroke={ink} strokeWidth={4} />
      {k % 3 === 0 ? <><path d={`M-8 ${y} L${w / 2} ${y - 46} L${w + 8} ${y} Z`} fill="#c8a870" stroke={ink} strokeWidth={4} />{[0.15, 0.38, 0.62, 0.85].map((f, i) => <rect key={i} x={w * f - 7} y={y + 10} width={14} height={h - 10} fill="#f6e8c8" stroke={ink} strokeWidth={2} />)}</>
        : <><rect x={-6} y={y - 10} width={w + 12} height={12} fill="#c8a870" stroke={ink} strokeWidth={3} /><path d={`M${w / 2 - 16} 0 L${w / 2 - 16} -40 Q${w / 2} -60 ${w / 2 + 16} -40 L${w / 2 + 16} 0`} fill="#5a3a1a" stroke={ink} strokeWidth={3} />
          {win(w * 0.18, y + 22, 16, 20, 1)}{win(w * 0.68, y + 22, 16, 20, 2)}</>}</g>; }
  if (era === 'medieval') { const c = ['#efe2c4', '#e6d2a8', '#f4e8cf'][k % 3]; const roof = ['#9a3a2a', '#7a4a2a', '#5a5a6a'][k % 3];
    return <g transform={`translate(${x},0)`}><rect x={0} y={y} width={w} height={h} fill={c} stroke={ink} strokeWidth={4} />
      <line x1={0} y1={y + h * 0.5} x2={w} y2={y + h * 0.5} stroke="#5a3a1a" strokeWidth={6} /><line x1={w / 3} y1={y} x2={w / 3} y2={0} stroke="#5a3a1a" strokeWidth={5} /><line x1={(2 * w) / 3} y1={y} x2={(2 * w) / 3} y2={0} stroke="#5a3a1a" strokeWidth={5} />
      <path d={`M-12 ${y} L${w / 2} ${y - w * 0.6} L${w + 12} ${y} Z`} fill={roof} stroke={ink} strokeWidth={4} />
      {win(w * 0.1, y + 18, 18, 22, 1)}{win(w * 0.72, y + 18, 18, 22, 2)}<rect x={w / 2 - 14} y={-46} width={28} height={46} rx={14} fill="#5a3a1a" stroke={ink} strokeWidth={3} /></g>; }
  if (era === 'industrial') { const c = ['#a8503a', '#8a4a3a', '#b86a4a'][k % 3];
    return <g transform={`translate(${x},0)`}><rect x={0} y={y} width={w} height={h} fill={c} stroke={ink} strokeWidth={4} />
      <rect x={w * 0.7} y={y - 50} width={18} height={50} fill="#6a3a2a" stroke={ink} strokeWidth={3} />
      {[0, 1, 2].map((r) => Math.floor(h / 70) > r ? [0, 1, 2].map((cIdx) => win(10 + cIdx * ((w - 20) / 3), y + 18 + r * 64, (w - 40) / 3, 38, r * 3 + cIdx)) : null)}
      {[0, 1, 2].map((p) => { const a = (t * 0.5 + p * 0.33 + k * 0.2) % 1; return <circle key={p} cx={w * 0.7 + 9 + a * 30} cy={y - 56 - a * 90} r={10 + a * 18} fill="#9a9a9a" opacity={0.6 * (1 - a)} />; })}</g>; }
  if (era === 'future') { const c = ['#2a3a6a', '#3a2a6a', '#1a4a6a'][k % 3];
    return <g transform={`translate(${x},0)`}><path d={`M0 0 L${w * 0.1} ${y} L${w * 0.9} ${y} L${w} 0 Z`} fill={c} stroke="#7af0ff" strokeWidth={3} />
      {[0, 1, 2, 3, 4, 5].map((r) => <line key={r} x1={w * 0.12} x2={w * 0.88} y1={y + 20 + r * (h / 7)} y2={y + 20 + r * (h / 7)} stroke="#7af0ff" strokeWidth={2} opacity={0.4 + 0.4 * Math.sin(t * 3 + r + k)} />)}
      <ellipse cx={w / 2} cy={y - 8} rx={w * 0.45} ry={10} fill="none" stroke="#ff6ad5" strokeWidth={3} /></g>; }
  // modern
  const c = ['#5a7a9a', '#7a8a9a', '#4a6a8a', '#8a9ab0'][k % 4];
  return <g transform={`translate(${x},0)`}><rect x={0} y={y} width={w} height={h} fill={c} stroke={ink} strokeWidth={4} />
    {Array.from({ length: Math.floor((h - 30) / 46) }).map((_, r) => Array.from({ length: Math.max(2, Math.floor(w / 46)) }).map((__, cIdx, arr) => win(10 + cIdx * ((w - 20) / arr.length), y + 16 + r * 46, (w - 20) / arr.length - 10, 30, r * 9 + cIdx)))}</g>;
};

const SKY: Record<string, [string, string]> = { day: ['#7cc7ff', '#d6efff'], sunset: ['#ff8a5c', '#ffd29a'], night: ['#0b1430', '#2a3a6a'] };

export const Street: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.35, 0.4);
  if (vis <= 0) return null;
  const sc = seg.scene as any; const era: string = sc.era ?? 'modern'; const time: string = sc.time ?? (era === 'future' ? 'night' : 'day');
  const night = time === 'night'; const [s0, s1] = SKY[time] ?? SKY.day;
  const at = cue(seg, sc.cue ?? sc.title ?? '', 0, 1); const ti = pr(t, at - 0.2, 0.7, eBack);
  const lt = t - a; const pan = lt * 40; // slow camera pan
  const bw = [170, 220, 150, 260, 190, 230, 160, 210];
  let x = -200; const blds: React.ReactNode[] = [];
  for (let k = 0; x < W + 400; k++) { const w = bw[k % bw.length]; const h = (era === 'modern' ? 300 : era === 'future' ? 420 : era === 'industrial' ? 240 : 170) + rnd(k) * (era === 'modern' || era === 'future' ? 260 : 80);
    blds.push(<Building key={k} era={era} x={x} w={w} h={h} k={k} t={t} night={night} />); x += w + (era === 'ancient' ? 40 : 14); }
  const people = ((sc.people ?? []) as (string | [string, number])[]).map((p) => (typeof p === 'string' ? [p, 1] : p)) as [string, number][];
  const ground = era === 'ancient' || era === 'medieval' ? '#c8a878' : era === 'future' ? '#1a1f3a' : '#6a6a72';
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: vis, overflow: 'hidden' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s0} /><stop offset="1" stopColor={s1} /></linearGradient></defs>
        <rect width={W} height={H} fill="url(#sky)" />
        {night ? Array.from({ length: 60 }).map((_, k) => <circle key={k} cx={rnd(k) * W} cy={rnd(k + 99) * 420} r={1.5 + rnd(k + 7) * 2} fill="#fff" opacity={0.4 + 0.5 * Math.abs(Math.sin(t * 2 + k))} />)
          : <circle cx={W * 0.78} cy={time === 'sunset' ? 420 : 180} r={70} fill={time === 'sunset' ? '#ffdd8a' : '#fff4c0'} opacity={0.95} />}
        {night ? <circle cx={W * 0.8} cy={160} r={52} fill="#f4f0d8" /> : null}
        {[0, 1, 2].map((k) => { const cx = ((rnd(k) * W + t * (18 + k * 8)) % (W + 400)) - 200; return <g key={k} opacity={night ? 0.25 : 0.9} transform={`translate(${cx},${120 + k * 70})`}><ellipse rx={90} ry={26} fill="#fff" /><ellipse cx={50} cy={-14} rx={60} ry={24} fill="#fff" /><ellipse cx={-50} cy={-6} rx={50} ry={20} fill="#fff" /></g>; })}
        <g transform={`translate(${-pan * 0.4},${H - 250})`} opacity={0.35}>{blds}</g>
        <g transform={`translate(${-pan},${H - 190})`}>{blds}</g>
        <rect x={0} y={H - 190} width={W} height={190} fill={ground} />
        {era === 'modern' || era === 'industrial' || era === 'future' ? Array.from({ length: 14 }).map((_, k) => <rect key={k} x={((k * 180 - pan * 1.4) % (W + 180) + W + 180) % (W + 180) - 90} y={H - 100} width={90} height={10} fill={era === 'future' ? '#7af0ff' : '#e8e8e8'} opacity={0.7} />)
          : Array.from({ length: 40 }).map((_, k) => <circle key={k} cx={((rnd(k) * W * 1.5 - pan * 1.2) % W + W) % W} cy={H - 160 + rnd(k + 3) * 140} r={3 + rnd(k + 5) * 4} fill="rgba(90,60,30,.35)" />)}
        {people.map(([role, skin], k) => { const n = people.length; const walk = k % 2 === 1; const baseX = 200 + (k * (W - 400)) / Math.max(1, n - 1) + (k % 2 ? 40 : -40);
          const px = walk ? ((baseX + lt * 70 * (k % 4 === 1 ? 1 : -1)) % (W + 200) + W + 200) % (W + 200) - 100 : baseX;
          const pin = pr(t, a + 0.2 + k * 0.25, 0.5, eBack);
          return <g key={k} transform={`translate(${px},${H - 150 - (k % 2) * 26}) scale(${pin})`}><Person role={role} skin={skin} t={t} s={1.1} walk={walk} wave={!walk && k === 0} flip={walk && k % 4 !== 1} seed={k * 1.7} /></g>; })}
      </svg>
      {sc.title ? <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${ti})`, opacity: cl(ti * 2) }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 92, color: '#fff', textShadow: '0 6px 0 rgba(0,0,0,.35), 0 0 40px rgba(0,0,0,.5)', WebkitTextStroke: '3px #1a120c' } as any}>{sc.title}</div>
        {sc.sub ? <div style={{ marginTop: 8, fontFamily: BODY, fontWeight: 700, fontSize: 34, color: '#1a120c', background: '#f6e7c4', border: '3px solid #1a120c', borderRadius: 14, padding: '4px 18px' }}>{sc.sub}</div> : null}
      </div> : null}
    </div>
  );
};

// ---------- people lineup (characters on a parchment/plain stage, e.g. "who lived here") ----------
export const Crowd: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg, i }) => {
  const [a, b] = segWindow(i); const vis = fadeWin(t, a, b, 0.35, 0.4);
  if (vis <= 0) return null;
  const sc = seg.scene as any; const people = (sc.people ?? []) as [string, string, number?, string?][]; // [role, caption, skin, cueWord]
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: vis }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {people.map(([role, , skin = 1, cw], k) => { const n = people.length; const x = 220 + (k * (W - 440)) / Math.max(1, n - 1);
          const at = cue(seg, cw ?? role, k, n); const p = pr(t, at - 0.15, 0.55, eBack);
          return <g key={k} transform={`translate(${x},${H - 230}) scale(${p})`} opacity={cl(p * 2)}><Person role={role} skin={skin} t={t} s={1.15} wave={p > 0.9 && t - at < 1.5} seed={k} /></g>; })}
      </svg>
      {people.map(([role, cap, , cw], k) => { const n = people.length; const x = 220 + (k * (W - 440)) / Math.max(1, n - 1); const at = cue(seg, cw ?? role, k, n); const p = pr(t, at + 0.2, 0.4, eOut);
        return <div key={k} style={{ position: 'absolute', left: x - 140, width: 280, top: H - 210, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
          <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 28, color: '#1a120c', background: '#f6e7c4', border: '3px solid #1a120c', borderRadius: 12, padding: '3px 14px' }}>{cap}</span></div>; })}
    </div>
  );
};
