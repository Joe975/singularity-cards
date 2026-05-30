// Forward projection for the strategy view: extrapolate the next N ticks under
// the current strategy and unlocked techs, ignoring random events and card plays.

import { SINGULARITY, phaseForCapability } from './config';
import { advanceGlobal, passiveDeltas } from './engine';
import type { GameState, Resources } from './types';

export interface ForecastPoint {
  capability: number;
  alignment: number;
  global: number;
}

export function projectForecast(state: GameState, ticks: number): ForecastPoint[] {
  const points: ForecastPoint[] = [
    {
      capability: state.resources.capability,
      alignment: state.resources.alignment,
      global: state.globalCapability,
    },
  ];

  let resources: Resources = { ...state.resources };
  let global = state.globalCapability;

  for (let i = 1; i <= ticks; i++) {
    const tickDays = phaseForCapability(resources.capability).tickDays;
    const delta = passiveDeltas({ ...state, resources, globalCapability: global });
    resources = { ...resources };
    if (delta.capability) resources.capability += delta.capability;
    if (delta.alignment) resources.alignment += delta.alignment;
    resources.capability = Math.max(0, Math.min(SINGULARITY, resources.capability));
    resources.alignment = Math.max(0, Math.min(100, resources.alignment));
    global = Math.min(SINGULARITY, advanceGlobal(global, tickDays));
    points.push({
      capability: resources.capability,
      alignment: resources.alignment,
      global,
    });
  }
  return points;
}
