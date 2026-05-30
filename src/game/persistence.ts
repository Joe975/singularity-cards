// localStorage save/load for the current run.

import { SAVE_VERSION } from './config';
import type { GameState } from './types';

const KEY = 'singularity-cards-save';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); fail silently.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
