# Roadmap

Proposed implementation order after the [2026-09-20 review](AUDIT-2026-09-20.md)
of version 0.1.0. These are delivery gates, not date commitments. Unchecked
items remain unimplemented. The review contains reproductions and evidence;
this file owns the proposed order. Incorporate the owner's visual feedback
before changing the form language.

Confirmed additions from the owner on 2026-09-20: physical scale models at
1:2 and 1:4, repeated support rows in depth, and explicit X/Y foot offsets for
leaning legs. These are specified in [Product definition](PRODUCT.md) and
[Architecture](ARCHITECTURE.md). Shared foot offsets are implemented in 0.1.3;
selected-leg overrides are implemented in 0.1.4; model-scale presets are
implemented in 0.1.5; support grids and layout feedback are implemented in
0.1.6; selected-support proportions are implemented in 0.1.7.
Selected-support placement is implemented in 0.1.8.
Divided and shared shoulder rows are implemented in 0.1.9.
Authored upper-mass placement is implemented in 0.1.10. A reusable high-rise
articulation module with balconies, windows and exterior doors is planned after
the initial recipe and drawing foundations.
Block and tapered upper-mass profiles are implemented in 0.1.11.
Linked and detached upper/support footprints are implemented in 0.1.12.
Semantic upper-mass and complete-support copies are implemented in 0.1.13.

## 0.1 — foundation

- [x] React, TypeScript and Three.js application shell
- [x] local-only network binding
- [x] strict verification and CI
- [x] RAAKA interface palette and selectable scene objects
- [x] deterministic Piloti generator
- [x] one-to-two metre physical scale
- [x] summed piece volume, approximate mass and ground contact readings
- [x] baseline code, geometry, browser and CI review recorded

The baseline is a working study prototype. Manufacturing export, cores and five
of the six recipe families are not yet implemented. Version 0.1.1 closes the
measured geometry and viewport defects; version 0.1.2 begins durable study
work with project files, recovery and history; version 0.1.3 adds authored
shared leg lean; version 0.1.4 adds per-leg overrides; version 0.1.5 adds
physical model scales; version 0.1.6 adds support grids.
Version 0.1.7 adds selected-support proportions.
Version 0.1.8 adds selected-support placement.
Version 0.1.9 adds divided and shared shoulder topology.
Version 0.1.10 adds authored upper-mass cantilever in X/Y.
Version 0.1.11 adds a tapered upper-mass profile.
Version 0.1.12 links upper X/Y dimensions to the support grid by default.
Version 0.1.13 adds source-linked semantic part copies and X/Y/Z placement.

## 0.1.1 — correct the baseline

- [x] A01: compute the complete geometry bounds, not just upper-mass size
- [x] A02: fit the shadow camera to model and receiver; verify Z-up lighting
- [x] A03: supply the required automatic token to PR secret scanning and
  verify push, ordinary PR and Dependabot PR events
- [x] A05: distinguish clicks from orbit drags and reconcile deleted selections
- [x] preserve the camera across seed changes; make Fit and Home explicit
- [x] add geometry regressions for envelope, winding, closed edges, signed
  volume, ground plane and matching stem/shoulder interfaces
- [x] cover extreme height/proportion inputs and reject non-finite parameters

Done when the seed-319 envelope fixture agrees with all generated corners,
contact shadows work at both ends of the height range, selection is predictable
and the required checks pass on both push and pull-request events.

Completed in 0.1.1. GitHub evidence includes successful
[push](https://github.com/Bambi8000/raaka/actions/runs/35507704816) and
[ordinary pull-request](https://github.com/Bambi8000/raaka/actions/runs/35507713276)
runs for the release branch, followed by successful
[Dependabot push](https://github.com/Bambi8000/raaka/actions/runs/35507857560)
and [Dependabot pull-request](https://github.com/Bambi8000/raaka/actions/runs/35507859175)
runs after the bot rebased PR #6.

## 0.1.2 — preserve and inspect a study

- [x] project save and open with format and recipe versions, seed, parameters
  and model scale (defaulting to 1:1 for older studies)
- [x] validate complete files before replacing the current study
- [x] local recovery with explicit saved/recovered state
- [x] undo/redo, reset and direct seed entry; one undo step per slider gesture
- [ ] camera view presets: front, side, top and axonometric
- [ ] numeric inputs alongside sliders; explicit mm and percentage readouts
- [x] separate composition controls from selected-object information
- [ ] compact drawers/tabs that retain recipe, object and seed actions
- [ ] expose selection to assistive technology and preserve keyboard access

Done when an edited study survives save/open and reload, undo restores the
previous committed edit, invalid files leave current work intact, and essential
actions remain reachable in desktop and compact layouts.

## 0.1.3 — shared Piloti leg lean

- [x] shared Foot offset X/Y controls in design millimetres
- [x] keep every bottom face horizontal at Z = 0 and every neck joined to its
  shoulder while moving the support footprint
- [x] show the derived authored angle and foot direction without replacing the
  stored millimetre offsets
- [x] keep seeded Asymmetry as separate per-leg variation
- [x] update complete bounds while preserving shear-invariant volume, mass and
  ground-contact area
- [x] persist both offsets in Piloti recipe version 2 and migrate recipe version
  1 projects to zero offsets
- [x] include offset edits in local recovery and one-step slider undo/redo

Done when positive and negative offsets remain finite at supported limits,
every stem stays grounded and joined, older projects open unchanged, and the
same authored offset visibly affects every current leg.

## 0.1.4 — selected Piloti leg overrides

- [x] explicit Shared and Selected lean scopes in the inspector
- [x] resolve a selected stem or shoulder to the same named support
- [x] create an absolute selected-leg override from the current shared values
- [x] remove an override with Use shared without changing other legs
- [x] retain temporarily hidden overrides when support count is reduced
- [x] reject invalid IDs, duplicate entries and invalid values before generation
- [x] persist overrides in Piloti recipe version 3 and migrate versions 1 and 2
- [x] include override creation, editing and removal in recovery and undo/redo

Done when one selected leg can diverge from the shared X/Y offsets, the scope is
always visible, another leg remains unchanged, and save/open plus history retain
the distinction.

## 0.1.5 — physical scale models for testing

- [x] preserve full-size master parameters and add a separate uniform Model scale
- [x] presets 1:1, 1:2 and 1:4
- [ ] validated custom scale or target height
- [x] allow physical results below 1,000 mm without reapplying the design clamp
- [x] scale all geometry and offsets about the ground origin without rerolling
- [x] show master size and manufactured size distinctly; report scaled bounds,
  volume, mass and ground-contact area from the physical study
- [x] persist scale and include it in undo/recovery; repeatable return to 1:1
- [x] test linear dimensions by `s`, areas by `s²`, volumes and fixed-density
  mass by `s³`, including asymmetric and selected-leg-leaning studies
- [x] repeat the scale fixtures when multi-row studies exist
- [x] preserve view direction and automatically reframe after scale changes
- [ ] require future mesh/drawing exports to use this same physical geometry,
  with drawing paper scale and Kerros stock/kerf kept separate

Done when a saved 2,000 mm study yields faithful 1,000 mm and 500 mm models,
with unchanged seed/master parameters, correct physical readings and no drift
when switching scales repeatedly. Export verification follows as the output
milestones land; this stage does not imply that export already exists.

## 0.1.6 — Piloti support grids

- [x] preserve one-row defaults and existing first-row IDs
- [x] repeat one to six X columns through one to three Y rows
- [x] expose upper width, upper depth, support depth and Y row spacing
- [x] keep seeded first-row shapes stable when rows are added
- [x] address later-row stems and shoulders with stable row/column IDs
- [x] apply shared and selected X/Y foot offsets to every visible row
- [x] report adjacent shoulder overlap and upper-bearing overhang without
  silently resizing authored geometry
- [x] scale grid geometry and layout feedback at 1:1, 1:2 and 1:4
- [x] persist grid parameters in Piloti recipe version 4 and migrate versions
  1–3 to the original one-row layout

Done when a three-column/two-row study produces six grounded stems and six
matching shoulders, later-row legs remain selectable and editable, layout
problems are explicit, and save/recovery/history/model scale preserve the grid.

## 0.1.7 — selected Piloti support proportions

- [x] treat a selected stem and shoulder as one semantic support
- [x] add bounded 55–145% width and depth scales relative to the shared leg
- [x] preserve support position, height, seeded variation and joined interfaces
- [x] keep neighbours unchanged when one support is resized
- [x] recompute bounds, nominal volume, mass and ground contact
- [x] measure adjacent-column overlap and side-bearing overhang from actual
  shoulder footprints
- [x] combine selected lean and size in one visible create/remove workflow and
  one undo step
- [x] persist size overrides in Piloti recipe version 5 and migrate versions
  1–4 to shared support sizes
- [x] scale selected proportions and layout feedback at 1:1, 1:2 and 1:4

Done when either member of a selected support pair exposes the same width and
depth override, another support remains byte-for-byte unchanged, unsafe layout
growth is reported rather than corrected, and save/recovery/history retain the
edit.

## 0.1.8 — selected Piloti support placement

- [x] add selected X/Y placement relative to the generated support grid
- [x] translate the complete stem-and-shoulder pair without changing lean
- [x] preserve joined interfaces, height, size and seeded variation
- [x] keep neighbours unchanged and recompute the complete study envelope
- [x] preserve volume, mass and ground-contact area under translation
- [x] require actual two-axis intersection for row and column overlap warnings
- [x] report cross-grid collisions between supports that are not neighbours
- [x] include placement in the combined selected-leg create/remove workflow
- [x] persist placement in Piloti recipe version 6 and migrate versions 1–5
- [x] scale position and collision distances at 1:1, 1:2 and 1:4

Done when a selected support can move independently without deforming or
disconnecting its pair, warnings follow the translated bearing rectangles, and
save/recovery/history preserve the authored position.

## 0.1.9 — divided and shared Piloti shoulders

- [x] preserve the existing divided shoulder topology
- [x] add shared shoulder tops that meet continuously across each X row
- [x] retain seeded neck variation while aligning shared top faces
- [x] keep stems, joined interfaces, support IDs and random streams unchanged
- [x] let selected size and placement override shared-row continuity
- [x] measure shared-row gaps and existing overlaps from actual top rectangles
- [x] scale gap feedback at 1:1, 1:2 and 1:4
- [x] persist topology in Piloti recipe version 7 and migrate versions 1–6 to
  divided shoulders
- [x] state explicitly that shared preview pieces are not yet a boolean union

Done when the unedited shared row has coincident neighbouring top boundaries,
divided mode preserves the previous model, authored deviations produce explicit
gap or overlap feedback, and save/recovery/history retain the topology.

## 0.1.10 — authored upper-mass placement

- [x] add independent upper-mass X/Y offsets in design millimetres
- [x] preserve the existing seeded X shift as a separate deterministic choice
- [x] leave divided supports unchanged when the upper mass moves
- [x] align shared shoulder tops to the offset mass in X while retaining their
  fixed neck and stem geometry
- [x] derive X/Y bearing overhang from the actual translated mass bounds
- [x] include the complete offset geometry and feedback in model scaling
- [x] persist placement in Piloti recipe version 8 and migrate versions 1–7 to
  zero upper-mass offsets
- [x] include both controls in recovery and one-step slider undo/redo

Done when an authored cantilever changes only the upper mass and the required
shared shoulder top offsets, never rerolls a seeded choice, produces explicit
bearing feedback and survives save, recovery, history and model-scale changes.

## 0.1.11 — tapered Piloti upper mass

- [x] preserve the existing block profile exactly
- [x] add a tapered rectangular-loft profile with an unchanged bottom bearing
  face
- [x] add independent top width and depth ratios
- [x] add authored top X/Y drift in design millimetres
- [x] preserve every support, shoulder interface, support ID and random stream
- [x] derive bounds, nominal volume and mass from the complete tapered geometry
- [x] scale both faces and top drift uniformly at 1:1, 1:2 and 1:4
- [x] persist the profile in Piloti recipe version 9 and migrate versions 1–8
  to the block profile
- [x] include profile and tapered controls in recovery and undo/redo

Done when switching to Tapered changes only the upper mass above its fixed
bearing face, its physical readings follow the analytic loft, Block reproduces
the previous model exactly and both profiles survive persistence and scaling.

## 0.1.12 — linked Piloti footprint

- [x] link the upper X/Y footprint to support columns, rows and row spacing by
  default while keeping all Z proportions independent
- [x] preserve one support-bay width when columns are added or removed instead
  of squeezing the same upper width into a different count
- [x] extend upper depth by row spacing while preserving the single-row support
  depth module
- [x] add an explicit detached mode for independent upper X/Y sizing
- [x] keep selected-leg size and placement overrides local and continue to
  report any resulting overhang
- [x] include the relationship in recovery, undo/redo and recipe version 10
- [x] migrate recipe versions 1–9 to detached mode so saved geometry is exact
- [x] preserve linked and detached behavior at 1:1, 1:2 and 1:4 model scales

Done when adding supports extends a linked composition in the corresponding
plan axis without changing its Z structure or shrinking existing leg modules,
Detached reproduces the prior independent footprint, and both modes survive
persistence, history and scaling.

## 0.1.13 — semantic Piloti part copies

- [x] duplicate a selected upper mass as one semantic mass
- [x] duplicate either member of a selected support as its complete connected
  stem-and-shoulder pair
- [x] assign stable copy IDs and independent X/Y/Z translation in design
  millimetres
- [x] let duplicate-of-copy preserve the base source and continue from the
  selected copy's offset
- [x] retain copies of temporarily hidden support sources without generating
  orphan preview pieces
- [x] include copies in bounds, nominal volume and grounded-contact analysis
- [x] scale copy geometry and translation uniformly at 1:1, 1:2 and 1:4
- [x] include copy creation, placement and removal in project files, recovery,
  undo/redo and Piloti recipe version 11
- [x] label copies as separate preview solids whose intersections are
  double-counted until Fuse exists

Done when the inspector can duplicate and place either major Piloti part type,
a copied leg retains its joined interface, hidden sources recover predictably,
save/history/model scale preserve the result, and the interface never presents
preview overlap as a completed union.

## 0.2 — Piloti as a complete recipe and first manufacturing handoff

- [x] independent upper width and depth controls
- [ ] reusable stem/neck/shoulder/bearing support family
- [x] single, pair, row and grid support topology with independent Columns (X)
  and Rows (Y); preserve the one-row default
- [x] shared support template, explicit support depth and Y row spacing;
  repeat authored leg shapes and report overlaps or missing upper bearing
- [x] shared and divided shoulders
- [x] shared Foot offset X/Y for deterministic leg lean, with ground faces at Z = 0
  and matching stem/shoulder interfaces
- [x] explicit selected-leg offsets with visible shared/selected scope
- [x] explicit selected-leg width and depth with the same visible scope
- [x] selected support placement offsets
- [x] authored X/Y upper-mass cantilever
- [x] tapered upper mass with authored top proportions and drift
- [x] linked/detached upper footprint with support-grid X/Y coupling only
- [x] source-linked upper-mass and complete-support copies with X/Y/Z placement
- [ ] stepped or multi-part asymmetric upper masses
- [ ] stable per-feature random streams, durable IDs and lock controls
- [ ] a shared parameter schema and actual recipe definitions beyond menu metadata
- [ ] focused solid-kernel spike before committing to a boolean dependency
- [ ] union preview pieces and resolve internal contact faces
- [ ] editable density, centre-of-mass projection and support-polygon feedback
- [x] geometric bearing/contact feedback without automatic aesthetic correction
- [ ] retained lightweight core intent, preview and matching solid subtraction
- [ ] separate concrete/core volume and mass, with explicit material assumptions
- [ ] STL export from the finished watertight solid
- [ ] a measured millimetre round trip into Kerros
- [ ] update selection materials without rebuilding geometry; complete unmount
  cleanup and provide a visible WebGL failure state

The default solid estimate is approximately 1,409 kg at 1.5 m height. Weight
and core support belong here, not after decorative articulation. A void or core
must affect both finished geometry and the reported concrete volume.

The kernel gate must exercise coplanar/touching joins, subtractions, thin
regions, topology, volume agreement, sections and memory cleanup. Existing
preview meshes cannot simply be concatenated for manufacturing export.
Start with a few fixtures and expand tests with each supported operation.

Done when the same saved Piloti study drives the preview, physical estimates
and a watertight, correctly scaled Kerros import. Mould design stays in Kerros.
Include a three-column/two-row fixture with six stems and six shoulders,
positive/negative X/Y foot offsets, and 1:1/1:2/1:4 variants. Verify stable
identities, finite planar geometry, coincident interfaces, correct bounds and
volume, ground contact and explicit overlap/bearing feedback.

## 0.3 — first useful drawing output

Moved ahead of the complete recipe set: vector drawings are a core outcome,
and one recipe is enough to validate that workflow. The hidden-line spike can
begin during 0.2; finished drawing output must agree with the final solid.

- [ ] orthographic plans and elevations
- [ ] sections at authored planes
- [ ] silhouette and crease extraction with no triangulation diagonals
- [ ] hidden-line removal spike, including overlapping coplanar pieces
- [ ] semantic drawing roles and a documented millimetre path-set contract
- [ ] line-only SVG export with page size, scale and named drawing layers
- [ ] duplicate-stroke checks, clear hidden-line policy and stroke-text policy
- [ ] Muusia adapter and real path-set/scale verification
- [ ] axonometric drawing after hidden-line correctness is established
- [ ] RAAKA 1974 drawing preset: title block, module bubbles, dimensions,
  revision, scale bar and concrete section hatching routed through Muusia

Done when a saved study produces a measured SVG plan/elevation/section and a
successful Muusia plot at the chosen paper scale. Distinguish full-size mm
geometry from paper scale. Machine-specific G-code and pen routing stay in
Muusia; do not introduce a second machine exporter in RAAKA.

## 0.4 — first recipe set

- [ ] Silos first: monumental faceted tanks, hoppers, bridges and service cores
- [ ] Monolith
- [ ] Ziggurat
- [ ] Lamella tower
- [ ] Gate
- [ ] variant board and study branching with named saved candidates
- [ ] physical size independent from implied architectural scale

Implement one recipe at a time against the shared save, analysis and output
contracts. Each new family needs its own parameter-range, determinism and
geometry fixtures; an enabled menu card is not a completed recipe.

## 0.5 — high-rise articulation module

This is a reusable architectural articulation layer for compatible masses,
especially Piloti and Lamella tower, rather than a general building modeller or
a viewport-only texture system.

- [ ] define a face-anchored floor and bay grid with stable module IDs
- [ ] keep implied architectural scale separate from sculpture and model scale
- [ ] generate window families as recessed opening intent with controllable
  width, height, sill, depth and repeated bands
- [ ] generate projecting balcony slabs, recessed loggias and optional solid
  parapets as selectable semantic features
- [ ] generate exterior doors at valid base, terrace or balcony faces with
  explicit opening and threshold intent
- [ ] support seeded repetition, omissions and stagger while keeping local
  edits from rerolling unrelated facade modules
- [ ] add selected-module overrides and locks for individual balcony, window
  and door cells
- [ ] report details that become too thin or too small at the manufactured
  model scale instead of silently resizing them
- [ ] require windows and doors to participate in the finished solid and its
  volume; do not ship them as decals or unmeasured preview cuts
- [ ] expose facade roles to plans, elevations, sections and the Muusia path-set
  boundary
- [ ] persist the module schema and add deterministic geometry, migration and
  scale fixtures

Done when a saved mass can receive a repeatable high-rise facade whose
balconies, windows and exterior doors are real selectable geometry, remain
legible at the chosen scale and agree across preview, finished solid and vector
drawings.

## Shared form vocabulary

| Element or operation | Current status | Next use |
| --- | --- | --- |
| Box | Implemented as a semantic piece | Upper mass, plinth, bridge |
| Rectangular loft/frustum | Implemented as a semantic piece | Stem, shoulder, tapered upper mass |
| Faceted prism and taper | Planned | Silo tank and hopper |
| Place, align, repeat, mirror, group | Selected semantic parts can be translated and repeated; align, mirror and grouping remain planned | Shared composition tools |
| Union, subtract, plane-cut, chamfer | Planned; requires solid-kernel evidence | Finished solids and voids |
| Step, stagger, lean and vary | Shared and selected Piloti foot lean plus seeded variation implemented | Support grids and Ziggurat |
| Lock and branch | Planned; requires persistence and stable identity | Repeatable variants |

Build these only as needed by a concrete recipe or output. Preserve a
constrained massing workflow rather than accumulating general modelling tools.

## Later — Kerros manufacturing seam

- manufacturing package with face and core semantics
- cast direction and advisory undercut analysis
- open void, removable core and retained core workflows
- Kerros mould partitioning and sheet output
- miniature-model moulds as printable STL part sets
- layered foam core and hot-wire profile studies
- mould assembly drawings routed to Muusia
- 3MF or a versioned manufacturing bundle after the initial STL round trip

### Miniature-model STL moulds

This is a secondary prototyping route alongside laser-cut sheet moulds. RAAKA
hands Kerros the finished solid at the selected physical model scale together
with void, core and cast-direction intent. Kerros owns the negative cavity,
parting and printable mould geometry. A mould STL is not the same output as the
positive sculpture STL.

- [ ] derive the cavity from the actual model-scaled finished solid, never from
  camera scale or the unscaled design master
- [ ] add explicit casting clearance and minimum printable wall thickness
- [ ] split the negative into removable mould parts using a chosen cast and
  release direction; report trapped geometry and unresolved undercuts
- [ ] generate keyed registration, stable closures, a pour opening and air vents
  as mould features rather than sculpture features
- [ ] label every mould part and provide an assembly/exploded preview before
  export
- [ ] export each part as a watertight millimetre STL with consistent winding,
  normals and documented print orientation
- [ ] verify cavity dimensions, part fit and a complete cast-release cycle with
  a printed miniature test before treating the workflow as production-ready
- [ ] keep retained lightweight cores, removable cores and open visible voids
  distinct when deriving the mould cavity

Done when one saved 1:2 or 1:4 RAAKA study round-trips through Kerros into a
printable, labelled STL mould set, produces a dimensionally measured cast and
can be demoulded without destroying geometry that was marked reusable.

Laser-cut sheet moulds remain the primary manufacturing direction. Layered
foam, hot-wire profiles and printed miniature moulds are additional studies.
Retained cores stay distinct from visible voids and removable cores throughout
the handoff.

Mould design remains in Kerros. RAAKA must preserve enough intent that Kerros
does not have to infer everything back from an anonymous triangle mesh.

## Review and decision backlog

- [ ] incorporate the owner's visual inspection of the first prototype
- [ ] document an owner-selected repository licence
- [ ] review existing Dependabot major updates individually after A03 is fixed
- [ ] consider explicit `strict: true` for clarity; TypeScript 6 already enables it
- [ ] profile larger studies before choosing workers or extra state infrastructure
- [ ] make a separate hosting decision only when a shared running app is wanted
- [ ] record physical coupons/casts and feed measurements back into the design
