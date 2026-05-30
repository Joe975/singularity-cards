# Art generation runbook (Codex CLI)

The game ships with CSS-gradient placeholder art so it is playable immediately.
This runbook generates real PNGs into `public/art/` using the OpenAI Codex CLI's
built-in image generation (`$imagegen`, gpt-image). Prompts live in
`tools/art-manifest.json`.

## Prerequisites
- Codex CLI installed (`codex --version`).
- Signed in, or `OPENAI_API_KEY` set in the environment for batch API use.

## Option A — interactive, one image at a time
From the repo root, start Codex and ask it to generate each image. Include the
shared `style` string from `art-manifest.json` plus the per-item `prompt`, e.g.:

```
codex
> $imagegen Generate a 1024x768 image and save it to public/art/infrastructure.png.
  Style: <paste "style" from tools/art-manifest.json>
  Subject: rows of glowing GPU server racks in a vast dark datacenter, cables like rivers of light
```

Repeat for every entry under `cards[]` (filename `public/art/<id>.png`) and
`techCategories[]` (filename `public/art/tech-<id>.png`).

## Option B — batch via the API (faster for the whole set)
Set `OPENAI_API_KEY`, then ask Codex to write and run a small Node/Python script
that loops over `tools/art-manifest.json`, calls the images API
(`model: "gpt-image-1"` or newer) with `style + ": " + prompt`, and writes each
result to the path above. Keep size 1024x768 to match the card art frame.

## Wiring the art into the game (after PNGs exist)
1. Put files at `public/art/<cardType>.png` and `public/art/tech-<category>.png`.
2. In `src/format.ts`, the card art currently uses `TYPE_GRADIENT`. To use images,
   set the card-art background to `url(${import.meta.env.BASE_URL}art/<type>.png)`
   (keep the gradient as a fallback layer underneath).
3. Optionally add per-template art by giving each card template an `artKey` and a
   matching `public/art/<artKey>.png`.

Commit the generated PNGs — GitHub Pages serves them statically.
