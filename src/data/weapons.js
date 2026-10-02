// Armor classes, warhead multipliers and every weapon in the game (RA2 rules.ini style).
//
// Armor:   inf (infantry) · infHeavy (armored infantry / deployed) · light · medium · heavy
//          bldg (structures) · def (base defenses) · air (hovering / flying units)
// fx:      visual style resolved by systems/Combat.js
// special: non-damage behaviours resolved by systems/Abilities.js

export const ARMOR_NAMES = {
  inf: 'Infantry', infHeavy: 'Armored infantry', light: 'Light', medium: 'Medium', heavy: 'Heavy',
  bldg: 'Structure', def: 'Defense', air: 'Airborne',
};

export const WARHEADS = {
  needle:    { inf: 1.0, infHeavy: 0.7, light: 0.35, medium: 0.25, heavy: 0.2, bldg: 0.15, def: 0.1, air: 0.7 },
  kinetic:   { inf: 0.35, infHeavy: 0.45, light: 0.9, medium: 1.0, heavy: 0.85, bldg: 0.55, def: 0.5, air: 0.5 },
  pierce:    { inf: 0.15, infHeavy: 0.25, light: 1.0, medium: 1.15, heavy: 1.3, bldg: 0.35, def: 0.4, air: 0.8 },
  explosive: { inf: 0.9, infHeavy: 0.8, light: 0.85, medium: 0.75, heavy: 0.65, bldg: 1.0, def: 0.9, air: 0.3 },
  fire:      { inf: 1.2, infHeavy: 1.0, light: 0.85, medium: 0.7, heavy: 0.55, bldg: 0.8, def: 0.6, air: 0.5 },
  electric:  { inf: 1.0, infHeavy: 1.0, light: 1.0, medium: 0.9, heavy: 0.8, bldg: 0.5, def: 0.5, air: 0.6 },
  photon:    { inf: 0.6, infHeavy: 0.6, light: 1.0, medium: 1.0, heavy: 0.9, bldg: 1.0, def: 0.85, air: 0.6 },
  acid:      { inf: 1.5, infHeavy: 1.2, light: 0.3, medium: 0.2, heavy: 0.15, bldg: 0.05, def: 0.05, air: 0.3 },
  flak:      { inf: 0.6, infHeavy: 0.5, light: 0.3, medium: 0.15, heavy: 0.1, bldg: 0.05, def: 0.05, air: 1.0 },
  sonic:     { inf: 0.5, infHeavy: 0.5, light: 0.6, medium: 0.6, heavy: 0.6, bldg: 1.0, def: 1.0, air: 0.3 },
  laser:     { inf: 0.8, infHeavy: 0.8, light: 0.8, medium: 0.7, heavy: 0.6, bldg: 0.6, def: 0.5, air: 0.8 },
  melee:     { inf: 1.0, infHeavy: 1.0, light: 0.9, medium: 0.8, heavy: 0.7, bldg: 0.4, def: 0.3, air: 0 },
  psychic:   { inf: 1.0, infHeavy: 1.0, light: 0, medium: 0, heavy: 0, bldg: 0, def: 0, air: 0 },
  special:   { inf: 1, infHeavy: 1, light: 1, medium: 1, heavy: 1, bldg: 1, def: 1, air: 1 },
};

// targets: which entity classes may be attacked ('inf' | 'veh' | 'bldg'); default all ground targets
// air: can hit hovering units · ground: false = anti-air only
export const WEAPONS = {
  // ------------------------------------------------------------------ ALLIED
  spineProjector:        { warhead: 'needle', damage: 15, range: 4, cooldown: 0.7, fx: 'needle', speed: 26, air: true, sound: 'needle' },
  spineProjectorBunker:  { warhead: 'needle', damage: 24, range: 5.5, cooldown: 0.42, fx: 'needle', speed: 28, air: true, sound: 'needle' },
  chitinSpikes:          { warhead: 'pierce', damage: 22, range: 4.5, cooldown: 1.0, fx: 'pierce', speed: 22, air: true, sound: 'spike' },
  railHorn:              { warhead: 'pierce', damage: 70, range: 6.5, cooldown: 1.4, fx: 'pierce', speed: 30, air: true, sound: 'rail' },
  ventralSpines:         { warhead: 'needle', damage: 20, range: 4, cooldown: 0.5, fx: 'needle', speed: 26, air: true, sound: 'needle' },
  stasisBeam:            { warhead: 'special', damage: 0, range: 5.5, cooldown: 0.1, fx: 'chrono', special: 'chrono', sound: 'chrono' },
  hydroSpineDarts:       { warhead: 'needle', damage: 65, range: 4, cooldown: 0.6, fx: 'needle', speed: 30, targets: ['inf', 'veh'], sound: 'needle' },
  neuroDarts:            { warhead: 'needle', damage: 130, range: 5, cooldown: 0.5, fx: 'needle', speed: 34, burst: 2, targets: ['inf', 'veh'], sound: 'dart' },
  causticSac:            { warhead: 'special', damage: 0, range: 1.2, cooldown: 2, fx: 'none', special: 'c4', targets: ['bldg'], sound: 'plant' },
  miteLunge:             { warhead: 'melee', damage: 500, range: 0.7, cooldown: 0.8, fx: 'melee', special: 'lunge', targets: ['inf'], sound: 'bite' },
  boneCannon:            { warhead: 'kinetic', damage: 62, range: 5.5, cooldown: 1.4, fx: 'shell', speed: 18, sound: 'cannon' },
  incendiaryBile:        { warhead: 'fire', damage: 55, range: 6, cooldown: 1.6, fx: 'bile', speed: 12, splash: 0.8, sound: 'bile' },
  refractionBeam:        { warhead: 'photon', damage: 85, range: 6.5, cooldown: 2.6, fx: 'prism', splinters: 4, splinterRange: 2.6, sound: 'prism' },
  kineticRam:            { warhead: 'pierce', damage: 95, range: 5.5, cooldown: 1.6, fx: 'pierce', speed: 26, sound: 'rail' },
  stingInjectors:        { warhead: 'needle', damage: 18, range: 5, cooldown: 0.32, fx: 'needle', speed: 28, air: true, sound: 'needle' },
  seekerPods:            { warhead: 'flak', damage: 60, range: 9, cooldown: 1.2, fx: 'seeker', speed: 14, air: true, ground: false, burst: 2, sound: 'missile' },
  solarLance:            { warhead: 'photon', damage: 110, range: 7.5, cooldown: 3.0, fx: 'prism', chain: true, sound: 'prism' },

  // ------------------------------------------------------------------ SOVIET
  acidShards:            { warhead: 'needle', damage: 12, range: 4, cooldown: 0.8, fx: 'needle', speed: 24, air: true, color: 0x9bff3a, sound: 'needle' },
  aerosolBurst:          { warhead: 'flak', damage: 32, range: 5, cooldown: 1.0, fx: 'flak', speed: 18, air: true, sound: 'flak' },
  electroSting:          { warhead: 'electric', damage: 42, range: 2.6, cooldown: 1.0, fx: 'arc', sound: 'zapSmall' },
  radBile:               { warhead: 'acid', damage: 50, range: 3.5, cooldown: 1.5, fx: 'acid', splash: 0.8, sound: 'bile' },
  enzymeBomb:            { warhead: 'special', damage: 0, range: 1.1, cooldown: 2.5, fx: 'none', special: 'bomb', bombDamage: 420, bombTime: 4, sound: 'plant' },
  boneShardCannon:       { warhead: 'needle', damage: 55, range: 5, cooldown: 0.6, fx: 'needle', speed: 30, burst: 2, targets: ['inf', 'veh'], air: true, sound: 'needle' },
  pheromonePaint:        { warhead: 'special', damage: 0, range: 7, cooldown: 30, fx: 'paint', special: 'airstrike', targets: ['bldg'], sound: 'paint' },
  rotaryNeedles:         { warhead: 'needle', damage: 14, range: 4, cooldown: 0.22, fx: 'needle', speed: 30, air: true, sound: 'needle' },
  hornCannon:            { warhead: 'kinetic', damage: 76, range: 5.5, cooldown: 1.6, fx: 'shell', speed: 18, sound: 'cannon' },
  flakPod:               { warhead: 'flak', damage: 30, range: 6, cooldown: 0.9, fx: 'flak', speed: 20, air: true, sound: 'flak' },
  toxicDart:             { warhead: 'explosive', damage: 230, range: 13, minRange: 3, cooldown: 7, fx: 'missile', speed: 8, splash: 1.5, sound: 'missileLaunch' },
  drillMandibles:        { warhead: 'special', damage: 0, range: 0.8, cooldown: 1, fx: 'none', special: 'drill', targets: ['veh'], sound: 'drill' },
  drillBite:             { warhead: 'melee', damage: 500, range: 0.7, cooldown: 0.8, fx: 'melee', special: 'lunge', targets: ['inf'], sound: 'bite' },
  twinHornCannon:        { warhead: 'kinetic', damage: 100, range: 6, cooldown: 2.0, fx: 'shell', speed: 18, burst: 2, sound: 'bigCannon' },
  harpoonTubes:          { warhead: 'flak', damage: 55, range: 7, cooldown: 1.4, fx: 'seeker', speed: 16, air: true, ground: false, burst: 2, sound: 'missile' },
  needleSpitter:         { warhead: 'needle', damage: 20, range: 5, cooldown: 0.28, fx: 'needle', speed: 30, air: true, sound: 'needle' },
  sporeFlak:             { warhead: 'flak', damage: 55, range: 9, cooldown: 1.2, fx: 'flak', speed: 20, air: true, ground: false, sound: 'flak' },
  stingPylonArc:         { warhead: 'electric', damage: 150, range: 7, cooldown: 2.5, fx: 'bigArc', sound: 'zap' },

  // ------------------------------------------------------------------ YURI
  pyroBolt:              { warhead: 'fire', damage: 24, range: 4.5, cooldown: 1.0, fx: 'fireBolt', speed: 14, air: true, sound: 'pyro' },
  bruteFists:            { warhead: 'melee', damage: 62, range: 0.85, cooldown: 1.1, fx: 'melee', targets: ['inf', 'veh', 'bldg'], sound: 'punch' },
  sporeStinger:          { warhead: 'needle', damage: 125, range: 8, cooldown: 2.6, fx: 'needle', speed: 40, special: 'virus', targets: ['inf'], color: 0xc8ff4a, sound: 'sniper' },
  mindControl:           { warhead: 'special', damage: 0, range: 6, cooldown: 1.5, fx: 'psy', special: 'mc', targets: ['inf', 'veh'], sound: 'mind' },
  mindControlPrime:      { warhead: 'special', damage: 0, range: 7.5, cooldown: 1.2, fx: 'psy', special: 'mc', targets: ['inf', 'veh', 'bldg'], sound: 'mind' },
  mindControlMulti:      { warhead: 'special', damage: 0, range: 7, cooldown: 1.2, fx: 'psy', special: 'mc', capacity: 3, overload: true, targets: ['inf', 'veh'], sound: 'mind' },
  mindControlTower:      { warhead: 'special', damage: 0, range: 7, cooldown: 1.2, fx: 'psy', special: 'mc', capacity: 3, targets: ['inf', 'veh'], sound: 'mind' },
  energyProjector:       { warhead: 'kinetic', damage: 56, range: 5, cooldown: 1.2, fx: 'laser', color: 0xff6af0, sound: 'laser' },
  spineGatling:          { warhead: 'needle', damage: 13, range: 5, cooldown: 0.5, spin: [0.5, 0.3, 0.14], fx: 'needle', speed: 30, air: true, sound: 'gatling' },
  chaosGas:              { warhead: 'special', damage: 0, range: 1.6, cooldown: 3, fx: 'none', special: 'gas', targets: ['inf', 'veh'], sound: 'gas' },
  magnetBeam:            { warhead: 'special', damage: 0, range: 7, cooldown: 0.2, fx: 'magnet', special: 'magnet', targets: ['veh'], sound: 'magnet' },
  sonicPulse:            { warhead: 'sonic', damage: 45, range: 7, cooldown: 2.0, fx: 'sonic', targets: ['bldg'], sound: 'sonic' },
  eyeLaser:              { warhead: 'laser', damage: 32, range: 4.5, cooldown: 0.8, fx: 'laser', color: 0xff3a2a, sound: 'laser' },
  gatlingVenom:          { warhead: 'needle', damage: 15, range: 6.5, cooldown: 0.45, spin: [0.45, 0.28, 0.16], fx: 'needle', speed: 30, air: true, sound: 'gatling' },
};
