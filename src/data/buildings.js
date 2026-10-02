// Every structure for the three arthropod factions (see RA2_Insect_Conversion_Complete_GDD.md).
//
// w,h: footprint in tiles · height: world units (model height; also picking box)
// power: + supply / - drain · role: generic function used by AI & systems
// dock: tile offset (relative to footprint origin) where harvesters unload / vehicles park
// exit: tile offset where produced units roll out · produces: 'infantry' | 'vehicles'
// parts: named nodes the model MUST provide (checked by scripts/check-models.mjs)

const B = (o) => ({ armor: 'bldg', sight: 6, prereq: [], tab: 'structures', buildable: true, parts: [], ...o });
const D = (o) => B({ armor: 'def', tab: 'defense', sight: 8, w: 1, h: 1, ...o });

export const BUILDINGS = {
  // =================================================================== ALLIED — Hymenoptera & Elytra Bio-Tech
  maternalSpire: B({
    faction: 'allied', role: 'cy', name: 'Maternal Spire', w: 3, h: 3, height: 3.2, hp: 3000, cost: 3000, power: 0, buildTime: 30,
    sight: 9, buildable: false,
    desc: 'Cocoon hive on calcified chitin stilts. Brood-pheromones govern the build radius.',
  }),
  fireflyHive: B({
    faction: 'allied', role: 'power', name: 'Luminescent Firefly Hive', w: 2, h: 2, height: 2.0, hp: 750, cost: 800, power: 200, buildTime: 6,
    prereq: ['maternalSpire'], desc: 'Hex combs of synchronised fireflies. Luciferin ATP power +200.',
  }),
  digestiveMound: B({
    faction: 'allied', role: 'refinery', name: 'Digestive Chitin Mound', w: 3, h: 3, height: 2.4, hp: 1400, cost: 2000, power: -50, buildTime: 12,
    prereq: ['fireflyHive'], dock: { x: 1, z: 3 }, freeUnit: 'scarabHarvester',
    desc: 'Termite mound with a gastric pit. Dissolves ore into nutrients. Includes a Scarab Harvester.',
  }),
  broodHatchery: B({
    faction: 'allied', role: 'barracks', name: 'Brood Hatchery', w: 2, h: 2, height: 1.8, hp: 900, cost: 500, power: -10, buildTime: 5,
    prereq: ['fireflyHive'], exit: { x: 0, z: 2 }, produces: 'infantry', parts: ['door'],
    desc: 'Humid larval chamber. Hatches all infantry castes.',
  }),
  metamorphosisPod: B({
    faction: 'allied', role: 'factory', name: 'Chitin Metamorphosis Pod', w: 3, h: 3, height: 2.8, hp: 1800, cost: 2000, power: -25, buildTime: 12,
    prereq: ['digestiveMound'], exit: { x: 1, z: 3 }, produces: 'vehicles', parts: ['door'],
    desc: 'Vaulted cocoon between ivory pillars. Gestates armoured arthropods.',
  }),
  pheromoneRoost: B({
    faction: 'allied', role: 'radar', name: 'Pheromone Roost', w: 2, h: 2, height: 3.6, hp: 1000, cost: 1000, power: -50, buildTime: 8,
    prereq: ['digestiveMound'], radar: true, parts: ['radar'],
    desc: 'Needle tower of antennae. Provides radar.',
  }),
  panopticArray: B({
    faction: 'allied', role: 'tech', name: 'Panoptic Compound Array', w: 2, h: 2, height: 3.8, hp: 1200, cost: 2500, power: -150, buildTime: 15,
    prereq: ['metamorphosisPod', 'pheromoneRoost'], revealMap: true, parts: ['radar'],
    desc: 'Giant dragonfly eye aimed skyward. Reveals the whole battlefield. Unlocks advanced castes.',
  }),
  enzymaticSynth: B({
    faction: 'allied', role: 'purifier', name: 'Enzymatic Catalyst Synthesizer', w: 2, h: 2, height: 2.6, hp: 1200, cost: 2000, power: -50, buildTime: 10,
    prereq: ['panopticArray'], purifier: 0.25,
    desc: 'Neon catalytic bile glands. +25% income from every harvest.',
  }),
  cleaningHollow: B({
    faction: 'allied', role: 'depot', name: 'Mutualist Cleaning Hollow', w: 3, h: 3, height: 0.9, hp: 1100, cost: 800, power: -25, buildTime: 7,
    prereq: ['metamorphosisPod'], depot: true, walkable: true,
    desc: 'Cleaner mites mend vehicles parked inside and scrape out Drill Mites.',
  }),
  tachyonReliquary: B({
    faction: 'allied', role: 'superweapon', name: 'Tachyon Mantis Reliquary', w: 3, h: 3, height: 3.4, hp: 1500, cost: 2500, power: -150, buildTime: 20,
    prereq: ['panopticArray'], superweapon: 'chronoshift', limit: 1, parts: ['core'],
    desc: 'SUPERWEAPON: teleports units in a 3×3 area anywhere. Infantry are shredded.',
  }),
  swarmConduit: B({
    faction: 'allied', role: 'superweapon', name: 'Stratospheric Swarm Conduit', w: 3, h: 3, height: 4.2, hp: 1500, cost: 5000, power: -200, buildTime: 25,
    prereq: ['panopticArray'], superweapon: 'storm', limit: 1, parts: ['core'],
    desc: 'SUPERWEAPON: cicada-wing resonance summons a lightning storm.',
  }),
  stinkChamber: D({
    faction: 'allied', role: 'defense', sub: 'antiInf', name: 'Hardened Stink-Chamber', height: 0.8, hp: 600, cost: 500, power: 0, buildTime: 4,
    prereq: ['broodHatchery'], weapon: 'stingInjectors', parts: ['muzzle'],
    desc: 'Calcified pillbox dome. Shreds infantry.',
  }),
  skyPiercer: D({
    faction: 'allied', role: 'defense', sub: 'aa', name: 'Sky-Piercer Bombardier Sentry', height: 1.6, hp: 800, cost: 1000, power: -50, buildTime: 7,
    prereq: ['pheromoneRoost'], weapon: 'seekerPods', turret: true, needsPower: true, parts: ['turret', 'muzzle'],
    desc: 'Anti-air beetle abdomens. Homing pods vs airborne units.',
  }),
  jewelObelisk: D({
    faction: 'allied', role: 'defense', sub: 'antiArmor', name: 'Jewel Beetle Obelisk', height: 3.0, hp: 650, cost: 1500, power: -75, buildTime: 10,
    prereq: ['pheromoneRoost'], weapon: 'solarLance', needsPower: true, parts: ['muzzle'],
    desc: 'Elytra-mirror prism tower. Nearby obelisks chain-amplify the beam.',
  }),
  sepiaEmitter: D({
    faction: 'allied', role: 'defense', sub: 'gap', name: 'Sepia Spore Emitter', height: 2.2, hp: 900, cost: 1000, power: -100, buildTime: 8,
    prereq: ['panopticArray'], gap: 8, needsPower: true, parts: ['smoke'],
    desc: 'Puffs radar-absorbing spores. Shrouds your base from the enemy.',
  }),

  // =================================================================== SOVIET — Scorpiones, Araneae & Toxic Blattodea
  hiveNexus: B({
    faction: 'soviet', role: 'cy', name: 'Central Hive Nexus', w: 3, h: 3, height: 2.8, hp: 3000, cost: 3000, power: 0, buildTime: 30,
    sight: 9, buildable: false, desc: 'Brutalist mud-and-mastic termitary. Nerve centre of the hive.',
  }),
  electrocyteHive: B({
    faction: 'soviet', role: 'power', name: 'Electrocyte Breeding Hive', w: 2, h: 2, height: 2.2, hp: 750, cost: 600, power: 150, buildTime: 5,
    prereq: ['hiveNexus'], parts: ['core'], desc: 'Vibrating egg sacs with electric organs. Power +150.',
  }),
  chitinMill: B({
    faction: 'soviet', role: 'refinery', name: 'Grinding Chitin Mill', w: 3, h: 3, height: 2.6, hp: 1400, cost: 2000, power: -50, buildTime: 12,
    prereq: ['electrocyteHive'], dock: { x: 1, z: 3 }, freeUnit: 'trenchTermite',
    desc: 'Rotating serrated jawbones over a digestive pit. Includes a Trench-Termite.',
  }),
  swarmHatchery: B({
    faction: 'soviet', role: 'barracks', name: 'Swarm Hatchery', w: 2, h: 2, height: 1.6, hp: 900, cost: 500, power: -10, buildTime: 5,
    prereq: ['electrocyteHive'], exit: { x: 0, z: 2 }, produces: 'infantry', parts: ['door'],
    desc: 'Brood pits force-feeding shock troops mutagenic royal jelly.',
  }),
  carapaceFoundry: B({
    faction: 'soviet', role: 'factory', name: 'Heavy Carapace Foundry', w: 3, h: 3, height: 2.8, hp: 1800, cost: 2000, power: -25, buildTime: 12,
    prereq: ['chitinMill'], exit: { x: 1, z: 3 }, produces: 'vehicles', parts: ['door'],
    desc: 'Smouldering geothermal kiln baking iron-chitin war beasts.',
  }),
  antennaLattice: B({
    faction: 'soviet', role: 'radar', name: 'Pheromone Antenna Lattice', w: 2, h: 2, height: 3.6, hp: 1000, cost: 1000, power: -50, buildTime: 8,
    prereq: ['chitinMill'], radar: true, parts: ['radar'], desc: 'Twitching moth antennae track enemy movement. Radar.',
  }),
  geneForge: B({
    faction: 'soviet', role: 'tech', name: 'Mutagenic Gene Forge', w: 3, h: 3, height: 2.8, hp: 1500, cost: 2000, power: -100, buildTime: 14,
    prereq: ['carapaceFoundry', 'antennaLattice'], desc: 'Nest of mutating pupae. Unlocks Hercules, Goliath and superweapons.',
  }),
  toxicCyst: B({
    faction: 'soviet', role: 'superweapon', name: 'Caustic Toxic Queen Cyst', w: 3, h: 3, height: 3.2, hp: 1500, cost: 5000, power: -200, buildTime: 25,
    prereq: ['geneForge'], superweapon: 'nuke', limit: 1, parts: ['core'],
    desc: 'SUPERWEAPON: launches a Gargantuan Acidic Spore with corrosive fallout.',
  }),
  carapaceResonator: B({
    faction: 'soviet', role: 'superweapon', name: 'Hardened Carapace Resonator', w: 3, h: 3, height: 3.4, hp: 1500, cost: 2500, power: -200, buildTime: 20,
    prereq: ['geneForge'], superweapon: 'ironCurtain', limit: 1, parts: ['core'],
    desc: 'SUPERWEAPON: bio-magnetic field makes units invulnerable for 20 s.',
  }),
  spineSpitter: D({
    faction: 'soviet', role: 'defense', sub: 'antiInf', name: 'Gatling Spine Spitter', height: 0.9, hp: 500, cost: 500, power: 0, buildTime: 4,
    prereq: ['swarmHatchery'], weapon: 'needleSpitter', turret: true, parts: ['turret', 'muzzle'],
    desc: 'Burrowing spider with a rotating needle abdomen. Shreds infantry.',
  }),
  sporeMortar: D({
    faction: 'soviet', role: 'defense', sub: 'aa', name: 'Spore Burst Mortar', height: 1.2, hp: 900, cost: 1000, power: -50, buildTime: 7,
    prereq: ['swarmHatchery'], weapon: 'sporeFlak', turret: true, needsPower: true, parts: ['turret', 'muzzle'],
    desc: 'Upward-facing beetle lobbing flak spores at airborne units.',
  }),
  stingPylon: D({
    faction: 'soviet', role: 'defense', sub: 'antiArmor', name: 'Bio-Electric Sting Pylon', height: 2.6, hp: 700, cost: 1500, power: -75, buildTime: 10,
    prereq: ['antennaLattice'], weapon: 'stingPylonArc', needsPower: true, chargeable: true, parts: ['muzzle'],
    desc: 'Upright giant centipede crackling with arcs. Spark Centipedes can charge it.',
  }),

  // =================================================================== YURI — Neuroptera, Cordyceps & Psionic Parasites
  neuralCortex: B({
    faction: 'yuri', role: 'cy', name: 'Neural Cortex Chamber', w: 3, h: 3, height: 3.0, hp: 3000, cost: 3000, power: 0, buildTime: 30,
    sight: 9, buildable: false, parts: ['core'], desc: 'Pulsating brain-mass in a ribbed bone cage.',
  }),
  larvalVat: B({
    faction: 'yuri', role: 'power', name: 'Metabolic Larval Vat', w: 2, h: 2, height: 1.8, hp: 750, cost: 600, power: 150, buildTime: 5,
    prereq: ['neuralCortex'], garrison: 5, garrisonPower: 50,
    desc: 'Amber digestive pods. Power +150, +50 per garrisoned infantry (max 5).',
  }),
  cordycepsIncubator: B({
    faction: 'yuri', role: 'barracks', name: 'Cordyceps Incubator', w: 2, h: 2, height: 2.0, hp: 900, cost: 500, power: -10, buildTime: 5,
    prereq: ['larvalVat'], exit: { x: 0, z: 2 }, produces: 'infantry', parts: ['door'],
    desc: '(Added) Fungal mound that hatches Yuri infantry.',
  }),
  chrysalisFoundry: B({
    faction: 'yuri', role: 'factory', name: 'Chrysalis Bio-Foundry', w: 3, h: 3, height: 3.0, hp: 1800, cost: 2000, power: -25, buildTime: 12,
    prereq: ['cordycepsIncubator'], exit: { x: 1, z: 3 }, produces: 'vehicles', parts: ['door'],
    desc: '(Added) Hanging chrysalis that pupates Yuri war beasts.',
  }),
  digestionChasm: B({
    faction: 'yuri', role: 'grinder', name: 'Carnivorous Digestion Chasm', w: 3, h: 3, height: 1.4, hp: 1200, cost: 800, power: -25, buildTime: 7,
    prereq: ['cordycepsIncubator'], grinder: true, parts: ['spinY'],
    desc: 'Spiral-toothed maw. Units ordered inside are recycled for 100% of their cost.',
  }),
  psionicSpire: B({
    faction: 'yuri', role: 'radar', name: 'Psionic Antenna Spire', w: 2, h: 2, height: 3.6, hp: 1000, cost: 1000, power: -50, buildTime: 8,
    prereq: ['chrysalisFoundry'], radar: true, sensor: 16, parts: ['radar'],
    desc: 'Silken moth antennae. Radar, and reveals enemy movement orders nearby. Unlocks advanced strains.',
  }),
  pupaChambers: B({
    faction: 'yuri', role: 'cloning', name: 'Dual Brood Pupa Chambers', w: 2, h: 2, height: 2.4, hp: 1000, cost: 2500, power: -100, buildTime: 14,
    prereq: ['psionicSpire'], clone: true, exit: { x: 0, z: 2 },
    desc: 'Twin chrysalises. Every infantry hatched gets a free clone.',
  }),
  sporeDiffuser: B({
    faction: 'yuri', role: 'superweapon', name: 'Mutagenic Spore Diffuser', w: 3, h: 3, height: 3.6, hp: 1500, cost: 2500, power: -200, buildTime: 20,
    prereq: ['psionicSpire'], superweapon: 'mutator', limit: 1, parts: ['core'],
    desc: 'SUPERWEAPON: Cordyceps cloud turns all infantry in the area into your Stag Brawlers.',
  }),
  cerebralSpire: B({
    faction: 'yuri', role: 'superweapon', name: 'Mind-Shatter Cerebral Spire', w: 3, h: 3, height: 4.4, hp: 1500, cost: 5000, power: -200, buildTime: 25,
    prereq: ['psionicSpire'], superweapon: 'dominator', limit: 1, parts: ['core'],
    desc: 'SUPERWEAPON: permanently enslaves all units in the area and shatters structures.',
  }),
  gatlingLarva: D({
    faction: 'yuri', role: 'defense', sub: 'antiInf', name: 'Needle-Tail Gatling Larva', height: 1.4, hp: 700, cost: 1000, power: -25, buildTime: 7,
    prereq: ['cordycepsIncubator'], weapon: 'gatlingVenom', turret: true, parts: ['turret', 'muzzle'],
    desc: 'Scorpion tail with three venom tubes. Spins up; hits ground & air.',
  }),
  pheromoneMonolith: D({
    faction: 'yuri', role: 'defense', sub: 'antiArmor', name: 'Hypnotic Pheromone Monolith', height: 2.6, hp: 800, cost: 1500, power: -75, buildTime: 10,
    prereq: ['psionicSpire'], weapon: 'mindControlTower', needsPower: true, parts: ['muzzle'],
    desc: 'Fleshy spire with a glowing brain. Mind-controls up to 3 attackers.',
  }),
};
