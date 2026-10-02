// Faction definitions: identity, role → structure mapping (used by AI & generic systems),
// starting forces, AI unit mix and superweapons.

export const FACTIONS = {
  allied: {
    key: 'allied',
    name: 'Allied',
    order: 'Hymenoptera & Elytra Bio-Tech',
    paradigm: 'Polished iridescent chitin, compound-eye optics, photonic refraction and chrono-displacement.',
    crest: '🐝',
    accent: '#5ac8ff',
    power: 'Luciferin',
    roles: {
      cy: 'maternalSpire', power: 'fireflyHive', refinery: 'digestiveMound', barracks: 'broodHatchery', factory: 'metamorphosisPod',
      radar: 'pheromoneRoost', tech: 'panopticArray', depot: 'cleaningHollow', purifier: 'enzymaticSynth',
      mcv: 'broodMother', harvester: 'scarabHarvester',
      antiInf: 'stinkChamber', antiArmor: 'jewelObelisk', aa: 'skyPiercer', gap: 'sepiaEmitter',
    },
    superweapons: ['tachyonReliquary', 'swarmConduit'],
    startUnits: [['stagRover', 2], ['strikebug', 3], ['striderMite', 1]],
    aiMix: [['strikebug', 4], ['stagRover', 6], ['halberdier', 2], ['tigerBallista', 2], ['refractionWeaver', 2], ['orchidMantis', 1], ['dragonWasp', 1], ['striderMite', 1]],
  },
  soviet: {
    key: 'soviet',
    name: 'Soviet',
    order: 'Scorpiones, Araneae & Toxic Blattodea',
    paradigm: 'Brutal mass, crushing pincers, toxic bio-hazards and high-voltage bio-electric discharge.',
    crest: '🦂',
    accent: '#ff5a3a',
    power: 'Bio-Electric',
    roles: {
      cy: 'hiveNexus', power: 'electrocyteHive', refinery: 'chitinMill', barracks: 'swarmHatchery', factory: 'carapaceFoundry',
      radar: 'antennaLattice', tech: 'geneForge',
      mcv: 'nexusQueen', harvester: 'trenchTermite',
      antiInf: 'spineSpitter', antiArmor: 'stingPylon', aa: 'sporeMortar',
    },
    superweapons: ['toxicCyst', 'carapaceResonator'],
    startUnits: [['rhinoBeetle', 2], ['swarmAnt', 4]],
    aiMix: [['swarmAnt', 5], ['rhinoBeetle', 6], ['bombardierGunner', 1], ['sparkCentipede', 2], ['drillMite', 2], ['bombardierSpider', 1], ['centipedeHalftrack', 1], ['herculesDreadnought', 1]],
  },
  yuri: {
    key: 'yuri',
    name: 'Yuri',
    order: 'Neuroptera, Cordyceps & Psionic Parasites',
    paradigm: 'Mind control, genetic mutation, parasitic manipulation and bio-magnetic levitation.',
    crest: '🧠',
    accent: '#c86bff',
    power: 'Metabolic',
    roles: {
      cy: 'neuralCortex', power: 'larvalVat', barracks: 'cordycepsIncubator', factory: 'chrysalisFoundry',
      radar: 'psionicSpire', tech: 'psionicSpire', grinder: 'digestionChasm', cloning: 'pupaChambers',
      mcv: 'cortexLarva', harvester: 'broodQueen',
      antiInf: 'gatlingLarva', antiArmor: 'pheromoneMonolith', aa: 'gatlingLarva',
    },
    superweapons: ['sporeDiffuser', 'cerebralSpire'],
    startUnits: [['mantisRover', 2], ['spitterMaggot', 3], ['broodQueen', 1]],
    aiMix: [['spitterMaggot', 4], ['mantisRover', 6], ['stagBrawler', 3], ['shredderTick', 2], ['mindWeaver', 1], ['trapSpider', 1], ['sporeFlea', 1], ['overmindBehemoth', 1]],
  },
};

export const FACTION_KEYS = Object.keys(FACTIONS);

// Superweapon behaviour definitions (timers in seconds)
export const SUPERWEAPONS = {
  chronoshift: {
    building: 'tachyonReliquary', name: 'Tachyon Shift', charge: 300, radius: 1.6, twoStep: true,
    desc: 'Pick a 3×3 group, then a destination. Infantry are shredded by dimensional friction.',
  },
  storm: {
    building: 'swarmConduit', name: 'Swarm Storm', charge: 420, radius: 4, duration: 12, strikeDamage: 120,
    desc: 'Hyper-friction ionic storm with lightning strikes over the target.',
  },
  nuke: {
    building: 'toxicCyst', name: 'Gargantuan Acidic Spore', charge: 420, radius: 4.5, damage: 1600, fallout: 25,
    desc: 'Devastating blast with lingering corrosive fallout.',
  },
  ironCurtain: {
    building: 'carapaceResonator', name: 'Carapace Resonance', charge: 300, radius: 1.8, duration: 20,
    desc: 'Units and structures in the area become invulnerable for 20 s.',
  },
  mutator: {
    building: 'sporeDiffuser', name: 'Cordyceps Bloom', charge: 300, radius: 3,
    desc: 'All infantry in the cloud become your Mutated Stag Brawlers.',
  },
  dominator: {
    building: 'cerebralSpire', name: 'Mind Shatter', charge: 420, radius: 3.5, buildingDamage: 0.6,
    desc: 'Permanently enslaves every unit in the area and shatters structures.',
  },
};
