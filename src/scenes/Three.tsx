// Three.js layers: textured Earth globe for the intro, and a waving cloth flag.
import React, { useEffect, useMemo, useState } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { EP, W, H, cl, lerp, eExpoIO, eOut } from '../lib/core';

const TEX: Record<string, THREE.Texture> = {};
export const usePreload = (srcs: string[]) => {
  const [h] = useState(() => delayRender('textures'));
  const [ready, setReady] = useState(() => srcs.every((s) => TEX[s]));
  useEffect(() => {
    Promise.all(srcs.map((s) => new Promise<void>((res) => {
      if (TEX[s]) return res();
      new THREE.TextureLoader().load(staticFile(s), (tx) => { tx.anisotropy = 8; tx.colorSpace = s === 'flag.png' ? THREE.NoColorSpace : THREE.SRGBColorSpace; TEX[s] = tx; res(); }, undefined, () => res());
    }))).then(() => { setReady(true); continueRender(h); });
  }, [h]);
  return ready;
};

// ---------- globe ----------
const atmoVS = `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const atmoFS = `varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.35,0.65,1.0,1.0) * i * 1.6; }`;
const Stars: React.FC = () => {
  const g = useMemo(() => {
    const n = 1400, p = new Float32Array(n * 3); let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) { const th = r() * 6.283, ph = Math.acos(2 * r() - 1), R = 40; p[i * 3] = R * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = R * Math.cos(ph); p[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); return geo;
  }, []);
  return <points geometry={g}><pointsMaterial color="#cfe2ff" size={0.09} sizeAttenuation transparent opacity={0.8} /></points>;
};

// lon/lat -> rotation that brings the point to face the camera (+z)
const faceRot = (lon: number, lat: number) => ({ y: -((lon + 90) * Math.PI) / 180, x: (lat * Math.PI) / 180 });

export const Globe: React.FC<{ t: number; t0: number; t1: number }> = ({ t, t0, t1 }) => {
  const tex = TEX['bm.jpg'];
  const p = eExpoIO(cl((t - t0) / (t1 - t0)));
  const lon = lerp(EP.country.lon + 95, EP.country.lon, p), lat = lerp(8, EP.country.lat, p);
  const r = faceRot(lon, lat);
  const dist = lerp(4.6, 2.05, eExpoIO(cl((t - t0 - (t1 - t0) * 0.35) / ((t1 - t0) * 0.65))));
  const atmo = useMemo(() => new THREE.ShaderMaterial({ vertexShader: atmoVS, fragmentShader: atmoFS, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true }), []);
  return (
    <ThreeCanvas width={W} height={H} camera={{ fov: 35, position: [0, 0, dist] }} gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={['#02050c']} />
      <Stars />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3, 2, 4]} intensity={2.6} />
      <group rotation={[r.x, r.y, 0]}>
        <mesh>
          <sphereGeometry args={[1, 128, 128]} />
          <meshStandardMaterial map={tex ?? null} roughness={0.85} metalness={0} />
        </mesh>
      </group>
      <mesh scale={1.12} material={atmo}><sphereGeometry args={[1, 64, 64]} /></mesh>
    </ThreeCanvas>
  );
};

// ---------- waving flag ----------
const flagVS = `
uniform float uTime; uniform float uAmp; varying vec2 vUv; varying float vShade;
void main(){
  vUv = uv; vec3 p = position; float k = uv.x;
  float a1 = p.x*2.0 - uTime*4.6 + p.y*0.7, a2 = p.x*4.1 - uTime*7.1 - p.y*1.2;
  p.z += (sin(a1)*0.16 + sin(a2)*0.05) * (0.25 + k) * uAmp;
  vShade = (cos(a1)*2.0*0.16 + cos(a2)*4.1*0.05) * (0.25 + k) * uAmp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const flagFS = `
uniform sampler2D uMap; uniform float uOpacity; varying vec2 vUv; varying float vShade;
void main(){
  vec4 c = texture2D(uMap, vUv);
  if (c.a < 0.04) discard; // non-rectangular flags (Nepal): keep the transparent parts see-through
  float l = clamp(0.92 + 0.4*vShade, 0.55, 1.3);
  gl_FragColor = vec4(c.rgb * l + vec3(1.0,0.96,0.88) * pow(max(vShade,0.0),2.0) * 0.16, uOpacity * c.a);
}`;
const FlagMesh: React.FC<{ t: number; amp: number }> = ({ t, amp }) => {
  const tex = TEX['flag.png'];
  const geo = useMemo(() => new THREE.PlaneGeometry(3.2, 2.4, 80, 60), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: flagVS, fragmentShader: flagFS, side: THREE.DoubleSide, transparent: true,
    uniforms: { uTime: { value: 0 }, uAmp: { value: 1 }, uMap: { value: null }, uOpacity: { value: 1 } } }), []);
  mat.uniforms.uTime.value = t; mat.uniforms.uAmp.value = amp; mat.uniforms.uMap.value = tex ?? null;
  return <mesh geometry={geo} material={mat} rotation={[0.05, -0.28, 0.02]} />;
};
export const FlagWave: React.FC<{ t: number; w: number; h: number; amp?: number }> = ({ t, w, h, amp = 1 }) => (
  <ThreeCanvas width={w} height={h} camera={{ fov: 30, position: [0, 0, 5.0] }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
    <FlagMesh t={t} amp={amp} />
  </ThreeCanvas>
);
export { eOut };

// ---------- gold dust + burst particles ----------
const dustVS = `
attribute vec3 aSeed; uniform float uTime; uniform float uBurst; uniform float uPx;
varying float vA;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uTime*(0.25 + aSeed.x*0.5) + 14.0, 28.0) - 14.0;
  p.x += sin(uTime*0.6 + aSeed.y*6.28)*0.4;
  // burst: fly outward from center
  vec3 dir = normalize(vec3(aSeed.y-0.5, aSeed.z-0.5, (aSeed.x-0.5)*0.6) + 1e-4);
  float bt = max(uBurst, 0.0);
  vec3 bp = dir * (bt * (6.0 + aSeed.z*14.0)) * (1.0 - 0.25*bt) + vec3(0.0, -bt*bt*1.5, 0.0);
  p = mix(p, bp, step(0.0001, uBurst) * step(aSeed.x, 0.55));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (2.0 + aSeed.z*7.0) * uPx / -mv.z;
  vA = (0.35 + 0.65*aSeed.y) * (0.6 + 0.4*sin(uTime*3.0 + aSeed.z*20.0));
  gl_Position = projectionMatrix * mv;
}`;
const dustFS = `
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d); a = a*a;
  gl_FragColor = vec4(uColor * (1.0 + a), a * vA * uOpacity);
}`;

const Dust: React.FC<{ t: number; burst: number; opacity: number }> = ({ t, burst, opacity }) => {
  const geo = useMemo(() => {
    const n = 420, pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
    let s = 1234567;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r() - 0.5) * 30; pos[i * 3 + 1] = (r() - 0.5) * 28; pos[i * 3 + 2] = (r() - 0.6) * 8;
      seed[i * 3] = r(); seed[i * 3 + 1] = r(); seed[i * 3 + 2] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: dustVS, fragmentShader: dustFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uBurst: { value: 0 }, uPx: { value: 28 }, uColor: { value: new THREE.Color('#ffc24a') }, uOpacity: { value: 1 } },
  }), []);
  mat.uniforms.uTime.value = t; mat.uniforms.uBurst.value = burst; mat.uniforms.uOpacity.value = opacity;
  return <points geometry={geo} material={mat} />;
};

export const DustLayer: React.FC<{ t: number; burstAt: number }> = ({ t, burstAt }) => {
  const burst = t > burstAt ? Math.min(1.6, (t - burstAt) / 1.6) : 0;
  const op = Math.min(1, t / 1.0) * (t > burstAt ? 1.2 : 0.32);
  const w = 960, h = 540;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: 'scale(2)', transformOrigin: '0 0', pointerEvents: 'none' }}>
      <ThreeCanvas width={w} height={h} camera={{ fov: 60, position: [0, 0, 12] }} gl={{ antialias: false, alpha: true, preserveDrawingBuffer: true }}>
        <Dust t={t} burst={burst} opacity={op} />
      </ThreeCanvas>
    </div>
  );
};
