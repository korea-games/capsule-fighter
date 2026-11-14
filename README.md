# Capsule Fighter

A top-down survival shooter made of simple shapes. You are the blue capsule. Everything else that wants you dead is a red capsule. The map is a hand-placed concrete campus, and the point of the game is how hits feel.

## Play

From this directory:

```bash
python3 -m http.server 8741
```

Open [http://127.0.0.1:8741](http://127.0.0.1:8741). No build step. The first click or key starts audio.

| Input | Action |
| --- | --- |
| WASD | Move, relative to the camera. Screen-up is north (+Z). |
| Mouse | Aim |
| Hold left mouse and sweep | Swing the sword yourself. A faster sweep hits harder. Resting the blade on a body does nothing. |
| Space | Short dash. Cooldown, and you cannot be hit during it. |
| R or click | Restart after you drop |

The clock is real time. Best time is stored in `localStorage`. On-screen license text is `MIT`.

The picture is 3D pixel art. The scene is drawn at a quarter of the window (pixel size 4, so a 1440×900 window is a 360×225 target) and scaled up with nearest-neighbor. Lighting is a 3-step toon ramp. Outlines are one rendered pixel, taken from depth and normal edges. The pass is three.js `RenderPixelatedPass` (Kody King, MIT, vendored under `vendor/three/examples`). The camera locks to that pixel grid, and the upscale shifts by the leftover fraction so edges don't crawl. Hits freeze for a few frames, flash the body white, throw square pixel sparks along the knockback, expand a ring of blocks, and shake the view. A kill or a hit you take also splits the color for a frame. Damage numbers are a bitmap font drawn inside the pixel pass. Debris is squares of the body color and cream. There is no blood.

Walk speed is **5 m/s**. The campus is 160 m across, so a straight walk is about 32 seconds (about 31 seconds between the inner faces of the outer walls). The capsule radius is **0.5 m**.

## Map

`js/world.js` is the level designer's file, imported as-is (`export default`). Do not regenerate the boxes. The contract for a replacement map is [WORLD_SCHEMA.md](WORLD_SCHEMA.md). Notes for this particular layout are in [docs/world-notes.md](docs/world-notes.md).

Zones, north (+Z) to south: cover field, east pillar hall, central plaza with the only copper obelisk (`#A66B4F`), west alleys, south wall rings, an outer corridor, and four different corner yards. 136 boxes. Eight rectangular enemy zones. The file lists five health pickups. The game does not spawn them.

The loader does not move boxes. A spawn is a random point inside one of those rectangles, at least 16.5 m from you and not inside a solid. If you are standing in a zone, that zone is skipped until you leave. If every zone fails, a fallback ring just off-screen is used. Every box in this map starts on the floor and is tall enough to block movement, sword swings, and enemies.

## Difficulty

All of the numbers live in `js/config.js`. Pressure is only a function of the survival clock.

| Time | What shows up |
| --- | --- |
| 0:00 | Grunts. Slower than you. |
| 0:45 | Skitters. Small, already a little faster than a walk. |
| 2:24 | Brutes. Large, slow, many hits. |
| 4:00 | Chargers. They stop, telegraph, then rush. |

A smooth ramp is full at 12 minutes (more bodies, a bit more speed, more health, harder hits). A second ramp starts at 12 minutes and is full at 19, which is what makes a 20 minute run collapse. The blade shove leaves a struck enemy at the tip of the sword plus its own radius, so the late ramp's speed and damage are a little higher than the first melee tune, and the average bot stands closer and dashes less often.

Juice toggles (hit flash, hitstop, squash, knockback, shake, sparks, vignette, slow-mo, sound, reticle) are consts at the top of the same file. Pixel size and the toon steps are `PIXEL` in that same file.

Scripted players run the real `step()`:

```bash
node js/sim.js
node js/sim.js --selftest
node js/sim.js --runs 4 --profile average
```

Eight runs, capped at 20:00:

| Bot | Median | Mean | Range | Reached 20:00 |
| --- | --- | --- | --- | --- |
| Sloppy (slow sweeps, random skill picks, rarely dashes) | 5:37 | 5:59 | 3:45–8:28 | 0/8 |
| Average (steady sweeps, picks damage and reach) | 9:52 | 9:45 | 7:32–12:00 | 0/8 |
| Skilled (fast sweeps, drafts orbit, spin, frost, and sustain) | 14:32 | 14:42 | 11:47–18:45 | 0/8 |

Nobody reached 20:00. The longest skilled run was 18:45. Healing is on the level-up cards (Patch Up, Mend, More Heart, Siphon), not on map pickups. The minimap in the bottom-left is 312 px. The sword reaches 2.28 m and points at the cursor. A sweep slower than 0.75 rad/s does not count.

Kills drop orbs. The bar under your health is experience. Each level pauses on three skill cards. Press a card, or the 1, 2, or 3 key. The press lands on pointerdown. A swing that was already held cannot pick a card until 120 ms after the cards appear, so the release does not count as a choice. There are 20 skills: border blades, a twin sword, a spin blade, ring posts, a shock ring, a dash cut, a longer blade, a heavier edge, a harder shove, siphon, mend, patch up (an instant heal that can be taken again), an orb magnet, a frost aura, arc leap, bramble, quick step, more heart, a kill pop, and a boomerang. When you are hurt, Patch Up and Mend show up more often.

## Dependencies

- three.js **0.170.0**, MIT, vendored at `vendor/three/`. No CDN at runtime. See `vendor/three/LICENSE`.

Everything else is in this repo. Sound is procedural WebAudio. No audio files.

## License

MIT. See [LICENSE](LICENSE).
