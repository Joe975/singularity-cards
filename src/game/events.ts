// World events. Each tick the world view may throw an event that changes the
// player's resources and/or the global modifiers (e.g. a memory shock that
// raises the cost of future compute, or an arms-race scare that spikes tension).

import type { GameState, Modifiers, WorldEvent } from './types';
import type { Rng } from './rng';

interface EventDef {
  event: WorldEvent;
  weight: number;
  oneShot?: boolean;
  eligible?: (s: GameState) => boolean;
}

const DEFS: EventDef[] = [
  {
    weight: 3,
    oneShot: true,
    eligible: (s) => s.resources.compute >= 50,
    event: {
      id: 'memory-shock',
      title: 'Global Memory Shortage',
      description: 'HBM supply seizes up. Running your clusters costs more for months.',
      severity: 'bad',
      modifiers: { computeCostMult: 1.5 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'efficiency-wave',
      title: 'Open Efficiency Breakthrough',
      description: 'A published trick makes everyone’s compute go further.',
      severity: 'good',
      modifiers: { computeCostMult: 0.8, capabilityMult: 1.1 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'market-boom',
      title: 'AI Market Boom',
      description: 'Investors pile in. A windfall lands in the treasury.',
      severity: 'good',
      effects: { capital: 35 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'market-correction',
      title: 'Market Correction',
      description: 'The bubble wobbles. Capital dries up and valuations fall.',
      severity: 'bad',
      effects: { capital: -25 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'safety-incident',
      title: 'High-Profile Safety Incident',
      description: 'A deployed system fails publicly. Oversight takes a hit.',
      severity: 'bad',
      effects: { alignment: -6 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'alignment-prize',
      title: 'Alignment Breakthrough',
      description: 'An open result makes oversight meaningfully easier.',
      severity: 'good',
      effects: { alignment: 8 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'compute-windfall',
      title: 'Surplus Hardware',
      description: 'A cancelled rival project floods the market with cheap accelerators.',
      severity: 'good',
      effects: { compute: 15 },
    },
  },
  {
    weight: 2,
    event: {
      id: 'cyber-attack',
      title: 'State-Level Cyberattack',
      description: 'Your systems are breached. Costly to recover.',
      severity: 'bad',
      effects: { capital: -20 },
    },
  },
  {
    weight: 2,
    eligible: (s) => s.resources.capability >= 30,
    event: {
      id: 'regulatory-probe',
      title: 'Regulatory Probe',
      description: 'Lawmakers open an inquiry into your frontier work.',
      severity: 'bad',
      effects: { capital: -18, capability: -2 },
    },
  },
  {
    weight: 2,
    eligible: (s) => s.globalCapability >= 45,
    event: {
      id: 'rival-leap',
      title: 'A Rival Makes a Leap',
      description: 'A competing power announces a major advance. The world clock jumps.',
      severity: 'bad',
      effects: { alignment: -2 },
    },
  },
  {
    weight: 1,
    event: {
      id: 'quiet-month',
      title: 'A Quiet Stretch',
      description: 'The world holds its breath. Nothing major happens.',
      severity: 'neutral',
    },
  },
];

export const PROBABILITY_EVENT = 0.55;

export function rollEvent(state: GameState, rng: Rng): WorldEvent | null {
  if (!rng.chance(PROBABILITY_EVENT)) return null;
  const eligible = DEFS.filter(
    (d) =>
      (!d.oneShot || !state.firedEvents.includes(d.event.id)) &&
      (!d.eligible || d.eligible(state)),
  );
  if (eligible.length === 0) return null;
  const def = rng.weighted(eligible, eligible.map((d) => d.weight));
  return def.event;
}

export function applyModifiers(current: Modifiers, patch?: Partial<Modifiers>): Modifiers {
  if (!patch) return current;
  const next: Modifiers = { ...current };
  for (const [k, v] of Object.entries(patch) as [keyof Modifiers, number][]) {
    next[k] = +(next[k] * v).toFixed(3);
  }
  return next;
}

export function isOneShot(eventId: string): boolean {
  return DEFS.some((d) => d.event.id === eventId && d.oneShot === true);
}
