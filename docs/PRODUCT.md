# RAAKA product definition

## Product thesis

RAAKA is a deterministic brutalist massing studio for physical sculpture. It
turns a constrained architectural vocabulary into repeatable solid forms,
vector drawings and manufacturing intent.

This document describes the product direction. In version 0.1.0, only the
interactive Piloti study, selection and basic physical estimates are
implemented. Saved projects, outputs, cores and the remaining recipe families
are planned. See [Roadmap](ROADMAP.md) and the
[baseline review](AUDIT-2026-09-20.md) for delivery status and known issues.

The constraint is the identity: RAAKA is not a general-purpose modeller. Its
primary geometry is made from planes, prisms, wedges, facets and explicit
boolean relationships. This produces a coherent visual language and makes the
result legible to later mould and drawing systems.

## Physical scale

The normal finished sculpture is 1,000–2,000 mm tall, with 1,500 mm as the
default study height. RAAKA distinguishes two scales:

- **Physical scale** is the actual manufactured size in millimetres.
- **Implied scale** controls architectural cues such as board marks, tie points,
  modules and service details. A 1.5 metre sculpture may read as a 60 metre silo.

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
a pair, as a row or eventually as a grid.

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
