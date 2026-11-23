// Six universal elemental types. Every topic maps its concepts onto these.
// Each type is strong against exactly one other and weak to exactly one other (a cycle),
// so the chart is easy to learn: Logic > Cipher > Spark > Data > Structure > Flux > Logic
export const TYPES = {
  logic:     { name: 'Logic',     color: '#4aa8ff', icon: '◆', desc: 'Reasoning, algorithms, rules' },
  cipher:    { name: 'Cipher',    color: '#b36bff', icon: '✦', desc: 'Security, secrets, abstraction' },
  spark:     { name: 'Spark',     color: '#ffd23f', icon: 'ϟ', desc: 'Energy, speed, signals' },
  data:      { name: 'Data',      color: '#3ddc84', icon: '●', desc: 'Information, storage, life' },
  structure: { name: 'Structure', color: '#c98b52', icon: '■', desc: 'Architecture, matter, foundations' },
  flux:      { name: 'Flux',      color: '#ff6a3d', icon: '▲', desc: 'Change, flow, heat, motion' },
  normal:    { name: 'Focus',     color: '#cfcfd8', icon: '○', desc: 'Neutral' },
};
export const TYPE_KEYS = ['logic', 'cipher', 'spark', 'data', 'structure', 'flux'];
const BEATS = { logic: 'cipher', cipher: 'spark', spark: 'data', data: 'structure', structure: 'flux', flux: 'logic' };
export function effectiveness(atk, def) {
  if (!atk || atk === 'normal' || !def) return 1;
  if (BEATS[atk] === def) return 2;
  if (BEATS[def] === atk) return 0.5;
  return 1;
}
export const beats = (t) => BEATS[t];
export const weakTo = (t) => Object.keys(BEATS).find((k) => BEATS[k] === t);
