import * as THREE from "three";
import { BEST_KEY, JUICE, PLAYER } from "./config.js";
import { skillDef, skillLine } from "./skills.js";
import { createGame, step } from "./game.js";
import { createAudio } from "./audio.js";
import { createView } from "./render.js";
import world from "./world.js";
import { mulberry32 } from "./rng.js";

const canvas = document.getElementById("view");
const timerEl = document.getElementById("timer");
const bestEl = document.getElementById("best");
const hpEl = document.getElementById("hp");
const hpFill = document.getElementById("hp-fill");
const dashFill = document.getElementById("dash-fill");
const xpFill = document.getElementById("xp-fill");
const lvEl = document.getElementById("lv");
const comboEl = document.getElementById("combo");
const cardsEl = document.getElementById("cards");
const cardBtns = Array.from(document.querySelectorAll("#cards .card"));
const hintEl = document.getElementById("hint");
const soundEl = document.getElementById("sound-hint");
const overlay = document.getElementById("overlay");
const finalTime = document.getElementById("final-time");
const finalBest = document.getElementById("final-best");
const vignette = document.getElementById("vignette");
const failEl = document.getElementById("fail");

const STEP = 1 / 60;
const keys = new Set();
const mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, down: false };
let dashEdge = false;
let audioOn = false;

let game = createGame(world, mulberry32((Math.random() * 1e9) | 0));
let view;
let audio;
try {
  view = createView(canvas, world);
  audio = createAudio();
} catch (err) {
  failEl.classList.add("show");
  failEl.textContent = "This browser could not start WebGL.";
  throw err;
}

let hitstop = 0;
let slowT = 0;
let acc = 0;
let shownOver = false;
let vignetteAmt = 0;
let hintT = 8;
let skillPick = null;
let offerShownAt = 0;
const CARD_ARM_MS = 120;
let freezeNextHit = false;
let frozen = false;
let frameCount = 0;
let fpsWindow = 0;
let fpsStamp = performance.now();
let fpsValue = 0;
const proj = new THREE.Vector3();

function fmt(t) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0);
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* private mode */
  }
}

function showBestLabel() {
  const best = readBest();
  if (best > 0) {
    bestEl.hidden = false;
    bestEl.textContent = "BEST " + fmt(best);
  } else bestEl.hidden = true;
}

function sampleInput() {
  if (!audioOn) {
    audio.unlock();
    audioOn = true;
    soundEl.classList.remove("show");
  }
  const b = view.basis();
  let mx = 0;
  let mz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) { mx += b.fx; mz += b.fz; }
  if (keys.has("KeyS") || keys.has("ArrowDown")) { mx -= b.fx; mz -= b.fz; }
  if (keys.has("KeyD") || keys.has("ArrowRight")) { mx += b.rx; mz += b.rz; }
  if (keys.has("KeyA") || keys.has("ArrowLeft")) { mx -= b.rx; mz -= b.rz; }
  const aim = view.groundPoint(mouse.x, mouse.y);
  const dash = dashEdge;
  dashEdge = false;
  const pick = skillPick;
  skillPick = null;
  return { moveX: mx, moveZ: mz, aimX: aim.x, aimZ: aim.z, swing: mouse.down, dash, skillPick: pick };
}

function showOffer(offer) {
  if (cardsEl.hidden) offerShownAt = performance.now();
  cardsEl.hidden = false;
  for (let i = 0; i < cardBtns.length; i++) {
    const btn = cardBtns[i];
    const id = offer[i];
    if (!id) {
      btn.hidden = true;
      continue;
    }
    btn.hidden = false;
    const def = skillDef(id);
    const next = (game.player.skills[id] || 0) + 1;
    btn.innerHTML = "<b>" + skillLine(id, next) + "</b><span>" + (def ? def.blurb : "") + "</span><i>PICK</i>";
  }
}

function hideOffer() {
  cardsEl.hidden = true;
}

function pickCard(i) {
  if (!game.player.offer) return false;
  if (i < 0 || i >= game.player.offer.length) return false;
  skillPick = i;
  return true;
}

function project(x, y, z) {
  proj.set(x, y, z);
  proj.project(view.camera);
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (proj.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-proj.y * 0.5 + 0.5) * rect.height,
  };
}

function consumePresentation(events) {
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type === "hit" || ev.type === "kill") {
      if (freezeNextHit) {
        frozen = true;
        view.setHold(true);
      }
    } else if (ev.type === "hurt") {
      if (JUICE.hurtVignette) vignetteAmt = 1;
    }
  }
}

function updateHud() {
  const p = game.player;
  timerEl.textContent = fmt(game.time);
  const hp = Math.max(0, p.hp / p.maxHp);
  hpFill.style.transform = "scaleX(" + hp + ")";
  hpEl.classList.toggle("low", hp < 0.3 && hp > 0);
  const dash = p.dashCd > 0 ? 1 - p.dashCd / PLAYER.dashCooldown : 1;
  dashFill.style.transform = "scaleX(" + Math.max(0, Math.min(1, dash)) + ")";
  const xp = p.xpNext > 0 ? p.xp / p.xpNext : 0;
  xpFill.style.transform = "scaleX(" + Math.max(0, Math.min(1, xp)) + ")";
  lvEl.textContent = "LV " + p.level;
  if (p.combo > 1) {
    comboEl.hidden = false;
    comboEl.textContent = p.combo + " HIT";
  } else comboEl.hidden = true;
  vignetteAmt = Math.max(0, vignetteAmt - 0.016 * 3.2);
  vignette.style.opacity = JUICE.hurtVignette ? String(vignetteAmt * 0.85) : "0";
}

function showGameOver() {
  if (shownOver) return;
  shownOver = true;
  const prev = readBest();
  const best = Math.max(prev, game.time);
  if (game.time > prev) writeBest(best);
  finalTime.textContent = fmt(game.time);
  finalBest.textContent = "BEST " + fmt(best);
  overlay.hidden = false;
  showBestLabel();
}

function restart() {
  game = createGame(world, mulberry32((Math.random() * 1e9) | 0));
  view.reset();
  view.setHold(false);
  frozen = false;
  freezeNextHit = false;
  hitstop = 0;
  slowT = 0;
  acc = 0;
  shownOver = false;
  vignetteAmt = 0;
  overlay.hidden = true;
  hintT = 4;
  hintEl.classList.remove("hide");
  showBestLabel();
  last = performance.now();
}

function advance(realDt, inputFn, opts) {
  const render = !opts || opts.render !== false;
  const quiet = opts && opts.quiet;
  if (game.player.alive && game.player.offer && skillPick == null && !quiet) {
    showOffer(game.player.offer);
    if (render) {
      view.present(game, realDt, true);
      updateHud();
    }
    return;
  }
  hideOffer();
  if (!game.player.alive) {
    if (!shownOver) showGameOver();
    if (render) {
      view.present(game, realDt, false);
      updateHud();
    }
    return;
  }
  game.time += realDt;
  if (hitstop > 0) {
    hitstop -= realDt;
    const tip = view.swordProbe().tipDist;
    if (tip > 0) {
      game.player.tipDist = tip;
      game.player.tipLive = true;
    }
    const req = step(game, inputFn(), realDt, { bladeOnly: true });
    if (!quiet) {
      audio.consume(game.events);
      consumePresentation(game.events);
      view.applyEvents(game.events);
    }
    game.events.length = 0;
    if (req.hitstop && JUICE.hitstop) hitstop = Math.max(hitstop, req.hitstop);
    if (render) {
      view.present(game, realDt, true);
      updateHud();
    }
    return;
  }
  let scale = 1;
  if (slowT > 0 && JUICE.hurtSlowMo) {
    scale = JUICE.hurtSlowScale;
    slowT -= realDt;
    if (slowT < 0) slowT = 0;
  }
  acc += realDt * scale;
  if (acc > STEP * 5) acc = STEP * 5;
  let guard = 0;
  while (acc >= STEP && game.player.alive && guard++ < 5) {
    const tip = view.swordProbe().tipDist;
    if (tip > 0) {
      game.player.tipDist = tip;
      game.player.tipLive = true;
    }
    const req = step(game, inputFn(), STEP);
    if (!quiet) {
      audio.consume(game.events);
      consumePresentation(game.events);
      view.applyEvents(game.events);
    }
    game.events.length = 0;
    if (req.hitstop && JUICE.hitstop) hitstop = Math.max(hitstop, req.hitstop);
    if (req.slow && slowT <= 0) slowT = req.slow;
    acc -= STEP;
    if (hitstop > 0) break;
    if (!game.player.alive) showGameOver();
  }
  if (render) {
    view.present(game, realDt, hitstop > 0);
    updateHud();
  }
}

let last = performance.now();
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frameCount++;
  fpsWindow++;
  if (now - fpsStamp > 500) {
    fpsValue = fpsWindow / ((now - fpsStamp) / 1000);
    fpsWindow = 0;
    fpsStamp = now;
  }
  if (!document.hidden && !frozen) {
    advance(realDt, sampleInput, { render: true });
  } else {
    view.present(game, realDt, true);
    updateHud();
  }
  if (hintT > 0) {
    hintT -= realDt;
    if (hintT <= 0) hintEl.classList.add("hide");
  }
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === "Space") dashEdge = true;
  if (e.code === "KeyR" && shownOver) restart();
  if (game.player.offer && !cardsEl.hidden) {
    if (e.code === "Digit1" || e.code === "Numpad1") pickCard(0);
    if (e.code === "Digit2" || e.code === "Numpad2") pickCard(1);
    if (e.code === "Digit3" || e.code === "Numpad3") pickCard(2);
  }
  if (!audioOn) {
    audio.unlock();
    audioOn = true;
    soundEl.classList.remove("show");
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  mouse.down = false;
});
window.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
for (let i = 0; i < cardBtns.length; i++) {
  cardBtns[i].addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    pickCard(i);
  });
}
window.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest && e.target.closest("#cards")) return;
  if (shownOver) {
    restart();
    return;
  }
  mouse.down = true;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("pointerup", (e) => {
  if (e.button !== 0) return;
  const heldSwing = mouse.down;
  mouse.down = false;
  const card = e.target.closest && e.target.closest("#cards .card");
  if (!card || !game.player.offer) return;
  // The swing that leveled you up was already held. Its release is not a pick
  // until the short arm window has passed.
  if (heldSwing && performance.now() - offerShownAt < CARD_ARM_MS) return;
  const idx = cardBtns.indexOf(card);
  if (idx >= 0 && skillPick == null) pickCard(idx);
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("resize", () => view.resize());

if (JUICE.sfx) soundEl.classList.add("show");
showBestLabel();

window.__GAME = {
  get state() { return game; },
  restart,
  overview(on) { view.setOverview(!!on); },
  kill() {
    game.player.hp = 0;
    game.player.alive = false;
    game.over = true;
    showGameOver();
  },
  set holdFlash(v) { freezeNextHit = !!v; if (!v) { frozen = false; view.setHold(false); } },
  get holdFlash() { return frozen; },
  project(x, y, z) { return project(x, y, z); },
  pause(v) { frozen = !!v; },
  aim() { return { x: view.aim.x, z: view.aim.z }; },
  ground(x, y) {
    const p = view.groundPoint(x, y);
    return { x: p.x, z: p.z };
  },
  flashing() { return view.flashing(); },
  swordProbe() { return view.swordProbe(); },
  cardTiming() {
    return {
      shownAt: offerShownAt,
      armMs: CARD_ARM_MS,
      age: offerShownAt ? performance.now() - offerShownAt : 0,
      open: !cardsEl.hidden && !!game.player.offer,
    };
  },
  ribbonStats() { return view.ribbonStats(); },
  worldToMap(x, z) { return view.worldToMap(x, z); },
  mapToWorld(x, y) { return view.mapToWorld(x, y); },
  pixelInfo() { return view.pixelInfo(); },
  projectPixel(x, y, z) { return view.projectPixel(x, y, z); },
  basis() { return view.basis(); },
  fps() { return fpsValue; },
  async fastForward(seconds, skill = "average") {
    const { createBot, botInput } = await import("./bots.js");
    const bot = createBot(skill, mulberry32(99));
    const end = game.time + seconds;
    const startAlive = game.player.alive;
    while (game.player.alive && game.time < end) {
      advance(STEP, () => botInput(bot, game, STEP), { render: false, quiet: true });
    }
    view.present(game, STEP, false);
    updateHud();
    return { alive: game.player.alive, time: game.time, startedAlive: startAlive };
  },
};

requestAnimationFrame(frame);
