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
The Manifold solid-kernel gate is complete in 0.1.14.
User-facing multi-selection, Fuse and Unfuse are implemented in 0.1.15.
Default dark mode and the persistent Light/Dark switch are implemented in
0.1.16.
Linked bearing alignment, fog-free viewing and the feature-branch CI correction
are implemented in 0.1.17.
Individual part removal, restoration and selection-aware controls are
implemented in 0.1.18.
Two- and four-part upper-mass division with independent tapered tops is
implemented in 0.1.19.
Hexagonal/octagonal Piloti plans, radial support rings and matching six/eight
upper-mass sectors are implemented in 0.1.20.
Global and centered foot offset spaces for polygon Piloti are implemented in 0.1.21.
The selection-focused inspector with Show all is implemented in 0.1.22.
Scoped translation gizmos are implemented in 0.1.23.
Exact numeric parameter entry is implemented in 0.1.24.
Watertight binary STL export and a measured Kerros round trip are implemented
in 0.1.25.
Retained lightweight upper-core intent, separate material readings and matching
STL subtraction are implemented in 0.1.26.
Mass-centre projection and static support-polygon feedback are implemented in
0.1.27.
Editable concrete and retained-core densities are implemented in 0.1.28.
The reusable foot/neck/shoulder/bearing support family is implemented in 0.1.29.
Two-, three- and four-level stepped upper masses are implemented in 0.1.30.
Named feature streams, durable random targets and source locks are implemented
in 0.1.31.
A shared parameter schema and executable recipe registry are implemented in
0.1.32.
Selection-only material updates, on-demand rendering, complete viewport cleanup
and a retryable WebGL failure state are implemented in 0.1.33.
Measured X/Y section drawings and line-only scaled SVG export are implemented
in 0.1.34.
Measured plan and X/Y elevation silhouettes, sharing the same semantic drawing
pipeline, are implemented in 0.1.35.
Angle-filtered visible creases, depth occlusion and independent line-role
controls are implemented in 0.1.36.

## 0.1 — foundation

- [x] React, TypeScript and Three.js application shell
- [x] local-only network binding
- [x] strict verification and CI
- [x] RAAKA interface palette and selectable scene objects
- [x] deterministic Piloti generator
- [x] one-to-two metre physical scale
- [x] summed piece volume, approximate mass and ground contact readings
- [x] baseline code, geometry, browser and CI review recorded

The baseline is a working study prototype. Finished-solid STL export and the
first retained upper-core workflow are implemented; open/removable voids, mould
output and five of the six recipe families are not yet implemented. Version 0.1.1 closes the
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
Version 0.1.14 validates the solid-kernel boundary before user-facing Fuse.
Version 0.1.15 adds saved, measured Fuse groups and reversible Unfuse.
Version 0.1.16 adds a default dark workspace and persistent Light/Dark switch.
Version 0.1.17 corrects linked bearing placement, removes distance fog and
serialises feature-branch verification through pull requests.
Version 0.1.23 adds direct translation handles for existing placement fields.
Version 0.1.24 adds validated numeric entry beside every visible slider.
Version 0.1.25 adds a watertight, model-scaled binary STL handoff to Kerros.
Version 0.1.26 adds retained upper-core intent and subtraction.
Version 0.1.27 adds material-aware mass-centre and support-polygon feedback.
Version 0.1.28 makes both material density assumptions editable and saved.
Version 0.1.29 adds independent foot flare and bearing scale to one shared
rectangular/polygon support profile.
Version 0.1.30 adds selectable Z levels with cumulative scale/offset steps and
independent per-level tops.
Version 0.1.31 makes seed variation order-independent and lockable per upper
mass or support source.
Version 0.1.32 binds Piloti defaults, schema, normalization and generation into
the same recipe contract future families will implement.
Version 0.1.33 closes the first viewport resource-lifecycle audit item without
changing model truth or project data.
Version 0.1.34 begins the drawing pipeline with vertical finished-solid
sections, the millimetre path-set contract and paper-scaled section SVGs.
Version 0.1.35 adds finished-solid plan and X/Y elevation silhouettes without
claiming unimplemented visible creases or hidden lines.
Version 0.1.36 adds finished-mesh visible creases while continuing to omit
hidden edges rather than styling them as a completed hidden-line drawing.

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
- [x] numeric inputs alongside sliders; explicit mm and percentage readouts
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
- [x] require mesh export to use this same physical geometry, with Kerros
  stock/kerf kept separate; retain the same requirement for future drawings

Done when a saved 2,000 mm study yields faithful 1,000 mm and 500 mm models,
with unchanged seed/master parameters, correct physical readings and no drift
when switching scales repeatedly. Version 0.1.25 verifies that the same
physical result survives the binary STL and Kerros import boundary.

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

## 0.1.14 — solid-kernel gate

- [x] pin Manifold 3.5.3 and initialize its WASM module once
- [x] convert semantic boxes and rectangular lofts without using Three.js
- [x] verify overlapping, coincident and coplanar-touching union fixtures
- [x] verify thin positive intersections and disconnected component reporting
- [x] return closed indexed meshes, exact kernel bounds and finished-solid
  volume
- [x] emit simplified horizontal section polygons and measured section area
- [x] compare exported mesh topology and signed volume against kernel truth
- [x] repeat a thin-overlap union 50 times and explicitly release every WASM
  solid and section

Done when the chosen dependency proves that RAAKA's current planar vocabulary
can enter and leave one deterministic solid boundary without internal contact
faces, silent topology failure or unmanaged per-operation WASM objects.

## 0.1.15 — selected-part Fuse

- [x] build an explicit blue secondary selection set without replacing the
  current yellow object selection
- [x] preflight two or more sources and refuse disconnected islands
- [x] replace valid sources with one selectable closed indexed mesh
- [x] derive group bounds, finished-union volume, mass and ground contact from
  the kernel result
- [x] keep Fuse sources live so recipe and copy edits recompute the union
- [x] pause disconnected groups with a visible reason and retain temporarily
  hidden source groups as dormant project intent
- [x] restore editable source pieces with Unfuse
- [x] preserve finished meshes and measurements at 1:1, 1:2 and 1:4 without
  rerunning the kernel for scale-only changes
- [x] persist source IDs in Piloti recipe version 12 and include Fuse/Unfuse in
  recovery and undo/redo
- [x] lazy-load the WASM kernel only when a solid operation is requested

Done when a copied upper mass or support piece can join another touching part
as one measured selectable solid, a separated pair is refused, Unfuse restores
the sources, and project/history/model-scale round trips preserve the intent.

## 0.1.16 — default dark workspace

- [x] make the charcoal interface and matching 3D workspace the default
- [x] add one direct top-bar control for switching to Light mode and back
- [x] preserve yellow, blue and magenta semantic accent roles in both palettes
- [x] update the viewport environment and neutral materials without resetting
  geometry, selection or camera state
- [x] retain the preference in the local browser profile
- [x] keep theme outside project files, recovery and undo/redo history
- [x] fall back safely to dark when stored preference access is unavailable

Done when a new browser profile opens in Dark mode, either palette remains
legible across the application and viewport, reloading restores the chosen
mode, and switching themes never marks or mutates the current study.

## 0.1.17 — linked-bearing and workspace clarity corrections

- [x] align ordinary divided and shared shoulder bearing tops to linked upper
  X/Y placement while keeping stems and feet fixed
- [x] retain independent mass placement and overhang feedback in Detached mode
- [x] preserve selected-support size and placement overrides as local authored
  exceptions that may still overhang
- [x] remove viewport distance fog so zoomed-out geometry and grids stay crisp
- [x] run feature verification only through pull requests and reserve push
  verification for `main`, eliminating delayed scans of deleted PR branches

Done when the linked screenshot case with a tapered mass, X/Y placement and
unaltered supports reports zero ordinary bearing overhang, while the equivalent
Detached study preserves the independent cantilever; zooming out remains crisp;
and every feature change has one authoritative pull-request verification before
the merged `main` run.

## 0.1.18 — remove individual parts and clarify selection

- [x] remove a complete selected leg while retaining its grid slot, seeded
  neighbours and the upper footprint; support the six-to-four-leg example
- [x] remove upper masses and copies while keeping original-source copies alive
- [x] retain authored overrides and restore removed parts individually
- [x] include removals in project version 13, recovery and undo/redo; migrate
  older projects without changing geometry
- [x] update physical readings and base-grid bearing feedback after removal
- [x] handle an empty study at every model scale and keep Restore reachable
- [x] reframe the first restored part after an empty study
- [x] retain affected Fuses as dormant intent; expose inactive Fuses for Unfuse
- [x] highlight sliders that affect the selected geometry, including linked
  shoulders, live copies and selected overrides
- [x] keep unrelated controls readable and editable in neutral grey
- [x] retain selection context while scrolling and expose Objects/Restore on
  compact screens

Done when two middle legs can be removed from a three-column/two-row study
without changing the surviving geometry, the result survives reopening and
scale changes, and selecting an upper mass, stem or shoulder changes control
emphasis to match its actual parameter dependencies.

### Proposed interface follow-ups

- [x] editable numeric values beside sliders, with explicit mm and percentages
  (0.1.24)
- [ ] group each stem and shoulder under one expandable leg in the object list
  while retaining separate face/part selection for Fuse
- [ ] a Selected / Composition inspector split, with selected overrides first
  and a clear link back to shared source controls for copies
- [x] selection-focused controls by default with Show all (0.1.22)
- [ ] front, side and top view buttons for precise placement
- [ ] review bundle splitting as the solid tools and inspector grow

Unchecked items remain proposals. The owner-requested dynamic inspector is now
implemented; fuller selected-first ordering and copy-source navigation remain
open. Translation gizmos, exact numeric entry, the first STL handoff, retained
lightweight core and static stability feedback are implemented. Next: editable
material density, while keeping the existing manufacturing gates below in
scope.

## 0.1.19 — divided upper masses and opposing tapers

- [x] divide the original upper mass into two X halves, two Y halves or four XY
  cells while preserving the initial block or tapered envelope
- [x] select a cell and edit its block/tapered profile, top ratios and signed
  X/Y drift without changing neighbours or bottom bearing faces
- [x] distinguish independent tops from the shared profile and allow re-linking
- [x] retain cell edits per division; Whole restores the shared mass, not a union
- [x] support cell removal, restoration, source-linked copies and Fuse groups
- [x] keep pre-existing whole-mass copies whole; pause cell copies and Fuses
  when their source division is inactive
- [x] persist recipe version 14, recovery, undo/redo and uniform model scales;
  migrate recipe versions 1–13 without changing geometry
- [x] test envelope, nominal and union volume, intermediate sections, independent
  edits, copies, removal, validation and migration
- [x] state nominal-volume and partial-bearing limitations in the interface

Done when two or four selectable cells can lean in different directions, retain
their exact settings after reopening and re-link to the shared profile. This
does not introduce arbitrary plane cuts or manufacturing slicing.

Follow-ups: divide arbitrary copied masses, author unequal split proportions,
inspect partial bearing coverage and add optional seam/exploded previews. These
remain planned; the first implementation divides only the original upper mass.

Verification: 223 unit tests plus lint, strict TypeScript and production build.
Browser checks cover opposing X drifts, four-cell selection, independent Y
drift, copying a cell, removal with a surviving copy, Restore, Fuse, inactive
division recovery, 1:4 scale, reload recovery, re-linking and Undo/Redo. No
browser errors were observed. The existing bundle-size warning remains open.

## 0.1.20 — polygon Piloti and radial mass sectors

- [x] Rectangle / Hexagon / Octagon plan shapes, with one radial leg per polygon side
- [x] whole polygon mass or matching six/eight centre-to-edge sectors
- [x] preserve the parent block/taper and every intermediate section on first division
- [x] independent uniform sector top scale and signed X/Y drift with planar side faces
- [x] radial spread links ring and upper X/Y only; Detached keeps the upper size independent
- [x] shared shoulder ring and divided shoulders with coincident neck interfaces
- [x] shape-specific support and sector IDs retaining inactive edits and operations
- [x] support existing selected-leg overrides, removal, Restore, copies and Fuse
- [x] polygon-edge overhang and true shoulder intersection-area feedback
- [x] preserve Rectangle settings; hide irrelevant grid/depth controls for polygon plans
- [x] recipe version 15, save/recovery/history and all three physical scale presets;
  migrate versions 1–14 without changing geometry
- [x] regression tests for planar closed lofts, Float32 seam agreement, connected
  tapered-sector union, intermediate sections, metrics, migration and validation

Done when hexagonal and octagonal forms have matching selectable upper sectors
that can taper independently, fuse back into a connected solid and retain their
edits after switching layouts. Polygon top scale is intentionally uniform;
arbitrary unequal/radial cuts and partial-bearing assessment remain follow-ups.

Verification: 282 unit tests plus lint, strict TypeScript and production build.
Browser checks cover shape switching, six/eight-sector selection, opposite
sector drifts, connected Fuse/Unfuse, radial leg removal/Restore, 1:4 scale,
Undo/Redo and retained independent sector edits after switching shapes. Complete
divided/shared polygon studies also form one connected union in kernel tests.
The existing bundle-size warning remains open.

## 0.1.21 — global and centered polygon leg lean

- [x] explicit Global / Centered foot offset space for Hexagon and Octagon
- [x] Global retains world X/Y; Centered uses radial outward/inward and tangential
  counter-clockwise/clockwise directions around the support-ring centre
- [x] resolve shared and selected offsets in the same space without changing their values
- [x] derive outward direction from the actual neck, with a stable bay-axis fallback at the centre
- [x] leave upper placement independent and keep copies aligned with their source direction
- [x] preserve horizontal grounded feet, planar faces, joined necks and physical metrics
- [x] relabel shared/selected controls and centered angle readout; highlight actual dependencies
- [x] retain dormant space in Rectangle without changing rectangular geometry
- [x] recipe version 16, recovery, Undo/Redo and 1:1 / 1:2 / 1:4 scale support;
  migrate versions 1–15 to Global without changing saved geometry
- [x] regression tests for global/radial/tangential direction, local overrides,
  copied and removed legs, origin fallback, connected Fuse, persistence and validation

Done when one positive radial value spreads all polygon feet away from the centre,
switching back restores the global compass, and the saved study reproduces both
modes without moving necks or shoulders.

Verification: 332 unit tests plus lint, strict TypeScript and production build.
Browser checks cover Global/Centered geometry, Hexagon and Octagon, shared and
selected radial/tangential values, Undo/Redo, reload recovery, 1:4 scale and
retained mode after switching through Rectangle. The existing bundle-size
warning remains tracked separately.

## 0.1.22 — selection-focused inspector

- [x] show only relevant controls by default; omit unrelated sliders and sections
- [x] pin Show all / Show relevant beside the current selection name
- [x] retain genuine shared dependencies such as linked grid size and upper base height
- [x] keep neutral enabling choices reachable without false yellow highlighting
- [x] handle stems, shoulders, independent cells, live copies and Fuse sources
- [x] retain local position/size while hiding foot lean for a selected shoulder
- [x] keep full controls and Restore reachable when no live target exists
- [x] keep filtering outside project files, recovery and Undo/Redo
- [x] cover pure relevance, rendered fields and actual App wiring in regressions

Done when selecting an upper mass removes leg-only faders, selecting a stem
restores its lean controls, and Show all restores the full composition without
changing the model. Geometry and the recipe schema are unchanged.

Verification: 348 tests plus lint, strict TypeScript and production build.
Browser checks cover Show all without history edits, upper/stem/shoulder
selection, local overrides, independent tops, live copies, a connected Fuse,
zero-offset Global/Centered reachability, keyboard-edit Undo and 1:4 recovery.
The existing bundle-size and Manifold externalization warnings remain unchanged.

## 0.1.23 — scoped translation gizmos

- [x] upper-mass X/Y handles write the existing authored placement offsets;
  preserve linked shoulder-top behavior and independent Z proportions
- [x] selected-leg X/Y handles move the whole stem/shoulder pair, retain ground
  contact and explicitly create a local override when required
- [x] copied-part X/Y/Z handles write that copy's existing translation fields
- [x] keep feet/lean handles visually and semantically separate from whole-part
  translation; unsupported rotation/scale/vertical axes stay unavailable
- [x] use shared upper placement for original cells until independent cell
  placement has an explicit model contract; never imply a local move exists
- [x] one completed drag equals one undo step; Escape cancels to the starting
  values; dragging blocks camera orbit and releases it reliably afterwards
- [x] convert physical handle movement back to design millimetres at 1:1, 1:2
  and 1:4; model truth stays in recipe parameters, not Three.js transforms
- [x] show the handle's target and scope; retain keyboard/numeric alternatives
  and require Unfuse before direct manipulation of a Fuse's individual sources
- [x] test selection changes, drag cancellation, history, file recovery, linked
  bearings and rectangular/polygon layouts before release

Done when the visible handle describes the exact object scope, writes only
existing design parameters, follows model scale correctly and makes one history
entry per completed drag. Escape restores the exact pre-drag study. Existing
range controls remain the keyboard alternative; dedicated numeric fields are
the following precision-editing step. The watertight STL and measured Kerros
round trip planned here are completed in 0.1.25; mould construction stays
there.

Verification: 359 tests plus lint, strict TypeScript and production build.
Browser checks cover upper, complete-leg and copy handle scopes; a 1:4 drag;
one-step Undo; automatic selected-leg override creation; 1 mm agreement between
the handle and sliders; Fuse suppression; and a clean console. Escape recovery
and redo preservation are pinned by the history regression.

Delivery: verified `main` commits are published as a public static application
at `https://bambi8000.github.io/raaka/`. Pull requests do not deploy, and the
local development origin remains available for isolated work.

## 0.1.24 — exact numeric parameter entry

- [x] replace passive slider readouts with direct number fields without removing
  range or keyboard editing
- [x] expose design millimetres directly, normalized proportions as percentages
  and discrete counts as integers
- [x] validate finite values, supported ranges and discrete steps before they
  reach study state; explain rejected input and restore it on blur
- [x] make Enter one Undo step and Escape a history-neutral cancellation
- [x] preserve focused drafts across unrelated renders and synchronize fields
  after external changes when they are not being edited
- [x] align millimetre sliders to the one-millimetre numeric precision so their
  displayed and stored values cannot disagree
- [x] retain recipe version 16, project files, recovery, geometry and model-scale
  behavior unchanged

Done when a slider value can be entered precisely without changing representation
in the project model, invalid values never alter geometry, and one committed
entry is one reversible history action.

Verification: 363 tests plus lint, strict TypeScript and production build.
Browser checks cover millimetre and percentage commits, one-step Undo, invalid
range feedback, Escape cancellation and a clean console.

## 0.1.25 — watertight STL handoff to Kerros

- [x] finish one or more visible semantic pieces through the Manifold kernel
- [x] require exactly one connected finished solid and explain empty or
  disconnected refusals
- [x] encode binary STL with finite millimetre coordinates, Z up, outward unit
  normals and stable triangle winding
- [x] export the selected 1:1, 1:2 or 1:4 physical study without changing the
  project, master parameters or drawing scale
- [x] name the file with seed and scale; report triangles, physical bounds and
  finished-solid volume after download
- [x] verify binary layout, zero open edges, signed volume and cubic scale using
  a three-column/two-row Piloti with X/Y lean and a selected-leg override
- [x] write a real 1:4 file and read it through Kerros's production importer
  with equal bounds, binary format detection and zero open edges
- [x] retain recipe version 16 and keep mould construction in Kerros

Done when the same generated physical study drives the viewport readings and a
single watertight STL that Kerros reads at the authored millimetre size. The
exported object is the positive sculpture, never an implied mould or set of
independent loose pieces.

Verification: 367 committed tests plus lint, strict TypeScript and production
build. The cross-repository fixture writes a 150-triangle, six-leg 1:4 STL;
Kerros reads it as 361.4 × 275.0 × 500.0 mm with zero warnings and zero open
edges. Browser verification covers the actual download path and a clean console.

## 0.1.26 — retained lightweight upper core

- [x] add disabled-by-default retained-core intent to Piloti recipe version 17;
  migrate versions 1–16 to byte-for-byte solid geometry
- [x] derive a centred contained core for whole block, tapered, hexagonal and
  octagonal upper masses without converting preview geometry to voxels
- [x] show the core as blue selectable secondary material and expose its size
  only in the relevant inspector context
- [x] pause divided or removed upper masses with an actionable reason while
  retaining the authored core settings; keep copies solid in the first scope
- [x] separate concrete volume/mass from core volume/mass using explicit
  2,400 kg/m³ concrete and 30 kg/m³ foam assumptions
- [x] scale core geometry and cover by `s`, and both material readings by `s³`
- [x] union positive pieces, subtract the retained core and export one
  watertight STL with unchanged outer bounds and a sealed internal cavity
- [x] retain disconnected-positive refusal without mistaking an inner cavity
  surface for a second loose object
- [x] cover generation, migration, inspector filtering, Fuse resolution,
  scaling, kernel subtraction and binary STL topology in regressions

Done when one saved whole upper mass can carry a visible, measurable retained
core through preview, 1:1/1:2/1:4 scaling and a watertight Kerros-readable STL.
Open voids, removable cores, per-cell cores, copy cores and mould construction
remain separate future workflows rather than ambiguous extensions of this mode.

Verification: 400 tests plus lint, strict TypeScript and production build.
Browser checks cover exact core-size entry, blue core selection, cubic 1:4
scaling, divided-mass pause/Whole recovery, browser recovery, STL download and a
clean console. The actual 96-triangle 1:4 download is 270.0 × 127.5 × 375.0 mm
and 5.34 L; Kerros's production importer reports binary STL, zero open edges,
positive signed volume and no warnings.

## 0.1.27 — mass centre and static support polygon

- [x] integrate exact volume centroids for boxes, rectangular lofts, polygon
  lofts and completed Fuse meshes
- [x] calculate the manufactured mass centre from concrete plus retained foam,
  subtracting the concrete displaced by an active core
- [x] form a convex support polygon from actual grounded stem faces and
  finished-solid ground contact
- [x] report a signed nearest-edge reserve in physical model millimetres
- [x] draw the support boundary, three-dimensional centre and vertical ground
  projection without making renderer state authoritative
- [x] recompute after removal, copies and Fuse; retain explicit nominal-overlap
  and disconnected-part limitations
- [x] scale the centre, polygon and reserve linearly at 1:1, 1:2 and 1:4
- [x] expose inside, edge, outside and unavailable states with actionable text
  and an explicit non-structural safety boundary

Done when the viewport and manufacturing panel agree on the same material-aware
mass projection, an authored cantilever can cross the measured foot boundary,
and every supported model scale preserves the result without changing project
data. A positive reserve remains design feedback, not structural approval.

Verification: 410 tests plus lint, strict TypeScript and production build.
Browser inspection covers the retained-core 1:4 study, visible support boundary,
mass-centre marker, projection line, signed reserve and an authored outside case.

## 0.1.28 — editable material densities

- [x] store concrete and retained-core density in Piloti recipe version 18
- [x] migrate recipe versions 1–17 to the previous 2,400/30 kg/m³ assumptions
- [x] validate whole concrete values from 800–4,000 kg/m³ and retained-core
  values from 10–500 kg/m³
- [x] keep both controls with the global manufacturing estimate instead of
  presenting them as selected-shape controls
- [x] recompute nominal and finished-Fuse mass at the authored densities
- [x] reweight the mixed-material mass centre and support reserve while leaving
  geometry, volume, cover and STL unchanged
- [x] preserve density through 1:1, 1:2 and 1:4 model scale while mass follows
  `s³`

Done when saved and recovered studies reproduce both density assumptions,
older files retain their previous readings, and edits immediately update every
mass path without changing the manufactured solid.

## 0.1.29 — reusable Piloti support family

- [x] extract one pure support-family definition used by rectangular, hexagonal
  and octagonal Piloti layouts
- [x] expose 60–180% Foot flare without moving the neck or shoulder
- [x] expose 65–125% Bearing scale without changing the stem or neck interface
- [x] preserve the established geometry exactly at both 100% defaults
- [x] retain selected support size, position and lean as separate local edits
- [x] route authored shared-bearing gaps and overlaps through existing measured
  feedback instead of automatic correction
- [x] save both fields in Piloti recipe version 19 without a pre-release version
  18 migration; start a fresh `raaka.recovery.v2` namespace

Done when one support profile controls every current Piloti plan, the foot and
bearing stations remain independent around a coincident neck, and downstream
bounds, volume, ground contact, stability, Fuse and STL paths consume the
resulting geometry without special cases.

Verification: 431 tests plus lint, strict TypeScript and production build.
Browser inspection covers dynamic stem/shoulder controls, 180% Foot flare,
80% Bearing scale and measured shared-shoulder gap feedback.

## 0.1.30 — stepped upper-mass levels

- [x] add equal-height two-, three- and four-level Z divisions to rectangle,
  hexagon and octagon upper masses
- [x] keep the lowest bearing face and complete Z envelope fixed
- [x] apply one cumulative 65–115% plan scale and −300–300 mm X/Y step
- [x] preserve shape-specific stable level IDs as the level count grows
- [x] expose each level as a selectable, removable and copyable semantic part
- [x] reuse independent block/tapered tops and signed drift on every level
- [x] support live Fuse groups and pause them when their source division is
  inactive
- [x] pause retained-core intent outside the whole upper-mass topology
- [x] save the three step fields in Piloti recipe version 20 without a
  pre-release version 19 migration; start `raaka.recovery.v3`
- [x] keep disconnected authored steps explicit and refuse them in Fuse/STL

Done when one compact step recipe produces asymmetric level stacks in every
current Piloti plan, local edits do not leak between shapes or levels, and the
same semantic pieces reach preview, save/recovery/history, scale, Fuse and the
finished-solid boundary.

Verification: 454 tests plus lint, strict TypeScript and production build.
Automated UI and geometry coverage includes rectangle and polygon level counts,
cumulative scale and X/Y steps, selected-level taper, removal, copying, Fuse
and model scaling. Owner visual inspection follows on the published build.

## 0.1.31 — stable random streams and source locks

- [x] derive every Piloti random choice from a named feature stream instead of
  one call-order sequence
- [x] keep second- and third-row support variation stable when columns are
  added
- [x] retain rectangle, hexagon and octagon source IDs across layout switches
- [x] lock the selected upper-mass family or complete support to its current
  seed while unlocked sources follow the global seed
- [x] map divided masses, retained core and source-linked copies to their
  semantic lock source
- [x] keep authored dimensions, local overrides and linked geometry live under
  a variation lock
- [x] mark locked visible and removed sources in the object list
- [x] preserve locks through inactive layouts, removal, project files,
  recovery and Undo/Redo
- [x] require Unfuse before changing an individual source lock
- [x] save locks in Piloti recipe version 21 without a pre-release version 20
  migration; start `raaka.recovery.v4`

Done when adding or reordering random consumers cannot reroll an existing
semantic feature, and the owner can preserve one source's generated character
while continuing to explore the rest of the composition by seed.

Verification: 483 tests plus lint, strict TypeScript and production build.
Automated UI and geometry coverage includes pinned streams, row/column identity,
rectangle and polygon locks, copy/source mapping, persistence and Undo/Redo.
Owner visual inspection follows on the published build.

## 0.1.32 — shared recipe and parameter contracts

- [x] define shared numeric, choice and identity-bearing collection parameter
  schema forms
- [x] cover every persisted Piloti parameter with one typed schema entry
- [x] derive existing numeric validation bounds from the schema rather than a
  parallel range table
- [x] bind Piloti ID, presentation, defaults, schema, normalization and pure
  generation into one executable recipe definition
- [x] render the recipe menu and generate the active study through the registry
- [x] represent the other five agreed families as planned definitions without
  fake generators or premature parameter choices
- [x] retain Piloti recipe version 21 and recovery v4 because geometry and
  persisted state are unchanged

Done when a future recipe has one explicit contract to implement and adding a
persisted Piloti parameter without a schema entry fails type checking and
runtime coverage.

Verification: 488 tests plus lint, strict TypeScript and production build.
Coverage includes registry identity and status, executable Piloti dispatch,
complete schema/default parity, default bounds and collection identity.

## 0.1.33 — viewport lifecycle and failure state

- [x] retain mesh and edge geometry identity across selection, Fuse-selection
  and theme-only appearance changes
- [x] update retained-core surface opacity and edge colour with selection
- [x] replace the perpetual animation loop with invalidated frames and bounded
  camera-damping continuation
- [x] dispose model and overlay resources, current grid and ground, controls,
  directional shadow, renderer lists, renderer state and WebGL context
- [x] deduplicate shared geometry and materials before disposal
- [x] catch WebGL startup failure and handle context loss with a visible alert
  that leaves project controls available
- [x] provide a Retry 3D action that recreates the runtime from current study
  state
- [x] retain Piloti recipe version 21 and recovery v4 because model and saved
  state are unchanged

Done when selection never allocates replacement geometry, an idle viewport
does not render continuously, all owned graphics resources have one cleanup
path, and graphics failure cannot turn the application into an unexplained
blank panel.

Verification: 495 tests plus lint, strict TypeScript and production build.
Coverage includes geometry identity under material changes, retained-core and
Fuse appearance, renderer startup refusal, shared-resource disposal and the
visible retry panel. Browser inspection exercised a real WebGL startup refusal
and repeated Retry without losing project controls. Normal WebGL appearance
requires owner inspection on the published build because the inspection
browser could not allocate a graphics context.

## 0.1.34 — first measured section drawing

- [x] slice the finished physical solid on authored world X or Y planes
- [x] resolve overlapping pieces as one union before drawing the cut boundary
- [x] subtract retained upper-core geometry from both section area and paths
- [x] keep path-set coordinates in full physical millimetres with explicit
  Cartesian horizontal/Z axes and a semantic `section` role
- [x] preview the measured section without requiring a working WebGL context
- [x] provide exact plane-position entry plus a bounded slider
- [x] keep paper scale independent from model scale with 1:1, 1:2, 1:5, 1:10
  and 1:20 choices
- [x] export tightly bounded, line-only SVG with a named section layer,
  millimetre page dimensions and paper-scale metadata
- [x] refuse a blank SVG when the authored plane does not intersect the solid
- [x] retain Piloti recipe version 21 and recovery v4 because drawing workspace
  state does not change the model or portable project

Done when the same scaled Piloti pieces used by the viewport and STL produce
measured X/Z or Y/Z paths, a retained core creates its inner boundary, and the
SVG's paper dimensions equal physical drawing bounds divided by the selected
paper scale plus its fixed paper margin.

Verification: 504 tests plus lint, strict TypeScript and production build.
Coverage includes both vertical axis transforms, finished-solid core
subtraction, semantic path metadata, paper size, SVG layer identity, blank-cut
refusal and visible drawing controls. Browser inspection covered X and Y
planes, numeric plane edits, the compact layout and a retained core changing
one outer path into outer and inner section paths.

## 0.1.35 — orthographic outline drawings

- [x] project the finished physical solid along world Z, X or Y
- [x] provide a measured top plan and X/Y elevation in the drawing workspace
- [x] union overlapping pieces before projection so shared and internal edges
  do not become duplicate outline strokes
- [x] subtract retained-core geometry before projection so a fully enclosed
  core remains hidden from the exterior outline
- [x] map plan to X/Y, X elevation to Y/Z and Y elevation to X/Z in explicit
  physical-millimetre path-set coordinates
- [x] add semantic `outline` paths beside the existing `section` role
- [x] share paper-scale preview, page bounds, filename and line-only SVG export
  across orthographic and section drawings
- [x] identify plan and elevation output as silhouette-only rather than
  implying unimplemented visible creases or hidden lines
- [x] preserve the selected drawing view when moving between 3D and drawings
- [x] retain Piloti recipe version 21 and recovery v4 because drawing workspace
  state does not change the model or portable project

Done when the plan and both elevations derive their bounds and net projected
area from the same final boolean solid used by STL and sections, overlapping
pieces produce one exterior outline, an enclosed retained core does not appear,
and each SVG reports its semantic outline layer and selected paper scale.

Verification: 513 tests plus lint, strict TypeScript and production build.
Coverage includes all three axis mappings, measured projection bounds and area,
overlap union, enclosed-core occlusion, semantic view metadata, outline SVG
layers and filenames, plus the existing section contract. Browser inspection
covered plan and both elevations in the compact layout and confirmed that the
drawing workspace remains usable when WebGL is unavailable.

## 0.1.36 — visible orthographic creases

- [x] derive candidate edges from adjacent faces of the finished boolean mesh,
  not from independent source-piece outlines
- [x] reject coplanar triangulation diagonals with a 5–90° adjustable minimum
  face-angle threshold and a 30° default
- [x] define plan and elevations as views from +Z, +X and +Y respectively
- [x] retain only front-facing crease candidates and clip their projected
  segments wherever a nearer front-facing triangle occludes them
- [x] remove crease segments already represented by the exterior outline and
  deduplicate identical remaining strokes
- [x] expose independent Outline and Creases switches without changing recipe,
  recovery, project or history state
- [x] keep projected drawing bounds stable when either line role is hidden
- [x] add open semantic `crease` paths and a named `layer-crease` SVG group
- [x] record the crease threshold in path-set view data and SVG metadata
- [x] state that hidden edges are omitted; do not present them as completed
  dashed hidden-line output
- [x] retain Piloti recipe version 21 and recovery v4 because drawing controls
  remain transient workspace state

Done when boxes contain no triangulation diagonals or duplicate silhouette
strokes, a stepped solid exposes only its four visible internal edges, a nearer
solid clips a rear crease at the exact projected depth boundary, and the same
roles appear in preview and SVG with stable physical-millimetre bounds.

Verification: 519 tests plus lint, strict TypeScript and production build.
Coverage includes angle thresholds, stepped-solid creases, silhouette
deduplication, complete and partial depth occlusion, role filtering, open SVG
paths and crease metadata. Browser inspection covered a tapered Piloti plan,
both elevations, Outline-only, Creases-only and the explicit empty-role refusal
in the compact layout.

## 0.2 — Piloti as a complete recipe and first manufacturing handoff

- [x] independent upper width and depth controls
- [x] reusable stem/neck/shoulder/bearing support family
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
- [x] stable individual part removal and restoration without repacking the grid
- [x] stepped or multi-part asymmetric upper masses
- [x] stable per-feature random streams, durable IDs and lock controls
- [x] a shared parameter schema and actual recipe definitions beyond menu metadata
- [x] focused solid-kernel spike before committing to a boolean dependency
- [x] union selected preview pieces and resolve their internal contact faces
- [x] editable concrete and retained-core densities
- [x] centre-of-mass projection and static support-polygon feedback
- [x] geometric bearing/contact feedback without automatic aesthetic correction
- [x] retained lightweight core intent, preview and matching solid subtraction
- [x] separate concrete/core volume and mass, with explicit material assumptions
- [x] STL export from the finished watertight solid
- [x] a measured millimetre round trip into Kerros
- [x] update selection materials without rebuilding geometry; complete unmount
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

- [x] orthographic plan and X/Y elevation silhouette views
- [x] vertical X/Y sections at authored physical-model planes
- [x] silhouette extraction with no triangulation diagonals
- [x] visible crease extraction with no triangulation diagonals
- [x] depth-clip visible creases against nearer finished-solid faces
- [ ] hidden-edge/dashed-line policy, including overlapping coplanar pieces
- [x] semantic drawing roles for `section` and `outline`
- [x] semantic `crease` role with an independently selectable SVG layer
- [x] documented physical-millimetre path-set contract for section, outline and
  crease output
- [x] line-only orthographic and section SVG with derived page size, paper
  scale and named semantic layers
- [x] duplicate silhouette/crease stroke checks
- [ ] clear hidden-line and stroke-text policy
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
| Faceted prism and taper | Polygon Piloti implemented; silo composition planned | Silo tank and hopper |
| Place, align, repeat, mirror, group | Selected semantic parts can be translated and repeated; align, mirror and grouping remain planned | Shared composition tools |
| Union, subtract, plane-cut, chamfer | Selected-part Union/Fuse and bounded retained-core subtraction are implemented; general subtract, plane-cut and chamfer remain planned | Finished solids and voids |
| Step, stagger, lean and vary | Shared and selected Piloti foot lean plus seeded variation implemented | Support grids and Ziggurat |
| Lock and branch | Seed-variation source locks implemented; study branching planned | Repeatable variants |

Build these only as needed by a concrete recipe or output. Preserve a
constrained massing workflow rather than accumulating general modelling tools.

## Later — Kerros manufacturing seam

- manufacturing package with face and core semantics
- cast direction and advisory undercut analysis
- open void, removable core and expanded retained-core workflows
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
