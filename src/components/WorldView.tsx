import { useEffect, useRef } from 'react';
import { NEUTRAL_MODIFIERS, RESOURCE_META, SINGULARITY, phaseForCapability } from '../game/config';
import { dateLabel } from '../game/engine';
import type { GameState, ModifierKey, ResourceKey } from '../game/types';

interface Props {
  state: GameState;
}

const MODIFIER_LABEL: Record<ModifierKey, string> = {
  computeCostMult: 'Compute cost',
  capabilityMult: 'Research speed',
};

export function WorldView({ state }: Props) {
  const r = state.resources;
  const phase = phaseForCapability(r.capability);
  const activeMods = (Object.keys(state.modifiers) as ModifierKey[]).filter(
    (k) => state.modifiers[k] !== NEUTRAL_MODIFIERS[k],
  );

  // Remember last-shown values so a changed number can flash up/down.
  const prev = useRef<Partial<Record<ResourceKey, number>>>({});
  useEffect(() => {
    const snap: Partial<Record<ResourceKey, number>> = {};
    for (const m of RESOURCE_META) snap[m.key] = Math.round(r[m.key]);
    prev.current = snap;
  });

  return (
    <div className="worldview panel">
      <div className="worldview-head">
        <h2>World View</h2>
        <span className="date">{dateLabel(state.day)}</span>
      </div>

      <div className="phase-banner">
        <strong>{phase.label}</strong>
        <span>{phase.blurb} · tick = {phase.tickDays}d</span>
      </div>

      <div className="race-bar">
        <div className="race-row">
          <span>You</span>
          <div className="bar">
            <div className="fill you" style={{ width: `${(r.capability / SINGULARITY) * 100}%` }} />
          </div>
          <span className="num">{Math.round(r.capability)}</span>
        </div>
        <div className="race-row">
          <span>World</span>
          <div className="bar">
            <div className="fill world" style={{ width: `${(state.globalCapability / SINGULARITY) * 100}%` }} />
          </div>
          <span className="num">{Math.round(state.globalCapability)}</span>
        </div>
      </div>

      <div className="resources">
        {RESOURCE_META.map((m) => {
          const val = Math.round(r[m.key]);
          const before = prev.current[m.key];
          const dir = before === undefined || before === val ? '' : val > before ? 'up' : 'down';
          return (
            <div key={m.key} className="resource">
              <div className="resource-top">
                <span className="badge" style={{ background: m.color }}>{m.short}</span>
                <span className="rlabel">{m.label}</span>
                {/* key forces a remount on change so the flash animation replays */}
                <span key={val} className={`rval ${dir}`}>{val}</span>
              </div>
              {m.gauge && (
                <div className="gauge">
                  <div
                    className="gauge-fill"
                    style={{ width: `${val}%`, background: m.color, boxShadow: `0 0 8px -1px ${m.color}` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeMods.length > 0 && (
        <div className="modifiers">
          {activeMods.map((k) => {
            const v = state.modifiers[k];
            const bad = k === 'computeCostMult' ? v > 1 : v < 1;
            return (
              <span key={k} className={`mod ${bad ? 'bad' : 'good'}`}>
                {MODIFIER_LABEL[k]} ×{v}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
