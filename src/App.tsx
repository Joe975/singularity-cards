import { useEffect, useState } from 'react';
import { NewGame } from './components/NewGame';
import { WorldView } from './components/WorldView';
import { StrategyPanel } from './components/StrategyPanel';
import { ForecastChart } from './components/ForecastChart';
import { CardChoice } from './components/CardChoice';
import { TechPanel } from './components/TechPanel';
import { EventLog } from './components/EventLog';
import { EndScreen } from './components/EndScreen';
import {
  chooseCard,
  researchTech,
  setStrategy,
  skipTurn,
  startGame,
} from './game/engine';
import { seedFromString } from './game/rng';
import { clearGame, loadGame, saveGame } from './game/persistence';
import type { EntityType, GameState, Strategy } from './game/types';

function urlSeed(): string {
  return new URLSearchParams(window.location.search).get('seed') ?? '';
}

export default function App() {
  const [state, setState] = useState<GameState | null>(() => loadGame());

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  function handleStart(entity: EntityType, strategy: Strategy, seed: string) {
    const numericSeed = seed.trim()
      ? seedFromString(seed.trim())
      : Math.floor(Math.random() * 2 ** 31);
    setState(startGame(entity, strategy, numericSeed));
  }

  function handleRestart() {
    clearGame();
    setState(null);
  }

  function copySeed(seed: number) {
    const url = `${window.location.origin}${window.location.pathname}?seed=${seed}`;
    void navigator.clipboard?.writeText(url);
  }

  if (!state) {
    return (
      <div className="app">
        <NewGame onStart={handleStart} initialSeed={urlSeed()} />
      </div>
    );
  }

  if (state.phase === 'ended') {
    return (
      <div className="app">
        <EndScreen state={state} onRestart={handleRestart} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Singularity</h1>
        <div className="topbar-right">
          <button className="ghost" onClick={() => copySeed(state.seed)} title="Copy shareable seed URL">
            seed {state.seed}
          </button>
          <button className="ghost" onClick={handleRestart}>
            New game
          </button>
        </div>
      </header>

      <div className="board">
        <aside className="sidebar">
          <WorldView state={state} />
          <StrategyPanel
            current={state.strategy}
            onChange={(s) => setState((prev) => (prev ? setStrategy(prev, s) : prev))}
          />
          <ForecastChart state={state} />
        </aside>

        <main className="main">
          <h2 className="choose-heading">Choose one card</h2>
          <CardChoice
            offer={state.offer}
            resources={state.resources}
            onPlay={(id) => setState((prev) => (prev ? chooseCard(prev, id) : prev))}
            onSkip={() => setState((prev) => (prev ? skipTurn(prev) : prev))}
          />
          <TechPanel
            state={state}
            onResearch={(id) => setState((prev) => (prev ? researchTech(prev, id) : prev))}
          />
          <EventLog log={state.log} />
        </main>
      </div>
    </div>
  );
}
