import { RESOURCE_META } from '../game/config';
import { dateLabel, outcomeHeadline } from '../game/engine';
import { unlockedTechs } from '../game/techtree';
import type { GameState, Outcome } from '../game/types';

interface Props {
  state: GameState;
  onRestart: () => void;
}

const TITLE: Record<NonNullable<Outcome>, string> = {
  'asi-utopia': 'ASI Utopia',
  'asi-dystopia': 'ASI Dystopia',
  'asi-rogue': 'Rogue ASI',
  'nuclear-war': 'Annihilation',
  'human-utopia': 'Human-Led Utopia',
  'human-dystopia': 'Human-Led Dystopia',
  'outpaced': 'Outpaced',
  'collapse': 'Collapse',
};

export function EndScreen({ state, onRestart }: Props) {
  const outcome = (state.outcome ?? 'collapse') as NonNullable<Outcome>;
  const years = (state.day / 365).toFixed(1);
  return (
    <div className={`endscreen outcome-${outcome}`}>
      <h1>{TITLE[outcome]}</h1>
      <p className="end-headline">{outcomeHeadline(state.outcome)}</p>
      <p className="end-meta">
        {dateLabel(state.day)} · {years} years · {state.techs.length} techs · score{' '}
        <strong>{state.score}</strong>
      </p>
      <div className="end-stats">
        {RESOURCE_META.filter((m) => m.gauge).map((m) => (
          <div key={m.key} className="end-stat">
            <span className="badge" style={{ background: m.color }}>{m.short}</span>
            <span>{Math.round(state.resources[m.key])}</span>
          </div>
        ))}
      </div>
      {state.techs.length > 0 && (
        <p className="end-techs">{unlockedTechs(state).map((t) => t.name).join(' · ')}</p>
      )}
      <p className="end-seed">seed {state.seed}</p>
      <button className="primary" onClick={onRestart}>
        Play again
      </button>
    </div>
  );
}
