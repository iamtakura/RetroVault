import { useRef, useEffect, useCallback } from 'react';

export function useAudioFeedback() {
  const audioCtxRef = useRef(null);
  const noiseBufferRef = useRef(null);
  
  // Keep track of active hiss source and gain to allow fading
  const hissSourceRef = useRef(null);
  const hissGainRef = useRef(null);

  // Initialize AudioContext lazily
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Generate White Noise Buffer (2 seconds)
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBufferRef.current = buffer;

    return ctx;
  }, []);

  // Resume context if suspended (browser security)
  const resumeContext = useCallback(async (ctx) => {
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, []);

  // Play Mechanical Click
  const playClick = useCallback(async () => {
    const ctx = initAudio();
    if (!ctx) return;
    await resumeContext(ctx);

    const noise = noiseBufferRef.current;
    if (!noise) return;

    // Create Click Graph
    const source = ctx.createBufferSource();
    source.buffer = noise;

    // Filter to make it a mechanical high-frequency click
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400; // Crisp mid-high freq
    filter.Q.value = 4; // Resonant click

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    // Envelope: decay to 0 over 5ms (0.005s)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.005);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + 0.008);
  }, [initAudio, resumeContext]);

  // Start Tape Hiss
  const startHiss = useCallback(async () => {
    const ctx = initAudio();
    if (!ctx) return;
    await resumeContext(ctx);

    const noise = noiseBufferRef.current;
    if (!noise) return;

    // Stop existing hiss if any
    if (hissSourceRef.current) {
      try {
        hissSourceRef.current.stop();
      } catch (e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;

    // Tape Hiss Bandpass (vintage low-fi character)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4500; // characteristic tape hiss frequency region
    filter.Q.value = 0.7; // broad warmth

    const gainNode = ctx.createGain();
    // Fade in tape hiss over 0.3 seconds
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.3);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start();

    hissSourceRef.current = source;
    hissGainRef.current = gainNode;
  }, [initAudio, resumeContext]);

  // Stop Tape Hiss
  const stopHiss = useCallback(() => {
    const ctx = audioCtxRef.current;
    const gainNode = hissGainRef.current;
    const source = hissSourceRef.current;

    if (!ctx || !gainNode || !source) return;

    // Fade out tape hiss over 0.8 seconds
    const fadeOutTime = 0.8;
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fadeOutTime);

    // Stop the source after fadeout finishes
    setTimeout(() => {
      try {
        source.stop();
      } catch (e) {}
    }, fadeOutTime * 1000);

    hissSourceRef.current = null;
    hissGainRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hissSourceRef.current) {
        try {
          hissSourceRef.current.stop();
        } catch (e) {}
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return {
    playClick,
    startHiss,
    stopHiss
  };
}
