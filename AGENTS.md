# AGENTS.md — working agreement for RAAKA

Read this file first, then read `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` and
`docs/ROADMAP.md` before making substantive changes.

## Language

- The product name is **RAAKA**.
- Every identifier, code comment, UI string, commit message and documentation
  sentence is English. The name RAAKA is the only intentional Finnish word in
  the software.
- Converse with the project owner in Finnish. Finnish conversation must not
  leak into repository artifacts.

## Verification

Run this before every commit:

```sh
pnpm verify
```

It must complete ESLint, strict TypeScript checks, Vitest and the production
build. Never commit on an assumed result. Read the full list of completed
commands.

Write unit tests with every geometry or generator change. Expected values must
come from explicit invariants, not screenshots.

## Product constraints

- RAAKA is a massing generator, not a general 3D modeller.
- Z is up and one unit is one millimetre in authored geometry.
- Primary form geometry is planar. Curved ideas are explicitly faceted.
- Randomness is seeded. Editing one feature must not silently reroll unrelated
  choices.
- The normal physical sculpture height is 1,000–2,000 mm.
- That range describes the full-size design, not a minimum manufactured size.
  Uniform model scales such as 1:2 and 1:4 must allow smaller physical test
  models. Keep model scale separate from camera zoom and drawing paper scale.
- Open voids, removable cores and retained lightweight cores are distinct
  manufacturing intents even when they look similar in the viewport.
- RAAKA produces form and drawing geometry. Kerros owns mould construction and
  cutting. Muusia owns pen and plotter execution.
- Physical estimates are advisory. Never present them as structural approval.

## UI direction

- Grey and white are structural colours, not a temporary theme.
- Yellow marks the current selection and immediate attention.
- Magenta is reserved for voids and destructive geometry.
- Blue is reserved for cores, guides and constructive secondary geometry.
- Use sharp edges, visible grids and strong typographic hierarchy. Avoid soft
  cards, decorative gradients and consumer-dashboard styling.
- Every control and refusal must say what it changes or why it cannot proceed.

## Engineering discipline

- Keep the generator pure and independent from React and Three.js.
- The renderer consumes generated pieces; it must not own model truth.
- Read a file before editing it and search for a symbol before changing its
  contract.
- Keep dependencies few, mature and pinned through `pnpm-lock.yaml`.
- Never commit secrets, `.env` files, Terraform state or generated build output.
- The local development server stays on `127.0.0.1`. Verified `main` builds are
  published as a static GitHub Pages application; any stateful or authenticated
  shared deployment requires a separate security and hosting decision.
- Make one logical change per commit and use descriptive English commit messages.
