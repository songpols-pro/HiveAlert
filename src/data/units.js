// Every infantry & vehicle for the three arthropod factions.
//
// type: 'infantry' | 'vehicle' · loco: 'foot' | 'track' | 'walker' | 'hover'
// radius: collision/selection radius (tiles) · height: model height (world units, used for picking & aim)
// crush: 1 = crushes infantry, 2 = also crushes light/medium vehicles · crushable: infantry that can be run over
// deploy: 'bunker' | 'brace' | 'radiate' | 'psiWave' | 'mcv' | 'slaveMiner' | 'unload'
// parts: named nodes the model MUST provide (checked by scripts/check-models.mjs)

const I = (o) => ({ type: 'infantry', loco: 'foot', armor: 'inf', radius: 0.17, height: 0.5, turnRate: 9, sight: 5, crushable: true, tab: 'infantry', buildable: true, parts: [], ...o });
const V = (o) => ({ type: 'vehicle', loco: 'track', armor: 'heavy', radius: 0.42, height: 0.6, turnRate: 3.2, sight: 6, crush: 1, tab: 'vehicles', buildable: true, parts: [], ...o });

export const UNITS = {
  // =================================================================== ALLIED
  strikebug: I({
    faction: 'allied', name: 'Carapace Strikebug', hp: 125, speed: 1.35, cost: 200, buildTime: 3, weapon: 'spineProjector',
    deploy: 'bunker', weaponDeployed: 'spineProjectorBunker', prereq: ['broodHatchery'], parts: ['muzzle', 'deployOn'],
    desc: 'Phalanx worker with dual scythes and spine-projectors. Deploy: entrenches into a shielded bunker.',
    barks: { select: ['Strikebug ready.', 'Carapace hardened.'], move: ['Moving out!', 'Scuttling!'], attack: ['Engaging!', 'Spines away!'] },
  }),
  halberdier: I({
    faction: 'allied', name: 'Pincer Halberdier', hp: 180, armor: 'infHeavy', speed: 1.15, cost: 400, buildTime: 5, radius: 0.2, height: 0.5,
    weapon: 'chitinSpikes', deploy: 'brace', weaponDeployed: 'railHorn', prereq: ['broodHatchery'], parts: ['muzzle', 'deployOn'],
    desc: 'Quadruped beetle warrior. Deploy: braces on a dorsal tripod and fires armor-piercing rail-horns at ground & air.',
    barks: { select: ['Halberdier standing.', 'Horns primed.'], move: ['Marching.', 'On the move.'], attack: ['Pierce their shells!'] },
  }),
  dragonWasp: I({
    faction: 'allied', name: 'Dragon-Wasp', hp: 130, armor: 'air', loco: 'hover', flyHeight: 1.4, speed: 3.0, cost: 600, buildTime: 7, sight: 7,
    radius: 0.22, height: 0.4, crushable: false, weapon: 'ventralSpines', prereq: ['broodHatchery', 'pheromoneRoost'], parts: ['muzzle', 'wingL', 'wingR'],
    desc: 'Iridescent quad-winged aero-hornet. Hovers over terrain; hits ground and air.',
    barks: { select: ['Wings humming.', 'Aero-hornet airborne.'], move: ['Flying!', 'Buzzing over!'], attack: ['Diving in!'] },
  }),
  phaseTick: I({
    faction: 'allied', name: 'Phase-Shift Tick', hp: 120, speed: 1.4, cost: 1500, buildTime: 15, weapon: 'stasisBeam', teleport: true,
    prereq: ['broodHatchery', 'panopticArray'], parts: ['muzzle'],
    desc: 'Temporal flea. Teleports instantly; its stasis beam erases targets from the timeline.',
    barks: { select: ['Phase-tick present.', 'Timeline stable.'], move: ['Phasing.', 'Chrono-jump!'], attack: ['Erasing.', 'You were never here.'] },
  }),
  mimicPhasmid: I({
    faction: 'allied', name: 'Mimic Phasmid', hp: 100, speed: 1.4, cost: 1000, buildTime: 10, sight: 6, spy: true,
    prereq: ['broodHatchery', 'pheromoneRoost'], parts: [],
    desc: 'Chameleon stick-insect spy. Disguised as enemy infantry; infiltrate refineries, power, radar, factories.',
    barks: { select: ['Disguise intact.', 'Shh…'], move: ['Blending in.', 'Moving quietly.'], attack: ['Infiltrating.'] },
  }),
  hydroScorpion: I({
    faction: 'allied', name: 'Hydro-Scorpion Commando', hp: 200, armor: 'infHeavy', speed: 1.5, cost: 1000, buildTime: 10, radius: 0.2,
    weapon: 'hydroSpineDarts', weaponBuilding: 'causticSac', prereq: ['broodHatchery', 'pheromoneRoost'], parts: ['muzzle', 'tail'],
    desc: 'Amphibious black scorpion. Annihilates infantry; plants caustic sacs that dissolve buildings.',
    barks: { select: ['Scorpion here.', 'Gland sacks ready.'], move: ['Slipping through.', 'Moving.'], attack: ['Dissolve them!'] },
  }),
  queenVespidia: I({
    faction: 'allied', name: 'Queen Vespidia', hp: 250, armor: 'infHeavy', speed: 1.7, cost: 1000, buildTime: 15, radius: 0.2, height: 0.6, hero: true,
    weapon: 'neuroDarts', weaponBuilding: 'causticSac', prereq: ['broodHatchery', 'panopticArray'], parts: ['muzzle', 'wingL', 'wingR'],
    desc: 'HERO. Wasp-mantis chimera. Neuro-darts kill infantry instantly; caustic sacs level structures.',
    barks: { select: ['Yes, my brood?', 'Queen Vespidia.'], move: ['On the wing.', 'Watch me.'], attack: ['Too easy!', 'Sting time!'] },
  }),
  striderMite: I({
    faction: 'allied', name: 'Strider Hunting Mite', hp: 100, speed: 3.6, cost: 200, buildTime: 2.5, sight: 7, radius: 0.18, height: 0.3,
    weapon: 'miteLunge', detector: true, turnRate: 12, prereq: ['broodHatchery'], parts: [],
    desc: 'Six-legged predatory mite. Lunges at infantry; sniffs out disguised spies.',
    barks: { select: ['*click-click*', '*chitter*'], move: ['*skitter*'], attack: ['*SNAP*'] },
  }),
  scarabHarvester: V({
    faction: 'allied', name: 'Quantum Scarab Harvester', hp: 1000, speed: 1.8, cost: 1400, buildTime: 12, radius: 0.5, height: 0.8, turnRate: 2.6,
    harvester: { capacity: 700, rate: 75, unload: 280, teleportHome: true }, prereq: ['metamorphosisPod', 'digestiveMound'], parts: ['cargo'],
    desc: 'Dung-beetle harvester. Teleports home to the Digestive Mound when full.',
    barks: { select: ['Scarab ready.', 'Rolling nodules.'], move: ['Off to the field.', 'Rolling!'] },
  }),
  stagRover: V({
    faction: 'allied', name: 'Horned Stag Rover', hp: 300, speed: 2.6, cost: 700, buildTime: 7, weapon: 'boneCannon', turret: true, loco: 'walker',
    prereq: ['metamorphosisPod'], parts: ['turret', 'muzzle'],
    desc: 'Agile stag beetle main battle tank with a pneumatic bone cannon.',
    barks: { select: ['Stag Rover ready.', 'Mandibles locked.'], move: ['Rolling out.', 'Advancing.'], attack: ['Fire!', 'Ram them!'] },
  }),
  orchidMantis: V({
    faction: 'allied', name: 'Floral Orchid Mantis', hp: 220, armor: 'medium', speed: 2.4, cost: 1000, buildTime: 10, loco: 'walker', mirage: true,
    weapon: 'incendiaryBile', prereq: ['metamorphosisPod', 'panopticArray'], parts: ['muzzle'],
    desc: 'Ambush predator. Becomes a harmless flower when still; spits incendiary bile.',
    barks: { select: ['Just a flower…', 'Orchid in bloom.'], move: ['Drifting.', 'Moving petals.'], attack: ['Surprise!'] },
  }),
  refractionWeaver: V({
    faction: 'allied', name: 'Photonic Refraction Weaver', hp: 160, armor: 'light', speed: 2.0, cost: 1200, buildTime: 12, loco: 'walker', radius: 0.46,
    weapon: 'refractionBeam', prereq: ['metamorphosisPod', 'panopticArray'], parts: ['muzzle'],
    desc: 'Spider with focused chitin lenses. Beams splinter into nearby targets.',
    barks: { select: ['Lenses focused.', 'Weaver ready.'], move: ['Skittering.'], attack: ['Refracting!'] },
  }),
  tigerBallista: V({
    faction: 'allied', name: 'Tiger-Beetle Ballista', hp: 420, speed: 2.0, cost: 900, buildTime: 9, weapon: 'kineticRam', loco: 'walker',
    prereq: ['metamorphosisPod', 'pheromoneRoost'], parts: ['muzzle'],
    desc: 'Low-slung tank destroyer with a forward ram horn. Brutal vs armour, weak vs infantry.',
    barks: { select: ['Ballista loaded.'], move: ['Charging forward.'], attack: ['Puncture!'] },
  }),
  broodMother: V({
    faction: 'allied', name: 'Brood Mother Carapace', hp: 1000, speed: 1.2, cost: 3000, buildTime: 25, radius: 0.7, height: 1.0, turnRate: 2,
    deploy: 'mcv', deploysInto: 'maternalSpire', prereq: ['metamorphosisPod', 'cleaningHollow'], parts: [],
    desc: 'Lumbering queen crawler (MCV). Deploys into a Maternal Spire.',
    barks: { select: ['Brood Mother.'], move: ['Lumbering on.'] },
  }),
  waterBoatman: V({
    faction: 'allied', name: 'Water Boatman Skimmer', hp: 400, armor: 'medium', speed: 2.6, cost: 900, buildTime: 8, radius: 0.5,
    transport: 12, deploy: 'unload', prereq: ['metamorphosisPod'], parts: [],
    desc: 'Paddle-legged transport. Carries up to 12 infantry.',
    barks: { select: ['Boatman ready.'], move: ['Paddling.'] },
  }),
  millipedeDreadnought: V({
    faction: 'allied', name: 'Colossal Millipede Dreadnought', hp: 900, speed: 1.3, cost: 2000, buildTime: 18, radius: 0.75, height: 0.9, turnRate: 1.8,
    crush: 2, transport: 5, garrisonFire: true, deploy: 'unload', prereq: ['metamorphosisPod', 'panopticArray'], parts: [],
    desc: 'Titan millipede. Crushes vehicles; up to 5 garrisoned infantry fire from its plates.',
    barks: { select: ['Dreadnought ready.'], move: ['Crushing forward.'], attack: ['Open fire!'] },
  }),

  // =================================================================== SOVIET
  swarmAnt: I({
    faction: 'soviet', name: 'Brood Swarm Ant', hp: 120, speed: 1.3, cost: 100, buildTime: 2, weapon: 'acidShards',
    prereq: ['swarmHatchery'], parts: ['muzzle'],
    desc: 'Cheap red ant soldier with a caustic bio-rifle.',
    barks: { select: ['For the hive!', 'Ant reporting.'], move: ['Swarming!', 'Moving!'], attack: ['Acid!', 'Bite them!'] },
  }),
  bombardierGunner: I({
    faction: 'soviet', name: 'Bombardier Beetle Gunner', hp: 135, armor: 'infHeavy', speed: 1.2, cost: 300, buildTime: 4, radius: 0.19,
    weapon: 'aerosolBurst', prereq: ['swarmHatchery'], parts: ['muzzle'],
    desc: 'Hunchback with twin reactant chambers. Anti-air aerosol bursts.',
    barks: { select: ['Chambers pressurised.'], move: ['Moving.'], attack: ['Detonate!'] },
  }),
  sparkCentipede: I({
    faction: 'soviet', name: 'Spark Centipede', hp: 160, armor: 'infHeavy', speed: 1.0, cost: 500, buildTime: 6, radius: 0.21,
    weapon: 'electroSting', chargesPylon: true, prereq: ['swarmHatchery', 'antennaLattice'], parts: ['muzzle'],
    desc: 'Arc soldier in conductive rings. Shocks armour; charges Sting Pylons.',
    barks: { select: ['Fully charged.', 'Zzzt.'], move: ['Coiling forward.'], attack: ['Shock them!'] },
  }),
  stinkBug: I({
    faction: 'soviet', name: 'Caustic Stink Bug', hp: 150, armor: 'infHeavy', speed: 1.0, cost: 600, buildTime: 7, radius: 0.2,
    weapon: 'radBile', deploy: 'radiate', prereq: ['swarmHatchery', 'antennaLattice'], parts: ['muzzle', 'deployOn'],
    desc: 'Shield-bug with radioactive bile. Deploy: saturates the ground in dissolving slime.',
    barks: { select: ['Bile tank full.'], move: ['Oozing forward.'], attack: ['Melt!'] },
  }),
  tickSaboteur: I({
    faction: 'soviet', name: 'Bombardier Tick Saboteur', hp: 120, speed: 1.5, cost: 600, buildTime: 6, height: 0.4,
    weapon: 'enzymeBomb', prereq: ['swarmHatchery', 'antennaLattice'], parts: [],
    desc: 'Frenetic tick. Sticks timed enzyme bombs on anything.',
    barks: { select: ['Heh heh heh!', 'Bombs!'], move: ['Ticking along!'], attack: ['Kaboom time!'] },
  }),
  goliathStag: I({
    faction: 'soviet', name: 'Goliath Stag Commando', hp: 280, armor: 'infHeavy', speed: 1.5, cost: 1500, buildTime: 15, radius: 0.22, height: 0.65,
    hero: true, weapon: 'boneShardCannon', weaponBuilding: 'pheromonePaint', prereq: ['swarmHatchery', 'geneForge'], parts: ['muzzle'],
    desc: 'HERO. Four-armed scarab veteran. Paints structures for a heavy moth airstrike.',
    barks: { select: ['Goliath here.', 'Point me at them.'], move: ['Moving.', 'Out of my way.'], attack: ['Moths inbound!', 'Crush!'] },
  }),
  trenchTermite: V({
    faction: 'soviet', name: 'Armored Trench-Termite', hp: 1000, speed: 1.6, cost: 1400, buildTime: 12, radius: 0.52, height: 0.8, turnRate: 2.6,
    harvester: { capacity: 700, rate: 70, unload: 260 }, weapon: 'rotaryNeedles', turret: true, prereq: ['carapaceFoundry', 'chitinMill'], parts: ['cargo', 'turret', 'muzzle'],
    desc: 'Multi-jawed armoured harvester with a rotary needle turret.',
    barks: { select: ['Termite ready.'], move: ['Digging in.', 'To the trench!'] },
  }),
  rhinoBeetle: V({
    faction: 'soviet', name: 'Rhinoceros Beetle Bruiser', hp: 400, speed: 2.2, cost: 900, buildTime: 9, radius: 0.46, height: 0.7, loco: 'walker',
    weapon: 'hornCannon', turret: true, prereq: ['carapaceFoundry'], parts: ['turret', 'muzzle'],
    desc: 'Double-horned bedrock of Soviet armour with a pneumatic shell cannon.',
    barks: { select: ['Rhino ready.', 'Horns sharpened.'], move: ['Rolling.', 'Charging!'], attack: ['Gore them!', 'Fire!'] },
  }),
  centipedeHalftrack: V({
    faction: 'soviet', name: 'Skittering Centipede Halftrack', hp: 220, armor: 'light', speed: 3.2, cost: 500, buildTime: 5, radius: 0.44, loco: 'walker',
    weapon: 'flakPod', turret: true, transport: 5, deploy: 'unload', prereq: ['carapaceFoundry'], parts: ['turret', 'muzzle'],
    desc: 'Fast centipede carrier with a flak pod. Carries 5 infantry.',
    barks: { select: ['Halftrack ready.'], move: ['Skittering!'], attack: ['Flak up!'] },
  }),
  bombardierSpider: V({
    faction: 'soviet', name: 'Ballistic Bombardier Spider', hp: 150, armor: 'light', speed: 1.8, cost: 800, buildTime: 9, radius: 0.45, loco: 'walker',
    weapon: 'toxicDart', prereq: ['carapaceFoundry', 'antennaLattice'], parts: ['muzzle', 'abdomen'],
    desc: 'Long-range siege spider. Raises its abdominal toxic dart and launches.',
    barks: { select: ['Dart loaded.'], move: ['Repositioning.'], attack: ['Launching!'] },
  }),
  drillMite: V({
    faction: 'soviet', name: 'Parasitic Drill Mite', hp: 100, armor: 'light', speed: 4.0, cost: 500, buildTime: 5, radius: 0.24, height: 0.3, loco: 'walker',
    crush: 0, turnRate: 10, weapon: 'drillMandibles', weaponInf: 'drillBite', mcImmune: true, prereq: ['carapaceFoundry'], parts: [],
    desc: 'Borer spider. Burrows into vehicles and eats them from inside. Bites infantry.',
    barks: { select: ['*whirr*'], move: ['*skitter-whirr*'], attack: ['*DRILL*'] },
  }),
  herculesDreadnought: V({
    faction: 'soviet', name: 'Titan Hercules Dreadnought', hp: 800, speed: 1.3, cost: 1750, buildTime: 18, radius: 0.72, height: 1.0, turnRate: 1.9,
    crush: 2, regen: 0.5, weapon: 'twinHornCannon', weaponAir: 'harpoonTubes', turret: true, prereq: ['carapaceFoundry', 'geneForge'], parts: ['turret', 'muzzle', 'muzzle2'],
    desc: 'Juggernaut beetle: twin cannons, crushing mandibles, AA harpoons, self-regenerating carapace.',
    barks: { select: ['Hercules ready.', 'The titan awakens.'], move: ['Crushing forward.'], attack: ['Obliterate!'] },
  }),
  nexusQueen: V({
    faction: 'soviet', name: 'Nexus Queen Crawler', hp: 1000, speed: 1.2, cost: 3000, buildTime: 25, radius: 0.7, height: 1.0, turnRate: 2,
    deploy: 'mcv', deploysInto: 'hiveNexus', prereq: ['carapaceFoundry', 'antennaLattice'], parts: [],
    desc: '(Added MCV) Termite queen that deploys into a Central Hive Nexus.',
    barks: { select: ['Queen crawler.'], move: ['Crawling.'] },
  }),

  // =================================================================== YURI
  spitterMaggot: I({
    faction: 'yuri', name: 'Telekinetic Spitter Maggot', hp: 130, speed: 1.3, cost: 200, buildTime: 3, weapon: 'pyroBolt',
    prereq: ['cordycepsIncubator'], parts: ['muzzle'],
    desc: 'Many-eyed maggot with an exposed brain. Fires pyrokinetic bolts.',
    barks: { select: ['We hear you.', 'Maggot ready.'], move: ['As one.', 'Wriggling.'], attack: ['Burn!'] },
  }),
  stagBrawler: I({
    faction: 'yuri', name: 'Mutated Stag Brawler', hp: 220, armor: 'infHeavy', speed: 1.5, cost: 500, buildTime: 6, radius: 0.22, height: 0.6,
    crushable: false, regen: 4, mcImmune: true, weapon: 'bruteFists', prereq: ['cordycepsIncubator'], parts: ['armA', 'armB'],
    desc: 'Hulking mutant beetle. Punches through carapace; regenerates; immune to mind control.',
    barks: { select: ['SMASH?', 'Grrraah!'], move: ['STOMP!'], attack: ['SMASH!', 'CRUNCH!'] },
  }),
  sniperWasp: I({
    faction: 'yuri', name: 'Cordyceps Sniper Wasp', hp: 110, speed: 1.3, cost: 700, buildTime: 8, sight: 8.5,
    weapon: 'sporeStinger', prereq: ['cordycepsIncubator', 'psionicSpire'], parts: ['muzzle'],
    desc: 'Hooded assassin wasp. Outranges defenses; victims burst into infectious spore clouds.',
    barks: { select: ['Target acquired.'], move: ['Relocating.'], attack: ['Infect.'] },
  }),
  mindWeaver: I({
    faction: 'yuri', name: 'Mind-Weaver Cerebral Larva', hp: 110, speed: 1.3, cost: 800, buildTime: 9, height: 0.55,
    weapon: 'mindControl', deploy: 'psiWave', prereq: ['cordycepsIncubator', 'psionicSpire'], parts: ['muzzle'],
    desc: 'Psionic worm. Mind-controls one unit. Deploy: psychic wave kills nearby infantry.',
    barks: { select: ['Your will is mine.', 'Mind-Weaver.'], move: ['Floating there.'], attack: ['Obey!', 'You are mine.'] },
  }),
  masterMindWeaver: I({
    faction: 'yuri', name: 'Master Mind-Weaver', hp: 300, armor: 'air', loco: 'hover', flyHeight: 0.9, speed: 1.6, cost: 1500, buildTime: 15,
    radius: 0.24, height: 0.7, hero: true, crushable: false, weapon: 'mindControlPrime', prereq: ['cordycepsIncubator', 'psionicSpire'], parts: ['muzzle'],
    desc: 'HERO. Floating brain-sovereign. Mind-controls units and even structures.',
    barks: { select: ['The Sovereign hears.', 'Kneel.'], move: ['I glide.'], attack: ['Your mind… is mine!'] },
  }),
  workerDrone: I({
    faction: 'yuri', name: 'Worker Drone', hp: 80, speed: 1.4, cost: 0, buildTime: 1, buildable: false, radius: 0.15, height: 0.35, mcImmune: true, drone: true,
    parts: ['cargo'], desc: 'Lobotomised slave harvesting for its Brood Queen.',
  }),
  broodQueen: V({
    faction: 'yuri', name: 'Brood Queen Harvester', hp: 2000, speed: 1.2, cost: 1500, buildTime: 12, radius: 0.7, height: 1.0, turnRate: 2, loco: 'walker',
    deploy: 'slaveMiner', slaveMiner: { drones: 5, radius: 5, respawn: 10 }, harvesterAI: true, prereq: ['chrysalisFoundry'], parts: ['deployOn'],
    desc: 'Root-legged queen. Deploys at a mineral field and releases 5 Worker Drones; acts as her own refinery.',
    barks: { select: ['The Queen awaits.'], move: ['To richer soil.'] },
  }),
  mantisRover: V({
    faction: 'yuri', name: 'Scythe-Arm Mantis Rover', hp: 300, speed: 2.8, cost: 700, buildTime: 7, loco: 'walker',
    weapon: 'energyProjector', prereq: ['chrysalisFoundry'], parts: ['muzzle', 'armA', 'armB'],
    desc: 'Fast light combat mantis with slashing talons and an energy projector.',
    barks: { select: ['Talons ready.'], move: ['Swift as thought.'], attack: ['Slash!'] },
  }),
  shredderTick: V({
    faction: 'yuri', name: 'Shredder-Tick Platform', hp: 250, armor: 'light', speed: 2.8, cost: 600, buildTime: 6, loco: 'walker',
    weapon: 'spineGatling', turret: true, prereq: ['chrysalisFoundry'], parts: ['turret', 'muzzle', 'spinZ'],
    desc: 'Six-legged tick with spinning spine-gatlings. Hits ground & air; spins up.',
    barks: { select: ['Barrels spinning.'], move: ['Ticking forward.'], attack: ['Shred!'] },
  }),
  sporeFlea: V({
    faction: 'yuri', name: 'Hallucinogenic Spore Flea', hp: 100, armor: 'light', speed: 3.2, cost: 1000, buildTime: 9, radius: 0.28, height: 0.4, loco: 'walker',
    crush: 0, mcImmune: true, weapon: 'chaosGas', prereq: ['chrysalisFoundry', 'psionicSpire'], parts: ['smoke'],
    desc: 'Erratic flea with neurological aerosol. Gassed enemies turn on each other.',
    barks: { select: ['*hiss*'], move: ['*boing*'], attack: ['*PSSHHH*'] },
  }),
  trapSpider: V({
    faction: 'yuri', name: 'Bio-Magnetic Trap Spider', hp: 220, armor: 'light', speed: 2.2, cost: 1000, buildTime: 10, radius: 0.46, loco: 'walker',
    weapon: 'magnetBeam', weaponBuilding: 'sonicPulse', prereq: ['chrysalisFoundry', 'psionicSpire'], parts: ['muzzle'],
    desc: 'Horseshoe-organ arachnid. Levitates enemy vehicles and drops them; sonic pulses vs structures.',
    barks: { select: ['Field charged.'], move: ['Moving.'], attack: ['Lift!'] },
  }),
  overmindBehemoth: V({
    faction: 'yuri', name: 'Overmind Cerebral Behemoth', hp: 900, speed: 1.2, cost: 1750, buildTime: 18, radius: 0.66, height: 1.0, turnRate: 2,
    weapon: 'mindControlMulti', mcImmune: true, prereq: ['chrysalisFoundry', 'psionicSpire'], parts: ['muzzle'],
    desc: 'Throbbing brain in glass. Controls 3 units; any more overloads it.',
    barks: { select: ['WE ARE MANY.'], move: ['The Overmind moves.'], attack: ['JOIN US.'] },
  }),
  bioUFO: V({
    faction: 'yuri', name: 'Levitating Bio-UFO', hp: 300, armor: 'air', loco: 'hover', flyHeight: 1.8, speed: 2.6, cost: 1250, buildTime: 12, radius: 0.55,
    crush: 0, weapon: 'eyeLaser', drainer: true, prereq: ['chrysalisFoundry', 'psionicSpire'], parts: ['muzzle', 'spinY'],
    desc: 'Jellyfish-beetle saucer. Hover over enemy power, refineries or defenses to drain or disable them.',
    barks: { select: ['Saucer ready.'], move: ['Gliding.'], attack: ['Draining!'] },
  }),
  cortexLarva: V({
    faction: 'yuri', name: 'Cortex Larva Crawler', hp: 1000, speed: 1.2, cost: 3000, buildTime: 25, radius: 0.7, height: 1.0, turnRate: 2, loco: 'walker',
    deploy: 'mcv', deploysInto: 'neuralCortex', prereq: ['chrysalisFoundry', 'psionicSpire'], parts: [],
    desc: '(Added MCV) Brain-larva that deploys into a Neural Cortex Chamber.',
    barks: { select: ['Cortex larva.'], move: ['Pulsing onward.'] },
  }),
};
