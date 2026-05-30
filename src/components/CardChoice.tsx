import { canPlay } from '../game/cards';
import { deltaEntries, isGoodDelta, signed, TYPE_GRADIENT, TYPE_LABEL } from '../format';
import type { Card, Resources } from '../game/types';

interface Props {
  offer: Card[];
  resources: Resources;
  onPlay: (cardId: string) => void;
  onSkip: () => void;
}

function DeltaList({ delta, kind }: { delta: Partial<Resources>; kind: 'cost' | 'effect' }) {
  const entries = deltaEntries(delta);
  if (entries.length === 0) return null;
  return (
    <ul className={`deltas ${kind}`}>
      {entries.map((e) => (
        <li key={e.key} className={isGoodDelta(e.key, e.value) ? 'pos' : 'neg'}>
          {e.label} {signed(e.value)}
        </li>
      ))}
    </ul>
  );
}

export function CardChoice({ offer, resources, onPlay, onSkip }: Props) {
  return (
    <div className="card-choice">
      <div className="cards">
        {offer.map((card) => {
          const playable = canPlay(card, resources);
          return (
            <div key={card.id} className={`card rarity-${card.rarity} ${playable ? '' : 'locked'}`}>
              <div className="card-art" style={{ background: TYPE_GRADIENT[card.type] }}>
                <span className="card-type">{TYPE_LABEL[card.type]}</span>
                <span className={`card-rarity ${card.rarity}`}>{card.rarity}</span>
              </div>
              <div className="card-body">
                <h3>{card.title}</h3>
                <p className="flavor">{card.flavor}</p>
                <DeltaList delta={card.effects} kind="effect" />
                <DeltaList delta={card.cost} kind="cost" />
                {card.duration > 0 && card.recurring && (
                  <p className="recurring-note">
                    For {card.duration} ticks: {deltaEntries(card.recurring)
                      .map((e) => `${e.label} ${signed(e.value)}`)
                      .join(', ')}
                  </p>
                )}
                {card.requires && (
                  <p className="requires-note">
                    Requires {deltaEntries(card.requires)
                      .map((e) => `${e.label} ${Math.round(e.value)}`)
                      .join(', ')}
                  </p>
                )}
              </div>
              <button className="play" disabled={!playable} onClick={() => onPlay(card.id)}>
                {playable ? 'Play' : 'Cannot afford'}
              </button>
            </div>
          );
        })}
      </div>
      <button className="skip" onClick={onSkip}>
        Pass on all three →
      </button>
    </div>
  );
}
