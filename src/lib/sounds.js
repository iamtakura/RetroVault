let ctx = null;
let masterGain = null;
let storedVolume = 0.7;

const cassetteInsert = () => {
  if (!ctx) return;
  // Thud: short noise burst, low freq
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 
      Math.pow(1 - i / bufferSize, 3);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain || ctx.destination);
  source.start();

  // Click-lock: sharp transient 80ms later
  setTimeout(() => {
    if (!ctx) return;
    const clickBuffer = ctx.createBuffer(1, 
      Math.floor(ctx.sampleRate * 0.015), ctx.sampleRate);
    const clickData = clickBuffer.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * 
        Math.pow(1 - i / clickData.length, 8);
    }
    const clickSource = ctx.createBufferSource();
    clickSource.buffer = clickBuffer;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.9, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, 
      ctx.currentTime + 0.015);

    clickSource.connect(clickGain);
    clickGain.connect(masterGain || ctx.destination);
    clickSource.start();
  }, 80);
};

const cassetteEject = () => {
  if (!ctx) return;
  // Spring release click
  const clickBuffer = ctx.createBuffer(1,
    Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
  const clickData = clickBuffer.getChannelData(0);
  for (let i = 0; i < clickData.length; i++) {
    clickData[i] = (Math.random() * 2 - 1) * 
      Math.pow(1 - i / clickData.length, 6);
  }
  const clickSource = ctx.createBufferSource();
  clickSource.buffer = clickBuffer;
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.7, ctx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, 
    ctx.currentTime + 0.02);
  clickSource.connect(clickGain);
  clickGain.connect(masterGain || ctx.destination);
  clickSource.start();

  // Slide out: filtered noise sweep
  setTimeout(() => {
    if (!ctx) return;
    const slideBuffer = ctx.createBuffer(1,
      Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const slideData = slideBuffer.getChannelData(0);
    for (let i = 0; i < slideData.length; i++) {
      slideData[i] = (Math.random() * 2 - 1) * 0.15 *
        Math.pow(1 - i / slideData.length, 2);
    }
    const slideSource = ctx.createBufferSource();
    slideSource.buffer = slideBuffer;
    const slideFilter = ctx.createBiquadFilter();
    slideFilter.type = 'bandpass';
    slideFilter.frequency.value = 800;
    slideFilter.Q.value = 0.8;
    const slideGain = ctx.createGain();
    slideGain.gain.setValueAtTime(0.4, ctx.currentTime);
    slideSource.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(masterGain || ctx.destination);
    slideSource.start();
  }, 40);
};

const needleDrop = () => {
  if (!ctx) return;
  // Scratch: short bandpass noise
  const scratchBuffer = ctx.createBuffer(1,
    Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
  const scratchData = scratchBuffer.getChannelData(0);
  for (let i = 0; i < scratchData.length; i++) {
    scratchData[i] = (Math.random() * 2 - 1) *
      Math.sin(Math.PI * i / scratchData.length);
  }
  const scratchSource = ctx.createBufferSource();
  scratchSource.buffer = scratchBuffer;

  const scratchFilter = ctx.createBiquadFilter();
  scratchFilter.type = 'bandpass';
  scratchFilter.frequency.value = 2400;
  scratchFilter.Q.value = 1.2;

  const scratchGain = ctx.createGain();
  scratchGain.gain.setValueAtTime(0.5, ctx.currentTime);
  scratchGain.gain.exponentialRampToValueAtTime(0.001,
    ctx.currentTime + 0.06);

  scratchSource.connect(scratchFilter);
  scratchFilter.connect(scratchGain);
  scratchGain.connect(masterGain || ctx.destination);
  scratchSource.start();

  // Thud: low freq body resonance
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(oscGain);
  oscGain.connect(masterGain || ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

const needleLift = () => {
  if (!ctx) return;
  const buffer = ctx.createBuffer(1,
    Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) *
      Math.pow(i / data.length, 0.5) *
      Math.pow(1 - i / data.length, 2) * 0.6;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain || ctx.destination);
  source.start();
};

const buttonClick = () => {
  if (!ctx) return;
  const buffer = ctx.createBuffer(1,
    Math.floor(ctx.sampleRate * 0.012), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) *
      Math.pow(1 - i / data.length, 10);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
  source.connect(gain);
  gain.connect(masterGain || ctx.destination);
  source.start();
};

const buttonRelease = () => {
  if (!ctx) return;
  const buffer = ctx.createBuffer(1,
    Math.floor(ctx.sampleRate * 0.008), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) *
      Math.pow(1 - i / data.length, 12) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.008);
  source.connect(gain);
  gain.connect(masterGain || ctx.destination);
  source.start();
};

const reelStart = () => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(20, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.3);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain || ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

const reelStop = () => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(60, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain || ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
};

const rewindScramble = () => {
  if (!ctx) return;
  const duration = 0.4;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const noise = Math.random() * 2 - 1;
    const mod = Math.sin(i / bufferSize * Math.PI * 80) * 0.5 + 0.5;
    data[i] = noise * mod * Math.pow(1 - i / bufferSize, 0.3);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.6;

  source.playbackRate.value = 1.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain || ctx.destination);
  source.start();
  source.stop(ctx.currentTime + duration);
};

const typewriterBell = () => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    660, ctx.currentTime + 0.3
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001, ctx.currentTime + 0.4
  );

  osc.connect(gain);
  gain.connect(masterGain || ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
};

const sounds = {
  cassetteInsert,
  cassetteEject,
  needleDrop,
  needleLift,
  buttonClick,
  buttonRelease,
  reelStart,
  reelStop,
  rewindScramble,
  typewriterBell,
};

export const initSounds = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Create master gain bus if not yet created
  if (ctx && !masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = storedVolume;
    masterGain.connect(ctx.destination);
  }
  // Resume context if suspended (browser security autoplays block)
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
  return sounds;
};

export const getAudioContext = () => ctx;

export const setMasterVolume = (value) => {
  storedVolume = Math.max(0, Math.min(1, value / 100));
  if (masterGain) {
    masterGain.gain.value = storedVolume;
  }
};

export const getMasterVolume = () => Math.round(storedVolume * 100);

export const setMasterEnabled = (enabled) => {
  if (masterGain) {
    masterGain.gain.value = enabled ? storedVolume : 0;
  }
};
