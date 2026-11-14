import { JUICE } from "./config.js";

function envGain(ctx, t, attack, dur, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  return g;
}

function tone(ctx, dest, t, freq, dur, type, peak) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const g = envGain(ctx, t, 0.005, dur, peak);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

function noiseBurst(ctx, dest, buffer, t, dur, freq, q, peak) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, t);
  filter.Q.value = q;
  const g = envGain(ctx, t, 0.004, dur, peak);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let buffer = null;
  let unlocked = false;

  function ensure() {
    if (!JUICE.sfx || !Ctx) return null;
    if (!ctx) {
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.3);
      buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true;
    return ctx;
  }

  function play(kind) {
    const ac = ensure();
    if (!ac || !unlocked) return;
    const t = ac.currentTime;
    const wobble = 0.94 + Math.random() * 0.12;
    if (kind === "swing") {
      noiseBurst(ac, master, buffer, t, 0.09, 880 * wobble, 0.55, 0.2);
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(640 * wobble, t);
      o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
      const g = envGain(ac, t, 0.004, 0.09, 0.1);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.12);
    } else if (kind === "hit") {
      tone(ac, master, t, 118 * wobble, 0.055, "sine", 0.28);
      noiseBurst(ac, master, buffer, t, 0.04, 320, 0.8, 0.16);
    } else if (kind === "kill") {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(720, t + 0.1);
      const g = envGain(ac, t, 0.004, 0.11, 0.32);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.14);
      noiseBurst(ac, master, buffer, t, 0.08, 900, 0.5, 0.2);
    } else if (kind === "hurt") {
      tone(ac, master, t, 90, 0.14, "sawtooth", 0.18);
      noiseBurst(ac, master, buffer, t, 0.1, 180, 0.6, 0.2);
    } else if (kind === "dash") {
      noiseBurst(ac, master, buffer, t, 0.11, 640, 0.45, 0.16);
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
      const g = envGain(ac, t, 0.005, 0.1, 0.1);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.13);
    } else if (kind === "pickup") {
      tone(ac, master, t, 520, 0.07, "sine", 0.12);
      tone(ac, master, t + 0.05, 780, 0.08, "sine", 0.08);
    } else if (kind === "windup") {
      tone(ac, master, t, 240, 0.08, "triangle", 0.06);
    } else if (kind === "level") {
      tone(ac, master, t, 420, 0.08, "square", 0.08);
      tone(ac, master, t + 0.07, 560, 0.1, "square", 0.08);
    } else if (kind === "xp") {
      tone(ac, master, t, 880, 0.04, "sine", 0.05);
    }
  }

  return {
    unlock: ensure,
    consume(events) {
      if (!JUICE.sfx) return;
      let swing = false;
      let hit = false;
      let kill = false;
      let hurt = false;
      let dash = false;
      let pickup = false;
      let windup = false;
      let level = false;
      let xp = false;
      for (let i = 0; i < events.length; i++) {
        const type = events[i].type;
        if (type === "swing") swing = true;
        else if (type === "hit") hit = true;
        else if (type === "kill") kill = true;
        else if (type === "hurt") hurt = true;
        else if (type === "dash") dash = true;
        else if (type === "pickup") pickup = true;
        else if (type === "windup") windup = true;
        else if (type === "level") level = true;
        else if (type === "xp") xp = true;
      }
      if (swing) play("swing");
      if (hit) play("hit");
      if (kill) play("kill");
      if (hurt) play("hurt");
      if (dash) play("dash");
      if (pickup) play("pickup");
      if (level) play("level");
      if (xp) play("xp");
      if (windup) play("windup");
    },
  };
}
