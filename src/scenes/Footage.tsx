// `footage` scene: real b-roll from the digital library (library/broll, Pexels + Pixabay) full-screen between map shots.
//  {type: 'footage', clips: ['pexels-123', 'pixabay-456'] (1–3, from library/broll/index.json), chapter?, title?, sub?, cue?, tags?: [[text, cueWord]]}
//  prepare.py resolves the clips to public/broll/<id>.mp4 and puts them in scene._clips [{src, credit, dur}].
import React from 'react';
import { OffthreadVideo, Sequence, staticFile, useVideoConfig } from 'remotion';
import { W, H, GOLD, BODY, Seg, cl, pr, eBack, eOut, spokenAt, DISPLAY } from '../lib/core';

type Clip = { src: string; credit: string; dur: number };
const XF = 0.45; // crossfade between clips and in/out of the scene (s)

export const Footage: React.FC<{ t: number; seg: Seg; i: number }> = ({ t, seg }) => {
  const { fps } = useVideoConfig();
  const sc = seg.scene; const clips = (sc._clips ?? []) as Clip[];
  const a = seg.start - XF, b = seg.end + XF;
  if (!clips.length || t < a - 0.1 || t > b + 0.1) return null;
  const slot = (b - a) / clips.length;
  const k = Math.min(clips.length - 1, Math.max(0, Math.floor((t - a) / slot)));
  const inA = pr(t, a, XF, (x) => x), outB = 1 - pr(t, b - XF, XF, (x) => x);
  const titleAt = (sc.cue ? spokenAt(seg, sc.cue) : null) ?? seg.start + 0.3;
  const tp = pr(t, titleAt, 0.7, eBack), tOut = 1 - pr(t, seg.end - 0.5, 0.5);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: Math.min(inA, outB), overflow: 'hidden', background: '#000' }}>
      {clips.map((c, j) => {
        const s0 = a + j * slot, s1 = s0 + slot + XF;           // each clip overlaps the next by XF for the crossfade
        if (t < s0 - 0.05 || t > s1 + 0.05) return null;
        const rate = Math.max(0.5, Math.min(1, c.dur / (s1 - s0)));  // gentle slow motion when a clip is shorter than its slot
        const op = j === 0 ? 1 : pr(t, s0, XF, (x) => x);
        const z = 1.05 + 0.08 * cl((t - s0) / (s1 - s0));         // slow Ken Burns push-in, alternating drift
        const dx = (j % 2 ? -1 : 1) * 30 * cl((t - s0) / (s1 - s0));
        return (
          <Sequence key={j} from={Math.round(s0 * fps)} durationInFrames={Math.max(1, Math.round((s1 - s0) * fps))} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: op, transform: `translateX(${dx}px) scale(${z})` }}>
              <OffthreadVideo src={staticFile(c.src)} muted playbackRate={rate} style={{ width: W, height: H, objectFit: 'cover' }} />
            </div>
          </Sequence>
        );
      })}
      {/* cinematic grade: soft vignette + bottom shade so captions stay readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,.6) 100%)' }} />
      {sc.title ? (
        <div style={{ position: 'absolute', left: 70, bottom: 190, opacity: cl(tp * 1.4) * tOut, transform: `translateY(${(1 - tp) * 40}px)` }}>
          <div style={{ width: 90 * tp, height: 7, background: GOLD, borderRadius: 4, marginBottom: 14 }} />
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, lineHeight: 1, color: '#fff', textShadow: '0 6px 30px rgba(0,0,0,.7)' }}>{sc.title}</div>
          {sc.sub ? <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 36, color: 'rgba(255,255,255,.9)', marginTop: 12, textShadow: '0 4px 18px rgba(0,0,0,.8)' }}>{sc.sub}</div> : null}
        </div>
      ) : null}
      {(sc.tags ?? []).map(([txt, cw]: [string, string], j: number) => {
        const at = spokenAt(seg, cw ?? txt) ?? seg.start + 1 + j * 1.5; const p = pr(t, at, 0.5, eBack);
        if (t < at) return null;
        return <div key={j} style={{ position: 'absolute', right: 70, top: 150 + j * 82, transform: `scale(${p})`, transformOrigin: 'right center', opacity: tOut,
          fontFamily: BODY, fontWeight: 800, fontSize: 34, color: '#0B1220', background: GOLD, borderRadius: 14, padding: '10px 22px', boxShadow: '0 10px 30px rgba(0,0,0,.45)' }}>{txt}</div>;
      })}
      <div style={{ position: 'absolute', right: 28, bottom: 20, fontFamily: BODY, fontSize: 19, color: 'rgba(255,255,255,.72)', textShadow: '0 2px 6px rgba(0,0,0,.9)', opacity: pr(t, a + slot * k, 0.4, eOut) }}>
        Footage: {clips[k].credit}
      </div>
    </div>
  );
};
