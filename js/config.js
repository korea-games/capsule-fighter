/**
 * Capsule Fighter — balance, juice toggles, and the survival curve.
 *
 * DIFFICULTY
 * ----------
 * Pressure is a function of elapsed survival time only (seconds).
 * Nothing else scales the player. Edit `difficultyAt` and re-run
 * `node js/sim.js`. Scripted bots stand in for three skill bands:
 *
 *   sloppy   ~ 5 min   slow reactions, sloppy aim, rarely dashes
 *   average  ~ 10 min  kites, dashes when touched, mostly hits
 *   skilled  ~ 15 min  threat priority, dash-iframes, grabs health
 *   20 min should be almost impossible even for the skilled bot.
 *
 * The curve eases in over about 12 minutes, then a late ramp from
 * minute 12 to 19 shortens spawns and raises damage so the clock
 * runs out. Enemy HP is rolled when that enemy spawns.
 * Move speed and contact damage read the live multiplier, so the
 * crowd already on screen gets meaner as the clock advances.
 *
 * Archetypes (see ENEMY_TYPES) enter on a timer:
 *   0:00  grunts   — plain chasers, slower than the player
 *   0:45  skitters — small, already a little faster than a walk
 *   2:24  brutes   — large, slow, soak several swings
 *   4:00  chargers — stop, telegraph, then rush
 *
 * The smooth ramp `u` is full at 12 minutes. A second ramp starts at
 * 12 minutes and is full at 19, which is what makes 20 minutes collapse.
 * The sword points at the cursor and damages on the swept arc,
 * either direction, once the sweep is faster than 0.75 rad/s.
 * Healing is a level-up card (Patch Up, Mend, More Heart, Siphon).
 * There are no health pickups on the map. Eight runs:
 *   sloppy  median 5:37  mean 5:59  range 3:45–8:28
 *   average median 9:52  mean 9:45  range 7:32–12:00
 *   skilled median 14:32 mean 14:42 range 11:47–18:45
 *   0/8 reached 20:00 (longest skilled run 18:45).
 */

/**
 * Pixel picture. `size` is how many screen pixels one rendered pixel
 * covers (three.js RenderPixelatedPass). 4 is a quarter of the window.
 * The shade ramp is three flat steps. Outlines are one low-res pixel.
 */
export const PIXEL = {
  size: 4,
  shadeSteps: 3,
  normalEdge: 0.92,
  depthEdge: 0.7,
};

export const JUICE = {
  hitFlash: true,
  hitFlashMs: 130,
  hitstop: true,
  hitstopHit: 0.067,
  hitstopKill: 0.117,
  hitstopHurt: 0.083,
  squashStretch: true,
  knockback: true,
  knockbackImpulse: 11,
  screenShake: true,
  shakeHit: 0.46,
  shakeKill: 0.86,
  shakeHurt: 0.92,
  cameraKick: true,
  kickStrength: 0.36,
  sparks: true,
  killBurst: true,
  damageNumbers: true,
  hurtVignette: true,
  hurtSlowMo: true,
  hurtSlowScale: 0.42,
  hurtSlowDuration: 0.11,
  sfx: true,
  targetReticle: true,
};

/** Vertical band that counts as a body. Boxes outside it are scenery. */
export const COLLISION_BAND = { min: 0.25, max: 1.45 };

export const CAMERA = {
  height: 19.5,
  back: 11.4,
  fov: 34,
  follow: 6.4,
};

/**
 * Walk speed is 5 m/s to match the hand-built world.
 * That world is 160 m across, so a straight walk takes about 32 s
 * (about 31 s between the inner faces of the outer walls).
 * Collision radius is 0.5 m, the capsule the map was checked against.
 * Narrowest designed corridor is 3.61 m.
 */
export const PLAYER = {
  maxHp: 100,
  speed: 5,
  radius: 0.5,
  /** How fast velocity chases the wish vector. Higher = snappier. */
  turn: 18,
  dashSpeed: 16,
  dashTime: 0.16,
  dashCooldown: 1.16,
  hurtIframes: 0.16,
};

/**
 * Melee sword. The tip sits `reach` meters from the capsule center.
 * Hold the mouse and sweep: the blade follows the cursor. Damage and
 * knockback scale with angular speed. Below `minOmega` a touch does nothing.
 */
export const SWORD = {
  reach: 2.28,
  damage: 26,
  minOmega: 0.75,
  refOmega: 8,
};

export const ENEMY_TYPES = {
  grunt: {
    hp: 52,
    speed: 3.15,
    damage: 8,
    radius: 0.48,
    height: 1.42,
    contactCd: 0.62,
    knockResist: 1,
  },
  skitter: {
    hp: 34,
    speed: 4.2,
    damage: 7,
    radius: 0.3,
    height: 0.9,
    contactCd: 0.48,
    knockResist: 1.25,
  },
  brute: {
    hp: 130,
    speed: 2.05,
    damage: 14,
    radius: 0.72,
    height: 1.95,
    contactCd: 0.52,
    knockResist: 0.28,
  },
  charger: {
    hp: 70,
    speed: 3.05,
    damage: 9,
    radius: 0.5,
    height: 1.42,
    contactCd: 0.44,
    knockResist: 0.72,
    windup: 0.48,
    chargeTime: 0.42,
    recover: 0.55,
    chargeSpeed: 13.4,
    chargeDamage: 22,
    triggerRange: 12,
    chargeCooldown: 2.15,
  },
  splitter: {
    hp: 44,
    speed: 2.9,
    damage: 8,
    radius: 0.44,
    height: 1.3,
    contactCd: 0.55,
    knockResist: 0.9,
  },
  swarm: {
    hp: 14,
    speed: 5.1,
    damage: 5,
    radius: 0.22,
    height: 0.7,
    contactCd: 0.36,
    knockResist: 1.4,
  },
  shield: {
    hp: 78,
    speed: 2.6,
    damage: 9,
    radius: 0.52,
    height: 1.5,
    contactCd: 0.55,
    knockResist: 0.55,
  },
  lobber: {
    hp: 46,
    speed: 2.35,
    damage: 6,
    radius: 0.42,
    height: 1.7,
    contactCd: 0.7,
    knockResist: 0.85,
  },
  elite: {
    hp: 150,
    speed: 2.4,
    damage: 12,
    radius: 0.62,
    height: 1.8,
    contactCd: 0.5,
    knockResist: 0.4,
  },
  boss: {
    hp: 380,
    speed: 1.85,
    damage: 16,
    radius: 1.05,
    height: 2.5,
    contactCd: 0.7,
    knockResist: 0.22,
  },
};

export const SPAWN = {
  /**
   * Zone spawns use the map's rectangles. This minimum keeps an enemy
   * from appearing on the player when they are standing in a zone.
   * The ring fallback (only if every zone fails) uses minDist..maxDist.
   */
  minDist: 16.5,
  maxDist: 23,
  separate: 1.2,
};

export const PICKUP = {
  amount: 34,
  radius: 0.75,
  respawn: 42,
};

export function smooth01(x) {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

export function difficultyAt(t) {
  const m = t / 60;
  // Melee cannot thin a crowd from across the plaza, so the opener
  // stays thin. The first ramp is full around 12 minutes. The late
  // ramp starts at 12 and is full at 19, which is what ends a clean run.
  const u = smooth01(m / 12);
  const late = smooth01((m - 12) / 7);

  const open = smooth01(m / 1.6);
  const spawnInterval = (1.45 + (0.36 - 1.45) * u) * (1 - 0.35 * late);
  const maxAlive = Math.round(4 + 3 * open + 6 * u + 12 * late);
  const speedMul = 1 + 0.16 * u + 1.0 * late;
  const hpMul = 1 + 0.22 * u + 0.2 * late;
  const dmgMul = 1 + 0.4 * u + 2.4 * late;

  const weights = {
    grunt: 1.35,
    skitter: m < 1.2 ? 0 : 0.45 + 0.8 * smooth01((m - 1.2) / 5),
    splitter: m < 2 ? 0 : 0.32 + 0.35 * smooth01((m - 2) / 4),
    swarm: m < 2.4 ? 0 : 0.5 + 0.7 * smooth01((m - 2.4) / 4),
    brute: m < 3 ? 0 : 0.24 + 0.4 * smooth01((m - 3) / 6),
    shield: m < 3.6 ? 0 : 0.26 + 0.35 * smooth01((m - 3.6) / 4),
    charger: m < 4.5 ? 0 : 0.28 + 0.55 * smooth01((m - 4.5) / 5),
    lobber: m < 5.2 ? 0 : 0.24 + 0.4 * smooth01((m - 5.2) / 4),
    elite: m < 7 ? 0 : 0.14 + 0.28 * smooth01((m - 7) / 4),
  };

  return { spawnInterval, maxAlive, speedMul, hpMul, dmgMul, weights };
}

/**
 * Scripted players used by js/sim.js. They drive the same `step()` the
 * browser does. Numbers are human-scale, not perfect or random.
 *
 * reaction     seconds of stale aim
 * aimError     radians of gaussian spread
 * swingLapse   fraction of time the bot forgets to hold the swing
 * swingExtra   extra meters past the blade tip where it still tries to swing
 * comfort      distance it tries to keep from the nearest body
 * packSense    chance it backs out when three enemies are inside the blade
 * threatSkill  0 = nearest body, 1 = priority (charges, skitters)
 * dashChance   probability it actually dashes when a dash is called for
 */
export const BOT_PROFILES = {
  sloppy: {
    name: "sloppy",
    reaction: 0.42,
    aimError: 0.62,
    swingLapse: 0.42,
    swingExtra: 0.5,
    sight: 14,
    comfort: 1.44,
    awareness: 8,
    threatSkill: 0.1,
    packSense: 0,
    strafe: 0.2,
    strafeFlip: 1.2,
    moveNoise: 0.62,
    dashRange: 0.95,
    dashChance: 0.16,
    dashAimError: 1.3,
    chargeDash: 0.12,
    pickupHp: 18,
    pickupRange: 8,
    wallSkill: 0.25,
    healAt: 0.34,
    sweepRate: 5.2,
    skillStyle: "sloppy",
  },
  average: {
    name: "average",
    reaction: 0.22,
    aimError: 0.32,
    swingLapse: 0.1,
    swingExtra: 0.3,
    sight: 18,
    comfort: 1.36,
    awareness: 12,
    threatSkill: 0.5,
    packSense: 0.2,
    strafe: 0.45,
    strafeFlip: 1.4,
    moveNoise: 0.16,
    dashRange: 1.22,
    dashChance: 0.28,
    dashAimError: 0.42,
    chargeDash: 0.4,
    pickupHp: 42,
    pickupRange: 16,
    wallSkill: 0.85,
    healAt: 0.38,
    sweepRate: 7.2,
    skillStyle: "average",
  },
  skilled: {
    name: "skilled",
    reaction: 0.08,
    aimError: 0.05,
    swingLapse: 0,
    swingExtra: 0.18,
    sight: 22,
    comfort: 1.9,
    awareness: 16,
    threatSkill: 1,
    packSense: 0.65,
    strafe: 0.4,
    strafeFlip: 1.8,
    moveNoise: 0,
    dashRange: 1.45,
    dashChance: 0.96,
    dashAimError: 0.08,
    chargeDash: 0.95,
    pickupHp: 58,
    pickupRange: 36,
    wallSkill: 1,
    healAt: 0.55,
    sweepRate: 12.5,
    skillStyle: "skilled",
  },
};

export const BEST_KEY = "capsule-fighter-best-seconds";
