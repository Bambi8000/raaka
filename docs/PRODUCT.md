# RAAKA product definition

## Product thesis

RAAKA is a deterministic brutalist massing studio for physical sculpture. It
turns a constrained architectural vocabulary into repeatable solid forms,
vector drawings and manufacturing intent.

This document describes the product direction. In version 0.1.22, the
interactive Piloti study, selection, physical estimates, versioned project
files, local recovery, undo/redo, shared X/Y foot offsets and selected-leg
overrides are implemented, together with 1:1, 1:2 and 1:4 model scales,
multi-row support grids, selected-support width/depth overrides, selected X/Y
support placement, divided/shared shoulder rows and semantic part copies.
Outputs, cores and the remaining recipe families are planned. Authored X/Y
upper-mass offsets add a controlled cantilever without replacing seeded
asymmetry, and the upper mass can be a block or a tapered loft. Piloti supports
rectangular grids and regular hexagonal/octagonal plans with radial legs and
matching upper-mass sectors. See
[Roadmap](ROADMAP.md) and the
[baseline review](AUDIT-2026-09-20.md) for delivery status and known issues.

The constraint is the identity: RAAKA is not a general-purpose modeller. Its
primary geometry is made from planes, prisms, wedges, facets and explicit
boolean relationships. This produces a coherent visual language and makes the
result legible to later mould and drawing systems.

## Physical scale

The normal full-size sculpture is 1,000–2,000 mm tall, with 1,500 mm as the
default study height. This is not a minimum size for manufactured test models.
RAAKA keeps these concepts separate:

- **Design size** is the full-size master geometry in millimetres.
- **Model scale** uniformly scales the design into an actual manufactured
  size, also in millimetres. Presets include 1:1, 1:2 and 1:4, with a custom
  positive scale or target height planned.
- **Drawing scale** places the resulting physical model on paper. It must not
  change the dimensions of the solid exported to Kerros.
- **Implied scale** controls architectural cues such as board marks, tie points,
  modules and service details. A 1.5 metre sculpture may read as a 60 metre silo.

| Design height | Model scale | Manufactured height |
| --- | --- | --- |
| 2,000 mm | 1:1 | 2,000 mm |
| 2,000 mm | 1:2 | 1,000 mm |
| 2,000 mm | 1:4 | 500 mm |

Changing model scale preserves the original design parameters, feature IDs and
seed. It scales all geometric dimensions, positions and offsets uniformly,
including explicit voids and cores when available. Lengths scale by `s`, areas
by `s²`, and volumes and same-density mass by `s³`. A half-size model therefore
has one eighth of the original solid volume; a quarter-size model has one
sixty-fourth. Keep the ground origin fixed and show both design and model sizes.

Stock thickness, kerf and joint fit belong to the actual manufacturing setup in
Kerros; they must be selected for the test model, not blindly scaled from the
full-size mould. Report details that become too small instead of silently
thickening or removing them. A geometric scale model is not a structural
validation of a full-size cast.

Version 0.1.5 implements the 1:1, 1:2 and 1:4 presets. The generator still
clamps only the authored design height to 1,000–2,000 mm; the separate scale
stage can therefore produce manufactured results below 1,000 mm without
feeding them back through the design clamp. A validated custom scale or target
height remains planned.

Volume, estimated material mass, ground contact and centre of mass must remain
visible during form finding. These readings inform decisions but never certify
structural safety, reinforcement, anchors, wind loading or public installation.

## Form hierarchy

1. **Massing** — plinths, monoliths, lamellae, wedges, steps, supports, bridges,
   service cores, faceted silos and hoppers.
2. **Articulation** — deep cuts, window bands, ribs, balconies, chamfers,
   machinery housings and downpipe-like vertical details.
3. **Surface intent** — board-form lines, tie points, grooves, picked surfaces
   and pour seams. These are manufacturing features, not shader decoration.
4. **Documentation** — plans, elevations, sections, axonometric views and mould
   assembly drawings.

## Initial recipe families

- **Monolith** — one dominant mass cut by planes and deep voids.
- **Piloti** — a heavy upper mass carried by one or more faceted funnel supports.
- **Silos** — clusters of monumental faceted storage towers, bridges and service
  cores.
- **Ziggurat** — stepped masses that taper, shift and turn.
- **Lamella tower** — slender vertical plates with deep articulation.
- **Gate** — two uprights composed around one dominant void.

Piloti is the first implemented recipe. Its funnel support has an upper bearing
area, faceted shoulder, neck, stem and ground footprint. It may appear once, as
a pair, as a row or as a grid.

### Confirmed Piloti additions

- **Columns** repeat supports across width (X), and **Rows** repeat the same
  support template through depth (Y). Row count defaults to one, preserving
  the current single-row composition. Three columns and two rows mean six legs.
- **Row spacing** controls centre-to-centre distance along Y. Support depth and
  upper-mass depth must be separately controllable; repeated rows use the same
  authored leg shape. Preserve explicitly set leg dimensions when repeating
  rows and report overlap or insufficient bearing rather than silently resizing.
- **Foot offset X / Y** shifts a stem's bottom centre relative to its neck,
  allowing it to lean sideways or forwards/backwards. Its bottom face remains
  horizontal on Z = 0; its upper face stays joined to the shoulder. This is a
  planar loft, not a rigid rotation that lifts a foot away from the ground.
- Provide shared offsets for all legs and explicit selected-leg overrides.
  The UI must make the scope visible. Authored offsets use design millimetres;
  their effective physical values follow model scale.
- A selected support may replace the shared width and depth with bounded scale
  factors. The stem and shoulder remain one connected semantic leg; changing
  one must not resize a neighbour or break their coincident interface.
- A selected support may move in X/Y relative to its generated grid position.
  This translates the complete stem-and-shoulder pair and stays distinct from
  foot offset, which changes lean by moving only the bottom endpoint.
- **Divided shoulders** retain a deliberate gap between adjacent funnel tops.
  **Shared shoulders** widen and align their top faces to meet across each X
  row, producing the continuous folded base seen in the architectural reference.
  Selected size and placement remain authoritative and may reopen a gap or
  create an overlap; RAAKA reports either condition without correction.
- The **upper mass profile** may remain a block or taper from its unchanged
  bearing face to an independently sized and X/Y-shifted top face. This is a
  planar rectangular loft, not a mesh deformation, and it must not move or
  resize the supports below.
- The upper mass and support grid are **linked in X/Y by default**. Column count
  extends the composition by complete support bays; row count and row spacing
  extend its depth. Authored upper X/Y placement moves ordinary shoulder
  bearing tops with the mass while their stems and feet stay fixed. Detaching
  the footprint restores independent upper X/Y dimensions and bearing
  placement. Neither mode couples Z, and an individual support override stays
  local instead of resizing the complete upper mass.
- A selected upper mass can be duplicated as one semantic mass, while a
  selected stem or shoulder duplicates its complete support pair. Copies retain
  their base source shape and own an independent X/Y/Z translation. They are
  saved objects, not viewport instances; touching objects may be joined through
  the solid-kernel Fuse operation.
- Row/column identity and keyed variation must remain stable when another row
  is added or a different leg is edited. Update bounds, contact footprints and
  later centre-of-mass/bearing feedback from the actual tilted geometry.

Shared X/Y foot offsets are implemented in 0.1.3. Version 0.1.4 adds absolute
selected-leg overrides that replace the shared X/Y values for one named
support. Selecting either the stem or its shoulder addresses the same leg. A
new override starts from the current shared values; removing it restores
inheritance. Overrides for temporarily hidden supports are retained when the
support count is reduced. Version 0.1.6 adds one to three Y rows, stable
row/column identities, centre-to-centre spacing, separate upper-mass and
support-depth controls, and measured overlap and bearing-overhang feedback.
Version 0.1.7 adds 55–145% selected-support width and depth scales. The same
explicit override owns the selected leg's lean, size and position in the UI,
while the project keeps their validated arrays separate for backward
compatibility.
Column overlap and side-bearing overhang are measured from actual shoulder
footprints. The existing Asymmetry slider is seeded per-leg variation and
stays separate from authored overrides. Version 0.1.8 adds ±300 mm selected
X/Y placement. Bearing warnings require actual two-axis intersection and also
report collisions between supports that are not grid neighbours. Version 0.1.9
adds divided and shared shoulder topology. Existing projects migrate to divided
shoulders, preserving their previous form. Version 0.1.10 adds authored X/Y
upper-mass offsets in design millimetres. Divided supports remain fixed; shared
shoulder tops follow the mass in X while retaining their fixed necks. The
existing bearing feedback follows the actual mass position.
Version 0.1.11 adds the tapered profile with authored top width, depth and X/Y
drift. Existing projects migrate to the block profile and retain their exact
geometry.
Version 0.1.12 adds linked and detached upper-footprint modes. New studies link
the upper X/Y footprint to the support grid; existing projects migrate to
detached mode so their established geometry remains exact.
Version 0.1.13 adds source-linked upper-mass and complete-support copies with
independent X/Y/Z placement. Copies participate in scale, project files,
recovery and history. They remain separate closed preview solids, so overlap is
nominally double-counted until a validated solid-kernel Fuse operation exists.
Version 0.1.14 validates and adopts Manifold as that solid kernel. Its adapter
already produces closed union meshes, finished-solid volume and simplified
horizontal sections from the existing box and rectangular-loft vocabulary.
Version 0.1.15 connects the kernel to a user-facing Fuse operation. A blue
secondary selection set gathers source objects; a valid connected selection
becomes one closed semantic mesh with measured volume, bounds and ground
contact. Unfuse restores the source pieces. Disconnected inputs are refused,
while ordinary unfused copies retain the explicit nominal-volume warning.
Version 0.1.16 adds the default dark interface and a persistent Light/Dark mode
switch. Theme remains a local workspace preference rather than project data.
The 0.1.17 correction makes linked placement truthful: ordinary divided and
shared shoulder bearings follow upper-mass X/Y placement, while Detached keeps
the independent cantilever and its explicit overhang feedback.

Version 0.1.18 adds individual part removal and selection-aware controls.
Removing either a stem or shoulder omits the complete leg without closing its
grid slot, moving other legs or resizing the upper mass. Upper masses and copies
can also be removed. Removed parts keep their source parameters and can be
restored from the object list or through Undo; source-linked copies survive
removal of the original. Removal updates bounds, nominal volume, mass, contact
and base-grid bearing analysis, and participates in project files and recovery.
Fused objects must be unfused before removing individual parts; an affected
saved Fuse stays dormant until all its sources return.

Sliders that affect the selected piece receive a yellow edge, yellow track and
SELECTED label. In Show all mode, other sliders stay grey and editable. This follows the
current geometry, including linked bearings, source copies and explicit leg
overrides. For a Fuse, highlighting describes its live source pieces, not a
guarantee that changing an internal source changes the outside union surface.
A pinned selection label retains context while scrolling. Compact layouts
provide the same object selection and Restore actions in an Objects disclosure.

Version 0.1.19 divides the original upper mass into two X halves, two Y halves
or four XY cells. The untouched division preserves the complete outer shape,
including an existing taper and top drift. Select a cell to author its own
block/tapered profile, top width/depth and signed X/Y top drift; opposite signs
produce opposing lean directions. Bottom faces retain the shared linked or
detached footprint, and supports do not change. Independent tops no longer
follow the shared top profile until **Use shared profile** is chosen.

Each division retains its own edits and removed cells when inactive. **Whole**
returns to the shared single mass, not the union of edited cells; use **Fuse**
for that union. Individual cells can be copied, removed, restored and fused.
Existing whole-mass copies stay whole; cell copies follow their source cell and
pause outside its division. This is form composition, not manufacturing slicing.
Independent tapers may overlap or separate, and remaining unfused volumes are
nominal. Bearing feedback only checks the outer footprint, not holes left by
removed cells. Public-sculpture engineering and mould design remain out of scope.

Version 0.1.20 adds **Rectangle / Hexagon / Octagon** plan shapes. The polygon
plans use six or eight legs, one per side, and support **Whole** or matching
**6 sectors / 8 sectors** mass division. Sectors extend from the centre to one
outer edge; unedited sectors preserve the parent at every height, including
existing taper and drift. Each sector can then taper and drift independently.
Polygon top scale is uniform, unlike rectangular width/depth controls: this
keeps every side face planar. This is a radial form composition, not a new recipe.

**Polygon diameter share** times design height gives the corner-to-corner base
diameter. **Radial spread** multiplies the support ring radius and, while
**Linked**, the upper footprint. **Detached** leaves the upper diameter fixed.
Linked upper X/Y placement moves shoulder tops only; necks, stems and feet stay
fixed, and Z remains independent. **Shoulder radial depth** controls the bearing
ring depth. Shared shoulders meet along radial edges, leaving a central opening
below the mass; selected size or placement can intentionally break this match.
Bearing feedback uses actual polygon edges and shoulder intersection areas.

Rectangle retains its grid and separate depth settings. Hexagon and Octagon
retain distinct support and sector edits, removals, copies and Fuse intent when
inactive. Shared composition parameters still affect the active shape; whole-mass
copies follow the current whole parent. Polygon division mode is shared between
Hexagon and Octagon, but their local sector edits are separate. Save, recovery,
Undo/Redo and 1:1, 1:2 and 1:4 scales preserve all three layouts. Existing projects
open as Rectangle without changing their geometry. Partial-bearing assessment,
manufacturing slicing and structural approval remain outside this feature.

Version 0.1.21 adds **Global / Centered** foot offset space for polygon Piloti.
Global retains the shared world X/Y compass. Centered maps the authored X value
to each leg's outward radial direction and Y to the counter-clockwise tangent
when viewed from above. Positive radial values spread feet; negative values
draw them inward. Tangential offset zero gives purely radial lean. The inspector
labels these controls explicitly and reports centered direction relative to
outward, not as a shared world compass heading.

The centre is the fixed support-ring origin, independent of upper-mass placement.
Direction follows each actual neck, including seeded variation and selected
position; a neck placed exactly at the centre falls back to its original bay
direction. Moving a selected leg therefore realigns its centered lean. A copied
leg keeps its source's direction and translates as a complete pair. Only foot
offsets use the new frame: support placement, size, copy translation and mass
drift remain in world X/Y. Shared and selected offset values use the same mode.
Switching mode reinterprets existing values without converting or erasing them.
The setting is dormant in Rectangle and survives project files, recovery,
Undo/Redo and model scales. Existing projects migrate to Global without a shape
change. Ground faces remain horizontal and neck interfaces stay joined.

Version 0.1.22 makes the inspector selection-focused by default. Selecting an
upper mass hides leg-only sliders and sections; stems, shoulders, cells, copies
and Fuse sources expose their actual dependencies. Shared dimensions that also
affect the selection remain visible, so a linked upper mass still exposes grid
size and the support-height ratio, labelled **Upper base height** in this view.
**Show all / Show relevant** switches the control list without changing the
study, project file or history. The toggle stays beside the pinned selection
name. An empty study falls back to all controls and keeps Restore reachable.

Relevant enabling choices stay available even when they are neutral at the
current values: Linked/Detached, a mass's inherited Block/Tapered profile and
Global/Centered for polygon stems at zero lean. Independent mass tops hide the
shared profile controls. A shoulder's local position and size remain editable,
but foot lean belongs to its stem. Gizmos are planned next, not implemented in
this release; translation handles must not be confused with foot-lean handles.

### Planned high-rise articulation module

The high-rise module is a reusable articulation system rather than a separate
free-form modeller. It applies an architectural floor and bay grid to compatible
masses and generates balconies, windows and exterior doors as semantic geometry.
Windows and doors are recess or opening intent; balconies are projecting slabs
or recessed loggias. None of them are viewport decals. Repetition stays seeded,
individual modules can later be overridden, and details must remain legible at
the chosen model and implied architectural scales. The first delivery is scoped
in the [Roadmap](ROADMAP.md).

## Operations

The first operation vocabulary is:

- compose, subtract, embed and bridge;
- align and anchor to faces, edges, centres and module grids;
- taper, lean, chamfer, plane-cut, step and facet;
- repeat, vary, stagger, mirror and group;
- lock a part, silhouette or void before generating another variant;
- branch a study without destroying its source.

The first implemented shared operation is **Fuse**. It accepts two or more
touching or overlapping semantic pieces and stores their stable source IDs as a
live boolean group. Source parameter changes recompute the union. A group whose
source is temporarily outside the visible support grid stays dormant; a group
whose sources become disconnected pauses with an explicit reason. Fuse does
not yet accept another Fuse as an operand, so adding more pieces currently
means Unfuse and rebuilding the selection set.

Every generated choice has a stable seed stream. A local change must not reroll
unrelated decisions.

## Space and core intent

Negative volume has three different meanings:

1. **Open void** — visible space whose forming material must be removed.
2. **Removable core** — enclosed negative space with a planned extraction path.
3. **Retained lightweight core** — foam or another material that remains inside
   the cast and reduces concrete volume and mass.

RAAKA owns these semantic roles and their visualisation. Kerros later turns
them into mould plates, layered foam cores or other manufacturing plans.

## Outputs and ownership

### RAAKA

- editable recipe and seed;
- watertight manufacturing mesh;
- semantic surface and core intent;
- plans, elevations, sections and axonometric vector geometry;
- fast advisory castability and mass readings.

### Kerros

- authoritative mould partitioning and release directions;
- layered sheet or foam packages;
- joints, registration, vents and pour openings;
- nesting, DXF and cutting output;
- mould assembly documentation.

### Muusia

- pen assignment and line weight;
- hatching and drawing texture;
- travel ordering and pen changes;
- machine profiles and G-code.

RAAKA should export semantic drawing roles such as outline, crease, hidden,
section, grid, dimension, annotation and registration. An adapter maps those
roles into Muusia path sets rather than baking pen choices into RAAKA.

## Visual language

The interface is a working drawing surface:

- grey and white establish structure;
- yellow marks selection and immediate attention;
- magenta marks voids and destructive geometry;
- blue marks cores, guides and constructive secondary geometry;
- sharp borders, dense labels and visible coordinate grids replace soft cards;
- all product language is English except the name RAAKA.

A future drawing preset, provisionally named **RAAKA 1974**, carries title
blocks, module bubbles, dimension chains, concrete section hatching, scale bars,
revision stamps and restrained machine lettering.
