declare module 'flubber' {
  export function interpolate(a: string, b: string, o?: { maxSegmentLength?: number; string?: boolean }): (t: number) => string;
}
