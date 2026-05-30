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
    cost: { capital: -55, energy: -12 },
    effects: { compute: 30, capability: 3 },
    requires: { capital: 40 },
    entityBias: { company: 1.3 },
  },
  {
    key: 'power-deal',
    type: 'infrastructure',
    titles: ['Sign a Power Purchase Deal', 'Commission a Reactor Tap', 'Grid Expansion'],
    flavors: [
      'A long-term energy contract locks in cheap power.',
      'You wire a new substation into the campus.',
      'Surplus baseload is yours for a decade.',
    ],
    phases: ALL,
    tags: ['strat:profit', 'strat:diplomacy'],
    cost: { capital: -40 },
    effects: { energy: 45 },
    entityBias: { country: 1.4 },
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
    cost: { compute: -25, energy: -18, capital: -20 },
    effects: { capability: 12, tension: 5, autonomy: 2 },
    requires: { compute: 25 },
  },
  {
    key: 'research-program',
    type: 'research',
    titles: ['Fund a Research Program', 'Open a Frontier Lab', 'Blue-Sky Grant'],
    flavors: [
      'Curiosity-driven work seeds future breakthroughs.',
      'A generous grant unlocks new directions.',
      'The whiteboards fill with possibility.',
    ],
    phases: ALL,
    tags: ['strat:safety', 'strat:profit', 'strat:diplomacy'],
    cost: { capital: -35, talent: -5 },
    effects: { research: 22, capability: 2 },
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
    cost: { capital: -35, talent: -8 },
    effects: { alignment: 10, research: 8 },
    entityBias: { company: 1.1 },
  },
  {
    key: 'safety-recurring',
    type: 'research',
    titles: ['Standing Safety Team', 'Alignment Retainer', 'Permanent Eval Pipeline'],
    flavors: [
      'A dedicated team keeps watch every tick.',
      'Continuous evaluation becomes routine.',
      'Safety is no longer a one-off project.',
    ],
    phases: ['rsi', 'agi', 'asi'],
    tags: ['strat:safety'],
    cost: { capital: -60, talent: -10 },
    effects: { alignment: 4 },
    duration: 5,
    recurring: { alignment: 4, capital: -8 },
  },
  {
    key: 'poach-talent',
    type: 'talent',
    titles: ['Poach Star Researchers', 'Acqui-hire a Startup', 'Open a Research Hub'],
    flavors: [
      'A bidding war ends in your favor.',
      'A whole team signs on overnight.',
      'Brilliant minds relocate to your campus.',
    ],
    phases: ['narrow', 'rsi', 'agi'],
    tags: ['strat:race', 'strat:profit'],
    cost: { capital: -45 },
    effects: { talent: 18, research: 5 },
    entityBias: { company: 1.3 },
  },
  {
    key: 'university-pipeline',
    type: 'talent',
    titles: ['National Talent Pipeline', 'Fund University Chairs', 'Visa Fast-Track'],
    flavors: [
      'A generation of researchers is cultivated at home.',
      'Immigration reform brings the best minds to you.',
      'Scholarships seed the next decade of work.',
    ],
    phases: ['narrow', 'rsi', 'agi'],
    tags: ['strat:diplomacy'],
    cost: { capital: -30, influence: -3 },
    effects: { talent: 12 },
    duration: 4,
    recurring: { talent: 4 },
    entityBias: { country: 1.6 },
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
    tags: ['strat:profit'],
    cost: { compute: -12, talent: -6 },
    effects: { capital: 70, influence: 4 },
    requires: { compute: 12 },
    entityBias: { company: 1.4 },
  },
  {
    key: 'subsidy',
    type: 'market',
    titles: ['Secure State Subsidies', 'Sovereign Investment', 'Strategic War Chest'],
    flavors: [
      'A funding package clears the legislature.',
      'The treasury opens for a strategic priority.',
      'Capital arrives with strings — and ambition.',
    ],
    phases: ['narrow', 'rsi', 'agi'],
    tags: ['strat:profit', 'strat:diplomacy'],
    cost: { influence: -6 },
    effects: { capital: 90, openness: -3 },
    entityBias: { country: 1.7 },
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
    cost: { capital: -20, influence: -5 },
    effects: { alignment: 8, influence: 6, tension: -6 },
    entityBias: { country: 1.5 },
  },
  {
    key: 'global-summit',
    type: 'policy',
    titles: ['Convene a Global Summit', 'De-escalation Talks', 'Coalition of the Willing'],
    flavors: [
      'Rivals sit at one table and, briefly, agree.',
      'Back-channel diplomacy cools a crisis.',
      'A shared framework lowers the temperature.',
    ],
    phases: ALL,
    tags: ['strat:diplomacy'],
    cost: { capital: -25 },
    effects: { tension: -12, influence: 8, openness: 4 },
    entityBias: { country: 1.4 },
  },
  {
    key: 'pr-campaign',
    type: 'policy',
    titles: ['Public Trust Campaign', 'Transparency Pledge', 'Open Model Cards'],
    flavors: [
      'You make your case to the public — and they listen.',
      'Candor buys goodwill.',
      'Trust ticks upward as you show your work.',
    ],
    phases: ALL,
    tags: ['strat:diplomacy'],
    cost: { capital: -25 },
    effects: { influence: 14, openness: 4 },
  },
  {
    key: 'algo-breakthrough',
    type: 'wildcard',
    titles: ['Algorithmic Breakthrough', 'Efficiency Leap', 'A Clever New Architecture'],
    flavors: [
      'A small team finds 10x more from the same silicon.',
      'A new training trick rewrites the scaling laws.',
      'Yesterday’s impossible run is now cheap.',
    ],
    phases: ['rsi', 'agi', 'asi'],
    tags: ['strat:race', 'strat:safety', 'strat:profit', 'strat:diplomacy'],
    cost: { talent: -10 },
    effects: { capability: 9, compute: 10, research: 6 },
    requires: { talent: 15 },
  },
  {
    key: 'open-weights',
    type: 'wildcard',
    titles: ['Release Open Weights', 'Open-Source the Stack', 'Publish Everything'],
    flavors: [
      'The community builds on your work — fame and risk both rise.',
      'Goodwill soars; so does proliferation.',
      'You hand the world a gift with sharp edges.',
    ],
    phases: ['rsi', 'agi', 'asi'],
    tags: ['strat:diplomacy', 'strat:race'],
    cost: { capability: -3 },
    effects: { influence: 18, openness: 6, alignment: -4, autonomy: 5 },
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
    cost: { capital: -140, energy: -40 },
    effects: { compute: 90, capability: 6, tension: 4 },
    requires: { capital: 120, energy: 40 },
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
