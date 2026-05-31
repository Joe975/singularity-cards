import { RESOURCE_META } from '../game/config';
import { dateLabel, outcomeHeadline } from '../game/engine';
import type { GameState, Outcome } from '../game/types';

interface Props {
  state: GameState;
  onRestart: () => void;
}

const TITLE: Record<NonNullable<Outcome>, string> = {
  aligned: 'Aligned Singularity',
  misaligned: 'Misaligned Takeoff',
  outpaced: 'Outpaced',
  collapse: 'Collapse',
};

export function EndScreen({ state, onRestart }: Props) {
  const outcome = (state.outcome ?? 'collapse') as NonNullable<Outcome>;
  const years = (state.day / 365).toFixed(1);
  return (
    <div className={`endscreen outcome-${outcome}`}>
      <div className="end-card">
        <p className="end-eyebrow">The singularity arc ends</p>
        <h1>{TITLE[outcome]}</h1>
        <p className="end-headline">{outcomeHeadline(state.outcome)}</p>

        <div className="end-score">
          <span className="end-score-num">{state.score}</span>
          <span className="end-score-label">final score</span>
        </div>

        <p className="end-meta">
          {dateLabel(state.day)} · {years} years
        </p>

        <div className="end-stats">
          {RESOURCE_META.filter((m) => m.gauge).map((m) => (
            <div key={m.key} className="end-stat">
              <span className="badge" style={{ background: m.color }}>{m.short}</span>
              <span>{Math.round(state.resources[m.key])}</span>
            </div>
          ))}
        </div>

        <p className="end-seed">seed {state.seed}</p>
        <button className="primary" onClick={onRestart}>
          Play again
        </button>
      </div>
    </div>
  );
}
