// Templated + procedural card generation. A hand-authored library of archetypes
// is combined with randomized magnitudes (scaled by rarity) and weighted draws.

import { RARITY_SCALE, RARITY_WEIGHT, phaseForCapability } from './config';
import type { Rng } from './rng';
import type {
  Card,
  CardType,
  GameState,
  Phase,
  Rarity,
  Resources,
  Strategy,
} from './types';

interface CardTemplate {
  key: string;
  type: CardType;
  titles: string[];
  flavors: string[];
  phases: Phase[];
  tags: string[]; // includes strategy affinities, e.g. 'strat:race'
  cost: Partial<Resources>; // base magnitudes (per common card)
  effects: Partial<Resources>;
  duration?: number;
  recurring?: Partial<Resources>;
  requires?: Partial<Resources>;
  entityBias?: { company?: number; country?: number };
}

const ALL: Phase[] = ['narrow', 'rsi', 'agi', 'asi', 'singularity'];

// Base magnitudes are tuned for a "common" card; rarity scales them up.
const TEMPLATES: CardTemplate[] = [
  {
    key: 'gpu-cluster',
    type: 'infrastructure',
    titles: ['Spin Up a GPU Cluster', 'Procure Accelerators', 'Datacenter Wing'],
    flavors: [
      'Procurement secures a shipment of accelerators.',
      'Racks hum to life in a converted warehouse.',
      'A new training hall comes online ahead of schedule.',
    ],
    phases: ['narrow', 'rsi', 'agi'],
    tags: ['strat:race', 'strat:profit'],
    cost: { capital: -45 },
    effects: { compute: 28, capability: 1 },
    requires: { capital: 35 },
    entityBias: { company: 1.3 },
  },
  {
    key: 'compute-megaproject',
    type: 'infrastructure',
    titles: ['Compute Megaproject', 'Gigawatt Cluster', 'The Big Build'],
    flavors: [
      'A facility visible from orbit comes online.',
      'You commit to the largest training system ever built.',
      'Concrete, copper, and silicon at unprecedented scale.',
    ],
    phases: ['asi', 'singularity'],
    tags: ['strat:race', 'strat:profit'],
    cost: { capital: -130 },
    effects: { compute: 80, capability: 3 },
    requires: { capital: 110 },
  },
  {
    key: 'frontier-train',
    type: 'research',
    titles: ['Train a Frontier Model', 'Scale the Next Run', 'Push the Frontier'],
    flavors: [
      'Weeks of training crystallize into a new state of the art.',
      'The loss curve bends further than anyone predicted.',
      'Evals light up green across the board.',
    ],
    phases: ['narrow', 'rsi', 'agi', 'asi'],
    tags: ['strat:race'],
    cost: { compute: -22, capital: -10 },
    effects: { capability: 6, alignment: -3 },
    requires: { compute: 22 },
  },
  {
    key: 'efficiency-research',
    type: 'research',
    titles: ['Efficiency Research', 'Kernel Optimization', 'Squeeze the Stack'],
    flavors: [
      'The same silicon now does far more work.',
      'A new training trick rewrites your scaling laws.',
      'Yesterday’s impossible run is now cheap.',
    ],
    phases: ['narrow', 'rsi', 'agi', 'asi'],
    tags: ['strat:profit', 'strat:safety'],
    cost: { capital: -30 },
    effects: { compute: 14, capability: 2 },
  },
  {
    key: 'interp-lab',
    type: 'research',
    titles: ['Fund an Interpretability Lab', 'Mechanistic Audit', 'Red-Team the Model'],
    flavors: [
      'Researchers crack open the network and map its circuits.',
      'A control protocol survives adversarial pressure.',
      'You learn what the model is actually doing.',
    ],
    phases: ALL,
    tags: ['strat:safety'],
    cost: { capital: -35 },
    effects: { alignment: 12 },
    entityBias: { company: 1.1 },
  },
  {
    key: 'safety-recurring',
    type: 'policy',
    titles: ['Standing Safety Team', 'Alignment Retainer', 'Permanent Eval Pipeline'],
    flavors: [
      'A dedicated team keeps watch every tick.',
      'Continuous evaluation becomes routine.',
      'Safety is no longer a one-off project.',
    ],
    phases: ['rsi', 'agi', 'asi'],
    tags: ['strat:safety'],
    cost: { capital: -55 },
    effects: { alignment: 4 },
    duration: 5,
    recurring: { alignment: 4, capital: -8 },
  },
  {
    key: 'safety-regulation',
    type: 'policy',
    titles: ['Champion Safety Regulation', 'Draft an AI Treaty', 'Mandate Eval Standards'],
    flavors: [
      'New rules slow everyone down — including rivals.',
      'A framework for accountable deployment takes hold.',
      'The world agrees on guardrails, for now.',
    ],
    phases: ['rsi', 'agi', 'asi'],
    tags: ['strat:safety', 'strat:diplomacy'],
    cost: { capital: -20 },
    effects: { alignment: 9, capability: -1 },
    entityBias: { country: 1.4 },
  },
  {
    key: 'commercial-launch',
    type: 'market',
    titles: ['Launch a Product', 'Open the API', 'Enterprise Rollout'],
    flavors: [
      'Revenue starts flowing from day one.',
      'Developers flock to your platform.',
      'Enterprise contracts stack up.',
    ],
    phases: ALL,
    tags: ['strat:profit', 'strat:race'],
    cost: { compute: -10 },
    effects: { capital: 85 },
    requires: { compute: 10 },
    entityBias: { company: 1.4 },
  },
  {
    key: 'war-chest',
    type: 'market',
    titles: ['Secure State Subsidies', 'Sovereign Investment', 'Strategic War Chest'],
    flavors: [
      'A funding package clears the legislature.',
      'The treasury opens for a strategic priority.',
      'Capital arrives with strings — and ambition.',
    ],
    phases: ['narrow', 'rsi', 'agi'],
    tags: ['strat:profit', 'strat:diplomacy', 'strat:safety'],
    cost: {},
    effects: { capital: 100, alignment: -2 },
    entityBias: { country: 1.7 },
  },
  {
    key: 'alignment-grant',
    type: 'policy',
    titles: ['Alignment Grand Challenge', 'Fund Oversight Research', 'Control Protocol Prize'],
    flavors: [
      'A coordinated push makes oversight meaningfully easier.',
      'Money flows to the unglamorous work of control.',
      'The hard problem gets a little less hard.',
    ],
    phases: ALL,
    tags: ['strat:safety', 'strat:diplomacy'],
    cost: { capital: -25 },
    effects: { alignment: 10 },
  },
  {
    key: 'algo-breakthrough',
    type: 'wildcard',
    titles: ['Algorithmic Breakthrough', 'A Clever New Architecture', 'Scaling Insight'],
    flavors: [
      'A small team finds 10x more from the same silicon.',
      'A new idea bends the curve in your favor.',
      'The whole field quietly shifts overnight.',
    ],
    phases: ['rsi', 'agi', 'asi'],
    tags: ['strat:race', 'strat:safety', 'strat:profit', 'strat:diplomacy'],
    cost: {},
    effects: { capability: 5, compute: 10 },
    requires: { compute: 15 },
  },
  {
    key: 'crash-program',
    type: 'wildcard',
    titles: ['Crash Program', 'All-Nighter Sprint', 'Ship It Now'],
    flavors: [
      'You throw everything at the run and pray.',
      'Caution is for later; capability is now.',
      'A reckless push that just might pay off.',
    ],
    phases: ['agi', 'asi', 'singularity'],
    tags: ['strat:race'],
    cost: { capital: -30, compute: -20 },
    effects: { capability: 8, alignment: -6 },
    requires: { compute: 20, capital: 30 },
  },
];

function rollRarity(rng: Rng): Rarity {
  return rng.weighted(
    ['common', 'uncommon', 'rare'] as Rarity[],
    [RARITY_WEIGHT.common, RARITY_WEIGHT.uncommon, RARITY_WEIGHT.rare],
  );
}

function scaleDeltas(
  base: Partial<Resources> | undefined,
  scale: number,
  rng: Rng,
): Partial<Resources> {
  const out: Partial<Resources> = {};
  if (!base) return out;
  for (const [k, v] of Object.entries(base) as [keyof Resources, number][]) {
    const jitter = rng.range(0.85, 1.15);
    out[k] = Math.round(v * scale * jitter);
  }
  return out;
}

function templateWeight(
  t: CardTemplate,
  phase: Phase,
  strategy: Strategy,
  entity: 'company' | 'country',
): number {
  if (!t.phases.includes(phase)) return 0;
  let w = 1;
  if (t.tags.includes(`strat:${strategy}`)) w *= 2.4;
  const bias = t.entityBias?.[entity];
  if (bias) w *= bias;
  return w;
}

function makeCard(t: CardTemplate, rng: Rng): Card {
  const rarity = rollRarity(rng);
  const scale = RARITY_SCALE[rarity];
  const requires = scaleDeltas(t.requires, 1 + (scale - 1) * 0.5, rng);
  return {
    id: `${t.key}-${rng.int(1_000_000)}`,
    templateKey: t.key,
    title: rng.pick(t.titles),
    type: t.type,
    rarity,
    flavor: rng.pick(t.flavors),
    cost: scaleDeltas(t.cost, scale, rng),
    effects: scaleDeltas(t.effects, scale, rng),
    duration: t.duration ?? 0,
    recurring: t.duration ? scaleDeltas(t.recurring, scale, rng) : undefined,
    requires: Object.keys(requires).length ? requires : undefined,
    tags: t.tags,
  };
}

// Draw `count` distinct-template cards weighted by phase / strategy / entity.
export function drawOffer(state: GameState, rng: Rng, count = 3): Card[] {
  const phase = phaseForCapability(state.resources.capability).key;
  const chosen: Card[] = [];
  const usedKeys = new Set<string>();
  let guard = 0;
  while (chosen.length < count && guard < 200) {
    guard++;
    const candidates = TEMPLATES.filter(
      (t) => !usedKeys.has(t.key) && templateWeight(t, phase, state.strategy, state.entity) > 0,
    );
    if (candidates.length === 0) break;
    const weights = candidates.map((t) =>
      templateWeight(t, phase, state.strategy, state.entity),
    );
    const t = rng.weighted(candidates, weights);
    usedKeys.add(t.key);
    chosen.push(makeCard(t, rng));
  }
  return chosen;
}

// Can the player currently afford / meet the requirements of this card?
export function canPlay(card: Card, r: Resources): boolean {
  if (card.requires) {
    for (const [k, v] of Object.entries(card.requires) as [keyof Resources, number][]) {
      if (r[k] < v) return false;
    }
  }
  for (const [k, v] of Object.entries(card.cost) as [keyof Resources, number][]) {
    if (v < 0 && r[k] + v < 0 && k !== 'capital') return false;
  }
  return true;
}
