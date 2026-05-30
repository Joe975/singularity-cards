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

export type TechCategory =
  | 'ai'
  | 'robotics'
  | 'biology'
  | 'longevity'
  | 'energy'
  | 'materials'
  | 'quantum'
  | 'space'
  | 'exotic'
  | 'governance';

export interface Resources {
  capital: number; // money to spend (may go negative => collapse)
  compute: number; // FLOP capacity
  energy: number; // power capacity to run compute
  talent: number; // researchers / engineers
  research: number; // accumulated research points (spent on the tech tree)
  alignment: number; // safety / control progress (0-100)
  capability: number; // your AI progress toward singularity (0-100)
  influence: number; // public trust / political capital (0-100)
  tension: number; // geopolitical / existential tension (0-100) -> war
  autonomy: number; // how independent AI is of human control (0-100)
  openness: number; // free & open (high) vs authoritarian (low) (0-100)
}

export type ResourceKey = keyof Resources;

// Multiplicative world modifiers altered by events and techs (1 = neutral).
export interface Modifiers {
  computeCostMult: number; // memory/hardware shocks raise this
  energyCostMult: number;
  marketMult: number; // capital generation multiplier
  capabilityMult: number; // research-speed multiplier
  researchMult: number; // research-point generation multiplier
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

export interface Tech {
  id: string;
  name: string;
  category: TechCategory;
  tier: number; // 1 (near-term) .. 5 (far future)
  cost: number; // research points required
  prereqs: string[]; // tech ids that must be unlocked first
  requiresCapability?: number; // minimum capability to be researchable
  flavor: string;
  onUnlock?: Partial<Resources>; // one-time deltas
  perTick?: Partial<Resources>; // permanent per-tick deltas (scaled by tick length)
  modifiers?: Partial<Modifiers>; // permanent multipliers applied once
  relinquish?: boolean; // governance: enacts a global pause
}

export interface LogEntry {
  day: number;
  kind: 'event' | 'card' | 'tech' | 'system';
  text: string;
}

export type GamePhase = 'newgame' | 'playing' | 'ended';

export type Outcome =
  | 'asi-utopia'
  | 'asi-dystopia'
  | 'asi-rogue'
  | 'nuclear-war'
  | 'human-utopia'
  | 'human-dystopia'
  | 'outpaced'
  | 'collapse'
  | null;

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
  techs: string[]; // unlocked tech ids
  relinquished: boolean; // a global pause has been enacted
  offer: Card[]; // the current 3-card choice
  log: LogEntry[];
  phase: GamePhase;
  outcome: Outcome;
  score: number;
}
