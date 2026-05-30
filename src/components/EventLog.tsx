import { dateLabel } from '../game/engine';
import type { LogEntry } from '../game/types';

interface Props {
  log: LogEntry[];
}

export function EventLog({ log }: Props) {
  return (
    <div className="eventlog panel">
      <h2>Log</h2>
      <ul>
        {log.slice(0, 14).map((e, i) => (
          <li key={i} className={`log-${e.kind}`}>
            <span className="log-date">{dateLabel(e.day)}</span>
            <span className="log-text">{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
