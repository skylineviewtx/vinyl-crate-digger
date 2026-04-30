// sounds.js — config-driven synthesizer for all UI sounds
// Each sound has an ADSR envelope, waveform, frequency sweep, duration, volume, and active toggle
// All settings persist via window.api.setSetting

let _ctx = null;
let _masterGain = null;
let _crackleNode = null;
let _crackleGain = null;

// Default configs for each sound
export const SOUND_DEFAULTS = {
  needleDrop: {
    active: true, label: "Needle drop",
    waveform: "sine", noiseBlend: 0.4,
    freqStart: 80, freqEnd: 30,
    attack: 0.01, decay: 0.08, sustain: 0.0, release: 0.1,
    duration: 0.22, volume: 0.7
  },
  add: {
    active: true, label: "Add record",
    waveform: "sine", noiseBlend: 0,
    freqStart: 523, freqEnd: 784,
    attack: 0.02, decay: 0.05, sustain: 0.3, release: 0.25,
    duration: 0.35, volume: 0.25
  },
  save: {
    active: true, label: "Save record",
    waveform: "sine", noiseBlend: 0,
    freqStart: 523, freqEnd: 784,
    attack: 0.02, decay: 0.05, sustain: 0.3, release: 0.2,
    duration: 0.5, volume: 0.2
  },
  delete: {
    active: true, label: "Delete",
    waveform: "sine", noiseBlend: 0.1,
    freqStart: 300, freqEnd: 120,
    attack: 0.01, decay: 0.1, sustain: 0.0, release: 0.1,
    duration: 0.22, volume: 0.3
  },
  checkClick: {
    active: true, label: "Checkbox click",
    waveform: "square", noiseBlend: 0.1,
    freqStart: 1200, freqEnd: 400,
    attack: 0.001, decay: 0.03, sustain: 0.0, release: 0.02,
    duration: 0.06, volume: 0.3
  },
  hover: {
    active: true, label: "Card hover",
    waveform: "sine", noiseBlend: 0.6,
    freqStart: 800, freqEnd: 200,
    attack: 0.01, decay: 0.05, sustain: 0.0, release: 0.1,
    duration: 0.18, volume: 0.12
  }
};

// Live config — starts as defaults, gets overwritten from settings on load
let _configs = JSON.parse(JSON.stringify(SOUND_DEFAULTS));

export function getSoundConfigs() { return _configs; }

export function setSoundConfig(key, config) {
  _configs[key] = { ..._configs[key], ...config };
}

export async function loadSoundConfigs() {
  for (const key of Object.keys(SOUND_DEFAULTS)) {
    try {
      const raw = await window.api.getSetting(`sound_cfg_${key}`);
      if (raw) _configs[key] = { ...SOUND_DEFAULTS[key], ...JSON.parse(raw) };
    } catch {}
  }
}

export async function saveSoundConfig(key) {
  await window.api.setSetting(`sound_cfg_${key}`, JSON.stringify(_configs[key]));
}

// ── Audio context ─────────────────────────────────────────────────────────────
let _volume = 0.5;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = _volume;
    _masterGain.connect(_ctx.destination);
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

export function setVolume(vol) {
  _volume = Math.max(0, Math.min(1, vol));
  if (_masterGain) _masterGain.gain.setTargetAtTime(_volume, getCtx().currentTime, 0.05);
}

export function getVolume() { return _volume; }

// ── Core synth engine ─────────────────────────────────────────────────────────
function playSynth(cfg) {
  if (!cfg.active) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const { waveform, noiseBlend, freqStart, freqEnd, attack, decay, sustain,
          release, duration, volume } = cfg;

  const masterEnv = ctx.createGain();
  masterEnv.connect(_masterGain);

  // Tone oscillator
  if (noiseBlend < 1) {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = waveform === "noise" ? "sine" : waveform;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);
    }
    oscGain.gain.value = (1 - noiseBlend) * volume;
    osc.connect(oscGain);
    oscGain.connect(masterEnv);
    osc.start(now);
    osc.stop(now + duration + release + 0.05);
  }

  // Noise component
  if (noiseBlend > 0) {
    const bufSize = Math.ceil(ctx.sampleRate * (duration + release + 0.05));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = (freqStart + freqEnd) / 2;
    noiseFilter.Q.value = 1.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = noiseBlend * volume;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterEnv);
    noise.start(now);
  }

  // ADSR envelope on master
  masterEnv.gain.setValueAtTime(0, now);
  masterEnv.gain.linearRampToValueAtTime(1, now + attack);
  masterEnv.gain.linearRampToValueAtTime(sustain > 0 ? sustain : 0.001,
    now + attack + decay);
  if (sustain > 0) {
    masterEnv.gain.setValueAtTime(sustain, now + duration - release);
  }
  masterEnv.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
}

// ── Multi-note helper for add/save ────────────────────────────────────────────
function playChord(cfg, freqs) {
  if (!cfg.active) return;
  freqs.forEach((freq, i) => {
    setTimeout(() => playSynth({ ...cfg, freqStart: freq, freqEnd: freq }), i * 70);
  });
}

// ── Public sound functions ────────────────────────────────────────────────────
export function playNeedleDrop() { playSynth(_configs.needleDrop); }
export function playAdd()        { playChord(_configs.add, [523.25, 659.25, 783.99]); }
export function playSave()       { playChord(_configs.save, [523.25, 659.25, 783.99]); }
export function playDelete()     { playSynth(_configs.delete); }
export function playCheckClick() { playSynth(_configs.checkClick); }
export function playHover()      { playSynth(_configs.hover); }

// Preview a sound with a given config without saving
export function previewSound(cfg) { playSynth(cfg); }

// ── Vinyl crackle loop ────────────────────────────────────────────────────────
export function startCrackle() {
  if (_crackleNode) return;
  const ctx = getCtx();
  _crackleGain = ctx.createGain();
  _crackleGain.gain.value = 0;
  _crackleGain.connect(_masterGain);

  const hissBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const hissData = hissBuffer.getChannelData(0);
  for (let i = 0; i < hissData.length; i++) hissData[i] = (Math.random() * 2 - 1) * 0.15;
  const hiss = ctx.createBufferSource();
  hiss.buffer = hissBuffer;
  hiss.loop = true;
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = "highpass";
  hissFilter.frequency.value = 3000;
  hiss.connect(hissFilter);
  hissFilter.connect(_crackleGain);
  hiss.start();
  _crackleNode = hiss;

  function schedulePops() {
    if (!_crackleNode) return;
    const now = ctx.currentTime;
    const delay = 0.3 + Math.random() * 0.9;
    const popBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.015), ctx.sampleRate);
    const popData = popBuffer.getChannelData(0);
    for (let i = 0; i < popData.length; i++) {
      popData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (popData.length * 0.3));
    }
    const pop = ctx.createBufferSource();
    pop.buffer = popBuffer;
    const pg = ctx.createGain();
    pg.gain.value = 0.25 + Math.random() * 0.35;
    pop.connect(pg);
    pg.connect(_crackleGain);
    pop.start(now + delay);
    setTimeout(schedulePops, delay * 1000 * 0.8);
  }
  schedulePops();
  _crackleGain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.5);
}

export function stopCrackle() {
  if (!_crackleNode) return;
  const ctx = getCtx();
  _crackleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  setTimeout(() => {
    try { _crackleNode.stop(); } catch {}
    _crackleNode = null;
    _crackleGain = null;
  }, 2000);
}
