import {
  ENEMY_TYPES,
  JUICE,
  PICKUP,
  PLAYER,
  SPAWN,
  SWORD,
  difficultyAt,
} from "./config.js";
import { offerSkills, skillLevel } from "./skills.js";
import { circleBlocked, moveCircle, rayDistance, segmentCircleT, segmentSolidT } from "./phys.js";
import { createCollision } from "./phys.js";

function norm(x, z) {
  const l = Math.hypot(x, z);
  if (l < 1e-8) return { x: 0, z: 0, l: 0 };
  return { x: x / l, z: z / l, l };
}

function pickType(weights, rng) {
  let total = 0;
  for (const k in weights) total += weights[k];
  if (total <= 0) return "grunt";
  let r = rng() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return "grunt";
}

export function createGame(worldData, rng) {
  const world = worldData;
  const col = createCollision(world);
  const spawn = world.playerSpawn || { x: 0, z: 0 };
  const game = {
    world,
    col,
    rng,
    time: 0,
    over: false,
    nextId: 1,
    spawnCd: 0.45,
    opened: false,
    events: [],
    enemies: [],
    pickups: [],
    orbs: [],
    shots: [],
    bossCd: 30,
    stats: { swings: 0, hits: 0, damageTaken: 0, spawned: 0, kills: 0 },
    player: {
      x: spawn.x,
      z: spawn.z,
      vx: 0,
      vz: 0,
      r: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      dashCd: 0,
      dashT: 0,
      iframes: 0,
      facing: 0,
      tipDist: SWORD.reach,
      tipLive: false,
      reach: SWORD.reach,
      swinging: false,
      drawn: false,
      wasDrawn: false,
      blade: 0,
      prevBlade: 0,
      omega: 0,
      alive: true,
      skills: {},
      xp: 0,
      xpNext: 12,
      level: 0,
      offer: null,
      combo: 0,
      comboT: 0,
      orbitAng: 0,
      spinAng: 0,
      boomT: 1.2,
      boom: null,
      killMark: -1,
    },
  };

  if (circleBlocked(game.player.x, game.player.z, game.player.r, col)) {
    const moved = findClear(game, game.player.x, game.player.z, game.player.r, 6);
    if (moved) {
      game.player.x = moved.x;
      game.player.z = moved.z;
    }
  }
  return game;
}

function findClear(game, x, z, r, rings) {
  if (!circleBlocked(x, z, r, game.col)) return { x, z };
  for (let ring = 1; ring <= rings; ring++) {
    const rad = ring * 1.4;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const nx = x + Math.cos(a) * rad;
      const nz = z + Math.sin(a) * rad;
      if (!circleBlocked(nx, nz, r, game.col)) return { x: nx, z: nz };
    }
  }
  return null;
}

export function spawnEnemy(game, typeName, x, z) {
  const t = ENEMY_TYPES[typeName] || ENEMY_TYPES.grunt;
  const diff = difficultyAt(game.time);
  const hp = t.hp * diff.hpMul;
  const e = {
    id: game.nextId++,
    type: typeName,
    alive: true,
    x,
    z,
    vx: 0,
    vz: 0,
    r: t.radius,
    hp,
    maxHp: hp,
    speed: t.speed,
    damage: t.damage,
    contactCd: t.contactCd,
    contactT: game.rng() * t.contactCd,
    knockResist: t.knockResist,
    state: "chase",
    stateT: 0,
    chargeCd: typeName === "charger" ? game.rng() * 1.2 : 0,
    chargeDirX: 0,
    chargeDirZ: 1,
    phase: game.rng() * Math.PI * 2,
    steerX: 0,
    steerZ: 0,
    steerT: 0,
    follow: 0,
    bestDist: 1e9,
    stuckT: 0,
    windup: t.windup || 0,
    chargeTime: t.chargeTime || 0,
    recover: t.recover || 0,
    chargeSpeed: t.chargeSpeed || 0,
    chargeDamage: t.chargeDamage || 0,
    triggerRange: t.triggerRange || 0,
    chargeCooldown: t.chargeCooldown || 0,
    height: t.height,
    bladeCd: 0,
    orbitCd: 0,
    noSplit: false,
  };
  game.enemies.push(e);
  game.stats.spawned++;
  return e;
}

function steer(e, px, pz, col) {
  const dx = px - e.x;
  const dz = pz - e.z;
  const dist = Math.hypot(dx, dz) || 1;
  const gx = dx / dist;
  const gz = dz / dist;
  const body = e.r * 0.92;
  const reach = Math.min(dist, 32);
  const clear = rayDistance(e.x, e.z, gx, gz, reach, body, col);
  if (clear >= reach - 0.35) {
    e.stuckT = 0;
    return { x: gx, z: gz };
  }

  // A long wall does not shorten the crow-flies distance until the corner.
  // Commit to the current heading unless a clearly better opening appears,
  // or the body has actually stopped.
  if (Math.hypot(e.vx, e.vz) < 0.45) e.stuckT += 1;
  else e.stuckT = Math.max(0, e.stuckT - 1);
  const haveSteer = e.steerX * e.steerX + e.steerZ * e.steerZ > 0.25;
  const commit = e.stuckT > 8 ? 0 : 8;

  let bestScore = -1e9;
  let best = { x: gx, z: gz };
  let curScore = -1e9;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dirx = Math.cos(a);
    const dirz = Math.sin(a);
    const travel = rayDistance(e.x, e.z, dirx, dirz, 12, body, col);
    if (travel < 0.35) continue;
    const stepLen = Math.min(travel, 10);
    const nx = e.x + dirx * stepLen;
    const nz = e.z + dirz * stepLen;
    const tx = px - nx;
    const tz = pz - nz;
    const toL = Math.hypot(tx, tz) || 1;
    const second = rayDistance(nx, nz, tx / toL, tz / toL, Math.min(toL, 24), body, col);
    const score = (dist - (toL - second)) * 2.4 + (dirx * gx + dirz * gz) * 0.35 + Math.min(travel, 12) * 0.04;
    if (haveSteer && dirx * e.steerX + dirz * e.steerZ > 0.84) curScore = Math.max(curScore, score);
    if (score > bestScore) {
      bestScore = score;
      best = { x: dirx, z: dirz };
    }
  }
  if (curScore > -1e8 && bestScore < curScore + commit) return { x: e.steerX, z: e.steerZ };
  return best;
}

function wrapAngle(d) {
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when `ang` lies on the short arc from a0 to a1, either direction. */
function angleInSweep(ang, a0, a1) {
  const span = wrapAngle(a1 - a0);
  const rel = wrapAngle(ang - a0);
  if (Math.abs(span) < 1e-8) return Math.abs(rel) <= 0.02;
  if (span > 0) return rel >= -0.04 && rel <= span + 0.04;
  return rel <= 0.04 && rel >= span - 0.04;
}

/** 0 if the sweep is too slow to count. Climbs past 1 on a fast cut, caps at 1.85. */
export function sweepMultiplier(omega) {
  const w = Math.abs(omega);
  if (w < SWORD.minOmega) return 0;
  const u = (w - SWORD.minOmega) / (SWORD.refOmega - SWORD.minOmega);
  return Math.min(1.85, 0.45 + u * 0.95);
}

function bladeReach(p) {
  return SWORD.reach * (1 + 0.2 * skillLevel(p, "length"));
}

function resolveSweep(game, p, a0, a1, scale, out, opts) {
  if (scale <= 0) return;
  const reach = p.tipLive ? Math.max(p.tipDist, p.reach) : p.reach;
  const power = 1 + 0.18 * skillLevel(p, "power");
  const knockMul = (0.55 + 0.7 * Math.min(scale, 1.4)) * (1 + 0.22 * skillLevel(p, "knock"));
  const dual = opts && opts.dual ? 0.55 + 0.2 * skillLevel(p, "dual") : 1;
  let dmg = SWORD.damage * power * scale * dual;
  const crit = scale >= 1.35;
  if (crit) dmg *= 1.5;
  const span = wrapAngle(a1 - a0);
  const steps = Math.max(1, Math.ceil(Math.abs(span) / 0.3));
  const seen = (opts && opts.seen) || new Set();
  for (let s = 1; s <= steps; s++) {
    const b0 = a0 + span * ((s - 1) / steps);
    const b1 = a0 + span * (s / steps);
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.alive || seen.has(e.id)) continue;
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach + e.r || dist < 0.05) continue;
      const ang = Math.atan2(dx, dz);
      if (!angleInSweep(ang, b0, b1)) continue;
      if (segmentSolidT(p.x, p.z, e.x, e.z, 0.04, game.col) !== null) continue;
      seen.add(e.id);
      let hit = dmg;
      if (e.type === "shield") {
        const face = Math.atan2(e.vx || e.steerX || 0, e.vz || e.steerZ || 1);
        const from = Math.atan2(p.x - e.x, p.z - e.z);
        if (Math.abs(wrapAngle(from - face)) < 1.05) hit *= 0.22;
      }
      e.bladeHit = true;
      e.bladeKnockMul = knockMul * (opts && opts.dual ? 0.85 : 1);
      const outward = norm(dx, dz);
      hurtEnemy(game, out, e, hit, outward.x, outward.z, false, { crit, sword: true });
    }
  }
}

/** Nearest point to `wantDist` along the ray that the body can occupy. */
function placeAlongRay(px, pz, ang, wantDist, radius, col) {
  const dx = Math.sin(ang);
  const dz = Math.cos(ang);
  const at = (d) => ({ x: px + dx * d, z: pz + dz * d, d });
  const clear = (pt) => !circleBlocked(pt.x, pt.z, radius, col);
  const want = at(wantDist);
  if (clear(want)) return want;
  let best = null;
  let bestErr = Infinity;
  const far = wantDist + radius + 4;
  for (let d = radius + 0.02; d <= far; d += 0.04) {
    const pt = at(d);
    if (!clear(pt)) continue;
    const err = Math.abs(d - wantDist);
    if (err < bestErr) {
      bestErr = err;
      best = pt;
    }
  }
  return best || { x: px + dx * radius, z: pz + dz * radius, d: radius };
}

function applyBladePush(game, p) {
  const tip = p.tipDist > 0 ? p.tipDist : SWORD.reach;
  for (let i = 0; i < game.enemies.length; i++) {
    const e = game.enemies[i];
    if (!e.bladeHit || !e.alive) {
      e.bladeHit = false;
      continue;
    }
    const dx = e.x - p.x;
    const dz = e.z - p.z;
    const ang = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dx, dz) : p.facing;
    const want = tip + e.r;
    const placed = placeAlongRay(p.x, p.z, ang, want, e.r, game.col);
    e.angBefore = ang;
    e.x = placed.x;
    e.z = placed.z;
    e.angAfter = Math.atan2(e.x - p.x, e.z - p.z);
    e.distAfter = Math.hypot(e.x - p.x, e.z - p.z);
    e.snapExpect = want;
    if (JUICE.knockback) {
      const mag = JUICE.knockbackImpulse * e.knockResist * (e.bladeKnockMul || 1);
      e.vx += Math.sin(ang) * mag;
      e.vz += Math.cos(ang) * mag;
    }
    e.bladeHit = false;
  }
}

function xpFor(type) {
  if (type === "boss") return 8;
  if (type === "elite") return 4;
  if (type === "brute") return 3;
  if (type === "splitter" || type === "shield" || type === "charger" || type === "lobber") return 2;
  return 1;
}

function dropOrb(game, x, z, xp) {
  if (game.orbs.length > 36) game.orbs.shift();
  game.orbs.push({
    id: game.nextId++,
    x, z,
    vx: (game.rng() - 0.5) * 2.2,
    vz: (game.rng() - 0.5) * 2.2,
    xp,
    life: 16,
  });
  game.events.push({ type: "orb", x, z, xp });
}

function grantXp(game, n) {
  const p = game.player;
  p.xp += n;
  if (p.offer) return;
  if (p.xp < p.xpNext) return;
  p.xp -= p.xpNext;
  p.level += 1;
  p.xpNext = 12 + p.level * 10;
  const offer = offerSkills(p, game.rng, 3);
  if (!offer) return;
  p.offer = offer;
  game.events.push({ type: "level", level: p.level, offer, x: p.x, z: p.z });
}

function hurtEnemy(game, out, e, damage, dirX, dirZ, applyKnock = true, opts) {
  if (!e.alive) return;
  const p = game.player;
  const o = opts || {};
  e.hp -= damage;
  const kill = e.hp <= 0;
  if (applyKnock && JUICE.knockback) {
    const mag = JUICE.knockbackImpulse * e.knockResist * (kill ? 1.35 : 1) * 0.45;
    e.vx += dirX * mag;
    e.vz += dirZ * mag;
  }
  if (kill) {
    e.alive = false;
    e.hp = 0;
    game.stats.kills++;
    if (JUICE.hitstop) out.hitstop = Math.max(out.hitstop, JUICE.hitstopKill);
    dropOrb(game, e.x, e.z, xpFor(e.type));
    p.combo += 1;
    p.comboT = 1.6;
    if (p.killMark > 0 && game.time - p.killMark < 0.45) out.slow = Math.max(out.slow, 0.28);
    p.killMark = game.time;
    if (e.type === "splitter" && !e.noSplit) {
      for (const s of [-0.7, 0.7]) {
        const baby = spawnEnemy(game, "swarm", e.x + s, e.z + s * 0.2);
        baby.noSplit = true;
        baby.hp = Math.min(baby.hp, 16);
        baby.maxHp = baby.hp;
      }
    }
    const blast = skillLevel(p, "blast");
    if (blast && !o.noBlast) {
      const rad = 1.35 + blast * 0.45;
      const boom = 14 + blast * 8;
      for (let i = 0; i < game.enemies.length; i++) {
        const oth = game.enemies[i];
        if (!oth.alive || oth === e) continue;
        if (Math.hypot(oth.x - e.x, oth.z - e.z) > rad + oth.r) continue;
        const d = norm(oth.x - e.x, oth.z - e.z);
        hurtEnemy(game, out, oth, boom, d.x, d.z, true, { noBlast: true });
      }
      game.events.push({ type: "blast", x: e.x, z: e.z, power: blast });
    }
  } else if (JUICE.hitstop && o.sword) {
    out.hitstop = Math.max(out.hitstop, o.crit ? JUICE.hitstopHit * 1.4 : JUICE.hitstopHit);
  }
  if (o.sword && !kill) {
    const leech = skillLevel(p, "leech");
    if (leech) {
      const heal = [0, 2, 3, 5][leech];
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
  }
  if (o.crit && skillLevel(p, "chain") && !o.noChain) {
    const jumps = skillLevel(p, "chain");
    let from = e;
    const used = new Set([e.id]);
    for (let n = 0; n < jumps; n++) {
      let best = null;
      let bestD = 4.2;
      for (let i = 0; i < game.enemies.length; i++) {
        const oth = game.enemies[i];
        if (!oth.alive || used.has(oth.id)) continue;
        const d = Math.hypot(oth.x - from.x, oth.z - from.z);
        if (d < bestD) { bestD = d; best = oth; }
      }
      if (!best) break;
      used.add(best.id);
      const d = norm(best.x - from.x, best.z - from.z);
      hurtEnemy(game, out, best, damage * 0.42, d.x, d.z, true, { noBlast: true, noChain: true });
      game.events.push({ type: "chain", x: best.x, z: best.z, fromX: from.x, fromZ: from.z });
      from = best;
    }
  }
  game.stats.hits++;
  game.events.push({
    type: kill ? "kill" : "hit",
    id: e.id,
    x: e.x,
    z: e.z,
    dirX,
    dirZ,
    damage,
    crit: !!o.crit,
    enemyType: e.type,
    combo: p.combo,
  });
}

function hurtPlayer(game, out, amount, dirX, dirZ, from) {
  const p = game.player;
  if (!p.alive || p.iframes > 0) return;
  const thorns = skillLevel(p, "thorns");
  const taken = amount * (1 - thorns * 0.12);
  p.hp -= taken;
  if (thorns && from && from.alive) {
    hurtEnemy(game, out, from, [0, 6, 10, 16][thorns], -dirX, -dirZ, true, { noBlast: true, noChain: true });
  }
  game.stats.damageTaken += taken;
  p.iframes = PLAYER.hurtIframes;
  if (JUICE.knockback) {
    p.vx += dirX * 4.5;
    p.vz += dirZ * 4.5;
  }
  if (JUICE.hitstop) out.hitstop = Math.max(out.hitstop, JUICE.hitstopHurt);
  if (JUICE.hurtSlowMo && out.slow <= 0) out.slow = JUICE.hurtSlowDuration;
  game.events.push({
    type: "hurt",
    amount,
    x: p.x,
    z: p.z,
    dirX,
    dirZ,
  });
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    game.over = true;
    game.events.push({ type: "dead" });
  }
}

function trySpawn(game, diff) {
  const p = game.player;
  const zones = game.world.enemySpawnZones || game.world.spawnZones || [];
  const type = pickType(diff.weights, game.rng);
  const spec = ENEMY_TYPES[type] || ENEMY_TYPES.grunt;
  const radius = spec.radius;
  const b = game.col.bounds;
  const candidates = [];

  if (zones.length) {
    const order = zones.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (game.rng() * (i + 1)) | 0;
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    for (let n = 0; n < order.length; n++) {
      const zone = zones[order[n]];
      const zw = zone.w ?? zone.radius * 2 ?? 8;
      const zd = zone.d ?? zone.radius * 2 ?? 8;
      for (let k = 0; k < 4; k++) {
        candidates.push({
          x: zone.x + (game.rng() - 0.5) * zw,
          z: zone.z + (game.rng() - 0.5) * zd,
        });
      }
    }
  }
  for (let k = 0; k < 12; k++) {
    const a = game.rng() * Math.PI * 2;
    const rad = SPAWN.minDist + game.rng() * (SPAWN.maxDist - SPAWN.minDist);
    candidates.push({
      x: p.x + Math.cos(a) * rad,
      z: p.z + Math.sin(a) * rad,
    });
  }

  for (let i = 0; i < candidates.length; i++) {
    const x = candidates[i].x;
    const z = candidates[i].z;
    if (x < b.minX + radius + 0.6 || x > b.maxX - radius - 0.6) continue;
    if (z < b.minZ + radius + 0.6 || z > b.maxZ - radius - 0.6) continue;
    if (Math.hypot(x - p.x, z - p.z) < SPAWN.minDist) continue;
    if (circleBlocked(x, z, radius + 0.15, game.col)) continue;
    let crowded = false;
    for (let j = 0; j < game.enemies.length; j++) {
      const o = game.enemies[j];
      if (!o.alive) continue;
      if (Math.hypot(o.x - x, o.z - z) < o.r + radius + SPAWN.separate) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;
    spawnEnemy(game, type, x, z);
    return;
  }
}

/**
 * Advance one tick of gameplay. `dt` is game time (already scaled).
 * Presentation (hitstop, shake, flashes) is requested via the return
 * value and `game.events`; this function does not sleep.
 *
 * input: { moveX, moveZ, aimX, aimZ, swing, dash }
 */
function acceptOffer(game, pick) {
  const p = game.player;
  if (!p.offer) return;
  let id = null;
  if (typeof pick === "number") id = p.offer[pick];
  else if (p.offer.indexOf(pick) >= 0) id = pick;
  if (!id) return;
  const def = skillLevel(p, id);
  p.skills[id] = def + 1;
  if (id === "vital") {
    const bump = [0, 25, 25, 30][p.skills[id]];
    p.maxHp += bump;
    p.hp = Math.min(p.maxHp, p.hp + bump);
  }
  if (id === "patch") {
    const heal = Math.max(22, Math.round(p.maxHp * 0.22));
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }
  p.offer = null;
  game.events.push({ type: "skill", id, level: p.skills[id], x: p.x, z: p.z });
}

function tickBlades(game, dt, out) {
  const p = game.player;
  p.orbitAng += dt * (1.8 + skillLevel(p, "orbit") * 0.4);
  const orbit = skillLevel(p, "orbit");
  if (orbit) {
    const n = orbit;
    for (let i = 0; i < n; i++) {
      const a = p.orbitAng + (i / n) * Math.PI * 2;
      const bx = p.x + Math.sin(a) * 1.28;
      const bz = p.z + Math.cos(a) * 1.28;
      for (let k = 0; k < game.enemies.length; k++) {
        const e = game.enemies[k];
        if (!e.alive || e.orbitCd > 0) continue;
        if (Math.hypot(e.x - bx, e.z - bz) > 0.42 + e.r) continue;
        e.orbitCd = 0.38;
        const d = norm(e.x - p.x, e.z - p.z);
        hurtEnemy(game, out, e, 6 + orbit * 3, d.x, d.z, true, { noBlast: true });
      }
    }
  }
  const spin = skillLevel(p, "spin");
  if (spin) {
    const w = 5 + spin * 1.6;
    const prev = p.spinAng;
    p.spinAng = wrapAngle(p.spinAng + w * dt);
    const reach = (p.tipLive ? p.tipDist : p.reach) * 0.92;
    const scale = sweepMultiplier(w) * (0.35 + 0.12 * spin);
    if (scale > 0) {
      for (let k = 0; k < game.enemies.length; k++) {
        const e = game.enemies[k];
        if (!e.alive || e.orbitCd > 0) continue;
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > reach + e.r * 0.4 || dist < 0.2) continue;
        const ang = Math.atan2(dx, dz);
        if (!angleInSweep(ang, prev, p.spinAng)) continue;
        e.orbitCd = 0.32;
        const d = norm(dx, dz);
        hurtEnemy(game, out, e, SWORD.damage * scale, d.x, d.z, true, { noBlast: true });
      }
    }
  }
  const posts = skillLevel(p, "barrier");
  if (posts) {
    p.orbitAng += 0;
    for (let i = 0; i < posts; i++) {
      const a = -p.orbitAng * 0.65 + (i / posts) * Math.PI * 2;
      const bx = p.x + Math.sin(a) * 2.15;
      const bz = p.z + Math.cos(a) * 2.15;
      for (let k = 0; k < game.enemies.length; k++) {
        const e = game.enemies[k];
        if (!e.alive) continue;
        const dx = e.x - bx;
        const dz = e.z - bz;
        const dist = Math.hypot(dx, dz);
        const min = 0.38 + e.r;
        if (dist >= min || dist < 1e-4) continue;
        const push = (min - dist) + 0.04;
        e.x += (dx / dist) * push;
        e.z += (dz / dist) * push;
        if (e.orbitCd <= 0) {
          e.orbitCd = 0.45;
          hurtEnemy(game, out, e, 4 + posts * 2, dx / dist, dz / dist, true, { noBlast: true });
        }
      }
    }
  }
  const boomLv = skillLevel(p, "boom");
  if (boomLv) {
    p.boomT -= dt;
    if (!p.boom && p.boomT <= 0) {
      const ang = p.drawn ? p.blade : p.facing;
      p.boom = { x: p.x, z: p.z, ang, t: 0, out: true };
      p.boomT = 2.4 - boomLv * 0.35;
    }
    if (p.boom) {
      const b = p.boom;
      b.t += dt;
      const dist = b.out ? b.t * (7 + boomLv) : Math.max(0, (0.7 + boomLv * 0.1) - (b.t - 0.55) * (8 + boomLv));
      if (!b.out && b.t > 0.55 && dist <= 0.2) p.boom = null;
      else {
        if (b.out && b.t > 0.5) b.out = false;
        b.x = p.x + Math.sin(b.ang) * dist;
        b.z = p.z + Math.cos(b.ang) * dist;
        for (let k = 0; k < game.enemies.length; k++) {
          const e = game.enemies[k];
          if (!e.alive || e.orbitCd > 0) continue;
          if (Math.hypot(e.x - b.x, e.z - b.z) > 0.4 + e.r) continue;
          e.orbitCd = 0.4;
          const d = norm(e.x - p.x, e.z - p.z);
          hurtEnemy(game, out, e, 10 + boomLv * 6, d.x, d.z, true, { noBlast: true });
        }
      }
    }
  }
}

function tickOrbs(game, dt) {
  const p = game.player;
  const magnet = 1.15 + skillLevel(p, "magnet") * 1.7;
  for (let i = game.orbs.length - 1; i >= 0; i--) {
    const o = game.orbs[i];
    o.life -= dt;
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const d = Math.hypot(dx, dz) || 0.001;
    if (d < magnet) {
      const pull = (1 - d / magnet) * 14;
      o.vx += (dx / d) * pull * dt;
      o.vz += (dz / d) * pull * dt;
    }
    o.x += o.vx * dt;
    o.z += o.vz * dt;
    o.vx *= 0.98;
    o.vz *= 0.98;
    if (o.life <= 0) {
      game.orbs.splice(i, 1);
      continue;
    }
    if (d < p.r + 0.45) {
      game.orbs.splice(i, 1);
      grantXp(game, o.xp);
      game.events.push({ type: "xp", x: o.x, z: o.z, xp: o.xp });
    }
  }
}

function tickShots(game, dt, out) {
  const p = game.player;
  for (let i = game.shots.length - 1; i >= 0; i--) {
    const s = game.shots[i];
    s.life -= dt;
    const ox = s.x;
    const oz = s.z;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    if (s.life <= 0 || segmentSolidT(ox, oz, s.x, s.z, s.r * 0.4, game.col) !== null) {
      game.shots.splice(i, 1);
      continue;
    }
    if (Math.hypot(s.x - p.x, s.z - p.z) < p.r + s.r) {
      hurtPlayer(game, out, s.dmg, s.vx, s.vz, null);
      game.shots.splice(i, 1);
    }
  }
}

export function step(game, input, dt, flags) {
  const events = game.events;
  events.length = 0;
  const out = { hitstop: 0, slow: 0 };
  const p = game.player;
  if (!p.alive) return out;

  if (p.offer) {
    if (input.skillPick == null) return out;
    acceptOffer(game, input.skillPick);
  }

  const diff = difficultyAt(game.time);
  p.reach = bladeReach(p);
  if (!p.tipLive) p.tipDist = p.reach;
  if (p.comboT > 0) {
    p.comboT -= dt;
    if (p.comboT <= 0) p.combo = 0;
  }

  // --- player ---
  let wishX = input.moveX || 0;
  let wishZ = input.moveZ || 0;
  const wish = norm(wishX, wishZ);
  wishX = wish.x;
  wishZ = wish.z;

  if (input.dash && p.dashCd <= 0 && p.dashT <= 0) {
    let dx = wishX;
    let dz = wishZ;
    if (wish.l < 0.2) {
      dx = (input.aimX || p.x) - p.x;
      dz = (input.aimZ || p.z) - p.z;
    }
    const d = norm(dx, dz);
    if (d.l > 0) {
      p.vx = d.x * PLAYER.dashSpeed;
      p.vz = d.z * PLAYER.dashSpeed;
      p.dashT = PLAYER.dashTime;
      p.dashCd = PLAYER.dashCooldown;
      p.iframes = Math.max(p.iframes, PLAYER.dashTime);
      events.push({ type: "dash", x: p.x, z: p.z, dirX: d.x, dirZ: d.z });
      if (skillLevel(p, "dashslash")) p.dashSlash = skillLevel(p, "dashslash");
    }
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    const sp = Math.hypot(p.vx, p.vz) || 1;
    p.vx = (p.vx / sp) * PLAYER.dashSpeed;
    p.vz = (p.vz / sp) * PLAYER.dashSpeed;
  } else {
    const k = 1 - Math.exp(-PLAYER.turn * dt);
    const walk = PLAYER.speed * (1 + 0.08 * skillLevel(p, "haste"));
    p.vx += (wishX * walk - p.vx) * k;
    p.vz += (wishZ * walk - p.vz) * k;
  }
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.iframes > 0) p.iframes -= dt;
  const mend = skillLevel(p, "regen");
  if (mend > 0) p.hp = Math.min(p.maxHp, p.hp + (0.65 * mend) * dt);

  const oldPX = p.x;
  const oldPZ = p.z;
  const moved = moveCircle(p.x, p.z, p.r, p.vx * dt, p.vz * dt, game.col);
  p.x = moved.x;
  p.z = moved.z;
  if (dt > 0) {
    p.vx = (p.x - oldPX) / dt;
    p.vz = (p.z - oldPZ) / dt;
  }

  const ax = (input.aimX ?? p.x) - p.x;
  const az = (input.aimZ ?? p.z) - p.z;
  const aimFacing = ax * ax + az * az > 1e-8 ? Math.atan2(ax, az) : p.blade;
  p.prevBlade = p.blade;
  const dAng = wrapAngle(aimFacing - p.blade);
  p.blade = aimFacing;
  p.facing = aimFacing;
  p.omega = dt > 0 ? dAng / dt : 0;
  p.drawn = true;
  p.swinging = !!input.swing;

  if (input.swing) {
    if (!p.wasDrawn) {
      p.wasDrawn = true;
      game.stats.swings++;
      events.push({
        type: "swing",
        x: p.x,
        z: p.z,
        dirX: Math.sin(p.blade),
        dirZ: Math.cos(p.blade),
        facing: p.blade,
      });
    }
    const scale = sweepMultiplier(p.omega);
    const seen = new Set();
    resolveSweep(game, p, p.prevBlade, p.blade, scale, out, { seen });
    if (skillLevel(p, "dual")) {
      resolveSweep(game, p, p.prevBlade + Math.PI, p.blade + Math.PI, scale, out, { dual: true, seen });
    }
    const shock = skillLevel(p, "shock");
    if (shock && scale >= 1.15) {
      const rad = 1.15 + shock * 0.35;
      for (let i = 0; i < game.enemies.length; i++) {
        const e = game.enemies[i];
        if (!e.alive || seen.has(e.id)) continue;
        const dist = Math.hypot(e.x - p.x, e.z - p.z);
        if (dist > rad + e.r || dist < 0.3) continue;
        seen.add(e.id);
        const d = norm(e.x - p.x, e.z - p.z);
        hurtEnemy(game, out, e, 6 + shock * 4, d.x, d.z, true, { noBlast: true });
      }
      events.push({ type: "shock", x: p.x, z: p.z, power: shock });
    }
  } else {
    p.wasDrawn = false;
  }

  if (p.dashSlash) {
    const lv = p.dashSlash;
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.alive || e.bladeCd > 0) continue;
      if (Math.hypot(e.x - p.x, e.z - p.z) > 1.15 + e.r) continue;
      e.bladeCd = 0.35;
      const d = norm(e.x - p.x, e.z - p.z);
      hurtEnemy(game, out, e, 8 + lv * 6, d.x, d.z, true, { noBlast: true });
    }
    p.dashSlash = 0;
  }

  if (flags && flags.bladeOnly) {
    applyBladePush(game, p);
    return out;
  }

  // --- enemies ---
  const speedMul = diff.speedMul;
  const dmgMul = diff.dmgMul;
  for (let i = 0; i < game.enemies.length; i++) {
    const e = game.enemies[i];
    if (!e.alive) continue;
    e.contactT -= dt;
    e.steerT -= dt;
    if (e.chargeCd > 0) e.chargeCd -= dt;
    if (e.bladeCd > 0) e.bladeCd -= dt;
    if (e.orbitCd > 0) e.orbitCd -= dt;

    let speed = e.speed * speedMul;
    const frost = skillLevel(p, "frost");
    if (frost && Math.hypot(e.x - p.x, e.z - p.z) < 2.15 + frost * 0.55 + e.r) {
      speed *= [1, 0.72, 0.58, 0.46][frost];
    }
    if (e.type !== "elite") {
      for (let j = 0; j < game.enemies.length; j++) {
        const aura = game.enemies[j];
        if (aura !== e && aura.alive && aura.type === "elite" && Math.hypot(aura.x - e.x, aura.z - e.z) < 4.2) {
          speed *= 1.16;
          break;
        }
      }
    }
    let sx = e.steerX;
    let sz = e.steerZ;

    if (e.type === "charger") {
      if (e.state === "chase") {
        const dist = Math.hypot(p.x - e.x, p.z - e.z);
        const los = rayDistance(e.x, e.z, p.x - e.x, p.z - e.z, dist, e.r * 0.5, game.col) >= dist - 0.3;
        if (dist < e.triggerRange && e.chargeCd <= 0 && los) {
          const d = norm(p.x - e.x, p.z - e.z);
          e.chargeDirX = d.x;
          e.chargeDirZ = d.z;
          e.state = "windup";
          e.stateT = e.windup;
          events.push({ type: "windup", id: e.id, x: e.x, z: e.z });
        }
      }
      if (e.state === "windup") {
        speed = 0;
        e.vx *= Math.exp(-10 * dt);
        e.vz *= Math.exp(-10 * dt);
        e.stateT -= dt;
        if (e.stateT <= 0) {
          e.state = "charge";
          e.stateT = e.chargeTime;
        }
      } else if (e.state === "charge") {
        speed = e.chargeSpeed * speedMul;
        sx = e.chargeDirX;
        sz = e.chargeDirZ;
        e.stateT -= dt;
        const ahead = rayDistance(e.x, e.z, sx, sz, 0.7, e.r * 0.85, game.col);
        if (e.stateT <= 0 || ahead < 0.28) {
          e.state = "recover";
          e.stateT = e.recover;
          e.chargeCd = e.chargeCooldown;
          if (ahead < 0.28) {
            events.push({ type: "wall", x: e.x + sx * 0.4, z: e.z + sz * 0.4, dirX: sx, dirZ: sz });
          }
        }
      } else if (e.state === "recover") {
        speed *= 0.35;
        e.stateT -= dt;
        if (e.stateT <= 0) e.state = "chase";
      }
    }

    if (e.type === "lobber" || e.type === "boss") {
      const dist = Math.hypot(p.x - e.x, p.z - e.z);
      const ranged = e.type === "boss" ? dist < 9.5 : dist > 3.2 && dist < 13.5;
      if (e.state === "chase" && e.chargeCd <= 0 && ranged) {
        e.state = "windup";
        e.stateT = e.type === "boss" ? 0.62 : 0.48;
        events.push({ type: "windup", id: e.id, x: e.x, z: e.z });
      }
      if (e.state === "windup") {
        speed = 0;
        e.stateT -= dt;
        if (e.stateT <= 0) {
          const d = norm(p.x - e.x, p.z - e.z);
          const sp = e.type === "boss" ? 6.4 : 5.1;
          if (game.shots.length < 8) {
            game.shots.push({
              x: e.x + d.x * (e.r + 0.35),
              z: e.z + d.z * (e.r + 0.35),
              vx: d.x * sp,
              vz: d.z * sp,
              life: 2.5,
              r: e.type === "boss" ? 0.48 : 0.28,
              dmg: (e.type === "boss" ? 16 : 9) * dmgMul,
            });
          }
          e.state = "recover";
          e.stateT = 0.42;
          e.chargeCd = e.type === "boss" ? 2.3 : 2.7;
          events.push({ type: "lob", x: e.x, z: e.z });
        }
      } else if (e.state === "recover") {
        speed *= 0.3;
        e.stateT -= dt;
        if (e.stateT <= 0) e.state = "chase";
      }
    }

    const casting = (e.type === "charger" && (e.state === "windup" || e.state === "charge"))
      || ((e.type === "lobber" || e.type === "boss") && e.state === "windup");
    if (!casting) {
      if (e.steerT <= 0) {
        const lvx = Math.max(-PLAYER.speed, Math.min(PLAYER.speed, p.vx));
        const lvz = Math.max(-PLAYER.speed, Math.min(PLAYER.speed, p.vz));
        const s = steer(e, p.x + lvx * 0.35, p.z + lvz * 0.35, game.col);
        e.steerX = s.x;
        e.steerZ = s.z;
        e.steerT = 0.11 + game.rng() * 0.05;
        sx = s.x;
        sz = s.z;
      }
      if (e.type === "skitter" || e.type === "swarm") {
        const wob = Math.sin(game.time * 6.5 + e.phase) * 0.7;
        const side = norm(-sz, sx);
        const blended = norm(sx + side.x * wob, sz + side.z * wob);
        sx = blended.x;
        sz = blended.z;
      }
    }

    if (e.state !== "windup") {
      const k = 1 - Math.exp(-6.5 * dt);
      e.vx += (sx * speed - e.vx) * k;
      e.vz += (sz * speed - e.vz) * k;
    }

    const ox = e.x;
    const oz = e.z;
    const mv = moveCircle(e.x, e.z, e.r, e.vx * dt, e.vz * dt, game.col);
    e.x = mv.x;
    e.z = mv.z;
    if (dt > 0) {
      e.vx = (e.x - ox) / dt;
      e.vz = (e.z - oz) / dt;
    }
    e.prevX = ox;
    e.prevZ = oz;
  }

  // Separate bodies so a crowd surrounds instead of stacking into one point.
  for (let i = 0; i < game.enemies.length; i++) {
    const a = game.enemies[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < game.enemies.length; j++) {
      const b = game.enemies[j];
      if (!b.alive) continue;
      let dx = b.x - a.x;
      let dz = b.z - a.z;
      let d = Math.hypot(dx, dz);
      const min = a.r + b.r + 0.06;
      if (d >= min) continue;
      if (d < 1e-4) {
        dx = 1;
        dz = 0;
        d = 1;
      }
      const push = (min - d) * 0.5;
      const nx = dx / d;
      const nz = dz / d;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
    }
  }
  for (let i = 0; i < game.enemies.length; i++) {
    const e = game.enemies[i];
    if (!e.alive) continue;
    const mv = moveCircle(e.x, e.z, e.r, 0, 0, game.col);
    e.x = mv.x;
    e.z = mv.z;
  }

  // Contact, swept so a charge cannot skip through the player.
  if (p.alive) {
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (!e.alive || e.contactT > 0) continue;
      const hit = segmentCircleT(e.prevX ?? e.x, e.prevZ ?? e.z, e.x, e.z, p.x, p.z, p.r + e.r);
      const overlap = Math.hypot(e.x - p.x, e.z - p.z) < p.r + e.r;
      if (hit === null && !overlap) continue;
      const d = norm(p.x - e.x, p.z - e.z);
      const charging = e.type === "charger" && e.state === "charge";
      const amount = (charging ? e.chargeDamage : e.damage) * dmgMul;
      hurtPlayer(game, out, amount, d.x || 0, d.z || 1, e);
      e.contactT = e.contactCd;
      if (!p.alive) break;
    }
  }

  // --- pickups ---
  if (p.alive) {
    for (let i = 0; i < game.pickups.length; i++) {
      const pk = game.pickups[i];
      if (!pk.active) {
        pk.respawn -= dt;
        if (pk.respawn <= 0) pk.active = true;
        continue;
      }
      if (Math.hypot(pk.x - p.x, pk.z - p.z) <= p.r + PICKUP.radius) {
        p.hp = Math.min(p.maxHp, p.hp + pk.amount);
        pk.active = false;
        pk.respawn = PICKUP.respawn;
        events.push({ type: "pickup", x: pk.x, z: pk.z, amount: pk.amount });
      }
    }
  }

  // --- spawn ---
  if (p.alive && !game.opened && game.time > 0.3) {
    game.opened = true;
    const wave = 4;
    for (let i = 0; i < wave; i++) {
      const a = (i / wave) * Math.PI * 2 + game.rng() * 0.25;
      const rad = 13 + game.rng() * 4;
      const spot = findClear(game, p.x + Math.sin(a) * rad, p.z + Math.cos(a) * rad, 0.5, 4);
      if (!spot) continue;
      if (Math.hypot(spot.x - p.x, spot.z - p.z) < 11) continue;
      spawnEnemy(game, "grunt", spot.x, spot.z);
    }
  }
  if (p.alive) {
    game.spawnCd -= dt;
    const aliveCount = countAlive(game);
    if (game.spawnCd <= 0 && aliveCount < diff.maxAlive) {
      trySpawn(game, diff);
      const jitter = 0.85 + game.rng() * 0.3;
      game.spawnCd = diff.spawnInterval * jitter;
    }
  }

  if (p.alive && game.time > 480) {
    game.bossCd -= dt;
    let bossAlive = false;
    for (let i = 0; i < game.enemies.length; i++) {
      if (game.enemies[i].alive && game.enemies[i].type === "boss") bossAlive = true;
    }
    if (game.bossCd <= 0 && !bossAlive) {
      const ang = game.rng() * Math.PI * 2;
      const spot = findClear(game, p.x + Math.sin(ang) * 16, p.z + Math.cos(ang) * 16, 1.05, 5);
      if (spot) {
        spawnEnemy(game, "boss", spot.x, spot.z);
        events.push({ type: "boss", x: spot.x, z: spot.z });
      }
      game.bossCd = 165;
    }
  }

  tickBlades(game, dt, out);
  tickOrbs(game, dt);
  tickShots(game, dt, out);
  applyBladePush(game, p);
  compact(game.enemies);
  return out;
}

function countAlive(game) {
  let n = 0;
  for (let i = 0; i < game.enemies.length; i++) if (game.enemies[i].alive) n++;
  return n;
}

function compact(arr) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].alive) arr[w++] = arr[i];
  }
  arr.length = w;
}
