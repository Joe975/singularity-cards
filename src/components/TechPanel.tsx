import { TECHS, TECH_CATEGORY_META, techStatus } from '../game/techtree';
import { deltaEntries, signed } from '../format';
import type { GameState, Modifiers, Tech, TechCategory } from '../game/types';

interface Props {
  state: GameState;
  onResearch: (techId: string) => void;
}

const MOD_LABEL: Record<keyof Modifiers, string> = {
  computeCostMult: 'compute cost',
  energyCostMult: 'energy cost',
  marketMult: 'market',
  capabilityMult: 'research speed',
  researchMult: 'R&D output',
};

const CATEGORY_ORDER: TechCategory[] = [
  'ai', 'robotics', 'biology', 'longevity', 'energy',
  'materials', 'quantum', 'space', 'exotic', 'governance',
];

function effectBits(tech: Tech): string[] {
  const bits: string[] = [];
  if (tech.onUnlock) {
    deltaEntries(tech.onUnlock).forEach((e) => bits.push(`${e.label} ${signed(e.value)}`));
  }
  if (tech.perTick) {
    deltaEntries(tech.perTick).forEach((e) => bits.push(`${e.label} ${signed(e.value)}/tick`));
  }
  if (tech.modifiers) {
    (Object.entries(tech.modifiers) as [keyof Modifiers, number][]).forEach(([k, v]) =>
      bits.push(`${MOD_LABEL[k]} ×${v}`),
    );
  }
  if (tech.relinquish) bits.push('enacts a global pause');
  return bits;
}

export function TechPanel({ state, onResearch }: Props) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    techs: TECHS.filter((t) => t.category === cat).sort((a, b) => a.tier - b.tier),
  }));

  return (
    <div className="techpanel panel">
      <div className="tech-head">
        <h2>Tech Tree</h2>
        <span className="rp">{Math.round(state.resources.research)} RP</span>
      </div>
      <div className="tech-cats">
        {grouped.map(({ cat, techs }) => (
          <div key={cat} className="tech-cat">
            <h3 style={{ color: TECH_CATEGORY_META[cat].color }}>
              {TECH_CATEGORY_META[cat].label}
            </h3>
            <div className="tech-list">
              {techs.map((tech) => {
                const status = techStatus(tech, state);
                return (
                  <div key={tech.id} className={`tech tech-${status}`}>
                    <div className="tech-top">
                      <span className="tech-name">{tech.name}</span>
                      <span className="tech-tier">T{tech.tier}</span>
                    </div>
                    <div className="tech-effects">
                      {effectBits(tech).map((b, i) => (
                        <span key={i} className="tech-bit">{b}</span>
                      ))}
                    </div>
                    {status === 'unlocked' ? (
                      <span className="tech-status done">✓ researched</span>
                    ) : (
                      <button
                        className="tech-buy"
                        disabled={status !== 'available'}
                        onClick={() => onResearch(tech.id)}
                        title={
                          status === 'locked'
                            ? `Locked${tech.requiresCapability ? ` (needs ${tech.requiresCapability} capability)` : ''}`
                            : ''
                        }
                      >
                        {tech.cost} RP
                        {status === 'locked' && tech.prereqs.length > 0 ? ' · locked' : ''}
                        {status === 'unaffordable' ? ' · short' : ''}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
