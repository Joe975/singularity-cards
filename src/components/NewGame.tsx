import { useState } from 'react';
import { ENTITY_META, STRATEGY_META } from '../game/config';
import type { EntityType, Strategy } from '../game/types';

interface Props {
  onStart: (entity: EntityType, strategy: Strategy, seed: string) => void;
  initialSeed?: string;
}

export function NewGame({ onStart, initialSeed = '' }: Props) {
  const [entity, setEntity] = useState<EntityType>('company');
  const [strategy, setStrategy] = useState<Strategy>('race');
  const [seed, setSeed] = useState(initialSeed);

  return (
    <div className="newgame">
      <h1>Singularity</h1>
      <p className="tagline">
        Steer a power through the rise of superintelligence. One choice a month.
        Reach the singularity — and try to keep it aligned.
      </p>

      <section>
        <h2>Choose your entity</h2>
        <div className="option-grid">
          {ENTITY_META.map((e) => (
            <button
              key={e.key}
              className={`option-card ${entity === e.key ? 'selected' : ''}`}
              onClick={() => setEntity(e.key)}
            >
              <strong>{e.label}</strong>
              <span>{e.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Opening strategy</h2>
        <div className="option-grid four">
          {STRATEGY_META.map((s) => (
            <button
              key={s.key}
              className={`option-card ${strategy === s.key ? 'selected' : ''}`}
              onClick={() => setStrategy(s.key)}
            >
              <strong>{s.label}</strong>
              <span>{s.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="seed-row">
        <label>
          Seed (optional)
          <input
            type="text"
            value={seed}
            placeholder="leave blank for random"
            onChange={(e) => setSeed(e.target.value)}
          />
        </label>
        <button className="primary" onClick={() => onStart(entity, strategy, seed)}>
          Begin — Jan 2026
        </button>
      </section>
    </div>
  );
}
