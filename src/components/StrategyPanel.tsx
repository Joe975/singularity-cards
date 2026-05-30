import { STRATEGY_META } from '../game/config';
import type { Strategy } from '../game/types';

interface Props {
  current: Strategy;
  onChange: (s: Strategy) => void;
}

export function StrategyPanel({ current, onChange }: Props) {
  const meta = STRATEGY_META.find((s) => s.key === current);
  return (
    <div className="strategy panel">
      <h2>Strategy</h2>
      <div className="strategy-buttons">
        {STRATEGY_META.map((s) => (
          <button
            key={s.key}
            className={current === s.key ? 'selected' : ''}
            onClick={() => onChange(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {meta && <p className="strategy-blurb">{meta.blurb}</p>}
    </div>
  );
}
