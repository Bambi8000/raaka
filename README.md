# RAAKA

RAAKA is a deterministic brutalist massing studio for physical sculpture. It is
not a general-purpose 3D modeller. The project deliberately concentrates on
planar masses, explicit voids and repeatable recipes that can become real
one-to-two metre cast objects.

The first vertical slice implements the **Piloti** recipe: a heavy upper mass
carried by repeated faceted funnel supports. Its parameters update a live
Three.js view, every object is selectable, and the inspector reports the solid
volume, approximate concrete mass and ground contact area.

## Run locally

Requirements:

- Node.js 22 or newer
- pnpm 11

```sh
pnpm install
pnpm dev
```

The local server binds to `127.0.0.1:5174` only.

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
and [Roadmap](docs/ROADMAP.md).

## Status

RAAKA is an early design and geometry prototype. Mass and stability readings
are estimates, not structural engineering approval.
