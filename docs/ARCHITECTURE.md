# Architecture

## Current mode

RAAKA is a personal, laptop-only browser application. Vite binds to
`127.0.0.1`; there is no backend, authentication, database or cloud
infrastructure. Publishing the source repository does not expose the running
application.

If the application is later shared as a hosted service, hosting, authentication,
data and security must be designed as a separate change.

## Stack

- TypeScript in strict mode
- React and Vite for the application shell
- Three.js for interactive rendering only
- Vitest for unit tests
- ESLint with type-aware async rules
- pnpm with a committed lockfile

Manifold is the leading candidate for boolean geometry, cross-sections and
watertight mesh output, but it is not yet a dependency. It must first pass a
focused spike covering deterministic booleans, planar face preservation,
cross-section agreement, memory cleanup and long-session behaviour.

## Coordinate convention

- Z is up.
- One authored unit is one millimetre.
- The world origin is on the ground plane.
- Recipe output is already in physical size; display scaling must never change
  manufacturing dimensions.

## Data flow

```text
Recipe parameters + stable seed
              |
              v
       Pure form generator
              |
              +--> semantic scene pieces --> Three.js preview
              |
              +--> physical analysis
              |
              +--> future solid kernel --> mesh / sections / drawings
```

React owns interaction state. The generator owns form truth. Three.js receives
scene pieces and must remain replaceable; renderer state is never project data.

## Current vertical slice

`src/core/generator.ts` creates the Piloti study as boxes and rectangular
frustums. The same pure result drives the object list, viewport and physical
readings. `src/geometry/frustum.ts` converts a semantic rectangular loft into a
flat-shaded Three.js buffer geometry.

The volume equation integrates the product of linearly changing width and
depth. Pieces only meet at boundaries in the current recipe, so their volumes
can be summed without overlap correction. Future booleans must derive volume
from the finished solid instead.

## Selection colours

- selected: yellow `#FFD400`
- void/destructive: magenta `#E33B97`
- core/guide: blue `#287BC1`
- primary mass and supports: neutral concrete greys

Roles are semantic model data. Colours are a UI projection of those roles.

## File boundaries

The first transfer to Kerros may use STL because Kerros already imports it.
Long term, an STL-only handoff is insufficient: it discards planar face
identity, cast direction, surface intent, core roles and recipe metadata. A
RAAKA manufacturing package should eventually carry the solid plus explicit
intent without passing exact planes through Kerros's generic voxel import.

The Muusia boundary is 2D vector geometry in millimetres. RAAKA keeps semantic
drawing roles; a Muusia adapter maps them to path-set outputs and pens.

## Safety boundary

Material volume and mass are arithmetic estimates. A centre-of-mass check can
identify an obviously unsupported form, but RAAKA does not approve structural
capacity, lifting, reinforcement, anchors, weather exposure or public safety.
