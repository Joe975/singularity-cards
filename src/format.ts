// Small presentation helpers shared across components.

import { RESOURCE_META } from './game/config';
import type { CardType, ResourceKey, Resources } from './game/types';

export function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${r}`;
}

const LABEL = new Map(RESOURCE_META.map((m) => [m.key, m.label]));

export function resourceLabel(key: ResourceKey): string {
  return LABEL.get(key) ?? key;
}

// With only four resources, more is always better — a positive delta reads green.
export function isGoodDelta(_key: ResourceKey, value: number): boolean {
  return value > 0;
}

export interface DeltaEntry {
  key: ResourceKey;
  label: string;
  value: number;
}

export function deltaEntries(delta: Partial<Resources>): DeltaEntry[] {
  return (Object.entries(delta) as [ResourceKey, number][])
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ key: k, label: resourceLabel(k), value: v }));
}

// Background gradient used as placeholder card art, keyed by card type.
export const TYPE_GRADIENT: Record<CardType, string> = {
  infrastructure: 'linear-gradient(135deg, #1b3a5b, #2c6fa3)',
  research: 'linear-gradient(135deg, #4a1b5b, #a3417a)',
  policy: 'linear-gradient(135deg, #1b5b4a, #2c9f7a)',
  talent: 'linear-gradient(135deg, #3a1b5b, #6a3fb0)',
  market: 'linear-gradient(135deg, #5b4a1b, #b08a2c)',
  wildcard: 'linear-gradient(135deg, #5b1b2c, #b03a5a)',
};

export const TYPE_LABEL: Record<CardType, string> = {
  infrastructure: 'Infrastructure',
  research: 'Research',
  policy: 'Policy',
  talent: 'Talent',
  market: 'Market',
  wildcard: 'Wildcard',
};
