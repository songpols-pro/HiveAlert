# Model authoring guide (Hive Alert 2 — insect factions)

All models are **procedural low/medium-poly** Three.js geometry built in code. There are no asset files.
The GDD is `C:\Users\songpol_s\Downloads\RA2_Insect_Conversion_Complete_GDD.md`. Each kind's name, description, size and required parts are in `src/data/buildings.js` and `src/data/units.js`.

## Files

```
src/models/<faction>/structures.js   buildings with tab 'structures'
src/models/<faction>/defenses.js     buildings with tab 'defense'
src/models/<faction>/infantry.js     units with type 'infantry'
src/models/<faction>/vehicles.js     units with type 'vehicle'
```
Each file exports `MODELS = { kindKey: buildFn }` where `buildFn(team) => THREE.Group`.
Examples to copy the style from:
- `allied/structures.js` → `maternalSpire`
- `allied/infantry.js` → `strikebug`
- `soviet/vehicles.js` → `rhinoBeetle`
- `common.js` → bomber moth, mirage shrub

## Tools

- `PartBuilder` (`models/builder.js`). Primitives are merged per material:
  `box, cyl, cone, sphere, ico, dodeca, octa, torus, strut(a,b,r), taper(a,b,r0,r1), dome(rx,ry,rz,…),
  ellipsoid(rx,ry,rz,…), polygon(pts), leaf(…)`. Rotations are Euler XYZ in radians.
- `insectKit.js`:
  - static helpers: `eyes, chain, spikes, comb, sacs, stilts, ribs, plates`
  - articulated parts that return named pivots: `hexLegs, bipedLegs, arms, wings, antennae, mandibles, scorpionTail`
- `pivot(name, builder, x, y, z)` gives a named node holding a built part. `marker(name, x, y, z)` gives an empty named point.

## Materials (the only allowed source)

`const m = mats(team, F)` where `F` is `'allied' | 'soviet' | 'yuri'`. **Never create `new THREE.*Material`**: fog of war only works on materials from `mats()`. The checker flags any that aren't.

| key | use |
| --- | --- |
| `chitin`, `chitinDark`, `chitinLight` | faction carapace: main, shadowed, highlight |
| `membrane` | translucent wings, sac skins, veils |
| `eye` | compound eyes |
| `organ` | signature glowing organ (Allied firefly yellow-green, Soviet toxic green, Yuri psychic violet) |
| `bone`, `flesh`, `resin` (translucent amber/jelly), `mud` (nest mastic), `metal` (bio-tech fittings) | |
| `team`, `teamDark`, `glow` | house colour. Use it for bands, stripes and markings, about 10–20 % of the visible surface, so ownership reads clearly from the iso camera |
| `spark` (cyan), `acid` (green), `fire`, `psy` (violet), `photon` (gold-white), `chrono` (ice blue) | emissive effect colours |
| `steel`, `darkSteel`, `brass`, `copper`, `concrete`, `concreteDark`, `rubber`, `hazard`, `crystal`, `soil`, `stalk`, `leaf`, `fern`, `petal`, … | common materials, used sparingly |

## Faction style

- **Allied (Hymenoptera & Elytra)**: polished iridescent teal chitin, gold fittings, amber resin, hex honeycombs, wasp/bee/beetle/dragonfly forms, elegant and symmetric. Glowing parts are firefly yellow-green.
- **Soviet (Scorpions, spiders, cockroaches)**: heavy dark rust/black plates, bone horns and spikes, pincers, mud-and-mastic brutalism, toxic green sacs, cyan electric organs on tesla things. Squat and menacing.
- **Yuri (Neuroptera, Cordyceps, psionics)**: violet chitin, pink brain-flesh, bone cages, fungal stalks and caps, translucent violet membranes, glowing psychic organs. Organic and unsettling.

## Coordinates & sizes

- +Z is forward (front door / gun direction), +Y is up. The origin is on the ground at the footprint or unit centre.
- **Buildings** fill their `w × h` footprint: x ∈ [-w/2, w/2], z ∈ [-h/2, h/2], with a total height of about `height`.
  Buildings with `dock`/`exit` may add a flat apron pad (y ≤ 0.05) up to 1 tile in front (+Z).
- **Units** span about `radius*2*1.6` and stand about `height` tall. Hover units are modelled at ground level; the game lifts them by `flyHeight`.
- Infantry are 0.35–0.5 tall: upright soldier insects (use `bipedLegs` + `arms`) or small multi-legged critters.
- Budgets: buildings ≤ 9000 tris, defenses ≤ 4000, vehicles ≤ 5000, infantry ≤ 1800. Use low segment counts (5–10). Keep named nodes below 30 per model.

## Named parts (they drive animation and gameplay)

| name | behaviour |
| --- | --- |
| `turret` | yaws toward the target (Y). Put `muzzle` inside it |
| `muzzle`, `muzzle2` | projectile spawn point at the barrel or stinger tip. Place it accurately |
| `body` | bobs while walking. Put the torso/hull plus turret in here; legs go on the root |
| `hexA*` / `hexB*` | walker legs (`hexLegs`) |
| `bipA` / `bipB`, `armA` / `armB` | biped legs and arms. Arms raise when firing |
| `wingL*` / `wingR*` | flap while moving or hovering |
| `antL` / `antR`, `mandL` / `mandR`, `tail` | antennae twitch; mandibles open when firing; tail strikes when firing |
| `spinX*` / `spinY*` / `spinZ*` | continuous rotation (`node.userData.speed`, rad/s, default 2) |
| `pulse*`, `glow*` | organic pulsing scale (slow / fast) |
| `deployOn*` / `deployOff*` | scale in / out when the unit deploys |
| `radar*` | spins while powered (radar structures) |
| `core*` | superweapon core: spins and swells as the weapon charges |
| `door*` | factory/barracks door: rises by `userData.lift` (default 0.6) when a unit exits, so put it at the front (+Z) |
| `abdomen` | rotates −X (raises) when aiming (Bombardier Spider's missile) |
| `cargo` | the game scales its Y by load 0..1, so put its origin at the bottom of the load |
| `smoke`, `smoke2` | chimney / vent markers for smoke particles |

A part's geometry must be inside its pivot. Pivots are converted to bones, so **only named nodes animate**; unnamed groups are flattened.

## Validate

```bash
node scripts/check-models.mjs allied/infantry
```
A file check looks like `allied/infantry`; a whole-faction check looks like `allied`. Fix every `ERROR` and `WARN`. `MISSING` lines are kinds still to do.
