import { FORECAST_TICKS, SINGULARITY } from '../game/config';
import { projectForecast } from '../game/forecast';
import type { ForecastPoint } from '../game/forecast';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

const W = 320;
const H = 150;
const PAD = 8;

function path(points: ForecastPoint[], key: 'capability' | 'alignment' | 'global'): string {
  const n = points.length - 1 || 1;
  return points
    .map((p, i) => {
      const x = PAD + (i / n) * (W - PAD * 2);
      const y = H - PAD - (p[key] / SINGULARITY) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// The capability line closed down to the baseline, for a soft area fill.
function area(points: ForecastPoint[], key: 'capability'): string {
  return `${path(points, key)} L${(W - PAD).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
}

export function ForecastChart({ state }: Props) {
  const points = projectForecast(state, FORECAST_TICKS);
  const threshold = H - PAD - (SINGULARITY / SINGULARITY) * (H - PAD * 2);

  return (
    <div className="forecast panel">
      <h2>Forecast · next {FORECAST_TICKS} ticks</h2>
      <p className="forecast-sub">Projected under current strategy (no events / cards)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="forecast-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="capArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cap)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--cap)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD} y1={threshold} x2={W - PAD} y2={threshold} className="grid singularity-line" />
        <path d={area(points, 'capability')} className="area-capability" />
        <path d={path(points, 'global')} className="line line-global" />
        <path d={path(points, 'alignment')} className="line line-alignment" />
        <path d={path(points, 'capability')} className="line line-capability" />
      </svg>
      <div className="legend">
        <span className="lg cap">Your capability</span>
        <span className="lg aln">Alignment</span>
        <span className="lg glb">World</span>
      </div>
    </div>
  );
}
