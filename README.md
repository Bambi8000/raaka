# RAAKA

[Open the public RAAKA studio](https://bambi8000.github.io/raaka/)

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

Version 0.1.6 turns the Piloti supports into an X/Y grid. One to six columns
can repeat through one to three depth rows with an authored row spacing and a
support depth separate from the upper mass. Existing first-row identities stay
stable, so saved selected-leg overrides still address the same legs. RAAKA
reports shoulder-row overlap and bearing overhang instead of silently changing
the composition.

Version 0.1.7 extends the selected-leg override with independent width and
depth scales. A selected stem and shoulder remain one connected support, while
their X/Y proportions can diverge from the shared template without changing
neighbours. Oversized supports produce measured column-overlap and side-bearing
warnings. Size edits share the same save, recovery and undo workflow as lean.

Version 0.1.8 adds independent X/Y placement for a selected support. Placement
translates the complete stem-and-shoulder pair away from its generated grid
position, while foot offset remains a separate lean control. Actual bearing
rectangles drive row, column, cross-grid and upper-mass overhang warnings, so a
visual separation is not reported as a collision on only one axis.

Version 0.1.9 adds divided and shared shoulder topologies. Divided preserves
the separate funnel supports; shared aligns and widens the shoulder tops into a
continuous folded row while leaving their necks and seeded variation intact.
Selected size or placement may deliberately break that continuity, in which
case RAAKA reports the resulting gap or overlap instead of moving the support.

Version 0.1.10 adds authored X/Y placement for the upper mass. These design-mm
offsets create a controlled cantilever without moving divided supports or
rerolling the seeded variation. Shared shoulder tops follow the upper mass in X
while their necks remain fixed, producing a connected sloping transition.
Bearing feedback follows the actual offset mass and model scale.

Version 0.1.11 adds block and tapered upper-mass profiles. The tapered profile
keeps the lower bearing face fixed while its top width, depth and X/Y drift form
a planar rectangular loft. Supports and bearing feedback therefore retain the
same interface while the envelope, volume and mass follow the complete tapered
geometry.

Version 0.1.12 links the upper footprint to the support grid by default. Adding
columns extends the upper mass in X without shrinking the leg module; adding
rows or changing row spacing extends it in Y. **Detached** restores independent
upper X/Y sizing. Both modes leave every Z proportion unchanged, and selected
leg overrides remain local rather than resizing the whole composition.

Version 0.1.13 adds saved semantic part copies. The upper mass duplicates as
one live-source mass; a support duplicates as its complete connected stem and
shoulder pair. Each copy has independent X/Y/Z translation in design
millimetres, participates in scale, recovery and undo/redo, and can be removed
without changing its source. Copies remain separate preview solids unless the
owner joins touching parts with Fuse; unfused intersections are therefore still
counted more than once and are labelled explicitly in the interface.

Version 0.1.14 accepts Manifold 3.5.3 as the solid kernel after a focused gate.
The tested adapter converts RAAKA boxes and rectangular lofts without Three.js,
produces closed indexed union meshes, measures finished-solid volume and emits
simplified horizontal sections. Regression fixtures cover overlaps, coincident
solids, coplanar contact, thin intersections, disconnected results and repeated
WASM cleanup. This release established the kernel boundary used by the
user-facing multi-selection and Fuse operation in 0.1.15.

Version 0.1.15 adds that user-facing Fuse workflow. **Add to Fuse** builds a
blue secondary selection set from two or more objects; **Fuse parts** replaces
touching or overlapping sources with one closed, selectable mesh and removes
their internal contact faces. Its volume, mass, bounds and ground contact come
from the finished union. Disconnected selections are refused, **Unfuse**
restores the editable source pieces, and saved Fuse groups recompute when their
live source geometry changes. Fuse creation and removal participate in project
files, recovery, undo/redo and all three model scales.

Version 0.1.16 makes the full charcoal interface and 3D workspace the default.
The top bar switches directly between **Light mode** and **Dark mode** without
resetting the study, selection or camera. The preference is retained in the
local browser profile and remains separate from portable project files and
undo/redo history.

Version 0.1.17 keeps ordinary divided and shared shoulder bearings under an
offset upper mass when the footprint is **Linked**. Their tops follow authored
X/Y placement while stems and feet remain fixed; **Detached** preserves the
independent cantilever and overhang feedback. The viewport no longer applies
distance fog when zoomed out. CI also avoids duplicate feature-branch push runs,
so the pull-request scan cannot start after its source branch has been deleted.

Version 0.1.18 adds **Remove leg** and **Remove mass**. Remove two middle legs
from a six-leg grid to leave four without changing the grid spacing or upper
mass. A leg includes its stem and shoulder. **Removed parts → Restore** and
Undo bring it back with its authored settings; copies survive removal of their
original. Saved projects, local recovery and scale presets preserve removals.
Unfuse a joined part before removing its individual members.

Yellow sliders marked **Selected** affect the current selection; **Show all**
also exposes grey sliders for other parts. Highlighting follows linked bearings, selected
overrides, live copies and Fuse sources. The selection label stays pinned while
scrolling, and narrow windows expose the object list through **Objects**.

Version 0.1.19 adds **Upper mass division**: **2 · X**, **2 · Y** and **4 · XY**.
Select a mass cell, choose **Part tapered**, then adjust its own top proportions
and **Part top drift X/Y**. Opposite signs lean neighbouring parts in different
directions. The first division preserves the current shape exactly; local edits
leave the other cells and supports unchanged. **Use shared profile** re-links
one cell; **Whole** returns to the shared mass rather than fusing edited cells.
Cells support removal, Restore, Duplicate and Fuse, with save/recovery/history.
Whole-mass copies stay whole; cell copies pause outside their source division.

Version 0.1.20 adds **Plan shape → Hexagon / Octagon** with six or eight radial
legs, one per polygon side. Choose **6 sectors / 8 sectors** to divide the upper
mass into matching triangular wedges. Each sector has its own uniform **Part top
scale** and signed **Part top drift X/Y**; the untouched division preserves the
whole polygon, including its taper. **Radial spread** changes the support ring
and, while Linked, the upper footprint. Rectangular grid settings and each
layout's individual edits remain available when switching back. Polygon parts
support the same copies, removal, Fuse, project files, recovery and scale presets.

Version 0.1.21 adds **Foot offset space → Global / Centered** for Hexagon and
Octagon. Global uses one world X/Y compass for all legs. Centered interprets X
as outward/inward radial offset and Y as counter-clockwise/clockwise tangential
offset, with explicit slider labels. For evenly spreading feet, use a positive
**Radial foot offset** and zero **Tangential foot offset**. Both shared and
selected offsets use this space; necks and shoulders remain fixed. Existing
studies open in Global, and Rectangle keeps its original world-axis behavior.

Version 0.1.22 makes the sidebar **Relevant controls** by default. Selecting an
upper mass hides leg-only faders; selecting a stem or shoulder shows the controls
that affect that part. Shared linked dimensions remain visible. **Show all**
beside the pinned selection name restores the complete inspector; **Show relevant**
focuses it again. Filtering does not change geometry, saved files or undo history.

Version 0.1.23 adds translation gizmos in the 3D view. Original upper masses and
cells move through their shared X/Y placement, a selected stem or shoulder moves
the complete leg in X/Y, and a copy moves in X/Y/Z. The overlay states the scope
and available axes. Movement is snapped to one design millimetre at every model
scale, one drag is one Undo step, and Escape cancels the drag. Orbit is paused
only while a handle is active. Fuses must be unfused before their sources can be
moved; the existing inspector sliders remain available for keyboard editing.

Version 0.1.24 makes every visible slider value directly editable. Millimetre
fields accept exact whole millimetres, percentage fields expose familiar whole
percent values, and count fields remain integers. Enter commits one Undo step;
Escape cancels the draft. Invalid and out-of-range values stay out of the study,
explain the accepted range, and restore the current value when focus leaves.
The sliders remain available and now share the same displayed precision.

Version 0.1.25 adds the first manufacturing handoff. **Export** resolves every
visible part through the Manifold solid kernel and downloads one watertight
binary STL in physical millimetres with Z up. The selected 1:1, 1:2 or 1:4
model scale is part of the geometry, not file metadata. Empty studies and
disconnected compositions are refused with a specific reason instead of
producing an ambiguous file. A six-leg, two-row 1:4 fixture has been written to
disk and read by Kerros's real importer with identical bounds and zero open
edges. This is the positive sculpture; mould construction still belongs to
Kerros.

Version 0.1.26 adds the first retained lightweight core. Select the original,
undivided upper mass and choose **Upper core** to place a centred homothetic
foam volume inside block, tapered, hexagonal or octagonal forms. The core is
shown in blue, scales with 1:1, 1:2 and 1:4 models, and reports its volume,
estimated 30 kg/m³ mass and minimum axis cover separately from 2,400 kg/m³
concrete. STL export unions the positive sculpture and subtracts the closed
core, producing one watertight shell with a sealed internal cavity. Dividing or
removing the upper mass pauses the saved core intent with an explicit reason;
upper-mass copies remain solid in this first bounded workflow.

Version 0.1.27 adds a live mass-centre and static support-polygon check. The
analysis integrates boxes, rectangular and polygon lofts, and finished Fuse
meshes; an active retained core replaces displaced concrete with its lighter
foam mass. The viewport draws the convex boundary of the actual grounded feet,
the three-dimensional mass centre and its vertical ground projection. A signed
model-millimetre reserve is positive inside the boundary and negative outside.
The reading follows 1:1, 1:2 and 1:4 model scales and remains explicitly
advisory: it does not assess connections, loads, reinforcement or anchoring.

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
This address works on the computer running the server. Verified `main` builds
are also published as the public static
[GitHub Pages application](https://bambi8000.github.io/raaka/).

## Quality gate

```sh
pnpm verify
```

This runs ESLint with type-aware async rules, strict TypeScript checks, unit
tests and the production build. CI runs the same gate and secret scanning once
for feature branches through their pull request and again when the finished
change reaches `main`.

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

RAAKA 0.1.27 is an early design and geometry prototype. Only Piloti is
implemented. Study state is recoverable locally and can be saved as a
versioned project file. Its finished solid, including the first retained upper
core subtraction, can be exported as a watertight millimetre STL for Kerros.
Mould output, other recipes, drawings, removable/open void workflows and
editable material density are planned. The current mass, core, ground-contact
and static stability readings are estimates, not structural engineering
approval. The displayed envelope is derived from every generated piece,
including seeded variation,
support rows, explicit foot offsets and authored upper-mass placement, plus any
translated part copies.
