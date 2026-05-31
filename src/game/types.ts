// Core domain types for the singularity card game.

export type EntityType = 'country' | 'company';
export type Strategy = 'race' | 'safety' | 'profit' | 'diplomacy';

// The arc of the game: each phase ticks faster than the last.
export type Phase = 'narrow' | 'rsi' | 'agi' | 'asi' | 'singularity';

export type CardType =
  | 'infrastructure'
  | 'research'
  | 'policy'
  | 'talent'
  | 'market'
  | 'wildcard';
export type Rarity = 'common' | 'uncommon' | 'rare';

// Four resources only: two spendable stockpiles and two 0-100 gauges.
export interface Resources {
  capital: number; // money to spend (may go negative => collapse)
  compute: number; // FLOP capacity; drives capability gain
  capability: number; // your AI progress toward singularity (0-100)
  alignment: number; // safety / control progress (0-100)
}

export type ResourceKey = keyof Resources;

// Multiplicative world modifiers altered by events (1 = neutral).
export interface Modifiers {
  computeCostMult: number; // hardware/energy shocks raise the cost of running compute
  capabilityMult: number; // research-speed multiplier
}

export type ModifierKey = keyof Modifiers;

export interface RecurringEffect {
  label: string;
  effects: Partial<Resources>;
  remaining: number; // ticks left
}

export interface Card {
  id: string;
  templateKey: string;
  title: string;
  type: CardType;
  rarity: Rarity;
  flavor: string;
  cost: Partial<Resources>; // immediate deltas (usually negative)
  effects: Partial<Resources>; // immediate deltas (usually positive)
  duration: number; // >0 => recurring effect applied for N ticks
  recurring?: Partial<Resources>; // per-tick effect when duration > 0
  requires?: Partial<Resources>; // minimum resources to be playable
  tags: string[]; // affinity tags for draw weighting
}

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  severity: 'good' | 'neutral' | 'bad';
  effects?: Partial<Resources>;
  modifiers?: Partial<Modifiers>; // multiplied into current modifiers
}

export interface LogEntry {
  day: number;
  kind: 'event' | 'card' | 'system';
  text: string;
}

export type GamePhase = 'newgame' | 'playing' | 'ended';

export type Outcome = 'aligned' | 'misaligned' | 'collapse' | 'outpaced' | null;

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  day: number; // days elapsed since 2026-01-01
  entity: EntityType;
  strategy: Strategy;
  resources: Resources;
  modifiers: Modifiers;
  globalCapability: number; // rival "world" clock toward singularity (0-100)
  recurring: RecurringEffect[];
  firedEvents: string[]; // one-shot events already triggered
  offer: Card[]; // the current 3-card choice
  log: LogEntry[];
  phase: GamePhase;
  outcome: Outcome;
  score: number;
}
