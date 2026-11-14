import { COLLISION_BAND } from "./config.js";

const CELL = 8;
const _res = { x: 0, z: 0, hit: false };

function hashKey(ix, iz) {
  return (ix + 4000) + (iz + 4000) * 8000;
}

/**
 * Build the static collision world from a schema world.
 * A box is solid when its vertical span overlaps COLLISION_BAND.
 * Decorative floor inlays and overhead lintels are skipped.
 */
export function createCollision(world) {
  const solids = [];
  const boxes = world.boxes || [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const base = b.y || 0;
    const top = base + b.h;
    if (top < COLLISION_BAND.min || base > COLLISION_BAND.max) continue;
    const rot = b.rotY || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const hx = b.w / 2;
    const hz = b.d / 2;
    const ex = Math.abs(cos) * hx + Math.abs(sin) * hz;
    const ez = Math.abs(sin) * hx + Math.abs(cos) * hz;
    solids.push({
      x: b.x,
      z: b.z,
      hx,
      hz,
      cos,
      sin,
      minX: b.x - ex,
      maxX: b.x + ex,
      minZ: b.z - ez,
      maxZ: b.z + ez,
      gen: 0,
    });
  }

  const buckets = new Map();
  for (let i = 0; i < solids.length; i++) {
    const o = solids[i];
    const x0 = Math.floor(o.minX / CELL);
    const x1 = Math.floor(o.maxX / CELL);
    const z0 = Math.floor(o.minZ / CELL);
    const z1 = Math.floor(o.maxZ / CELL);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const k = hashKey(x, z);
        let bucket = buckets.get(k);
        if (!bucket) {
          bucket = [];
          buckets.set(k, bucket);
        }
        bucket.push(i);
      }
    }
  }

  return {
    solids,
    buckets,
    bounds: world.bounds,
    _out: [],
    _gen: 1,
  };
}

function queryAABB(col, minX, minZ, maxX, maxZ) {
  const out = col._out;
  out.length = 0;
  const gen = ++col._gen;
  if (gen > 1e9) {
    col._gen = 1;
    for (let i = 0; i < col.solids.length; i++) col.solids[i].gen = 0;
  }
  const x0 = Math.floor(minX / CELL);
  const x1 = Math.floor(maxX / CELL);
  const z0 = Math.floor(minZ / CELL);
  const z1 = Math.floor(maxZ / CELL);
  const solids = col.solids;
  const buckets = col.buckets;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const bucket = buckets.get(hashKey(x, z));
      if (!bucket) continue;
      for (let k = 0; k < bucket.length; k++) {
        const o = solids[bucket[k]];
        if (o.gen === gen) continue;
        o.gen = gen;
        if (o.maxX < minX || o.minX > maxX || o.maxZ < minZ || o.minZ > maxZ) continue;
        out.push(o);
      }
    }
  }
  return out;
}

/** Local-space closest-point push. Writes _res and returns it when overlapping. */
function pushOut(cx, cz, r, o) {
  const dx = cx - o.x;
  const dz = cz - o.z;
  const lx = o.cos * dx - o.sin * dz;
  const lz = o.sin * dx + o.cos * dz;
  const clx = lx < -o.hx ? -o.hx : lx > o.hx ? o.hx : lx;
  const clz = lz < -o.hz ? -o.hz : lz > o.hz ? o.hz : lz;
  let ox = lx - clx;
  let oz = lz - clz;
  const d2 = ox * ox + oz * oz;
  let nlx = 0;
  let nlz = 0;
  if (d2 > r * r) return null;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const pen = r - d;
    nlx = (ox / d) * pen;
    nlz = (oz / d) * pen;
  } else {
    const penL = o.hx - Math.abs(lx);
    const penD = o.hz - Math.abs(lz);
    if (penL < penD) {
      nlx = (lx >= 0 ? 1 : -1) * (penL + r);
    } else {
      nlz = (lz >= 0 ? 1 : -1) * (penD + r);
    }
  }
  _res.x = o.cos * nlx + o.sin * nlz;
  _res.z = -o.sin * nlx + o.cos * nlz;
  _res.hit = true;
  return _res;
}

export function circleBlocked(x, z, r, col) {
  const b = col.bounds;
  if (x - r < b.minX || x + r > b.maxX || z - r < b.minZ || z + r > b.maxZ) return true;
  const solids = queryAABB(col, x - r, z - r, x + r, z + r);
  for (let i = 0; i < solids.length; i++) {
    if (pushOut(x, z, r, solids[i])) return true;
  }
  return false;
}

function clampBounds(cx, cz, r, bounds) {
  if (cx < bounds.minX + r) cx = bounds.minX + r;
  else if (cx > bounds.maxX - r) cx = bounds.maxX - r;
  if (cz < bounds.minZ + r) cz = bounds.minZ + r;
  else if (cz > bounds.maxZ - r) cz = bounds.maxZ - r;
  return { x: cx, z: cz };
}

/**
 * Move a circle, resolving solids and the map bounds.
 * Substeps so a dash cannot tunnel through a thin wall.
 */
export function moveCircle(x, z, r, dx, dz, col) {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / Math.max(0.28, r * 0.7)));
  const sx = dx / steps;
  const sz = dz / steps;
  let cx = x;
  let cz = z;
  for (let s = 0; s < steps; s++) {
    cx += sx;
    cz += sz;
    for (let iter = 0; iter < 3; iter++) {
      const solids = queryAABB(col, cx - r, cz - r, cx + r, cz + r);
      let hit = false;
      for (let i = 0; i < solids.length; i++) {
        const p = pushOut(cx, cz, r, solids[i]);
        if (!p) continue;
        cx += p.x;
        cz += p.z;
        hit = true;
      }
      if (!hit) break;
    }
    const c = clampBounds(cx, cz, r, col.bounds);
    cx = c.x;
    cz = c.z;
  }
  return { x: cx, z: cz };
}

function clipSeg(p, q, span) {
  if (Math.abs(p) < 1e-9) return q >= 0;
  const t = q / p;
  if (p < 0) {
    if (t > span.t1) return false;
    if (t > span.t0) span.t0 = t;
  } else {
    if (t < span.t0) return false;
    if (t < span.t1) span.t1 = t;
  }
  return true;
}

/** Entry parameter (0..1) of a segment against an inflated OBB, or null. */
function segmentTOBB(x0, z0, x1, z1, o, radius) {
  const lx0 = o.cos * (x0 - o.x) - o.sin * (z0 - o.z);
  const lz0 = o.sin * (x0 - o.x) + o.cos * (z0 - o.z);
  const lx1 = o.cos * (x1 - o.x) - o.sin * (z1 - o.z);
  const lz1 = o.sin * (x1 - o.x) + o.cos * (z1 - o.z);
  const hx = o.hx + radius;
  const hz = o.hz + radius;
  const dx = lx1 - lx0;
  const dz = lz1 - lz0;
  const span = { t0: 0, t1: 1 };
  if (!clipSeg(-dx, lx0 + hx, span)) return null;
  if (!clipSeg(dx, hx - lx0, span)) return null;
  if (!clipSeg(-dz, lz0 + hz, span)) return null;
  if (!clipSeg(dz, hz - lz0, span)) return null;
  return span.t0;
}

/** Distance a body of `radius` can travel before a solid. `maxDist` if clear. */
export function rayDistance(x, z, dx, dz, maxDist, radius, col) {
  const len = Math.hypot(dx, dz);
  if (len < 1e-8 || maxDist <= 0) return 0;
  dx /= len;
  dz /= len;
  const x1 = x + dx * maxDist;
  const z1 = z + dz * maxDist;
  const minX = Math.min(x, x1) - radius;
  const maxX = Math.max(x, x1) + radius;
  const minZ = Math.min(z, z1) - radius;
  const maxZ = Math.max(z, z1) + radius;
  const solids = queryAABB(col, minX, minZ, maxX, maxZ);
  let best = 1;
  for (let i = 0; i < solids.length; i++) {
    const t = segmentTOBB(x, z, x1, z1, solids[i], radius);
    if (t !== null && t < best) best = t;
  }
  let boundT = 1;
  const b = col.bounds;
  if (dx > 1e-8) boundT = Math.min(boundT, (b.maxX - radius - x) / (dx * maxDist));
  else if (dx < -1e-8) boundT = Math.min(boundT, (b.minX + radius - x) / (dx * maxDist));
  if (dz > 1e-8) boundT = Math.min(boundT, (b.maxZ - radius - z) / (dz * maxDist));
  else if (dz < -1e-8) boundT = Math.min(boundT, (b.minZ + radius - z) / (dz * maxDist));
  if (boundT < best) best = Math.max(0, boundT);
  return best * maxDist;
}

/** First hit along a segment against solids. Returns t in 0..1 or null. */
export function segmentSolidT(x0, z0, x1, z1, radius, col) {
  const minX = Math.min(x0, x1) - radius;
  const maxX = Math.max(x0, x1) + radius;
  const minZ = Math.min(z0, z1) - radius;
  const maxZ = Math.max(z0, z1) + radius;
  const solids = queryAABB(col, minX, minZ, maxX, maxZ);
  let best = null;
  for (let i = 0; i < solids.length; i++) {
    const t = segmentTOBB(x0, z0, x1, z1, solids[i], radius);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** Closest approach parameter of a segment to a circle, if it comes within `r`. */
export function segmentCircleT(x0, z0, x1, z1, cx, cz, r) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const fx = x0 - cx;
  const fz = z0 - cz;
  const a = dx * dx + dz * dz;
  const c = fx * fx + fz * fz - r * r;
  if (a < 1e-10) return c <= 0 ? 0 : null;
  const b = 2 * (fx * dx + fz * dz);
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  const t = (-b - disc) / (2 * a);
  if (t >= 0 && t <= 1) return t;
  const t2 = (-b + disc) / (2 * a);
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}
