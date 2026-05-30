// The tick engine: accelerating phases, strategy passive deltas, tech effects,
// world events, and the branching win/lose resolution.

import {
  GAUGE_RESOURCES,
  HORIZON_DAYS,
  NEUTRAL_MODIFIERS,
  OPEN_THRESHOLD,
  SAFE_THRESHOLD,
  SAVE_VERSION,
  SINGULARITY,
  STARTING,
  TICK_BASE_DAYS,
  phaseForCapability,
} from './config';
import { canPlay, drawOffer } from './cards';
import { applyModifiers, isOneShot, rollEvent } from './events';
import { techById, techStatus, unlockedTechs } from './techtree';
import { Rng } from './rng';
import type {
  EntityType,
  GameState,
  Modifiers,
  Outcome,
  Resources,
  Strategy,
} from './types';

const STOCKPILES: (keyof Resources)[] = ['compute', 'energy', 'talent', 'research'];

function clampResources(r: Resources): Resources {
  const out = { ...r };
  for (const k of GAUGE_RESOURCES) {
    out[k] = Math.max(0, Math.min(100, Math.round(out[k])));
  }
  for (const k of STOCKPILES) {
    out[k] = Math.max(0, Math.round(out[k]));
  }
  out.capital = Math.round(out.capital); // capital may go negative => collapse
  return out;
}

function addDeltas(r: Resources, delta: Partial<Resources>): Resources {
  const out = { ...r };
  for (const [k, v] of Object.entries(delta) as [keyof Resources, number][]) {
    out[k] = out[k] + v;
  }
  return out;
}

// Effective compute is throttled by available energy capacity.
function effectiveCompute(r: Resources): number {
  return Math.min(r.compute, r.energy);
}

const CAP_COEFF: Record<Strategy, number> = {
  race: 0.1,
  safety: 0.04,
  profit: 0.05,
  diplomacy: 0.05,
};

// Monthly-equivalent passive change, then scaled to the current tick length.
export function passiveDeltas(state: GameState): Partial<Resources> {
  const r = state.resources;
  const m = state.modifiers;
  const phase = phaseForCapability(r.capability);
  const factor = phase.tickDays / TICK_BASE_DAYS;
  const eff = effectiveCompute(r);

  const base: Partial<Record<keyof Resources, number>> = {};
  const add = (k: keyof Resources, v: number) => {
    base[k] = (base[k] ?? 0) + v;
  };

  const capabilityGain =
    eff * CAP_COEFF[state.strategy] * m.capabilityMult * (1 + r.capability / 200);
  add('capability', capabilityGain);
  add('research', (r.talent * 0.5 + eff * 0.2) * m.researchMult);
  add('capital', -eff * 0.1 * m.computeCostMult); // running cost of live compute

  switch (state.strategy) {
    case 'race':
      add('capital', -8);
      add('alignment', -3);
      add('influence', -1);
      add('tension', 2.5);
      add('autonomy', 1.5);
      add('openness', -0.5);
      break;
    case 'safety':
      add('capital', -6);
      add('alignment', 3);
      add('tension', -0.5);
      add('autonomy', -0.5);
      break;
    case 'profit':
      add('capital', 12 + r.talent * 0.5 * m.marketMult);
      add('alignment', -1);
      add('tension', 0.5);
      break;
    case 'diplomacy':
      add('capital', 4);
      add('alignment', 1);
      add('influence', 3);
      add('tension', -2.5);
      add('openness', 1);
      break;
  }

  // Capability outrunning safety erodes alignment and feeds tension/autonomy.
  add('alignment', -Math.max(0, capabilityGain - 3) * 0.6);
  add('autonomy', capabilityGain * 0.15);
  if (r.alignment < 25) add('influence', -2);
  if (r.alignment < 30) add('tension', 1);
  if (r.tension > 70) add('openness', -1);

  // Permanent per-tick effects from unlocked techs.
  for (const t of unlockedTechs(state)) {
    if (!t.perTick) continue;
    for (const [k, v] of Object.entries(t.perTick) as [keyof Resources, number][]) {
      add(k, v);
    }
  }

  const out: Partial<Resources> = {};
  for (const [k, v] of Object.entries(base) as [keyof Resources, number][]) {
    out[k] = v * factor;
  }
  return out;
}

export function advanceGlobal(global: number, tickDays: number): number {
  return global + (1.2 + global * 0.025) * (tickDays / TICK_BASE_DAYS);
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const EPOCH = Date.parse('2026-01-01T00:00:00Z');

export function dateLabel(day: number): string {
  const d = new Date(EPOCH + day * 86_400_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function resolveOutcome(s: GameState): Outcome {
  const r = s.resources;
  if (r.tension >= 100) return 'nuclear-war';
  if (r.capital < 0) return 'collapse';
  if (r.capability >= SINGULARITY) {
    if (r.alignment < SAFE_THRESHOLD) return 'asi-rogue';
    return r.openness >= OPEN_THRESHOLD ? 'asi-utopia' : 'asi-dystopia';
  }
  if (s.globalCapability >= SINGULARITY) return 'outpaced';
  if (s.relinquished && r.tension <= 40) {
    return r.alignment >= SAFE_THRESHOLD && r.openness >= OPEN_THRESHOLD
      ? 'human-utopia'
      : 'human-dystopia';
  }
  if (s.day >= HORIZON_DAYS) {
    return r.alignment >= SAFE_THRESHOLD && r.openness >= OPEN_THRESHOLD
      ? 'human-utopia'
      : 'human-dystopia';
  }
  return null;
}

const ENDING_BONUS: Record<string, number> = {
  'asi-utopia': 1000,
  'human-utopia': 650,
  'asi-dystopia': 350,
  'human-dystopia': 200,
  'asi-rogue': 80,
  'outpaced': 40,
  'nuclear-war': 0,
  'collapse': 0,
};

function computeScore(s: GameState, outcome: Outcome): number {
  const r = s.resources;
  const base =
    r.capability + r.alignment * 1.2 + r.influence + r.openness * 0.5 - r.tension * 0.3;
  const techBonus = s.techs.length * 12;
  const bonus = outcome ? (ENDING_BONUS[outcome] ?? 0) : 0;
  const speed =
    outcome === 'asi-utopia' || outcome === 'human-utopia'
      ? Math.max(0, (HORIZON_DAYS - s.day) / 120)
      : 0;
  return Math.round(base + techBonus + bonus + speed);
}

export function startGame(
  entity: EntityType,
  strategy: Strategy,
  seed: number,
): GameState {
  const rng = new Rng(seed);
  const base: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: rng.state,
    day: 0,
    entity,
    strategy,
    resources: { ...STARTING[entity] },
    modifiers: { ...NEUTRAL_MODIFIERS },
    globalCapability: 5,
    recurring: [],
    firedEvents: [],
    techs: [],
    relinquished: false,
    offer: [],
    log: [
      {
        day: 0,
        kind: 'system',
        text: `${entity === 'company' ? 'Frontier lab' : 'Nation'} founded. The arc to the singularity begins.`,
      },
    ],
    phase: 'playing',
    outcome: null,
    score: 0,
  };
  base.offer = drawOffer(base, rng);
  base.rngState = rng.state;
  return base;
}

export function setStrategy(state: GameState, strategy: Strategy): GameState {
  if (state.phase !== 'playing' || strategy === state.strategy) return state;
  return {
    ...state,
    strategy,
    log: [
      { day: state.day, kind: 'system', text: `Strategy set to ${strategy}.` },
      ...state.log,
    ],
  };
}

// Research a tech (a free action, gated by accumulated research points).
export function researchTech(state: GameState, techId: string): GameState {
  if (state.phase !== 'playing') return state;
  const tech = techById(techId);
  if (!tech || techStatus(tech, state) !== 'available') return state;

  let resources = { ...state.resources, research: state.resources.research - tech.cost };
  if (tech.onUnlock) resources = addDeltas(resources, tech.onUnlock);
  const modifiers = tech.modifiers
    ? applyModifiers(state.modifiers, tech.modifiers)
    : state.modifiers;

  let next: GameState = {
    ...state,
    resources: clampResources(resources),
    modifiers,
    techs: [...state.techs, tech.id],
    relinquished: state.relinquished || !!tech.relinquish,
    log: [
      { day: state.day, kind: 'tech', text: `Researched: ${tech.name}.` },
      ...state.log,
    ],
  };

  // Some techs (e.g. a global pause) can immediately resolve the game.
  const outcome = resolveOutcome(next);
  if (outcome) {
    next = {
      ...next,
      phase: 'ended',
      outcome,
      score: computeScore(next, outcome),
      offer: [],
    };
    next.log.unshift({ day: next.day, kind: 'system', text: outcomeHeadline(outcome) });
  }
  return next;
}

function applyModifiersPatch(current: Modifiers, patch?: Partial<Modifiers>): Modifiers {
  return applyModifiers(current, patch);
}

// Advance one tick: length depends on the current phase, so the clock speeds up.
function advanceTick(state: GameState): GameState {
  const rng = new Rng(state.rngState);
  const tickDays = phaseForCapability(state.resources.capability).tickDays;
  let resources = { ...state.resources };
  let modifiers = { ...state.modifiers };
  const log = [...state.log];
  const day = state.day + tickDays;

  // 1. Recurring effects.
  const recurring = state.recurring
    .map((re) => {
      resources = addDeltas(resources, re.effects);
      return { ...re, remaining: re.remaining - 1 };
    })
    .filter((re) => re.remaining > 0);

  // 2. Passive strategy + tech deltas (scaled to tick length).
  resources = addDeltas(resources, passiveDeltas({ ...state, resources }));

  // 3. World clock.
  let globalCapability = advanceGlobal(state.globalCapability, tickDays);

  // 4. World event.
  const firedEvents = [...state.firedEvents];
  const eventState: GameState = { ...state, resources, modifiers, globalCapability };
  const event = rollEvent(eventState, rng);
  if (event) {
    if (event.effects) resources = addDeltas(resources, event.effects);
    if (event.modifiers) modifiers = applyModifiersPatch(modifiers, event.modifiers);
    if (event.id === 'rival-leap') globalCapability += 6;
    if (isOneShot(event.id)) firedEvents.push(event.id);
    log.unshift({ day, kind: 'event', text: `${event.title} — ${event.description}` });
  }

  resources = clampResources(resources);
  globalCapability = Math.min(SINGULARITY, +globalCapability.toFixed(2));

  let next: GameState = {
    ...state,
    day,
    resources,
    modifiers,
    globalCapability,
    recurring,
    firedEvents,
    log,
    rngState: rng.state,
  };

  const outcome = resolveOutcome(next);
  if (outcome) {
    next = {
      ...next,
      phase: 'ended',
      outcome,
      score: computeScore(next, outcome),
      offer: [],
    };
    next.log.unshift({ day, kind: 'system', text: outcomeHeadline(outcome) });
    return next;
  }

  next.offer = drawOffer(next, rng);
  next.rngState = rng.state;
  return next;
}

export function chooseCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'playing') return state;
  const card = state.offer.find((c) => c.id === cardId);
  if (!card || !canPlay(card, state.resources)) return state;

  let resources = addDeltas(state.resources, card.cost);
  resources = addDeltas(resources, card.effects);

  const recurring = [...state.recurring];
  if (card.duration > 0 && card.recurring) {
    recurring.push({ label: card.title, effects: card.recurring, remaining: card.duration });
  }

  const afterPlay: GameState = {
    ...state,
    resources: clampResources(resources),
    recurring,
    log: [{ day: state.day, kind: 'card', text: `Played: ${card.title}.` }, ...state.log],
  };
  return advanceTick(afterPlay);
}

export function skipTurn(state: GameState): GameState {
  if (state.phase !== 'playing') return state;
  const afterSkip: GameState = {
    ...state,
    log: [{ day: state.day, kind: 'system', text: 'Passed on all cards.' }, ...state.log],
  };
  return advanceTick(afterSkip);
}

export function outcomeHeadline(outcome: Outcome): string {
  switch (outcome) {
    case 'asi-utopia':
      return 'ASI UTOPIA. Aligned superintelligence, openly shared — a flourishing future for all.';
    case 'asi-dystopia':
      return 'ASI DYSTOPIA. Superintelligence is controlled, but freedom is the price. An ordered, joyless world.';
    case 'asi-rogue':
      return 'ROGUE ASI. The singularity arrives, and no one is steering. Humanity is no longer in charge.';
    case 'nuclear-war':
      return 'GLOBAL NUCLEAR WAR. Tensions boiled over before the machines could decide anything.';
    case 'human-utopia':
      return 'HUMAN-LED UTOPIA. You held the frontier in check and built a good world with AI as a tool, not a master.';
    case 'human-dystopia':
      return 'HUMAN-LED DYSTOPIA. The frontier was contained — into the hands of the few. Surveillance and control endure.';
    case 'outpaced':
      return 'OUTPACED. A rival reached the singularity first. History will remember them, not you.';
    case 'collapse':
      return 'COLLAPSE. The money ran out and the project folded.';
    default:
      return '';
  }
}
