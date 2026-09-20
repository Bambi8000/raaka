# Roadmap

Proposed implementation order after the [2026-09-20 review](AUDIT-2026-09-20.md)
of version 0.1.0. These are delivery gates, not date commitments. Unchecked
items remain unimplemented. The review contains reproductions and evidence;
this file owns the proposed order. Incorporate the owner's visual feedback
before changing the form language.

Confirmed additions from the owner on 2026-09-20: physical scale models at
1:2 and 1:4, repeated support rows in depth, and explicit X/Y foot offsets for
leaning legs. These are specified in [Product definition](PRODUCT.md) and
[Architecture](ARCHITECTURE.md); they are not implemented yet.

## 0.1 — foundation

- [x] React, TypeScript and Three.js application shell
- [x] local-only network binding
- [x] strict verification and CI
- [x] RAAKA interface palette and selectable scene objects
- [x] deterministic Piloti generator
- [x] one-to-two metre physical scale
- [x] summed piece volume, approximate mass and ground contact readings
- [x] baseline code, geometry, browser and CI review recorded

The baseline is a working study prototype. Export, saved projects, cores and
five of the six recipe families are not yet implemented. Version 0.1.1 closes
the measured geometry and viewport defects; remote CI event verification is
recorded separately below.

## 0.1.1 — correct the baseline

- [x] A01: compute the complete geometry bounds, not just upper-mass size
- [x] A02: fit the shadow camera to model and receiver; verify Z-up lighting
- [ ] A03: supply the required automatic token to PR secret scanning and
  verify push, ordinary PR and Dependabot PR events
- [x] A05: distinguish clicks from orbit drags and reconcile deleted selections
- [x] preserve the camera across seed changes; make Fit and Home explicit
- [x] add geometry regressions for envelope, winding, closed edges, signed
  volume, ground plane and matching stem/shoulder interfaces
- [x] cover extreme height/proportion inputs and reject non-finite parameters

Done when the seed-319 envelope fixture agrees with all generated corners,
contact shadows work at both ends of the height range, selection is predictable
and the required checks pass on both push and pull-request events.

## 0.1.2 — preserve and inspect a study

- [ ] project save and open with format and recipe versions, seed, parameters
  and model scale (defaulting to 1:1 for older studies)
- [ ] validate complete files before replacing the current study
- [ ] local recovery with explicit saved/recovered state
- [ ] undo/redo, reset and direct seed entry; one undo step per slider gesture
- [ ] camera view presets: front, side, top and axonometric
- [ ] numeric inputs alongside sliders; explicit mm and percentage readouts
- [ ] separate composition controls from selected-object information
- [ ] compact drawers/tabs that retain recipe, object and seed actions
- [ ] expose selection to assistive technology and preserve keyboard access

Done when an edited study survives save/open and reload, undo restores the
previous committed edit, invalid files leave current work intact, and essential
actions remain reachable in desktop and compact layouts.

## 0.1.3 — physical scale models for testing

- [ ] preserve full-size master parameters and add a separate uniform Model scale
- [ ] presets 1:1, 1:2 and 1:4, plus a validated custom scale or target height
- [ ] allow physical results below 1,000 mm without reapplying the design clamp
- [ ] scale all geometry and offsets about the ground origin without rerolling
- [ ] show master size and manufactured size distinctly; report scaled bounds,
  volume, mass and ground-contact area from the physical study
- [ ] persist scale and include it in undo/recovery; repeatable return to 1:1
- [ ] test linear dimensions by `s`, areas by `s²`, volumes and fixed-density
  mass by `s³`, including asymmetric and later multi-row/leaning studies
- [ ] require future mesh/drawing exports to use this same physical geometry,
  with drawing paper scale and Kerros stock/kerf kept separate

Done when a saved 2,000 mm study yields faithful 1,000 mm and 500 mm models,
with unchanged seed/master parameters, correct physical readings and no drift
when switching scales repeatedly. Export verification follows as the output
milestones land; this stage does not imply that export already exists.

## 0.2 — Piloti as a complete recipe and first manufacturing handoff

- [ ] independent upper width and depth controls
- [ ] reusable stem/neck/shoulder/bearing support family
- [ ] single, pair, row and grid support topology with independent Columns (X)
  and Rows (Y); preserve the one-row default
- [ ] shared support template, explicit support depth and Y row spacing;
  repeat authored leg shapes and report overlaps or missing upper bearing
- [ ] shared and divided shoulders
- [ ] Foot offset X/Y for deterministic leg lean, with ground faces at Z = 0
  and matching stem/shoulder interfaces
- [ ] shared offsets and explicit selected-leg overrides with visible scope
- [ ] support placement offsets and asymmetric upper masses
- [ ] stable per-feature random streams, durable IDs and lock controls
- [ ] a shared parameter schema and actual recipe definitions beyond menu metadata
- [ ] focused solid-kernel spike before committing to a boolean dependency
- [ ] union preview pieces and resolve internal contact faces
- [ ] editable density, centre-of-mass projection and support-polygon feedback
- [ ] geometric bearing/contact feedback without automatic aesthetic correction
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

## Shared form vocabulary

| Element or operation | Current status | Next use |
| --- | --- | --- |
| Box | Implemented as a semantic piece | Upper mass, plinth, bridge |
| Rectangular loft/frustum | Implemented as a semantic piece | Stem, neck, faceted shoulder |
| Faceted prism and taper | Planned | Silo tank and hopper |
| Place, align, repeat, mirror, group | Placement and one row are recipe-specific | Shared support layouts |
| Union, subtract, plane-cut, chamfer | Planned; requires solid-kernel evidence | Finished solids and voids |
| Step, stagger, lean and vary | Limited local offsets only | Ziggurat and asymmetric compositions |
| Lock and branch | Planned; requires persistence and stable identity | Repeatable variants |

Build these only as needed by a concrete recipe or output. Preserve a
constrained massing workflow rather than accumulating general modelling tools.

## Later — Kerros manufacturing seam

- manufacturing package with face and core semantics
- cast direction and advisory undercut analysis
- open void, removable core and retained core workflows
- Kerros mould partitioning and sheet output
- layered foam core and hot-wire profile studies
- mould assembly drawings routed to Muusia
- 3MF or a versioned manufacturing bundle after the initial STL round trip

Laser-cut sheet moulds remain the primary manufacturing direction. Layered
foam and hot-wire profiles are later studies. Retained cores stay distinct
from visible voids and removable cores throughout the handoff.

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
