# Architecture

## Current mode

RAAKA is a browser application with a local development mode and a public static
GitHub Pages build. Vite binds local development to `127.0.0.1`; the public app
is served from `https://bambi8000.github.io/raaka/`. Neither mode has a backend,
authentication, database, analytics or server-side storage. Project recovery
remains in that browser origin, and portable studies still require Save project.

`vite.config.ts` reads `RAAKA_BASE_PATH` only during the Pages build so local
development retains `/` while GitHub assets resolve below `/raaka/`. The Verify
workflow deploys only a `main` push after both quality and secret-scanning jobs
succeed. Pull requests never deploy. GitHub's short-lived Pages identity token
is scoped to the deploy job; RAAKA has no application secret.

If the application later gains shared data, accounts or another hosted service,
hosting, authentication, privacy and security require a separate design.

## Stack

- TypeScript 6 in strict mode (enabled by the compiler's default)
- React and Vite for the application shell
- Three.js for interactive rendering only
- Vitest for unit tests
- ESLint with type-aware async rules
- pnpm with a committed lockfile

The Verify workflow runs quality and secret-scanning jobs for pull requests and
for pushes to `main`. It deliberately does not run a second push workflow for a
feature branch: that duplicate previously let a green push check appear before
the actual pull-request check, after which squash-merge branch deletion could
leave the delayed scanner without its source commit. Pull requests now have one
authoritative pre-merge run; the merged commit receives the separate `main`
run.

## Recipe and parameter contracts

Version 0.1.32 replaces the former recipe-menu metadata in `generator.ts` with
the typed registry in `recipes.ts`. An executable recipe definition binds its
durable ID and presentation text to one complete parameter schema, default
parameters, normalizer and pure generator. The application obtains both the
recipe menu and the active Piloti generator through this registry, so a
definition that is never wired is visible to automated UI coverage. Planned
definitions carry an explicit reason and no generator, defaults or parameter
schema; they cannot be mistaken for implemented recipes.

`parameterSchema.ts` defines the shared number, choice and collection forms.
`PILOTI_PARAMETER_SCHEMA` contains every persisted `PilotiParameters` key.
Numeric entries own minimum, maximum, integer and unit metadata; the existing
`PILOTI_PARAMETER_RULES` name is a compatibility view of those same objects,
not a second range table. Choice entries enumerate every legal value, while
collection entries name the semantic identity field used by authored records.
Type checking requires complete schema coverage and tests compare its runtime
keys to the default parameter object. This lays the contract for Silos without
inventing its artistic parameters before that recipe is designed.

The change is structural: generated geometry and persisted fields are
unchanged. Piloti therefore remains recipe version 21 and recovery remains
`raaka.recovery.v4`.

Manifold 3.5.3 is the accepted solid kernel for boolean geometry,
cross-sections and watertight mesh output. Version 0.1.14 adds it as a pinned
dependency after a focused gate covering deterministic booleans, planar face
contact, section agreement, topology and repeated memory cleanup. Three.js
remains a renderer only and is not an input to the kernel.

`src/core/solidKernel.ts` initializes the WASM module once, converts semantic
boxes, rectangular lofts and convex polygon lofts directly, copies finished mesh data back into
owned JavaScript arrays and explicitly deletes every Manifold and CrossSection
object. Its finishing boundary unions positive pieces, optionally subtracts
closed retained-core pieces, and returns bounds, finished-solid volume,
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
the physical study; STL export consumes that same result and future drawings
must do likewise. Camera zoom is not model scale.

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

Version 0.1.29 extracts `supportFamily.ts` as the shared four-station profile
used by both rectangular and polygon Piloti generators. For rectangles it
returns explicit foot, neck and bearing sizes; for regular polygon supports it
returns the corresponding homothetic scales. `footFlareRatio` multiplies the
legacy 1.18 X / 1.16 Y foot-to-neck factors, while `bearingScaleRatio`
multiplies the topology's 0.92 divided or 1.00 shared bearing factor. Both
default to 1, so extraction alone changes no geometry. Layout-specific code
continues to own placement, lean, linked offsets and selected size overrides.

Version 0.1.30 adds `upperMassLevels.ts` as the shared vertical partition for
rectangular and polygon upper masses. It interpolates the parent loft at equal
Z intervals, then applies one cumulative planar scale and X/Y offset to each
higher interval. Analytic boxes, rectangular frustums and polygon lofts remain
the source of truth; Three.js only renders the resulting semantic pieces. The
lowest bearing face and parent Z range are invariant. Neutral scale/offset
reconstruct the parent exactly, including tapered endpoint interpolation.

Shape-qualified IDs (`rect-level`, `hex-level`, `oct-level`) prevent dormant
edits from crossing between layouts. Ordinal IDs remain stable as level count
grows. A local mass-part override replaces only one level's top face relative
to that level's inherited bottom face; this requires profile capture to use
top-minus-bottom drift rather than treating every bottom offset as zero. Large
steps are allowed as authored form, but the existing Manifold boundary reports
multiple components and Fuse/STL refuse disconnected results.

Version 0.1.31 replaces Piloti's call-order random consumption with named
feature streams. `featureRandom(seed, featureId)` hashes the UTF-16 feature ID
with FNV-1a, avalanches it together with the unsigned project seed, then gives
the result to the existing Mulberry32 generator. The pinned stream values are a
compatibility boundary: adding or evaluating an unrelated feature does not
advance another stream. Rectangle uses separate upper-mass, shared-layout and
per-support keys; Hexagon and Octagon use shape-qualified upper and support
keys. Second- and third-row supports therefore retain their random choice when
the column count changes.

`randomLocks.ts` maps rendered pieces, mass divisions, retained core and copies
back to either `upper-mass` or one stable support ID. A lock stores that target's
seed, not frozen geometry. Generation resolves the lock seed before opening the
named stream, so authored dimensions and linked dependencies still apply. A
support lock freezes its own layout/jitter samples; an unlocked linked upper
mass may still move the support's bearing target. Copies inherit their source
lock and Fuses remain immutable until opened. Inactive shapes, removed parts
and grid slots keep their lock records.

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

In linked mode every ordinary divided or shared shoulder top targets its
corresponding upper-mass bay centre in X and row centre in Y. Authored upper
X/Y placement therefore changes only the shoulder's top offset while its neck,
stem and foot remain fixed. This produces a sloping transition and keeps the
bearing rectangle inside the linked lower mass face without pretending that
the preview pieces are unioned. A selected support's size or placement remains
authoritative and may still produce explicit overhang.

Detached mode preserves the earlier independent cantilever: divided shoulders
remain unchanged, while shared shoulders retain their continuous X alignment;
an authored Y offset moves only the mass. Actual shoulder rectangles and the
translated mass bounds drive bearing feedback. The later model-scale stage
scales the complete resulting geometry and all distance feedback.

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

Version 0.1.17 closes a mismatch between the stored relationship and its
preview: linked upper X/Y placement now shifts ordinary shoulder bearing tops
to the corresponding mass bays and rows. Stems and feet remain fixed, so the
authored cantilever is expressed by planar shoulder lean rather than an
accidental bearing overhang. Detached remains the explicit way to move the
mass independently.

### Polygon Piloti and radial division

Version 0.1.20 adds `planShape` (`rectangle`, `hexagon`, `octagon`),
`polygonMassDivision` (`whole`, `sectors`) and `radialSpreadRatio`. The normalized
generator dispatches polygon plans to `radialPiloti.ts`; the existing rectangle
path retains its geometry and random sequence. `composePiloti.ts` owns the shared
copy-before-omission order, bounds and nominal metrics for both paths.

The base circumradius is `heightMm * upperWidthRatio / 2`. Radial spread scales
the support ring; Linked applies the same radius to the upper mass, while
Detached retains the base radius. One support pair sits under each polygon side.
Its trapezoid footprint spans from the outer ring to the inner ring at
`1 - supportDepthRatio`. Homothetic neck and foot faces keep side faces planar.
Shared shoulder tops tile the ring; divided tops shrink to 92% about each local
centre. Selected X/Y size, placement and foot offsets keep their existing scope.
Linked upper offsets move only shoulder tops; stems and feet remain fixed.

Hexagonal IDs are `support-hex-N` / `shoulder-hex-N` and `upper-mass-hex6-N`;
octagonal IDs use `oct` and `oct8`. Seeded per-shape streams generate every slot
before removal. Shape changes retain dormant overrides, copies, removals and
Fuse source IDs without reassigning them to another layout. Rectangle's row,
column and depth settings remain latent in polygon mode. The polygon division
mode is shared by both polygon shapes, but their sector overrides are distinct.

`PolygonLoftPiece` stores a convex CCW footprint with uniform bottom/top scales,
endpoint offsets, position and height. Polygon tops deliberately do not use
independent X/Y ratios: those could make side quads non-planar. Analytic volume
is `A * h * (b² + b*t + t²) / 3`; bounds use all endpoint vertices, and grounded
support contact uses the bottom area. Uniform model scale transforms footprint,
position, height and offsets together, leaving dimensionless face scales intact.

Upper sectors share the parent's coordinate frame and fan from its centre to
each edge. An independent top scales about its sector centroid and adds local
signed X/Y drift; first-edit snapshots preserve the current top geometry.
Unedited sectors therefore tile every intermediate parent section. Do not
recenter sectors and reconstruct their inherited shared endpoints independently:
cancellation followed by Float32 rounding can open seams. `polygonLoftMesh`
quantizes shared world endpoints once and chooses the side-quad diagonal by
world-coordinate endpoint order, not local winding. Neighbours traverse a shared
edge in opposite directions and must still use the same physical diagonal.
Both requirements are covered by closed-mesh, union and section regressions,
including shifted tapered hexagons and octagons.

Radial bearing feedback uses convex polygon half-planes and actual pairwise
shoulder intersection area, not the polygon's bounding box or rectangle-grid
analysis. Small numerical residue is suppressed only in reported distances and
areas, never in authored geometry. Readings exclude removed original supports;
copies and remaining unfused intersections retain the nominal-volume warning.
The outer parent footprint is not a partial-bearing or structural assessment.

### Polygon foot offset space

Version 0.1.21 adds recipe-level `footOffsetSpace` (`global` or `centered`).
Only polygon Piloti reads it for geometry; Rectangle retains the field as dormant
intent. Resolve shared or selected authored offsets first, then transform them
once before writing the stem's `bottomOffset`. Global is the identity transform.
For Centered, normalize the actual neck's XY position relative to the fixed ring
origin to obtain `u = (ux, uy)`, then map `(radial, tangent)` to
`(radial*ux - tangent*uy, radial*uy + tangent*ux)`. Positive tangent is
counter-clockwise from above. At radius at most `1e-9` mm, use the source bay's
radial axis, so a neck at the origin never produces NaN or an arbitrary jump.

Do not derive this basis from upper-mass placement, the displaced foot, camera
coordinates or the current set of visible legs. Selected neck placement and
seeded neck jitter do affect the actual outward direction. Copies inherit their
source geometry before translation, preserving the source's lean direction.
Mode switching reinterprets the stored values without modifying shared or
selected arrays. Neck/shoulder interfaces, face dimensions, heights, volumes and
ground areas are unchanged; complete bounds and Fuse meshes use the moved feet.
Existing model scaling follows this operation exactly once.

The inspector distinguishes `Global / World X/Y` from `Centered / Outward /
Tangent`, relabels both shared and selected offset sliders, and measures centered
direction from outward rather than asserting one world heading for the ring.
Control influence probes the new enum against actual generated geometry,
including copied and fused sources; unchanged shoulders and zero-offset legs
are not falsely highlighted.

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

### Part removal

Version 0.1.18 stores `removedPartIds` as stable semantic IDs: `upper-mass`,
base `support-*` IDs or an existing `copy-N`. A support ID addresses both its
stem and shoulder. The pure generator first generates the complete grid and
copies, then filters removed parts. This preserves seeded choices, bay spacing,
the linked upper envelope and live copy sources even when the original is
removed. Reducing the grid still makes copies of out-of-grid sources dormant,
as before. Removed overrides and copies remain authored data until restored.

Base-grid bearing analysis excludes removed legs, and `totalSupports` counts
remaining base-grid legs; columns and rows continue to describe the authored
grid. Overhang against a removed upper mass is not reported. Dimensions, volume,
mass and contact derive from the remaining pieces. An empty study has zero
bounds and measurements, remains saveable and can be restored at every scale.
Restoring the first visible part automatically reframes the viewport, including
after loading an empty project; ordinary edits preserve the camera as before.
Saved Fuses with missing sources become dormant without deleting their intent.
Inactive Fuses remain reachable in the object list for Unfuse.

## Data flow

```text
Recipe parameters + stable seed
              |
              v
       Pure master generator
              |
              v
  positive pieces + retained-core intent
              |
              v
       Semantic Fuse groups
              |
              v
      Explicit model scale
              |
              +--> physical positive + core pieces --> Three.js preview
              +--> separate concrete/core analysis
              +--> final union - retained core --> watertight STL
              +--> future sections / drawings / manufacturing package
```

React owns interaction state. The generator owns form truth. Three.js receives
scene pieces and must remain replaceable; renderer state is never project data.

## Project persistence and history

The portable project file is human-readable JSON with an explicit RAAKA format
version and a separate recipe version. Piloti recipe version 21 stores every
generator parameter, authored upper-mass placement, footprint relationship and
profile, shoulder topology, shared X/Y foot offsets, the three selected-leg
override arrays, semantic part copies, Fuse groups, removed part IDs, upper-mass
division, mass-part overrides, plan shape, polygon division, radial spread,
foot offset space, retained-core mode and retained-core scale, concrete density
and retained-core density, foot flare, bearing scale, upper-level scale/X/Y
step and source random locks, plus one of the supported `modelScale` presets.
Recipe version 19 deliberately requires both support-family fields. There is no
version 18 fallback because RAAKA has no user project archive during this
pre-release phase; an incomplete older project file is rejected before state
replacement.
Recipe version 20 deliberately requires the upper-level scale and X/Y step.
There is likewise no version 19 fallback; the owner confirmed that no existing
project archive needs preservation during this pre-release phase. Versions
1–17 receive latent neutral-compatible defaults only as part of their existing
legacy migration chain.
Recipe version 21 deliberately requires the random-lock array. There is no
version 20 fallback because the keyed streams intentionally replace the prior
call-order geometry and the owner confirmed that no project archive requires a
compatibility bridge. Versions 1–17 receive an empty latent lock list through
their existing migration path.
Recipe versions 1–17 receive the former 2,400 kg/m³ concrete and 30 kg/m³ core
defaults, preserving geometry and previous mass readings. Recipe versions 1–16 receive disabled retained
core intent and its latent 72% default, preserving their exact solid geometry.
Recipe versions 1–15 receive `global` foot offset space, preserving their current geometry.
Recipe versions 1–14 receive
`rectangle`, `whole` polygon division and radial spread 1 without changing their
existing geometry.
Recipe versions 1–13 receive `whole` division and no mass-part overrides.
Recipe versions 1–12 receive an empty removed
part list; versions 1–11 receive an empty Fuse-group list;
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

The browser keeps a recovery copy under `raaka.recovery.v4` after every edit,
undo and redo. Recovery is not a substitute for a project file: it belongs to
one browser profile, while Save creates the portable artifact the owner can
archive. Version 0.1.31 starts the new recovery namespace instead of reading the
pre-keyed-random `v3` copy. Opening a project starts a new history; invalid
input preserves the current study and reports the reason.

Undo/redo stores immutable Piloti study snapshots—master parameters plus model
scale—capped at 100 committed steps. Live slider values update the model and
recovery copy continuously, but the pointer or keyboard gesture commits only
its starting snapshot. Renderer selection and active scope are intentionally
outside project history; scale and override edits are undoable project data.

## Current vertical slice

`massDivision.ts` splits matching proportions of the upper mass's bottom and
top rectangles. At every height the untouched cells tile the parent section
exactly, even with unequal taper and signed drift. Cells are closed analytic
boxes or rectangular lofts, with IDs `upper-mass-x2-N`, `upper-mass-y2-N` or
`upper-mass-xy4-N`; changing topology cannot attach an edit to a different cell.
An independent override snapshots the current local profile on first edit,
then stores top ratios and design-millimetre drift. The bottom footprint and
height remain driven by shared dimensions; no new renderer-owned geometry exists.

Inactive division overrides, removals and source-linked copies retain intent.
Whole-mass copies still use the unpartitioned parent; cell copies use one live
cell with the existing `upper-mass-copy-N` piece identity. Copies resolve before
omissions, so removing an original cell does not remove its copies. Removing
`upper-mass` omits all original cells too. Fuses containing inactive cells or
the inactive whole parent remain dormant. The existing bearing analysis covers
the parent outline, not partial support after cell removal; the UI states this
limitation rather than claiming structural safety. Shared-profile highlighting
is derived from the generator and stays neutral for independently overridden tops.

The same division choice can instead select two, three or four Z levels.
`upperMassLevels.ts` serves both `generator.ts` and `radialPiloti.ts`, preserving
shape-specific analytic output and IDs. Step scale and X/Y offset are cumulative
from the lowest level. The object list, selection-focused controls, removal,
copies and Fuse all consume those IDs through the existing generic paths.
Plan division and Z division are intentionally mutually exclusive in this
release; an XYZ cell lattice, unequal level heights and per-level translation
remain separate future operations rather than hidden complexity in one control.

`src/core/generator.ts` creates the editable Piloti sources as boxes and
rectangular frustums, or delegates polygon plans to `radialPiloti.ts` for convex
polygon lofts. `src/core/studyFuses.ts` replaces active source groups
with derived closed meshes. The same result drives the object list, viewport
and physical readings. Three.js adapters convert analytic lofts and display
kernel meshes without owning either form.

`src/core/retainedCore.ts` derives the first non-positive semantic piece from
the original whole upper mass. The core is homothetic and centred in the
source: box dimensions shrink about the centre; rectangular and polygon lofts
trim both Z caps, interpolate the outer cross-section and centreline at those
caps, then shrink the resulting sections. It is therefore contained by the
convex source for block and tapered profiles. The analysis carries status,
pieces, physical volume, authored-density mass and conservative minimum axis
cover separately from `study.pieces` so positive union logic cannot count foam
as concrete. Division, removal or an unsupported analytic source returns a
paused status with no subtractor and retains the authored parameters.

`composePiloti.ts` subtracts active core volume from nominal positive volume,
then reports concrete and retained-foam mass at the authored recipe densities.
`studyFuses.ts` preserves the same single deduction after live positive pieces
are unioned. `modelScale.ts` preserves density, scales core geometry and cover
linearly, and scales both material volumes and masses cubically. The object list and viewport append the
core only for inspection; blue transparent rendering is a semantic projection,
not an additive scene solid.

`stability.ts` derives exact volume centroids for the current analytic pieces
and completed Fuse meshes. Rectangular loft centroids integrate their changing
cross-section and centreline; polygon lofts additionally use the true footprint
centroid; indexed meshes use signed tetrahedral moments about a local reference
to avoid world-origin cancellation. The manufactured mass centre sums concrete
moments, subtracts concrete displaced by an active retained core and adds the
core back at its foam density.

Material density is recipe state, not geometry state. `pilotiParameters.ts`
normalises concrete to a whole 800–4,000 kg/m³ and retained core to a whole
10–500 kg/m³. The manufacturing panel writes those fields through the same
history and recovery path as form parameters but does not mark them as controls
that reshape the current selection. `MassStudy` carries the effective concrete
density explicitly so asynchronous Fuse resolution cannot fall back to a stale
global assumption. Retained-core analysis carries its effective density even
while paused or disabled. Geometry, bounds, volume and solid export do not read
either density.

Grounded stem faces and grounded finished meshes contribute contact vertices.
A deterministic monotonic-chain hull forms the convex support polygon. The
minimum signed perpendicular distance from the X/Y mass projection to its CCW
edges is the support reserve: positive inside, zero on an edge and negative
outside. Uniform model scale transforms the centre, projection, polygon and
reserve linearly. Fuse resolution recomputes the analysis from the finished
mesh, while other unfused overlaps keep the same nominal-volume limitation as
the material estimate. The Three.js overlay only visualises this derived model
truth and is not selectable or persisted.

The volume equation integrates the product of linearly changing width and
depth. The one-row default and non-overlapping grids can sum preview-piece
volumes directly. An authored grid, selected size, selected placement or
unfused copy may deliberately overlap another piece; RAAKA labels those
remaining sums nominal and warns about double-counting. Active Fuse groups use
the kernel's finished-union volume and remove internal contact faces.

Pieces outside a Fuse remain separate closed preview meshes during editing.
The STL boundary resolves all visible positive pieces into a final union,
subtracts any active retained core, and refuses multiple positive connected
components. A closed inner cavity adds a boundary shell but does not become a
second loose object. The study envelope is
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
supported scale and height. Version 0.1.17 removes distance fog entirely, so
zooming out never fades geometry or the drawing-like grid into artificial haze.

## Selection colours

- selected: yellow `#FFD400`
- queued Fuse sources: blue `#287BC1`
- void/destructive: magenta `#E33B97`
- core/guide: blue `#287BC1`
- primary mass and supports: neutral concrete greys

Roles are semantic model data. Colours are a UI projection of those roles.

`controlInfluence.ts` derives global control highlighting from the actual pure
generator: it probes each allowed parameter range and compares the selected
analytic piece's geometric values with a small numeric tolerance. Copies follow
their source shape; Fuse selection checks the group's currently available source
pieces without invoking WASM. The result is memoized by parameters and selection
and never enters project or history data. Local copy translation and selected
support overrides have explicit local scope; foot lean affects stems, not
shoulders. In Show all mode, grey controls remain editable and describe the
absence of an effect on the current selection, rather than a disabled control.

Version 0.1.22 adds `inspectorControls.ts` as a pure reachability layer over that
influence set. It retains geometry-neutral enabling choices for currently live
sources: footprint linkage, inherited upper profiles and polygon-stem offset
space. An independent cell or its copy does not regain irrelevant shared top
controls. Fuse visibility is the union of its live sources, not a mesh probe.

`InspectorControls` supplies a view-only React context to the shared range
field; irrelevant sliders are omitted from the DOM in relevant mode, not merely
dimmed or hidden with CSS. Conditional groups also omit unrelated headings,
switches and lean readouts. Local selected-leg/cell/copy fields keep explicit
scope. A contextual core-size field can remain visible without falsely claiming
yellow influence over the selected outer surface. An empty influence/enablement set falls back to the full inspector with
an explanation. Model scale and manufacturing readings remain available.
The Show all flag is transient UI state, outside files, recovery and history;
recipe version 17 and every geometry parameter remain unchanged. Server-rendered
App tests check actual wiring as well as pure relevance and field visibility.

The object list is shared by the desktop sidebar and the compact Objects
disclosure, so Restore and inactive-Fuse access do not disappear below the
sidebar breakpoint. A sticky selection label keeps the target visible while
scrolling through controls. Yellow field borders and SELECTED labels supplement
colour, and sliders expose their current influence through accessible text.

### Creation workflow and progressive disclosure

Version 0.1.37 adds transient Create/Edit/Make navigation. `CreatePanel` writes
the same typed parameter updates and history gestures as the detailed editor;
it introduces no new recipe defaults or geometry transformations. All three
workflow panels remain mounted, with native `hidden` removing inactive panels
from interaction and accessibility. The viewport remains mounted across
navigation. Selecting a part opens Edit; selecting the retained core opens Make.

`InspectorSection` uses native details/summary with local open state. The edit
context is keyed by semantic selection so local sections begin open for a new
target while unrelated rerenders retain disclosure choices. Selected copy and
mass-part controls precede shared groups. `RangeField` also supports exact
number-only entry and discrete count buttons, sharing validation, scope and
the existing one-gesture history boundary with sliders.

Selected-leg scope now starts local. A first numeric, proportion or lean edit
writes all three override arrays from current inherited values in one study
replacement; selecting the leg alone creates no model change. Use shared removes
the same arrays. Geometry and project contracts are unchanged: Piloti remains
version 21 and recovery remains `raaka.recovery.v4`. The compact warning entry
reads the existing support/radial layout, stability, core and Fuse analysis
before linking to the full Make panel.

Version 0.1.38 adds `upperSilhouette.ts` with pure, idempotent shared-top actions.
Narrow and wide presets write the tapered profile, equal top ratios and zero
X/Y drift together; centering writes only the drift fields. `App` performs one
study replacement for each action, not several single-key updates that could
overwrite each other through a stale render closure. `UpperTaperActions` is
shared by Create and the detailed editor; preset selection is derived from
actual ratios and drift, never a saved preset flag. Polygon matching ignores
the dormant depth ratio. Existing local overrides and all unrelated parameters
are retained. Only the new-study latent X top drift changes from 120 mm to zero;
the default block geometry, project parsing and legacy migrations are unchanged.
No schema field changes: Piloti remains recipe version 21 and recovery v4.

### Direct translation handles

Version 0.1.23 adds `translationGizmo.ts` as the pure boundary between semantic
selection and viewport interaction. It derives one target from the generated
physical study: shared upper X/Y placement, complete selected-leg X/Y placement
or copied-part X/Y/Z placement. Original divided mass cells deliberately resolve
to the shared upper offsets. Fuse meshes, removed parts and dormant copies have
no target. Applying a target writes the existing Piloti parameters; Three.js
never becomes model truth.

The viewport attaches `TransformControls` to an otherwise empty scene object at
the selected target's measured physical centre. Moving that object is converted
back through model scale and snapped to one design millimetre before the pure
parameter update. Unsupported axes are hidden and bounded to the same ranges as
the inspector. A selected-leg move creates complete foot, size and position
override entries so its inherited lean and proportions do not change later when
shared values change.

Pointer-down starts the existing history gesture, continuous object changes
replace the current study, and pointer-up commits one entry. Escape resets the
control and dispatches `cancel-gesture`, restoring the exact pre-drag study
without consuming redo. OrbitControls are disabled only while the transform is
dragging. The existing sliders remain the keyboard path. Gizmo state, selection
and its overlay are transient UI projections; recipe version 16, project files
and recovery format are unchanged.

### Exact numeric parameter entry

Version 0.1.24 keeps `RangeField` as one semantic control while presenting two
editing surfaces: the existing range input and a direct number input. A pure
`numericInput.ts` boundary owns display scaling, parsing, finite/range/step
validation and stable decimal formatting. Stored recipe values remain in their
existing units. Millimetres map one-to-one, normalized proportions map to whole
percent values, and discrete counts retain their integer step.

A number field holds only a transient text draft while focused. Enter validates
and dispatches one complete history gesture; Escape restores the live value
without history; blur commits a valid change or restores an invalid draft with
an explicit reason. External study changes update an unfocused field but do not
overwrite an active draft. Range inputs and millimetre entry share a one-design-
millimetre step, preventing the browser from displaying a rounded slider value
beside a more precise model value. This is interface state only: recipe version
16, project serialization, recovery and generated geometry remain unchanged.

### Manufacturing STL boundary

Version 0.1.25 makes `stlExport.ts` the first manufacturing output boundary.
The caller passes `study.pieces`, which is already the uniformly scaled physical
study produced by `scaleMassStudy`; the exporter never re-reads master recipe
dimensions or applies a second scale. `finishScenePieces` accepts one or more
analytic or derived pieces, converts them through the existing Manifold adapter
and returns one indexed union mesh with kernel bounds, volume and connected-
component count. Existing user-authored Fuse groups have already replaced their
visible sources before this final whole-study union.

Export accepts exactly one connected result. An empty study and a union that
decomposes into multiple solids stop with explicit, actionable messages. This
prevents a single STL filename from concealing independent loose parts. The
positive sculpture is encoded as binary STL with finite Float32 vertices,
outward unit normals, zero attribute words and an exact `84 + 50n` byte length.
The header records `UNITS=MM` and `Z=UP`; STL has no standard unit field, so the
contract is that numeric coordinates are millimetres. Z = 0 and the authored
X/Y origin are preserved.

The UI downloads a seed- and scale-labelled file and reports triangle count,
physical W × D × H and finished-solid litres. No project data or history is
changed. Unit fixtures independently parse the bytes and verify bounds,
watertight edges, normals, signed volume and cubic scaling at 1:1, 1:2 and 1:4.
A written six-leg, two-row 1:4 file is also loaded through Kerros's real
`meshImport.ts`: it is detected as binary STL, retains its 361.4 × 275.0 ×
500.0 mm envelope and returns zero open edges. Mould construction and stock
compensation remain Kerros responsibilities.

Version 0.1.26 extends the same boundary with explicit subtractors. The caller
passes physical positive pieces and physical retained-core pieces separately.
The kernel measures positive connected components before subtraction, then
returns the difference mesh; this accepts a connected sculpture with a sealed
internal cavity while still refusing a composition that began as loose positive
islands. Export volume must equal the reported concrete volume for non-overlap
fixtures. Regression tests cover box subtraction, outward/inner winding, zero
open edges, unchanged outer bounds, model scale and cleanup.

The browser release fixture uses a 1:4 Piloti with an 80% retained box core.
The actual downloaded file contains 96 triangles and reports 5.34 L of finished
concrete. Kerros's production `meshImport.ts` recognises it as binary STL with a
270.0 × 127.5 × 375.0 mm envelope, zero open edges, no warnings and positive
5,342,765.66 mm³ signed volume. This verifies the sealed inner shell across the
real handoff; it does not validate foam placement or casting in material.

## Drawing pipeline

Version 0.1.34 starts the drawing boundary with vertical finished-solid
sections. `sectionScenePiecesAtPlane` receives the already model-scaled scene
pieces used by the viewport and STL path. It unions positive pieces, subtracts
active retained-core pieces and only then slices the result. A 90-degree exact
Manifold rotation reuses its horizontal cross-section operation: an X plane
maps back to drawing coordinates Y/Z, while a Y plane maps to X/Z. Z remains
positive upward in both views. Simplification happens inside the kernel before
polygons leave the WASM boundary, so preview triangulation diagonals are never
drawing paths.

Version 0.1.35 adds `projectScenePiecesAlongAxis` at the same finished-solid
boundary. It unions positive pieces, subtracts active retained cores and calls
Manifold's exact 2D projection after an axis-aligned rotation. World Z produces
an X/Y plan, world X produces a Y/Z elevation and world Y produces an X/Z
elevation. Because projection happens after the boolean result is complete,
overlapping pieces do not leave duplicate strokes and a fully enclosed
retained core does not appear in the exterior silhouette. These orthographic
views deliberately contain exterior silhouettes only; they do not claim
visible crease or hidden-line extraction.

Version 0.1.36 adds `orthographicCreases.ts` after that same finished-solid
boundary. Plan, X elevation and Y elevation are viewed from the positive Z, X
and Y sides respectively, with sight rays travelling along the negative axis.
The extractor canonicalises Manifold's merged vertices, builds triangle-edge
adjacency and compares the two outward face normals at every shared edge.
Coplanar triangulation diagonals remain below the authored 5–90° threshold;
30° is the workspace default.

A candidate must border at least one front-facing face and no back-facing face.
For every candidate, projected barycentric intervals identify where a nearer
front-facing triangle covers the segment; depth is affine on both the edge and
triangle, so the exact crossing splits visible from occluded portions without
a raster depth buffer. Segments already carried by the exterior outline are
removed, and equal remaining segments are deduplicated. This produces visible
crease paths only. Hidden edges are omitted; a later drawing decision may map
selected hidden geometry to dashed lines, but 0.1.36 does not imply that policy.

`drawing.ts` defines path-set format `raaka.path-set` version 1. The contract
is renderer-independent JSON-shaped data with `units: "mm"`, a Cartesian
coordinate system, explicit section plane or projection axis and direction,
horizontal and vertical world-axis names, measured net cut or projected area,
bounds and paths. Section and outline paths are closed polylines; visible
creases are open two-point paths with semantic role `crease`. Section holes
such as a retained core remain separate rings.
Coordinates always describe the manufactured physical model in millimetres.
Paper scale does not rewrite this path set.

The initial SVG serializer is deliberately line-only. It groups paths into
named `layer-section`, `layer-outline` or `layer-crease` groups, uses no polygon
fills or text strokes, inverts only the SVG display Y axis and derives a tightly
bounded millimetre page. The selected paper denominator scales the physical
bounds, a 10 mm paper margin and a 0.35 mm paper stroke independently from
model scale. Metadata records the path-set version, millimetre units, paper
scale and any active crease threshold. Empty cuts and drawings with no enabled
line roles are refused with an explicit reason instead of producing a
valid-looking blank document. Hiding Outline keeps the complete projection
bounds so role comparison does not resize the sheet.

Selected drawing view, section plane position, paper scale, enabled line roles
and crease threshold are drawing-workspace state, not recipe geometry, recovery
history or portable project data. These views therefore keep Piloti recipe
version 21 and recovery v4. Standard paper sizes, saved drawing sheets, hidden
edge styling, dimensions, hatching, annotations and the Muusia adapter remain
later drawing work; the current SVG must not be mistaken for the RAAKA 1974
document preset.

## Interface themes

### Viewport lifecycle

Version 0.1.33 gives each generated piece one viewport visual record containing
its semantic source, mesh and crease edges. Study changes still replace the
analytic render geometry, but selection, Fuse selection and theme changes call
`applyPieceAppearance` on the existing records. That path changes material
colour and retained-core opacity only; mesh and edge geometry identity stays
fixed. The core edge now follows the same blue/yellow state as its translucent
surface instead of retaining the colour captured at construction.

The viewport no longer owns a perpetual animation loop. Resize, camera
controls, model replacement, material changes, gizmo interaction and explicit
Fit/Home actions invalidate one frame. Orbit damping requests further frames
only while `OrbitControls.update()` reports movement. A lost graphics context
pauses requests until restoration or an explicit retry.

`viewportLifecycle.ts` owns renderer startup and resource disposal. Startup
exceptions become a visible **3D preview unavailable** state; context loss uses
the same retry path without taking project, save or inspector controls away.
Cleanup removes listeners and releases model/overlay geometry and materials,
the current grid and ground, transform/orbit controls, directional shadow,
renderer lists, renderer state and the WebGL context. Shared resources are
deduplicated before disposal. Retry recreates the runtime and rebuilds current
study visuals from the unchanged model state. No project or geometry schema
changes, so Piloti remains recipe version 21 and recovery remains v4.

Version 0.1.16 defaults to a charcoal dark interface and provides an explicit
top-bar switch to the original light interface. Both palettes preserve the
same semantic accent roles: yellow is current selection, blue is constructive
secondary geometry and magenta is destructive or void geometry. The Three.js
viewport changes its background, ground, grid, neutral materials and ambient
lighting with the interface while retaining the current camera and model.

The preference is stored locally under `raaka.ui-theme.v1`. It is deliberately
outside the portable project format, recovery payload and undo/redo history:
changing viewing comfort must not make a geometry study dirty. Missing,
invalid or unavailable storage resolves safely to dark. CSS variables own the
application chrome palettes; Three.js consumes an equivalent typed palette and
does not change model roles or geometry.

## File boundaries

The first transfer to Kerros uses binary STL because Kerros already imports it.
Long term, an STL-only handoff is insufficient: it discards planar face
identity, cast direction, surface intent, core roles and recipe metadata. A
RAAKA manufacturing package should eventually carry the solid plus explicit
intent without passing exact planes through Kerros's generic voxel import.

The Muusia boundary is 2D vector geometry in millimetres. RAAKA keeps semantic
drawing roles; a Muusia adapter maps them to path-set outputs and pens.

## Safety boundary

Material volume and mass are arithmetic estimates. The centre-of-mass check can
identify an obviously unsupported form by comparing its vertical projection to
the convex hull of grounded support faces. It does not prove that parts are
connected, that the foot or ground can carry the load, or that a positive
reserve is sufficient. RAAKA does not approve structural capacity, lifting,
reinforcement, anchors, weather exposure or public safety.
