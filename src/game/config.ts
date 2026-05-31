// Tunable constants and presentation metadata for the game.

import type {
  EntityType,
  Modifiers,
  Phase,
  Rarity,
  Resources,
  ResourceKey,
  Strategy,
} from './types';

export const SAVE_VERSION = 3;

// The calendar starts here; ticks advance a variable number of days.
export const START_DATE = '2026-01-01';
export const HORIZON_DAYS = 365 * 60; // ~2086: used to reward reaching an aligned win early

export const SINGULARITY = 100; // capability needed to reach the singularity
export const SAFE_THRESHOLD = 55; // alignment needed for an aligned outcome

export const FORECAST_TICKS = 12;
export const TICK_BASE_DAYS = 30; // economic deltas are normalized to a 30-day tick

// 0-100 gauges (everything else is an open-ended stockpile).
export const GAUGE_RESOURCES: ResourceKey[] = ['capability', 'alignment'];

export const STARTING: Record<EntityType, Resources> = {
  company: { capital: 180, compute: 20, capability: 6, alignment: 50 },
  country: { capital: 230, compute: 14, capability: 4, alignment: 50 },
};

export const NEUTRAL_MODIFIERS: Modifiers = {
  computeCostMult: 1,
  capabilityMult: 1,
};

export interface ResourceMeta {
  key: ResourceKey;
  label: string;
  short: string;
  color: string;
  gauge: boolean;
}

export const RESOURCE_META: ResourceMeta[] = [
  { key: 'capital', label: 'Capital', short: 'CAP', color: '#5ad19a', gauge: false },
  { key: 'compute', label: 'Compute', short: 'CMP', color: '#5aa9e6', gauge: false },
  { key: 'capability', label: 'Capability', short: 'AI', color: '#e65a8c', gauge: true },
  { key: 'alignment', label: 'Alignment', short: 'ALN', color: '#5ae6d8', gauge: true },
];

export interface PhaseMeta {
  key: Phase;
  label: string;
  minCapability: number;
  tickDays: number;
  blurb: string;
}

// Ordered by capability threshold; ticks shorten as the curve steepens.
export const PHASES: PhaseMeta[] = [
  { key: 'narrow', label: 'Narrow AI', minCapability: 0, tickDays: 30, blurb: 'Tool AI. Months pass between moves.' },
  { key: 'rsi', label: 'Recursive Self-Improvement', minCapability: 25, tickDays: 14, blurb: 'AI improves AI. The clock speeds up.' },
  { key: 'agi', label: 'AGI', minCapability: 45, tickDays: 7, blurb: 'General intelligence. A week is a long time now.' },
  { key: 'asi', label: 'ASI Emergence', minCapability: 70, tickDays: 3, blurb: 'Superintelligence stirs. Days decide everything.' },
  { key: 'singularity', label: 'Singularity', minCapability: 92, tickDays: 1, blurb: 'The curve goes vertical.' },
];

export function phaseForCapability(capability: number): PhaseMeta {
  let current = PHASES[0];
  for (const p of PHASES) {
    if (capability >= p.minCapability) current = p;
  }
  return current;
}

export interface EntityMeta {
  key: EntityType;
  label: string;
  blurb: string;
}

export const ENTITY_META: EntityMeta[] = [
  {
    key: 'company',
    label: 'Frontier Lab',
    blurb: 'A private AI company. Deep compute, scrappy capital. You move fast.',
  },
  {
    key: 'country',
    label: 'Nation State',
    blurb: 'A sovereign power. A deep treasury, but slower to turn money into capability.',
  },
];

export interface StrategyMeta {
  key: Strategy;
  label: string;
  blurb: string;
}

export const STRATEGY_META: StrategyMeta[] = [
  { key: 'race', label: 'Race', blurb: 'All-out capability. Fast progress, but alignment slips and capital burns.' },
  { key: 'safety', label: 'Safety', blurb: 'Invest in alignment and control. Slower capability, steadier hand.' },
  { key: 'profit', label: 'Profit', blurb: 'Commercialize. Capital compounds; capability ticks along quietly.' },
  { key: 'diplomacy', label: 'Diplomacy', blurb: 'A measured pace. Modest income and a little alignment each tick.' },
];

export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 0.62,
  uncommon: 0.28,
  rare: 0.1,
};

export const RARITY_SCALE: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.55,
  rare: 2.3,
};
