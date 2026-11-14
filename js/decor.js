// Hand-placed, non-colliding set dressing for the Capsule Fighter map.
// These props are drawn by the renderer only. They are never added to
// world.boxes, so they cannot block movement, swings, or enemies.
//
// Same axes as js/world.js: meters, z is north, y is the base of the prop.
// w and d are full extents (diameters for cone, cylinder, sphere), h is height.
// rotY is a yaw in radians (three.js rotation.y). glow marks lamp heads.
//
// Districts:
//   Central plaza    - L-wall banners, two lamp posts, a broken ring of floor tiles
//   North cover field - grass tufts, fallen stone blocks, one dead tree
//   East pillar hall - lamps hung from beams between columns, crates, a banner
//   West alleys      - fences, crates, a barrel cluster, one junction lamp
//   South wall rings - ruined columns, rubble piles, a stele banner, court grass
//   Corner yards     - NW gate vines and banner, NE rock cairns,
//                      SW cone garden, SE stacked crates and a lamp
//   Outer ring       - an occasional lamp and bush along the perimeter walk

export default [
  // ------------------------------------------------------------------
  // Central plaza. Spawn (0, 9) stays bare; the obelisk footprint is untouched.
  // ------------------------------------------------------------------
  // Banners on the inner faces of the four L-walls.
  { kind: "box", x: -11, y: 1.2, z: -19.94, w: 1.3, h: 2.1, d: 0.08, color: "#8d4a3a" },
  { kind: "box", x: -11, y: 3.3, z: -19.9, w: 1.7, h: 0.12, d: 0.14, color: "#3E4145" },
  { kind: "box", x: -19.94, y: 1.4, z: 11, w: 0.08, h: 2.2, d: 1.3, color: "#8d4a3a" },
  { kind: "box", x: -19.9, y: 3.6, z: 11, w: 0.14, h: 0.12, d: 1.7, color: "#3E4145" },
  { kind: "box", x: 11.5, y: 1.2, z: 19.94, w: 1.2, h: 2.0, d: 0.08, color: "#8d4a3a" },
  { kind: "box", x: 19.94, y: 1.5, z: -13, w: 0.08, h: 2.0, d: 1.2, color: "#8d4a3a" },

  // Two lamp posts, one at each end of the north and south gaps.
  { kind: "cylinder", x: -5.2, y: 0, z: 18.6, w: 0.22, h: 3.0, d: 0.22, color: "#3E4145" },
  { kind: "box", x: -5.2, y: 3.0, z: 18.6, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },
  { kind: "cylinder", x: 5.6, y: 0, z: -18.4, w: 0.22, h: 3.0, d: 0.22, color: "#3E4145" },
  { kind: "box", x: 5.6, y: 3.0, z: -18.4, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },

  // Broken ring of floor tiles around the obelisk. The west-southwest arc is missing.
  { kind: "box", x: 5.1, y: 0, z: 0.6, w: 1.2, h: 0.05, d: 1.1, rotY: 0.1, color: "#b7b0a4" },
  { kind: "box", x: 4.1, y: 0, z: 3.2, w: 1.0, h: 0.06, d: 1.2, rotY: -0.2, color: "#C9C4BA" },
  { kind: "box", x: 1.4, y: 0, z: 5.0, w: 1.1, h: 0.05, d: 1.0, rotY: 0.3, color: "#b7b0a4" },
  { kind: "box", x: -2.4, y: 0, z: 4.6, w: 1.2, h: 0.05, d: 1.2, rotY: -0.45, color: "#9A9DA1" },
  { kind: "box", x: -5.0, y: 0, z: 1.0, w: 1.0, h: 0.06, d: 1.3, color: "#C9C4BA" },
  { kind: "box", x: -1.6, y: 0, z: -5.0, w: 1.3, h: 0.05, d: 1.0, rotY: 0.15, color: "#b7b0a4" },
  { kind: "box", x: 2.8, y: 0, z: -4.4, w: 1.0, h: 0.05, d: 1.0, rotY: 0.6, color: "#9A9DA1" },
  { kind: "box", x: 4.9, y: 0, z: -1.9, w: 1.1, h: 0.06, d: 1.2, rotY: -0.1, color: "#C9C4BA" },

  // ------------------------------------------------------------------
  // North cover field.
  // ------------------------------------------------------------------
  // Dead tree in the open ground west of the stepped group.
  { kind: "cylinder", x: -17, y: 0, z: 57.5, w: 0.6, h: 3.6, d: 0.6, color: "#5C5F63" },
  { kind: "box", x: -16.4, y: 2.0, z: 57.2, w: 1.6, h: 0.3, d: 0.3, rotY: 0.5, color: "#5C5F63" },
  { kind: "box", x: -17.5, y: 2.8, z: 57.8, w: 1.2, h: 0.25, d: 0.25, rotY: 2.2, color: "#3E4145" },

  // Fallen stone blocks.
  { kind: "box", x: 20, y: 0, z: 56.5, w: 2.2, h: 0.7, d: 1.0, rotY: 0.3, color: "#9A9DA1" },
  { kind: "box", x: 21.7, y: 0, z: 57.6, w: 0.9, h: 0.6, d: 0.9, rotY: -0.2, color: "#7A7D82" },
  { kind: "box", x: -22, y: 0, z: 45.5, w: 1.8, h: 0.6, d: 0.9, rotY: -0.4, color: "#7A7D82" },
  { kind: "box", x: 40, y: 0, z: 55.5, w: 1.6, h: 0.8, d: 1.2, rotY: 0.6, color: "#5C5F63" },

  // Ruin grass tufts at the feet of the broken wall and the north strip.
  { kind: "cone", x: -38.4, y: 0, z: 52.0, w: 0.7, h: 0.5, d: 0.7, color: "#6e7a62" },
  { kind: "cone", x: -12.6, y: 0, z: 53.2, w: 0.6, h: 0.45, d: 0.6, color: "#8a8f72" },
  { kind: "cone", x: -1.5, y: 0, z: 52.6, w: 0.7, h: 0.5, d: 0.7, color: "#6e7a62" },
  { kind: "cone", x: 24.5, y: 0, z: 59.2, w: 0.8, h: 0.55, d: 0.8, color: "#8a8f72" },
  { kind: "cone", x: 31, y: 0, z: 56.4, w: 0.6, h: 0.4, d: 0.6, color: "#6e7a62" },
  { kind: "cone", x: -45, y: 0, z: 62, w: 0.7, h: 0.5, d: 0.7, color: "#8a8f72" },

  // ------------------------------------------------------------------
  // East pillar hall.
  // ------------------------------------------------------------------
  // Lamp hung from a beam between the two southern middle columns.
  { kind: "box", x: 55.6, y: 4.5, z: -7.5, w: 4.8, h: 0.3, d: 0.3, color: "#3E4145" },
  { kind: "box", x: 55.6, y: 3.8, z: -7.5, w: 0.06, h: 0.7, d: 0.06, color: "#3E4145" },
  { kind: "box", x: 55.6, y: 3.35, z: -7.5, w: 0.45, h: 0.45, d: 0.45, color: "#e6c27a", glow: true },
  // Lamp hung between the wide column and the tall thin column.
  { kind: "box", x: 52.3, y: 4.0, z: 5.9, w: 6.2, h: 0.3, d: 0.3, color: "#5C5F63" },
  { kind: "box", x: 52.3, y: 3.4, z: 5.9, w: 0.06, h: 0.6, d: 0.06, color: "#3E4145" },
  { kind: "box", x: 52.3, y: 2.95, z: 5.9, w: 0.45, h: 0.45, d: 0.45, color: "#e6c27a", glow: true },
  // Lamp hung from a beam running from the north column to the north wall.
  { kind: "box", x: 53, y: 3.4, z: 21.5, w: 0.3, h: 0.3, d: 5.2, color: "#3E4145" },
  { kind: "box", x: 53, y: 2.8, z: 21.5, w: 0.06, h: 0.6, d: 0.06, color: "#3E4145" },
  { kind: "box", x: 53, y: 2.35, z: 21.5, w: 0.45, h: 0.45, d: 0.45, color: "#e6c27a", glow: true },

  // Crates against the north wall and the southeast back wall.
  { kind: "box", x: 44.5, y: 0, z: 23.25, w: 1.4, h: 1.2, d: 1.4, color: "#C9C4BA" },
  { kind: "box", x: 62.55, y: 0, z: -15.5, w: 1.4, h: 1.3, d: 1.4, color: "#D8D4CC" },
  { kind: "box", x: 62.6, y: 1.3, z: -15.4, w: 0.9, h: 0.8, d: 0.9, rotY: 0.35, color: "#9A9DA1" },

  // Banner on the dark back wall, facing the west mouth.
  { kind: "box", x: 63.36, y: 2.0, z: 0, w: 0.08, h: 2.6, d: 1.4, color: "#8d4a3a" },
  { kind: "box", x: 63.32, y: 4.6, z: 0, w: 0.14, h: 0.12, d: 1.8, color: "#3E4145" },

  // ------------------------------------------------------------------
  // West alleys.
  // ------------------------------------------------------------------
  // Lamp at the junction where the west spine breaks.
  { kind: "cylinder", x: -54.4, y: 0, z: -4.8, w: 0.22, h: 3.0, d: 0.22, color: "#3E4145" },
  { kind: "box", x: -54.4, y: 3.0, z: -4.8, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },

  // Low fences along wall faces, never across a passage.
  { kind: "box", x: -54.5, y: 0, z: 12.5, w: 0.12, h: 0.9, d: 3.0, color: "#9A9DA1" },
  { kind: "box", x: -62.6, y: 0, z: -20.5, w: 0.12, h: 0.85, d: 3.2, color: "#7A7D82" },
  { kind: "box", x: -42.5, y: 0, z: 22.4, w: 3.0, h: 0.9, d: 0.12, rotY: 0.08, color: "#9A9DA1" },

  // Crates tucked behind the kink wall and beside the gate pier.
  { kind: "box", x: -38.2, y: 0, z: -11.2, w: 1.2, h: 1.2, d: 1.2, color: "#C9C4BA" },
  { kind: "box", x: -38.3, y: 0, z: -9.8, w: 0.9, h: 0.9, d: 0.9, rotY: 0.2, color: "#D8D4CC" },
  { kind: "box", x: -35.3, y: 0, z: 2.2, w: 1.1, h: 1.1, d: 1.1, color: "#C9C4BA" },

  // Barrel cluster against the west face of the south spine.
  { kind: "cylinder", x: -57.6, y: 0, z: -8.4, w: 0.75, h: 1.0, d: 0.75, color: "#7A7D82" },
  { kind: "cylinder", x: -57.7, y: 0, z: -9.3, w: 0.75, h: 0.95, d: 0.75, color: "#5C5F63" },
  { kind: "cylinder", x: -58.5, y: 0, z: -8.8, w: 0.75, h: 0.9, d: 0.75, color: "#7A7D82" },
  { kind: "cylinder", x: -58.3, y: 0, z: -7.7, w: 0.55, h: 0.6, d: 0.55, color: "#3E4145" },

  // ------------------------------------------------------------------
  // South wall rings.
  // ------------------------------------------------------------------
  // Banner on the north face of the stele, toward the plaza gate.
  { kind: "box", x: 0, y: 2.6, z: -49.26, w: 0.9, h: 2.4, d: 0.08, color: "#8d4a3a" },
  { kind: "box", x: 0, y: 5.0, z: -49.23, w: 1.2, h: 0.12, d: 0.12, color: "#3E4145" },

  // Grass in the inner court corners.
  { kind: "cone", x: -7.6, y: 0, z: -44.2, w: 0.7, h: 0.5, d: 0.7, color: "#6e7a62" },
  { kind: "cone", x: 6.4, y: 0, z: -57.6, w: 0.6, h: 0.45, d: 0.6, color: "#8a8f72" },
  { kind: "cone", x: -7.3, y: 0, z: -57.2, w: 0.8, h: 0.55, d: 0.8, color: "#6e7a62" },
  { kind: "cone", x: 2.2, y: 0, z: -43.4, w: 0.6, h: 0.4, d: 0.6, color: "#8a8f72" },

  // Ruined columns between the rings, each broken at a different height.
  { kind: "cylinder", x: -17, y: 0, z: -62, w: 1.1, h: 2.2, d: 1.1, color: "#9A9DA1" },
  { kind: "cylinder", x: 20.5, y: 0, z: -61.5, w: 1.0, h: 3.0, d: 1.0, color: "#7A7D82" },
  { kind: "cylinder", x: -14, y: 0, z: -46.5, w: 1.2, h: 1.4, d: 1.2, color: "#5C5F63" },

  // Rubble piles inside the west and northeast gaps.
  { kind: "box", x: -21.5, y: 0, z: -49, w: 0.9, h: 0.5, d: 0.7, rotY: 0.3, color: "#7A7D82" },
  { kind: "box", x: -20.8, y: 0, z: -48.3, w: 0.6, h: 0.35, d: 0.6, rotY: -0.5, color: "#9A9DA1" },
  { kind: "box", x: -22.1, y: 0, z: -48.2, w: 0.5, h: 0.3, d: 0.45, color: "#5C5F63" },
  { kind: "box", x: 21.5, y: 0, z: -42.6, w: 0.8, h: 0.45, d: 0.8, rotY: 0.6, color: "#9A9DA1" },
  { kind: "box", x: 22.3, y: 0, z: -43.2, w: 0.55, h: 0.3, d: 0.5, color: "#7A7D82" },

  // ------------------------------------------------------------------
  // Northwest yard: the ruined gate gets a lintel, a banner, and vines.
  // ------------------------------------------------------------------
  { kind: "box", x: -58, y: 5.6, z: 47, w: 6.0, h: 0.6, d: 1.2, color: "#3E4145" },
  { kind: "box", x: -58, y: 3.0, z: 47, w: 1.4, h: 2.6, d: 0.08, color: "#8d4a3a" },
  { kind: "box", x: -60.94, y: 0, z: 47.2, w: 0.1, h: 3.8, d: 0.9, color: "#6e7a62" },
  { kind: "box", x: -54.2, y: 0, z: 45.94, w: 1.1, h: 2.6, d: 0.1, color: "#8a8f72" },
  { kind: "box", x: -58.8, y: 5.0, z: 46.34, w: 2.0, h: 0.7, d: 0.1, color: "#6e7a62" },
  { kind: "cone", x: -62.6, y: 0, z: 44.6, w: 0.8, h: 0.6, d: 0.8, color: "#8a8f72" },

  // ------------------------------------------------------------------
  // Northeast yard: two rock cairns.
  // ------------------------------------------------------------------
  { kind: "box", x: 50.5, y: 0, z: 56.8, w: 1.2, h: 0.6, d: 1.1, color: "#7A7D82" },
  { kind: "box", x: 50.5, y: 0.6, z: 56.8, w: 0.85, h: 0.5, d: 0.75, rotY: 0.4, color: "#9A9DA1" },
  { kind: "sphere", x: 50.45, y: 1.1, z: 56.8, w: 0.55, h: 0.5, d: 0.55, color: "#C9C4BA" },
  { kind: "box", x: 59.6, y: 0, z: 51, w: 1.0, h: 0.5, d: 1.0, rotY: 0.2, color: "#5C5F63" },
  { kind: "sphere", x: 59.6, y: 0.5, z: 51, w: 0.75, h: 0.6, d: 0.75, color: "#9A9DA1" },
  { kind: "box", x: 59.6, y: 1.1, z: 51, w: 0.4, h: 0.35, d: 0.4, rotY: 0.7, color: "#C9C4BA" },

  // ------------------------------------------------------------------
  // Southwest yard: a small cone garden on a soil bed in the low court.
  // ------------------------------------------------------------------
  { kind: "box", x: -48.4, y: 0, z: -52.2, w: 6.0, h: 0.05, d: 3.4, color: "#b7b0a4" },
  { kind: "cone", x: -50.4, y: 0, z: -51.3, w: 0.9, h: 1.4, d: 0.9, color: "#6e7a62" },
  { kind: "cone", x: -49.1, y: 0, z: -52.4, w: 0.7, h: 1.0, d: 0.7, color: "#8a8f72" },
  { kind: "cone", x: -47.5, y: 0, z: -51.2, w: 1.0, h: 1.8, d: 1.0, color: "#6e7a62" },
  { kind: "cone", x: -46.3, y: 0, z: -52.8, w: 0.6, h: 0.8, d: 0.6, color: "#8a8f72" },
  { kind: "cone", x: -48.2, y: 0, z: -53.3, w: 0.8, h: 1.2, d: 0.8, color: "#6e7a62" },

  // ------------------------------------------------------------------
  // Southeast yard: stacked crates between the fins, and a lamp.
  // ------------------------------------------------------------------
  { kind: "box", x: 50.6, y: 0, z: -47.6, w: 1.4, h: 1.4, d: 1.4, color: "#C9C4BA" },
  { kind: "box", x: 52.0, y: 0, z: -47.9, w: 1.1, h: 1.1, d: 1.1, rotY: 0.15, color: "#D8D4CC" },
  { kind: "box", x: 50.7, y: 1.4, z: -47.5, w: 1.0, h: 1.0, d: 1.0, rotY: 0.3, color: "#9A9DA1" },
  { kind: "box", x: 42.2, y: 0, z: -55.4, w: 1.2, h: 1.2, d: 1.2, color: "#C9C4BA" },
  { kind: "cylinder", x: 53.8, y: 0, z: -56.2, w: 0.22, h: 3.2, d: 0.22, color: "#3E4145" },
  { kind: "box", x: 53.8, y: 3.2, z: -56.2, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },

  // ------------------------------------------------------------------
  // Outer ring walk. Sparse and uneven, clear of the perimeter walls.
  // ------------------------------------------------------------------
  { kind: "cylinder", x: -71, y: 0, z: 70.5, w: 0.22, h: 3.4, d: 0.22, color: "#3E4145" },
  { kind: "box", x: -71, y: 3.4, z: 70.5, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },
  { kind: "cylinder", x: 73.6, y: 0, z: 22, w: 0.22, h: 3.0, d: 0.22, color: "#3E4145" },
  { kind: "box", x: 73.6, y: 3.0, z: 22, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },
  { kind: "cylinder", x: -30, y: 0, z: -73.4, w: 0.22, h: 3.2, d: 0.22, color: "#3E4145" },
  { kind: "box", x: -30, y: 3.2, z: -73.4, w: 0.5, h: 0.45, d: 0.5, color: "#e6c27a", glow: true },

  { kind: "sphere", x: -73.4, y: 0, z: 40, w: 1.4, h: 1.1, d: 1.4, color: "#6e7a62" },
  { kind: "sphere", x: -8, y: 0, z: 73.6, w: 1.2, h: 0.9, d: 1.2, color: "#8a8f72" },
  { kind: "sphere", x: 73.4, y: 0, z: -55, w: 1.5, h: 1.2, d: 1.5, color: "#6e7a62" },
  { kind: "sphere", x: 72.5, y: 0, z: -56.2, w: 0.8, h: 0.7, d: 0.8, color: "#8a8f72" },
];
