/**
 * Skill draft. Each id can be taken up to `max` times.
 * Numbers in `rank` are the value at level 1, 2, 3 (orbit has 4).
 */

export const SKILLS = [
  { id: "orbit", name: "Border Blades", max: 4, blurb: "Blades orbit your edge and shove anything they touch." },
  { id: "dual", name: "Twin Sword", max: 3, blurb: "A mirrored sword sweeps with you." },
  { id: "spin", name: "Spin Blade", max: 3, blurb: "A blade spins on its own, even when you are not swinging." },
  { id: "barrier", name: "Ring Posts", max: 3, blurb: "Posts circle you, block bodies, and push them out." },
  { id: "shock", name: "Shock Ring", max: 3, blurb: "A fast sweep throws a ring of force." },
  { id: "dashslash", name: "Dash Cut", max: 3, blurb: "The dash itself cuts." },
  { id: "length", name: "Longer Blade", max: 3, blurb: "The sword reaches farther." },
  { id: "power", name: "Heavy Edge", max: 3, blurb: "Sweeps hit harder." },
  { id: "knock", name: "Hard Shove", max: 3, blurb: "Hits throw bodies farther." },
  { id: "leech", name: "Siphon", max: 3, blurb: "A solid hit gives you a little health." },
  { id: "regen", name: "Mend", max: 3, blurb: "Health trickles back on its own." },
  { id: "patch", name: "Patch Up", max: 99, repeat: true, blurb: "Restore a chunk of health right now. Can be taken again." },
  { id: "magnet", name: "Orb Magnet", max: 3, blurb: "Orbs drift in from farther away." },
  { id: "frost", name: "Frost Aura", max: 3, blurb: "Nearby enemies move slower." },
  { id: "chain", name: "Arc Leap", max: 3, blurb: "A crit jumps to other bodies." },
  { id: "thorns", name: "Bramble", max: 3, blurb: "Touching you hurts them and hurts you less." },
  { id: "haste", name: "Quick Step", max: 3, blurb: "You move faster." },
  { id: "vital", name: "More Heart", max: 3, blurb: "A larger health pool." },
  { id: "blast", name: "Pop", max: 3, blurb: "A kill bursts outward." },
  { id: "boom", name: "Boomerang", max: 3, blurb: "A blade flies out and comes back." },
];

const BY_ID = {};
for (let i = 0; i < SKILLS.length; i++) BY_ID[SKILLS[i].id] = SKILLS[i];

export function skillDef(id) {
  return BY_ID[id];
}

export function skillLevel(player, id) {
  return (player.skills && player.skills[id]) || 0;
}

export function offerSkills(player, rng, count) {
  const open = [];
  for (let i = 0; i < SKILLS.length; i++) {
    const s = SKILLS[i];
    if (s.repeat || skillLevel(player, s.id) < s.max) open.push(s.id);
  }
  if (!open.length) return null;
  const offer = [];
  const hurt = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  const patchChance = hurt < 0.45 ? 0.7 : hurt < 0.7 ? 0.45 : 0.22;
  if (open.indexOf("patch") >= 0 && rng() < patchChance) offer.push("patch");
  if (open.indexOf("regen") >= 0 && skillLevel(player, "regen") < 3 && hurt < 0.7 && rng() < 0.4) {
    offer.push("regen");
  }
  const pool = open.filter((id) => offer.indexOf(id) < 0);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  for (let i = 0; i < pool.length && offer.length < count; i++) offer.push(pool[i]);
  for (let i = offer.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = offer[i];
    offer[i] = offer[j];
    offer[j] = t;
  }
  return offer.slice(0, Math.min(count, offer.length));
}

export function skillLine(id, level) {
  const s = BY_ID[id];
  if (!s) return "";
  if (s.repeat) return s.name;
  return s.name + "  " + level + "/" + s.max;
}

export const SKILL_PREFS = {
  sloppy: null,
  average: ["patch", "regen", "vital", "power", "length", "knock", "haste", "shock", "orbit"],
  skilled: ["patch", "regen", "vital", "orbit", "spin", "frost", "barrier", "haste", "chain", "blast", "dual"],
};
