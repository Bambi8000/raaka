# RAAKA

RAAKA is a deterministic brutalist massing studio for physical sculpture. It is
not a general-purpose 3D modeller. The project deliberately concentrates on
planar masses, explicit voids and repeatable recipes that can become real
one-to-two metre cast objects.

The first vertical slice implements the **Piloti** recipe: a heavy upper mass
carried by repeated faceted funnel supports. Its parameters update a live
Three.js view, every object is selectable, and the inspector reports the solid
volume, approximate concrete mass and ground contact area.

Version 0.1.2 adds validated project files, automatic local recovery and a
100-step undo/redo history. Use **Save project** for a portable `.raaka.json`
file and **Open** to restore it. One slider drag is one undo step; direct seed
entry, reset and seed changes participate in the same history.

Version 0.1.3 adds shared X/Y foot offsets to Piloti. The offsets move every
support footprint in design millimetres while keeping each neck fixed and each
bottom face horizontal on the ground. The inspector also reports the resulting
authored lean angle and foot direction; seeded asymmetry remains a separate
per-leg variation.

Version 0.1.4 adds explicit selected-leg overrides. Select a support or its
shoulder, switch the lean scope to **Selected**, and create an override from the
current shared values. **Use shared** removes it without affecting the other
legs. Overrides are project data and participate in save, recovery and history.

Version 0.1.5 adds 1:1, 1:2 and 1:4 manufacturing scale presets. RAAKA keeps
the full-size design parameters unchanged, derives a uniformly scaled physical
study about the ground origin, and reports both design and manufactured
envelopes. Length, contact area, volume and same-density mass follow their
correct scale powers. Scale changes are saved, recoverable and undoable.

## Run locally

Requirements:

- Node.js 22 or newer
- pnpm 11

```sh
pnpm install
pnpm dev
```

The local server binds to `127.0.0.1:5174` only.
While it is running, open [RAAKA locally](http://127.0.0.1:5174/).
This address works on the computer running the server; the public GitHub
repository is not a hosted application.

## Quality gate

```sh
pnpm verify
```

This runs ESLint with type-aware async rules, strict TypeScript checks, unit
tests and the production build. CI runs the same gate and secret scanning.

## Product boundaries

- **RAAKA** owns form recipes, deterministic variation, artistic drawings and
  manufacturing intent.
- **Kerros** owns slicing, mould design, sheet layout and cutting output.
- **Muusia** owns pens, hatching, path routing and plotter-specific G-code.

See [Product definition](docs/PRODUCT.md), [Architecture](docs/ARCHITECTURE.md)
and [Roadmap](docs/ROADMAP.md). The
[2026-09-20 review](docs/AUDIT-2026-09-20.md) records measured findings and the
proposed next work.

## Status

RAAKA 0.1.5 is an early design and geometry prototype. Only Piloti is
implemented. Study state is recoverable locally and can be saved as a
versioned project file. Manufacturing export is not implemented yet. Other
recipes, drawings, cores and stability feedback are planned. The current mass
and ground-contact readings are estimates, not structural engineering
approval. The displayed envelope is derived from every generated piece,
including seeded variation and explicit foot offsets.
