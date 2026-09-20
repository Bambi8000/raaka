# Architecture

## Current mode

RAAKA is a personal, laptop-only browser application. Vite binds to
`127.0.0.1`; there is no backend, authentication, database or cloud
infrastructure. Publishing the source repository does not expose the running
application.

If the application is later shared as a hosted service, hosting, authentication,
data and security must be designed as a separate change.

## Stack

- TypeScript 6 in strict mode (enabled by the compiler's default)
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

### Model-scale stage

Version 0.1.5 preserves the master design and derives a physical study by one
explicit uniform scale about the ground origin. The flow is master recipe
geometry → model scale → physical geometry and analysis. Rendering consumes
the physical study; future exports must consume the same result. Camera zoom
is not model scale.

The scale stage transforms positions, primitive dimensions and loft endpoint
offsets together, then recomputes complete bounds. Areas use `s²`; volume and
same-density mass use `s³`. It never feeds a 500 mm quarter-scale result back
through the 1,000 mm design-height clamp. Scale is stored separately from the
master parameters and seed and applied once from the master, not cumulatively.

Project persistence accepts the 1:1, 1:2 and 1:4 presets with a
backward-compatible 1:1 default. Future drawing documents additionally store a
paper scale; their dimension labels describe the physical model. Machine stock
and kerf remain unscaled settings in Kerros. Regression fixtures cover `s`,
`s²`, `s³`, ground-plane preservation and repeated switching back to 1:1.

### Support lean and planned support grid

Use a shared leg template and stable row/column identities to compose the
support grid. Resolve global layout and selected-leg overrides before applying
model scale. Adding rows changes placement without rerolling existing legs.

Version 0.1.3 stores shared foot offset as the bottom-centre displacement from
the neck in the XY plane, in design millimetres. The generator applies that
same authored offset to every stem. The bottom stays at Z = 0 and the
stem/shoulder interface stays coincident; the UI derives an angle for display
without making that angle project truth. Seeded asymmetry remains an additive
per-leg endpoint variation. Complete bounds include both loft endpoints, while
volume and contact area remain unchanged by shear.

Version 0.1.4 stores selected-leg overrides as a deterministic array keyed by
the current semantic support ID. An override contains absolute design-mm X/Y
values and replaces, rather than adds to, the shared offset. Both a stem and
its shoulder resolve to the same support ID in the inspector. Reducing support
count does not delete hidden overrides, so restoring the count restores the
authored leg. The generator validates IDs and rejects duplicates before making
an ID-to-override lookup.

The support grid is still planned. Row placement must translate the entire
leg, while lean changes its endpoint relationship. Keep these operations
distinct, and include effective endpoints in bounds, contact and overlap
checks. A future grid migration must preserve existing first-row identities.

## Data flow

```text
Recipe parameters + stable seed
              |
              v
       Pure master generator
              |
              v
      Explicit model scale
              |
              +--> physical scene pieces --> Three.js preview
              +--> physical analysis
              +--> future solid kernel --> mesh / sections / drawings
```

React owns interaction state. The generator owns form truth. Three.js receives
scene pieces and must remain replaceable; renderer state is never project data.

## Project persistence and history

The portable project file is human-readable JSON with an explicit RAAKA format
version and a separate recipe version. Piloti recipe version 3 stores every
generator parameter, shared X/Y foot offsets, selected-leg overrides and one
of the supported `modelScale` presets. Recipe version 2 is migrated with an
empty override list;
recipe version 1 additionally receives zero shared offsets. A missing model
scale is read as 1 for compatibility; any unsupported format, recipe, scale or
parameter is rejected before current state is replaced. The same canonical
serializer feeds file downloads, dirty-state comparison and local recovery.

The browser keeps a recovery copy under `raaka.recovery.v1` after every edit,
undo and redo. Recovery is not a substitute for a project file: it belongs to
one browser profile, while Save creates the portable artifact the owner can
archive. Opening a project starts a new history; invalid input preserves the
current study and reports the reason.

Undo/redo stores immutable Piloti study snapshots—master parameters plus model
scale—capped at 100 committed steps. Live slider values update the model and
recovery copy continuously, but the pointer or keyboard gesture commits only
its starting snapshot. Renderer selection and active scope are intentionally
outside project history; scale and override edits are undoable project data.

## Current vertical slice

`src/core/generator.ts` creates the Piloti study as boxes and rectangular
frustums. The same pure result drives the object list, viewport and physical
readings. `src/geometry/frustum.ts` converts a semantic rectangular loft into a
flat-shaded Three.js buffer geometry.

The volume equation integrates the product of linearly changing width and
depth. Pieces only meet at boundaries in the current recipe, so their volumes
can be summed without overlap correction. Future booleans must derive volume
from the finished solid instead.

Current pieces are separate closed preview meshes; shared contact faces have
not been removed by a boolean union. They are not yet an export-ready single
solid. The study envelope is computed from every box and loft endpoint,
including offsets. It is the common source for physical dimensions, explicit
camera framing and directional-shadow fitting. The baseline defects and their
0.1.1 resolution are recorded in the
[baseline review](AUDIT-2026-09-20.md).

The camera is independent interaction state: changing a seed or design
parameter does not overwrite the chosen view. A model-scale change preserves
the viewing direction but automatically reframes the new physical bounds so a
quarter-scale model remains inspectable. **Fit** performs the same directional
reframe on demand; **Home** restores the authored axonometric direction. The
shadow camera includes the sculpture and a padded ground receiver at every
supported scale and height.

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
