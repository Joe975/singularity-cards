# Singularity — a card game

A browser card game that plays through the arc from present-day AI to the
singularity. You run a **frontier lab** or a **nation state**. Each tick you read
an updated **world view** and choose **one of three cards**. As capability climbs,
the game moves through phases — **Narrow AI → Recursive Self-Improvement → AGI →
ASI → Singularity** — and the tick shortens from a month down to a single day to
reflect the accelerating rate of change.

A **tech tree** (robotics, biology, longevity, energy, materials, quantum, space,
exotic physics, governance) is unlocked with Research Points and grants permanent
effects. Where you land is one of several endings: **ASI utopia / dystopia, rogue
ASI, global nuclear war, human-led utopia / dystopia, outpaced,** or **collapse**.

All randomness flows from a **seed**, so a given seed + the same choices replays
identically. Share the seed URL from the top bar.

## Run locally
```
npm install
npm run dev      # http://localhost:5173
```
Build / preview:
```
npm run build
npm run preview
```

## Deploy (GitHub Pages)
This repo includes `.github/workflows/deploy.yml`. On push to `main` it builds and
publishes `dist/` to Pages. One-time setup: **Settings → Pages → Build and
deployment → Source = GitHub Actions**. The site serves at
`https://<user>.github.io/singularity-cards/`.

`vite.config.ts` sets `base: '/singularity-cards/'` to match the repo path — rename
both if you use a different repo name.

## Art
Ships with gradient placeholders. To generate real artwork with the Codex CLI, see
[`tools/gen-art.md`](tools/gen-art.md) and the prompts in
[`tools/art-manifest.json`](tools/art-manifest.json).

## Project layout
- `src/game/` — pure game logic (no React): `types`, `config`, `rng`, `cards`,
  `events`, `techtree`, `engine`, `forecast`, `persistence`.
- `src/components/` — React UI panels.
- `src/App.tsx` — wiring and state.
