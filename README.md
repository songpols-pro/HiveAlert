# Hive Alert 2 — Arthropod Wars

An isometric WebGL RTS (Three.js r186 + Vite) that converts *Red Alert 2 / Yuri's Revenge* to insects, built from
`RA2_Insect_Conversion_Complete_GDD.md`. It has three playable factions with their land forces: structures, base defenses,
infantry, vehicles and superweapons. Each unit and structure has its signature ability.

| Faction | Order | Look |
| --- | --- | --- |
| **Allied** 🐝 | Hymenoptera & Elytra Bio-Tech | iridescent teal chitin, gold, amber resin, firefly glow |
| **Soviet** 🦂 | Scorpiones, Araneae & Toxic Blattodea | rust/black plates, bone horns, toxic green, tesla cyan |
| **Yuri** 🧠 | Neuroptera, Cordyceps & Psionic Parasites | violet chitin, brain-flesh, fungal stalks, psychic glow |

## Run

```bash
npm install
npm run dev
```

- Game: http://localhost:5173. Pick your hive, the enemy hive and a difficulty, then press **DEPLOY**.
- Model gallery: http://localhost:5173/gallery.html (every model, with idle / walk / fire / deploy animations and both team colours).
- `npm run build` writes both pages to `dist/`.
- `node scripts/check-models.mjs [all|allied|soviet|yuri|allied/infantry…]` validates models headlessly.

## Controls

| Action | Input |
| --- | --- |
| Pan / zoom | `WASD` / arrows / screen edge / middle-drag · mouse wheel |
| Select | click, drag-box, `Shift` add, double-click selects that type on screen, `Ctrl+A` selects the army |
| Contextual order | right-click: move · attack · harvest · enter (transport, Larval Vat, Digestion Chasm, Sting Pylon, Cleaning Hollow) · infiltrate (spy) · drain (Bio-UFO) · rally (selected factory) |
| Attack-move / stop | `Ctrl`+right-click or `Q` · `X` |
| Deploy | `F`: bunker, brace, radiate, psychic wave, unload, deploy MCV, anchor slave miner |
| Groups | `Ctrl+1-9` set · `1-9` recall (press twice to jump the camera) |
| Base | click a cameo to build, click it again when READY to place · right-click a cameo to hold, then cancel · `R` repair · `E` sell |
| Superweapons | click the panel at the left edge when READY, then target (Tachyon Shift: pick the units first, then the destination) |
| Display | `P` pixelate · `B` dither · `C` CRT · `M` mute · `I` stats · `F1` manual (pauses the game) |
| Dev cheats | `F9` reveal map · `F10` +$10k · `F11` charge superweapons |

## What's implemented (land scope)

**Allied:**
- **Structures:** Maternal Spire, Firefly Hive, Digestive Mound, Brood Hatchery, Metamorphosis Pod, Pheromone Roost, Panoptic Array (map reveal), Enzymatic Synthesizer (+25 % income), Cleaning Hollow (repairs, removes drill mites), Tachyon Reliquary, Swarm Conduit.
- **Defenses:** Stink-Chamber, Sky-Piercer (AA), Jewel Obelisk (prism chaining), Sepia Spore Emitter (gap shroud).
- **Infantry:** Strikebug (bunker), Halberdier (brace), Dragon-Wasp (hover), Phase-Shift Tick (teleport + chrono erase), Mimic Phasmid (spy), Hydro-Scorpion and Queen Vespidia (caustic C4), Strider Mite (spy detector).
- **Vehicles:** Scarab Harvester (teleports home), Stag Rover, Orchid Mantis (turns into a flower when idle), Refraction Weaver (splintering beam), Tiger-Beetle Ballista, Brood Mother (MCV), Water Boatman and Millipede Dreadnought (transport with garrison fire, crushes vehicles).

**Soviet:**
- **Structures:** Hive Nexus, Electrocyte Hive, Chitin Mill, Swarm Hatchery, Carapace Foundry, Antenna Lattice, Gene Forge, Toxic Queen Cyst (nuke with fallout), Carapace Resonator (iron curtain).
- **Defenses:** Spine Spitter, Spore Mortar (AA), Sting Pylon (Spark Centipedes can charge it, so it works through a power outage).
- **Infantry:** Swarm Ant, Bombardier Gunner, Spark Centipede, Stink Bug (radiation field), Tick Saboteur (timed bombs), Goliath Stag (paints targets for a bomber-moth airstrike).
- **Vehicles:** Trench-Termite (armed harvester), Rhino Beetle, Centipede Halftrack (transport), Bombardier Spider (V3 artillery), Drill Mite (infests vehicles), Hercules Dreadnought (regenerates, crushes), Nexus Queen (MCV).

**Yuri:**
- **Structures:** Neural Cortex, Larval Vat (garrisoned infantry add power), Cordyceps Incubator, Chrysalis Foundry, Digestion Chasm (recycles units for 100 % of their cost), Psionic Spire (radar that also shows enemy move orders), Pupa Chambers (clones every hatched infantry), Spore Diffuser (mutator), Cerebral Spire (dominator).
- **Defenses:** Gatling Larva (spins up, hits air), Pheromone Monolith (controls 3 units).
- **Infantry:** Spitter Maggot, Stag Brawler (regenerates, immune to mind control), Sniper Wasp (virus clouds), Mind-Weaver (mind control + psychic wave), Master Mind-Weaver (hover hero, captures buildings).
- **Vehicles:** Brood Queen (slave miner with 5 worker drones), Mantis Rover, Shredder-Tick (spin-up), Spore Flea (chaos gas makes enemies turn on each other), Trap Spider (magnetic lift and drop), Overmind Behemoth (controls 3, overloads past that), Bio-UFO (drains power, credits or defenses), Cortex Larva (MCV).

**Shared rules:**
- RA2 combat model: warhead × armor (infantry / armoured infantry / light / medium / heavy / structure / defense / airborne).
- Crushing, veterancy (granted by spy infiltration), hero limit, power with low-power penalties, and spy effects (steal credits, blackout, reshroud radar, veteran units, sabotage a superweapon).
- Psionic Spire movement lines, prism tower chaining, and the slave-miner economy.
- Every superweapon has both a player UI and AI use.

**Added because the GDD left gaps:**
- Yuri's barracks and war factory (*Cordyceps Incubator* and *Chrysalis Bio-Foundry*).
- Soviet and Yuri MCVs (*Nexus Queen*, *Cortex Larva*).

**Not in this round:** naval units, aircraft (the Dragon-Wasp, Master Mind-Weaver and Bio-UFO are hovering land units), Coral Nursery and Abyssal Trench, and the Kirov / Dragonfly / Cicada / Ghost Moth.

## How it's built

```
src/data/          rules: buildings, units, weapons (warheads & armor), factions, superweapons
src/models/        procedural models per faction (allied/ soviet/ yuri/), insect kit, baking, animation rig
                   → see src/models/README.md for the model authoring guide
src/entities/      Entity (status effects, mind-control ownership swap), Unit, Building
src/systems/       Combat, Abilities (all special mechanics), Superweapons, Production, Team, AIController
src/core/Game.js   simulation hub: spawning, death, fog/gap/reveal, targeting rules
src/ui/ src/input/ sidebar HUD, overlay, minimap, cameos · input & orders
```

- **Models.** About 85 models are built procedurally from primitives using an insect kit (legs, wings, antennae, mandibles, tails, combs, egg sacs, ribs).
  - Each model is **baked** into a few skinned meshes, one per shading class with vertex colours. Named pivots become bones, so animated models cost about 3–5 draw calls.
  - A generic rig animates parts by name: walker gaits, biped legs, wing flaps, mandibles, tails, deploy pieces, spinning parts, pulsing organs, doors and superweapon cores.
- **Fog of war.** It is patched into every material. The Sepia Spore Emitter re-shrouds an area, the Panoptic Array lifts the shroud, and a spy in your radar resets it.
- **Effects.**
  - **Beams:** tesla arcs, prism/laser/chrono/magnet/mind-control beams, and storm lightning.
  - **Particles and clouds:** gas, virus, radiation and fallout fields, plus the nuke mushroom.
  - **Decals and auras:** iron-curtain auras, goo splats and scorch decals.
  - **Post-processing:** the retro pixel/dither/CRT pass is unchanged.
- **AI.** A role-based controller plays any faction. It harasses early, sends escalating waves, defends its harvesters and base, and uses every superweapon.
