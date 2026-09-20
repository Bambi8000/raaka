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

Manifold 3.5.3 is the accepted solid kernel for boolean geometry,
cross-sections and watertight mesh output. Version 0.1.14 adds it as a pinned
dependency after a focused gate covering deterministic booleans, planar face
contact, section agreement, topology and repeated memory cleanup. Three.js
remains a renderer only and is not an input to the kernel.

`src/core/solidKernel.ts` initializes the WASM module once, converts semantic
boxes and rectangular lofts directly, copies finished mesh data back into
owned JavaScript arrays and explicitly deletes every Manifold and CrossSection
object. Its current union boundary returns bounds, finished-solid volume,
component count and a closed indexed mesh. Horizontal sections are simplified
before their polygons leave the kernel. A disconnected union is valid kernel
output with more than one component; the Fuse UI refuses it clearly instead of
presenting separate islands as one joined part. The WASM dependency is loaded
only when the first solid operation is requested.

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

### Support lean and support grid

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

Version 0.1.6 repeats the authored support through one to three centred Y rows.
Row placement translates the entire leg, while lean changes its endpoint
relationship; the operations remain distinct. The first row retains the
historic `support-N` and `shoulder-N` IDs. Later rows use
`support-rR-cC` and `shoulder-rR-cC`, so adding a row does not rename existing
legs or redirect selected-leg overrides. The original random sequence is
consumed by the complete first row before later rows, preserving its seeded
shapes when rows are added.

Support depth is a separate ratio of upper-mass depth and drives shoulder,
neck and foot depth without automatic fitting. Row spacing is a design-mm
centre distance. Analysis reports adjacent shoulder overlap and the per-side
distance by which the outer shoulder zone exceeds the upper mass. Model scale
transforms those measured distances together with the geometry. The UI reports
the condition instead of silently shrinking or moving supports.

Version 0.1.7 adds a selected-support size override keyed by the same stable
support ID as lean. Width scale transforms the stem foot, neck and shoulder
bearing in X; depth scale transforms the corresponding Y dimensions. Height,
position, seeded variation and endpoint offsets remain unchanged, and both
members of the support pair receive matching interface dimensions. Bounds,
volume and ground contact are recomputed from the resulting pieces.

The project stores foot offsets, size scales and placement in separate override
arrays so older recipes migrate without changing established lean or size data.
The UI presents them as one selected-leg override: Create writes all three, Use
shared removes all three, and one history snapshot covers the combined edit.
Bearing analysis uses each shoulder's actual top rectangle. It reports maximum
overlap between adjacent rows and columns plus maximum X and Y overhang beyond
the upper mass; it never alters authored geometry to remove a warning.

Version 0.1.8 adds a third stable-ID override array for selected-support X/Y
placement in design millimetres. Placement translates both the stem and
shoulder from their generated grid centre after seeded shape variation is
resolved. It does not change the stem's endpoint relationship, dimensions,
height, volume or ground-contact area. Foot offset therefore remains lean,
while position is whole-support translation. Both operations scale uniformly
at the later model-scale stage.

Shoulder overlap analysis now requires positive intersection on both planar
axes before reporting a collision. Logical row and column neighbours retain
their directional overlap readings. Any intersecting pair that is not a
logical neighbour produces a separate cross-grid overlap reading using the
minimum translation distance along X or Y. Bearing overhang continues to use
each translated shoulder's actual top rectangle.

Version 0.1.9 adds a recipe-level `shoulderMode`. `divided` preserves the
historic 92% bay-width top and its seeded top offset. `shared` uses the full
bay width and aligns each top face to the corresponding upper-mass bay centre,
while retaining the independently seeded neck position below. Unedited shared
neighbours therefore meet exactly at their X boundary and remain inside the
upper mass even when asymmetry is non-zero. The operation does not change
stems, neck interfaces, support IDs or the random sequence.

Selected width and placement overrides remain authoritative in shared mode.
Analysis measures the planar separation between adjacent top rectangles and
reports the largest shared-row gap, while existing overlap checks still report
intersections. The gap distance scales with model scale. Shared shoulder pieces
remain separate closed preview frustums whose top boundaries coincide; the mode
does not claim a boolean union or export-ready solid.

### Upper-mass placement

Version 0.1.10 stores authored `upperOffsetXMm` and `upperOffsetYMm` values in
design millimetres. They translate the upper box after its existing seeded X
shift is resolved. The seeded shift and authored placement remain independent:
changing either offset must not consume randomness or alter support identities,
dimensions or ground footprints.

Divided shoulders remain unchanged when the mass moves, exposing the resulting
bearing overhang. In shared mode each shoulder top continues to target its
corresponding upper-mass bay centre in X, so an authored X offset changes only
the shoulder's top offset while the neck and stem remain fixed. This produces a
continuous sloping row without pretending that the preview pieces are unioned.
An authored Y offset moves only the mass; actual shoulder rectangles and the
translated mass bounds drive the existing Y-bearing feedback. The later model
scale stage scales the complete resulting geometry and all distance feedback.

### Upper-mass profile

Version 0.1.11 adds a recipe-level `upperMassProfile`. `block` preserves the
existing box exactly. `tapered` replaces only that box with one rectangular
frustum whose bottom size, position and elevation equal the box it replaces.
The authored top-width and top-depth ratios scale that bottom face, and the
top X/Y offsets drift its top centre relative to the fixed bottom centre.

The operation consumes no randomness and changes no support piece. Shoulder
bearing analysis continues to use the unchanged bottom footprint; complete
scene bounds, volume and mass use the actual frustum. The existing analytic
rectangular-loft volume equation and Three.js frustum adapter therefore serve
both supports and the tapered mass without a new geometry dependency. Uniform
model scale transforms both faces and the top offset together.

### Upper/support footprint relationship

Version 0.1.12 adds a recipe-level `upperFootprintMode`. `linked` treats the
support grid as the upper mass's X/Y module system. The authored base width is
the three-column reference width, so the actual upper width is the base width
multiplied by `supportCount / 3`; changing the column count therefore adds or
removes complete bays without shrinking the remaining supports. The authored
base depth describes one row, and each additional row extends the upper depth
by one `rowSpacingMm`. Support depth continues to use the single-row base depth
so it does not inflate as rows are added.

`detached` retains the earlier calculation: upper width and depth depend only
on their authored ratios, while the support grid may extend beyond them and
produce bearing feedback. Both modes preserve support and upper Z dimensions,
seed order, placement offsets and the tapered top relationship. Selected-leg
size or placement overrides remain local and may still produce explicit
overhang instead of silently resizing the full composition.

### Semantic part copies

Version 0.1.13 stores up to 24 source-linked part copies. A copy has a stable
`copy-N` ID, one base source ID and an independent X/Y/Z translation in design
millimetres. An upper-mass source produces one copied mass. A support source
produces both its stem and matching shoulder, preserving their coincident
interface and treating the pair as one semantic leg. Duplicating a copy keeps
the same base source and adds to the existing translation.

Copy geometry is resolved after the base recipe so later global or source-shape
changes propagate into every copy without duplicating parameter schemas. A copy
of a temporarily hidden grid support remains in project data but generates no
scene pieces until its source row and column are visible again. Uniform model
scale transforms copied dimensions and translations with the rest of the
study. Only copied stems whose actual lower bound remains on Z = 0 contribute
ground contact.

Copies begin as separate closed preview solids. Their bounds and nominal volume
contribute to the study, but intersecting volume is counted once per piece until
the owner explicitly includes them in a Fuse. Copy proportion edits remain
source-linked, and no current Fuse is itself manufacture-ready export.

### Semantic Fuse groups

Version 0.1.15 stores up to 12 Fuse groups, each with a stable `fuse-N` ID and
2–24 unique source piece IDs. A source may belong to only one group. The source
recipe and copies remain project truth; the closed indexed union mesh is derived
and is never serialized as a stale geometry cache. Unfuse deletes only the
group and immediately exposes the editable sources again.

The kernel resolves Fuse groups in full-size master millimetres before the
existing uniform model-scale stage. Uniform scale commutes with union, while
this order avoids rerunning WASM when only 1:1, 1:2 or 1:4 changes. Mesh
positions, bounds, volume and ground contact then scale by `s`, `s³` and `s²`
through the same stage as analytic pieces. Three.js renders the returned indexed
mesh but does not create or validate it.

The UI preflights a new group and refuses a union with more than one connected
component. Later source edits recompute the group. If they disconnect it, the
Fuse pauses and the interface shows the separate sources plus the reason; if a
source grid part is temporarily hidden, the group stays dormant and reactivates
when that source returns. Other unfused pieces remain separately summed, so the
physical reading states whether it mixes finished unions and nominal pieces.

## Data flow

```text
Recipe parameters + stable seed
              |
              v
       Pure master generator
              |
              v
       Semantic Fuse groups
              |
              v
      Explicit model scale
              |
              +--> physical analytic and mesh pieces --> Three.js preview
              +--> physical analysis
              +--> future mesh / sections / drawings
```

React owns interaction state. The generator owns form truth. Three.js receives
scene pieces and must remain replaceable; renderer state is never project data.

## Project persistence and history

The portable project file is human-readable JSON with an explicit RAAKA format
version and a separate recipe version. Piloti recipe version 12 stores every
generator parameter, authored upper-mass placement, footprint relationship and
profile, shoulder topology, shared X/Y foot offsets, the three selected-leg
override arrays, semantic part copies, Fuse groups and one of the supported
`modelScale` presets. Recipe versions 1–11 receive an empty Fuse-group list;
recipe versions 1–10 receive an empty part-copy list; versions 1–8
receive the block upper-mass profile and latent tapered defaults; recipe
versions 1–9 receive the detached footprint relationship to preserve their
exact geometry; versions 1–7 additionally
receive zero upper-mass offsets; versions 1–6 additionally receive divided
shoulders; version 5
additionally receives an empty support-position override list; version 4
additionally receives an empty support-size override list; version 3
additionally migrates to one row with the original support depth; version 2
additionally receives an empty foot-offset override list; version 1
additionally receives zero shared offsets. A missing model
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

`src/core/generator.ts` creates the editable Piloti sources as boxes and
rectangular frustums. `src/core/studyFuses.ts` replaces active source groups
with derived closed meshes. The same result drives the object list, viewport
and physical readings. Three.js adapters convert analytic lofts and display
kernel meshes without owning either form.

The volume equation integrates the product of linearly changing width and
depth. The one-row default and non-overlapping grids can sum preview-piece
volumes directly. An authored grid, selected size, selected placement or
unfused copy may deliberately overlap another piece; RAAKA labels those
remaining sums nominal and warns about double-counting. Active Fuse groups use
the kernel's finished-union volume and remove internal contact faces.

Pieces outside a Fuse remain separate closed preview meshes, so the complete
composition is not automatically one export-ready solid. The study envelope is
computed from every analytic endpoint and finished mesh vertex. It is the
common source for physical dimensions, explicit camera framing and
directional-shadow fitting. The baseline defects and their 0.1.1 resolution are
recorded in the
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
- queued Fuse sources: blue `#287BC1`
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
