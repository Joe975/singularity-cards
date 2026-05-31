// The tick engine: accelerating phases, strategy passive deltas, tech effects,
// world events, and the branching win/lose resolution.

import {
  GAUGE_RESOURCES,
  HORIZON_DAYS,
  NEUTRAL_MODIFIERS,
  SAFE_THRESHOLD,
  SAVE_VERSION,
  SINGULARITY,
  STARTING,
  TICK_BASE_DAYS,
  phaseForCapability,
} from './config';
import { canPlay, drawOffer } from './cards';
import { applyModifiers, isOneShot, rollEvent } from './events';
import { Rng } from './rng';
import type {
  EntityType,
  GameState,
  Modifiers,
  Outcome,
  Resources,
  Strategy,
} from './types';

const STOCKPILES: (keyof Resources)[] = ['compute'];

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

const CAP_COEFF: Record<Strategy, number> = {
  race: 0.05,
  safety: 0.02,
  profit: 0.03,
  diplomacy: 0.03,
};

// Monthly-equivalent passive change, then scaled to the current tick length.
export function passiveDeltas(state: GameState): Partial<Resources> {
  const r = state.resources;
  const m = state.modifiers;
  const phase = phaseForCapability(r.capability);
  const factor = phase.tickDays / TICK_BASE_DAYS;

  const base: Partial<Record<keyof Resources, number>> = {};
  const add = (k: keyof Resources, v: number) => {
    base[k] = (base[k] ?? 0) + v;
  };

  // Compute drives capability, accelerating as the curve steepens.
  const capabilityGain =
    r.compute * CAP_COEFF[state.strategy] * m.capabilityMult * (1 + r.capability / 200);
  add('capability', capabilityGain);
  add('capital', -r.compute * 0.05 * m.computeCostMult); // running cost of live compute

  switch (state.strategy) {
    case 'race':
      add('capital', -4);
      add('alignment', -3);
      break;
    case 'safety':
      add('capital', -3);
      add('alignment', 3);
      break;
    case 'profit':
      add('capital', 12);
      add('alignment', -1);
      break;
    case 'diplomacy':
      add('capital', 5);
      add('alignment', 1);
      break;
  }

  // Capability outrunning safety erodes alignment.
  add('alignment', -Math.max(0, capabilityGain - 3) * 0.6);

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
  if (r.capital < 0) return 'collapse';
  if (r.capability >= SINGULARITY) {
    return r.alignment >= SAFE_THRESHOLD ? 'aligned' : 'misaligned';
  }
  if (s.globalCapability >= SINGULARITY) return 'outpaced';
  return null;
}

const ENDING_BONUS: Record<string, number> = {
  aligned: 600,
  misaligned: 150,
  outpaced: 40,
  collapse: 0,
};

function computeScore(s: GameState, outcome: Outcome): number {
  const r = s.resources;
  const base = r.capability + r.alignment * 1.5;
  const bonus = outcome ? (ENDING_BONUS[outcome] ?? 0) : 0;
  // Reaching an aligned singularity earlier scores higher.
  const speed = outcome === 'aligned' ? Math.max(0, (HORIZON_DAYS - s.day) / 120) : 0;
  return Math.round(base + bonus + speed);
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
    case 'aligned':
      return 'AN ALIGNED SINGULARITY. Superintelligence arrives under control — and it is yours.';
    case 'misaligned':
      return 'MISALIGNED TAKEOFF. The singularity arrives, but no one is steering.';
    case 'outpaced':
      return 'OUTPACED. A rival reached the singularity first. History will remember them, not you.';
    case 'collapse':
      return 'COLLAPSE. The money ran out and the project folded.';
    default:
      return '';
  }
}
