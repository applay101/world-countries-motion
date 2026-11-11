// Shared timing / easing helpers and episode types.
import gsap from 'gsap';
import EPJ from '../data/episode.json';

export const W = 1920, H = 1080;
// per-episode look: accent colour + map style (see THEMES in MapLayer), so episodes don't all look alike
const TH = ((EPJ as any).theme ?? {}) as { accent?: string; map?: string };
export const GOLD = TH.accent ?? '#FFC94A', INK = '#0B1220', WHITE = '#F4F7FB', ACCENT = '#5EC8FF';
export const MAP_STYLE = TH.map ?? 'navy';
export const TITLE = 'Montserrat, sans-serif', BODY = 'Inter, sans-serif';
export const HIST = MAP_STYLE === 'parchment';
export const DISPLAY = HIST ? 'Cinzel, serif' : TITLE; // vintage display face for history episodes

export type Word = { w: string; t: number; e: number };
export type View = { lon: number; lat: number; span: number };
export type Scene = { type: string; chapter?: string; view?: View; [k: string]: any };
export type Seg = { id: string; text: string; scene: Scene; start: number; end: number; words: Word[] };
export type Ep = { id: string; country: { name: string; iso2: string; isoNum: string; lon: number; lat: number; capital: string }; segments: Seg[]; duration: number; voiceDuration: number };
export const EP = EPJ as unknown as Ep;
// the globe intro hands over to the map when the second segment starts
export const INTRO_END = EP.segments[1]?.start ?? 6;
// intro style: globe | flag | hook | dive
export const INTRO_TYPE: string = EP.segments[0]?.scene.type ?? 'globe';

export const E = (n: string) => gsap.parseEase(n) as (x: number) => number;
export const eOut = E('power3.out'), eIO = E('power2.inOut'), eExpoIO = E('expo.inOut'), eBack = E('back.out(1.8)'), eExpo = E('expo.out');
export const cl = (x: number) => Math.max(0, Math.min(1, x));
export const pr = (t: number, a: number, d: number, e = eOut) => e(cl((t - a) / d));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const fadeWin = (t: number, a: number, b: number, fi = 0.5, fo = 0.5) => Math.min(pr(t, a, fi), 1 - pr(t, b - fo, fo, (x) => x));

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
// Time at which a name is first spoken in a segment (matches the first word of the name), or null.
export const spokenAt = (seg: Seg, name: string): number | null => {
  const first = norm(name.split(/[\s·]+/)[0]);
  if (!first) return null;
  for (const w of seg.words) if (norm(w.w).startsWith(first) || (first.length > 3 && norm(w.w) === first)) return w.t;
  return null;
};
// Cue time for item i of n in a segment: when it's spoken, else spread evenly.
export const cue = (seg: Seg, name: string, i: number, n: number) => {
  const s = spokenAt(seg, name);
  if (s !== null) return s - 0.15;
  const d = seg.end - seg.start;
  return seg.start + 0.6 + (i * (d - 1.2)) / Math.max(1, n);
};
export const segIndexAt = (t: number) => {
  let k = 0;
  for (let i = 0; i < EP.segments.length; i++) if (t >= EP.segments[i].start - 0.35) k = i;
  return k;
};
// Segment visibility window: from its start (minus lead) to the next segment's start.
export const segWindow = (i: number): [number, number] => {
  const s = EP.segments[i];
  const next = EP.segments[i + 1];
  return [s.start - 0.35, next ? next.start - 0.35 : EP.duration];
};
export const fmtNum = (v: number, fmt?: string) => {
  if (fmt === '1dp') return v.toFixed(1);
  if (fmt === '2dp') return v.toFixed(2);
  return Math.round(v).toLocaleString('en-US');
};
