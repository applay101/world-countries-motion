// Renders an icon from the digital library: "fluent-emoji-flat:<name>" (colour emoji), "lucide:<name>" (line icons),
// "circle-flags:<iso2>" (round flags). pipeline/prepare.py copies only the icons a script uses into src/data/icons.json.
import React from 'react';
import ICONS from '../data/icons.json';

const LIB = ICONS as Record<string, string>;
export const isIcon = (s?: string) => !!s && /^(fluent-emoji-flat|circle-flags|lucide):/.test(s);
export const Icon: React.FC<{ name: string; size: number; color?: string; style?: React.CSSProperties }> = ({ name, size, color, style }) =>
  LIB[name] ? <div style={{ width: size, height: size, color: color ?? '#fff', flexShrink: 0, ...style }} dangerouslySetInnerHTML={{ __html: LIB[name] }} /> : null;

// the same icon inside an SVG (maps): centred at x,y
export const SvgIcon: React.FC<{ name: string; x: number; y: number; size: number; opacity?: number; rotate?: number }> = ({ name, x, y, size, opacity = 1, rotate = 0 }) => {
  const src = LIB[name]; if (!src) return null;
  const inner = src.replace('<svg ', `<svg x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" `).replace(/ width="100%" height="100%"/, '');
  return <g transform={`translate(${x},${y}) rotate(${rotate})`} opacity={opacity} dangerouslySetInnerHTML={{ __html: inner }} />;
};
