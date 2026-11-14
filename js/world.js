// Hand-placed world data for the capsule survival shooter.
// Units are meters. Capsule diameter is about 1 m.
// x, z are box centers. w is extent along local X, d along local Z.
// h is height from the ground (the box occupies y = 0 .. h).
// rotY is an optional yaw in radians, counterclockwise about the box center.
// color is an optional CSS hex. Omitted rotY means 0.

export default {
  bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },

  playerSpawn: { x: 0, z: 9 },

  boxes: [
    // ------------------------------------------------------------------
    // Perimeter walls. 3 m thick, 6.5 m tall. Outer faces sit on the
    // bounds so the playable inner face is at |x| = 77 and |z| = 77.
    // The four boxes overlap at the corners on purpose, to seal the edge.
    // ------------------------------------------------------------------
    { x: 0, z: 78.5, w: 160, d: 3, h: 6.5, color: "#5C5F63" },
    { x: 0, z: -78.5, w: 160, d: 3, h: 6.5, color: "#5C5F63" },
    { x: -78.5, z: 0, w: 3, d: 160, h: 6.5, color: "#5C5F63" },
    { x: 78.5, z: 0, w: 3, d: 160, h: 6.5, color: "#5C5F63" },

    // ------------------------------------------------------------------
    // Outer-wall buttresses. Irregular spacing and size, so the ring
    // walkway is not a stamped colonnade. Each one still leaves a
    // corridor of at least 6 m to the interior structures.
    // ------------------------------------------------------------------
    { x: -60, z: 75, w: 3.0, d: 4, h: 6.5, color: "#5C5F63" },
    { x: -18, z: 75, w: 2.4, d: 4, h: 5.5, color: "#7A7D82" },
    { x: 24, z: 75, w: 3.5, d: 4, h: 6.5, color: "#5C5F63" },
    { x: 62, z: 75.2, w: 2.8, d: 3.6, h: 6.0, color: "#5C5F63" },
    { x: -40, z: -75, w: 4.0, d: 4, h: 6.5, color: "#5C5F63" },
    { x: 6, z: -75, w: 2.5, d: 4, h: 5.8, color: "#7A7D82" },
    { x: 44, z: -75, w: 3.2, d: 4, h: 6.5, color: "#5C5F63" },
    { x: -75, z: -22, w: 4, d: 3.0, h: 6.5, color: "#5C5F63" },
    { x: -75, z: 30, w: 4, d: 2.6, h: 5.5, color: "#7A7D82" },
    { x: -75, z: 62, w: 4, d: 3.2, h: 6.5, color: "#5C5F63" },
    { x: 75, z: -40, w: 4, d: 3.5, h: 6.5, color: "#5C5F63" },
    { x: 75, z: -8, w: 4, d: 2.4, h: 5.2, color: "#7A7D82" },
    { x: 75, z: 36, w: 4, d: 3.0, h: 6.5, color: "#5C5F63" },
    { x: 75, z: 64, w: 4, d: 2.8, h: 5.8, color: "#9A9DA1" },

    // ------------------------------------------------------------------
    // Central plaza monument. The only copper landmark. Three stacked
    // boxes share a center so they read as one stepped obelisk.
    // ------------------------------------------------------------------
    { x: 0, z: 0, w: 3.4, d: 3.4, h: 1.15, color: "#A66B4F" },
    { x: 0, z: 0, w: 2.0, d: 2.0, h: 4.6, color: "#A66B4F" },
    { x: 0, z: 0, w: 0.85, d: 0.85, h: 11.0, color: "#A66B4F" },

    // Plaza frame: four L-shaped corner walls. Mid-side gaps are about
    // 12 m so the plaza never becomes a kill box. Heights and lengths
    // differ slightly at each corner to break perfect symmetry.
    // Southwest L
    { x: -13.5, z: -21, w: 15, d: 2, h: 3.6, color: "#7A7D82" },
    { x: -21, z: -13.5, w: 2, d: 15, h: 3.6, color: "#7A7D82" },
    // Southeast L (taller, slightly shorter vertical arm)
    { x: 13.5, z: -21, w: 15, d: 2, h: 4.0, color: "#9A9DA1" },
    { x: 21, z: -14.5, w: 2, d: 13, h: 4.0, color: "#9A9DA1" },
    // Northwest L (tallest, longer horizontal arm)
    { x: -14, z: 21, w: 16, d: 2, h: 4.2, color: "#5C5F63" },
    { x: -21, z: 13.5, w: 2, d: 15, h: 4.2, color: "#5C5F63" },
    // Northeast L (lowest, shorter horizontal arm)
    { x: 14.0, z: 21, w: 14, d: 2, h: 3.8, color: "#7A7D82" },
    { x: 21, z: 13.5, w: 2, d: 15, h: 3.8, color: "#7A7D82" },

    // Four low benches tucked toward the L corners, leaving the center
    // open. The northeast bench is rotated in plan so the set is not a
    // stamped copy.
    { x: -15, z: -15, w: 3.5, d: 0.8, h: 0.85, color: "#D8D4CC" },
    { x: 15, z: -15, w: 3.5, d: 0.8, h: 0.85, color: "#C9C4BA" },
    { x: -15, z: 15, w: 3.5, d: 0.8, h: 0.9, color: "#D8D4CC" },
    { x: 15, z: 15, w: 0.8, d: 3.5, h: 0.85, color: "#C9C4BA" },

    // ------------------------------------------------------------------
    // West alleys. A handmade street fabric, not a grid: two broken
    // spines, T-junctions, a kink, a shallow chicane, and a small
    // crate court. Every passage is meant to stay at least 3 m wide,
    // and every pocket opens back onto a loop.
    // ------------------------------------------------------------------
    // East gate, facing the plaza ring street. A wide south opening
    // and a narrower north side gate, split by a taller pier.
    { x: -33.5, z: 17.5, w: 2, d: 13, h: 4.4, color: "#5C5F63" },
    { x: -33.5, z: 4, w: 2, d: 6, h: 5.2, color: "#3E4145" },
    { x: -33.5, z: -15.5, w: 2, d: 17, h: 4.0, color: "#5C5F63" },

    // Broken west facade, with two exits out to the outer ring.
    { x: -64.5, z: -18, w: 2.2, d: 16, h: 5.2, color: "#5C5F63" },
    { x: -64.5, z: 4, w: 2.2, d: 14, h: 4.6, color: "#7A7D82" },
    { x: -64.5, z: 20, w: 2.2, d: 8, h: 5.5, color: "#5C5F63" },

    // West spine (north-south), broken at a mid-block gap.
    { x: -56, z: -14, w: 1.8, d: 16, h: 3.9, color: "#7A7D82" },
    { x: -56, z: 8, w: 1.8, d: 14, h: 4.3, color: "#9A9DA1" },

    // East spine, offset so the two streets are not twins.
    { x: -47, z: 14, w: 1.8, d: 12, h: 3.6, color: "#7A7D82" },
    { x: -47, z: -4, w: 1.8, d: 10, h: 4.1, color: "#5C5F63" },

    // T-junction off the west spine, leaving a passage past the east spine.
    { x: -53.35, z: 8, w: 3.5, d: 1.7, h: 3.4, color: "#9A9DA1" },

    // Long east-west divider that forms a south yard rather than a dead end.
    { x: -51, z: -16, w: 12, d: 1.8, h: 4.0, color: "#7A7D82" },

    // North T off the east spine, stopping short of the gate so a 4 m
    // passage remains.
    { x: -42.4, z: 20, w: 7.8, d: 1.8, h: 3.3, color: "#9A9DA1" },

    // Kink wall that jogs the southeast alley without sealing it.
    { x: -40, z: -8, w: 1.8, d: 9, h: 3.7, color: "#3E4145" },

    // Shallow chicane off the west facade (open at the inner end).
    { x: -61.7, z: 2, w: 3.4, d: 1.6, h: 2.8, color: "#D8D4CC" },

    // Short north fragment, a visual stop rather than a trap.
    { x: -52.2, z: 22, w: 1.8, d: 6, h: 3.0, color: "#7A7D82" },

    // Local height accent: a gray tower, not an accent-color landmark.
    { x: -58.5, z: 19.6, w: 3.2, d: 3.2, h: 7.2, color: "#3E4145" },

    // Crate cluster in the south yard. Three different sizes, grouped
    // so a player can cut around either side.
    { x: -50.5, z: -22, w: 2.4, d: 1.4, h: 1.2, color: "#D8D4CC" },
    { x: -49.2, z: -22.5, w: 1.4, d: 1.4, h: 1.6, color: "#C9C4BA" },
    { x: -49.8, z: -21.3, w: 1.2, d: 1.2, h: 0.9, color: "#9A9DA1" },

    // ------------------------------------------------------------------
    // East pillar hall. A framed hall with a wide west mouth, two 5 m
    // back exits, and irregular columns — not a regular colonnade.
    // Low benches sit in the gaps as extra cover.
    // ------------------------------------------------------------------
    { x: 33.5, z: 17, w: 2, d: 14, h: 5.0, color: "#5C5F63" },
    { x: 33.5, z: -17, w: 2, d: 14, h: 5.0, color: "#5C5F63" },

    { x: 64.5, z: 18, w: 2.2, d: 12, h: 5.8, color: "#5C5F63" },
    { x: 64.5, z: -18, w: 2.2, d: 12, h: 5.5, color: "#5C5F63" },
    { x: 64.5, z: 0, w: 2.2, d: 14, h: 6.2, color: "#3E4145" },

    { x: 50, z: 25, w: 18, d: 1.8, h: 4.8, color: "#7A7D82" },
    { x: 50, z: -25, w: 20, d: 1.8, h: 4.4, color: "#7A7D82" },

    // Pillars, placed one by one with mixed footprints and heights.
    { x: 39.5, z: -10, w: 1.8, d: 1.8, h: 6.8, color: "#3E4145" },
    { x: 41.5, z: 14, w: 2.2, d: 2.0, h: 5.2, color: "#7A7D82" },
    { x: 47, z: -18, w: 1.6, d: 1.6, h: 7.8, color: "#3E4145" },
    { x: 48, z: 5, w: 2.4, d: 2.4, h: 4.6, color: "#9A9DA1" },
    { x: 52.5, z: -7, w: 1.4, d: 1.4, h: 8.4, color: "#3E4145" },
    { x: 53, z: 18, w: 2.8, d: 1.8, h: 3.8, color: "#C9C4BA" },
    { x: 56, z: 6, w: 1.2, d: 1.2, h: 9.0, color: "#3E4145" },
    { x: 57, z: -20, w: 1.8, d: 1.8, h: 6.2, color: "#7A7D82" },
    { x: 59, z: -9, w: 2.0, d: 3.2, h: 5.0, color: "#9A9DA1" },
    { x: 59.4, z: 11.5, w: 1.6, d: 1.6, h: 6.5, color: "#7A7D82" },
    { x: 45, z: -1, w: 1.7, d: 1.7, h: 5.8, color: "#7A7D82" },
    { x: 38.5, z: 20.0, w: 2.0, d: 1.4, h: 3.4, color: "#9A9DA1" },

    { x: 50, z: 11, w: 2.6, d: 1.0, h: 1.15, color: "#D8D4CC" },
    { x: 42, z: -15.5, w: 1.0, d: 2.4, h: 1.0, color: "#D8D4CC" },
    { x: 59.2, z: 2, w: 2.2, d: 1.0, h: 1.3, color: "#C9C4BA" },

    // ------------------------------------------------------------------
    // North cover field. A ruin / barricade ground: one staggered
    // broken wall, several irregular clusters, a short staggered lane,
    // and a thin north strip that does not seal the outer ring.
    // ------------------------------------------------------------------
    // Broken east-west wall, pieces offset in z and of mixed length.
    { x: -44, z: 50, w: 10, d: 1.8, h: 3.2, color: "#7A7D82" },
    { x: -26, z: 51.5, w: 8, d: 2.0, h: 2.6, color: "#9A9DA1" },
    { x: -6, z: 49.2, w: 12, d: 1.6, h: 3.6, color: "#5C5F63" },
    { x: 12, z: 50.8, w: 7, d: 1.8, h: 2.9, color: "#7A7D82" },
    { x: 30, z: 49.5, w: 11, d: 2.2, h: 4.0, color: "#3E4145" },

    // West ruin cluster.
    { x: -48, z: 40, w: 3.5, d: 2.2, h: 1.8, color: "#D8D4CC" },
    { x: -42, z: 36, w: 2.0, d: 2.0, h: 3.4, color: "#7A7D82" },
    { x: -41, z: 42, w: 1.6, d: 4.0, h: 2.4, color: "#9A9DA1" },
    { x: -35.5, z: 37.5, w: 2.8, d: 1.5, h: 1.2, color: "#C9C4BA" },

    // Center-west scatter.
    { x: -20, z: 38, w: 4.0, d: 1.6, h: 1.4, color: "#D8D4CC" },
    { x: -15, z: 43, w: 1.8, d: 1.8, h: 2.8, color: "#7A7D82" },
    { x: -12, z: 37, w: 2.2, d: 2.2, h: 1.6, color: "#9A9DA1" },

    // Short staggered lane (two parallel walls, not the same length).
    { x: 4, z: 40, w: 1.6, d: 6, h: 2.2, color: "#7A7D82" },
    { x: 10, z: 41.5, w: 1.6, d: 7, h: 2.7, color: "#9A9DA1" },

    // Northeast scatter.
    { x: 22, z: 40, w: 2.4, d: 2.4, h: 1.5, color: "#D8D4CC" },
    { x: 27, z: 36, w: 1.8, d: 3.0, h: 2.3, color: "#7A7D82" },
    { x: 32, z: 42, w: 3.2, d: 1.6, h: 1.3, color: "#C9C4BA" },
    { x: 38, z: 38, w: 2.0, d: 2.0, h: 3.8, color: "#3E4145" },
    { x: 42, z: 43, w: 4.5, d: 1.8, h: 1.7, color: "#9A9DA1" },

    // North strip, stopped well short of the perimeter so the outer
    // ring stay open (~11–13 m of walkway remains).
    { x: -30, z: 63, w: 6, d: 1.7, h: 2.5, color: "#7A7D82" },
    { x: -8, z: 64.5, w: 2.2, d: 2.2, h: 4.5, color: "#3E4145" },
    { x: 14, z: 62, w: 8, d: 1.6, h: 1.8, color: "#D8D4CC" },
    { x: 36, z: 64, w: 3.0, d: 2.0, h: 2.9, color: "#9A9DA1" },
    { x: 48, z: 60, w: 2.0, d: 4.0, h: 2.2, color: "#7A7D82" },

    // Stepped mid-north group, used as a wayfinding clump.
    { x: -4, z: 58, w: 2.5, d: 2.0, h: 1.4, color: "#C9C4BA" },
    { x: 1.5, z: 61, w: 2.0, d: 2.5, h: 2.6, color: "#7A7D82" },
    { x: 7, z: 56.5, w: 3.0, d: 1.8, h: 1.9, color: "#9A9DA1" },

    // Northwest edge of the field, a small L that opens south and east.
    { x: -54, z: 56, w: 1.8, d: 6, h: 3.3, color: "#5C5F63" },
    { x: -51.0, z: 59, w: 5.8, d: 1.8, h: 2.0, color: "#9A9DA1" },

    // ------------------------------------------------------------------
    // South wall rings. Two broken rectangles with gaps offset so a
    // player weaves between them. A few rotated fragments sit in the
    // space between the rings. The inner court has a gray stele for
    // wayfinding; it is not an accent-color landmark.
    // ------------------------------------------------------------------
    // Inner ring
    { x: -4, z: -41, w: 14, d: 2, h: 3.4, color: "#7A7D82" },
    { x: 10, z: -48, w: 2, d: 12, h: 4.2, color: "#5C5F63" },
    { x: 2, z: -60, w: 16, d: 2, h: 3.0, color: "#9A9DA1" },
    { x: -10, z: -50, w: 2, d: 16, h: 4.6, color: "#3E4145" },

    // Outer ring, north (wide gate toward the plaza street)
    { x: -20, z: -35, w: 20, d: 2, h: 3.8, color: "#5C5F63" },
    { x: 18, z: -35.5, w: 18, d: 2, h: 3.5, color: "#7A7D82" },
    // Outer east
    { x: 26, z: -51, w: 2, d: 16, h: 4.4, color: "#5C5F63" },
    // Outer south (leaves the perimeter corridor open)
    { x: -16, z: -66, w: 22, d: 2, h: 3.2, color: "#7A7D82" },
    { x: 16, z: -66, w: 18, d: 2.2, h: 4.0, color: "#9A9DA1" },
    // Outer west, two staggered pieces with a 4 m gap between them
    { x: -26, z: -45.5, w: 2, d: 11, h: 3.9, color: "#7A7D82" },
    { x: -28, z: -60, w: 2, d: 10, h: 5.0, color: "#3E4145" },

    // Fragments between the rings. Three of these are rotated so the
    // zone reads as a broken ring rather than only axis-aligned bars.
    { x: 8, z: -52, w: 6, d: 1.6, h: 2.4, color: "#9A9DA1", rotY: 0.4 },
    { x: -18, z: -55, w: 5, d: 1.5, h: 2.8, color: "#7A7D82", rotY: -0.55 },
    { x: 16, z: -46, w: 1.8, d: 3.5, h: 3.6, color: "#5C5F63", rotY: 0.25 },
    { x: -4, z: -54.5, w: 2.2, d: 2.2, h: 1.3, color: "#D8D4CC" },
    { x: 4, z: -46, w: 3.0, d: 1.2, h: 1.1, color: "#C9C4BA" },

    { x: 0, z: -50, w: 1.4, d: 1.4, h: 6.0, color: "#3E4145" },

    // ------------------------------------------------------------------
    // Corner yards. Each corner is a different micro-composition so
    // the diagonals are not empty and not copies of each other.
    // All four stay open to the outer ring and to the neighboring zones.
    // ------------------------------------------------------------------
    // Northwest: a ruined gate (two pillars) with a low threshold south
    // of the opening, so the gate itself stays clear.
    { x: -62, z: 47, w: 2.0, d: 2.0, h: 7.0, color: "#3E4145" },
    { x: -54, z: 47, w: 2.0, d: 2.0, h: 6.4, color: "#7A7D82" },
    { x: -58, z: 42, w: 10, d: 1.5, h: 1.2, color: "#D8D4CC" },

    // Northeast: three descending blocks in a loose triangle, plus a
    // low north-south bar.
    { x: 46, z: 50, w: 3.0, d: 3.0, h: 6.5, color: "#3E4145" },
    { x: 52, z: 47, w: 2.4, d: 2.4, h: 4.2, color: "#7A7D82" },
    { x: 54, z: 54, w: 2.0, d: 2.0, h: 2.4, color: "#9A9DA1" },
    { x: 57.2, z: 44, w: 1.6, d: 8, h: 1.4, color: "#C9C4BA" },

    // Southwest: a low court with a wide bar, a stub wall, a tall
    // marker, and a short south piece.
    { x: -48, z: -48, w: 8, d: 2.0, h: 1.5, color: "#D8D4CC" },
    { x: -54, z: -41, w: 1.8, d: 6, h: 3.2, color: "#7A7D82" },
    { x: -41, z: -53.5, w: 2.2, d: 2.2, h: 4.8, color: "#3E4145" },
    { x: -50, z: -56, w: 4.0, d: 1.6, h: 2.0, color: "#9A9DA1" },

    // Southeast: three staggered east-west fins with 4 m+ gaps, and a
    // vertical end cap that does not close the weave.
    { x: 44, z: -46, w: 8, d: 1.6, h: 3.0, color: "#7A7D82" },
    { x: 48, z: -52, w: 8, d: 1.6, h: 3.6, color: "#9A9DA1" },
    { x: 44, z: -58, w: 7, d: 1.6, h: 2.5, color: "#5C5F63" },
    { x: 56, z: -52, w: 1.6, d: 5, h: 4.2, color: "#3E4145" },
  ],

  // Axis-aligned rectangles. x, z are centers. Kept well away from the
  // player spawn in the plaza, and sitting in open ground (verified).
  enemySpawnZones: [
    { x: -32, z: 58, w: 8, d: 6 },
    { x: 16, z: 46, w: 8, d: 6 },
    { x: -42, z: -22, w: 6, d: 6 },
    { x: 58, z: 20, w: 6, d: 5 },
    { x: -18, z: -42, w: 6, d: 5 },
    { x: 18, z: -56, w: 6, d: 5 },
    { x: -70, z: 10, w: 5, d: 8 },
    { x: 70, z: -20, w: 5, d: 8 },
  ],

  pickups: [
    { x: -8, z: 1, type: "health" },
    { x: -51, z: -2, type: "health" },
    { x: 54, z: -2, type: "health" },
    { x: 0, z: 56, type: "health" },
    { x: -4, z: -48, type: "health" },
  ],
};
