// Renders an icon from the digital library: "fluent-emoji-flat:<name>" (colour emoji), "lucide:<name>" (line icons),
// "circle-flags:<iso2>" (round flags). pipeline/prepare.py copies only the icons a script uses into src/data/icons.json.
import React from 'react';
import ICONS from '../data/icons.json';

const LIB = ICONS as Record<string, string>;
export const isIcon = (s?: string) => !!s && /^(fluent-emoji-flat|circle-flags|lucide):/.test(s);
export const Icon: React.FC<{ name: string; size: number; color?: string; style?: React.CSSProperties }> = ({ name, size, color, style }) =>
  LIB[name] ? <div style={{ width: size, height: size, color: color ?? '#fff', flexShrink: 0, ...style }} dangerouslySetInnerHTML={{ __html: LIB[name] }} /> : null;
