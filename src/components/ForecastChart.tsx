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

export function ForecastChart({ state }: Props) {
  const points = projectForecast(state, FORECAST_TICKS);
  const threshold = H - PAD - (SINGULARITY / SINGULARITY) * (H - PAD * 2);

  return (
    <div className="forecast panel">
      <h2>Forecast · next {FORECAST_TICKS} ticks</h2>
      <p className="forecast-sub">Projected under current strategy (no events / cards)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="forecast-svg" preserveAspectRatio="none">
        <line x1={PAD} y1={threshold} x2={W - PAD} y2={threshold} className="grid singularity-line" />
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
