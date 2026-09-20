# RAAKA product definition

## Product thesis

RAAKA is a deterministic brutalist massing studio for physical sculpture. It
turns a constrained architectural vocabulary into repeatable solid forms,
vector drawings and manufacturing intent.

This document describes the product direction. In version 0.1.7, the
interactive Piloti study, selection, physical estimates, versioned project
files, local recovery, undo/redo, shared X/Y foot offsets and selected-leg
overrides are implemented, together with 1:1, 1:2 and 1:4 model scales,
multi-row support grids and selected-support width/depth overrides. Outputs,
cores and the remaining recipe families are planned. See
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
explicit override owns the selected leg's lean and size in the UI, while the
project keeps their validated arrays separate for backward compatibility.
Column overlap and side-bearing overhang are measured from actual shoulder
footprints. The existing Asymmetry slider is seeded per-leg variation and
stays separate from authored overrides.

## Operations

The first operation vocabulary is:

- compose, subtract, embed and bridge;
- align and anchor to faces, edges, centres and module grids;
- taper, lean, chamfer, plane-cut, step and facet;
- repeat, vary, stagger, mirror and group;
- lock a part, silhouette or void before generating another variant;
- branch a study without destroying its source.

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
