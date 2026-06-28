import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { initSounds, getAudioContext } from '../lib/sounds';

let sounds = null;

export default function Turntable({
  status, // 'idle' | 'recording' | 'processing' | 'done' | 'error'
  duration, // seconds
  onStartRecording,
  onStopRecording,
  playClick,
  isPlayback,
  playbackRecording,
  setIsPlayback,
  onPlaybackEnd,
}) {
  const platterRef = useRef(null);
  const tonearmRef = useRef(null);
  const leverRef = useRef(null);
  const recordWobbleRef = useRef(null);
  const audioPlayerRef = useRef(null);
  
  const [sessionTimer, setSessionTimer] = useState(0);
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const decodedBufferRef = useRef(null);
  const reversePlayerRef = useRef(null);
  const isRewinding = useRef(false);
  const rewindCounterRef = useRef(null);

  const [rpm, setRpm] = useState(33);

  // Rotation animation variables for GSAP ticker
  const platterAnimRef = useRef({
    angle: 0,
    speed: 0,
    active: false,
  });

  // Ticker for vinyl platter rotation
  useEffect(() => {
    const anim = platterAnimRef.current;

    const onTick = () => {
      if (!anim.active && anim.speed <= 0) return;

      // Update angle
      anim.angle += anim.speed;

      // Apply rotation to platter
      if (platterRef.current) {
        gsap.set(platterRef.current, { rotation: anim.angle });
      }

      // If active, accelerate to target speed (based on RPM setting)
      const targetSpeed = rpm === 33 ? 3.3 : 4.5;
      if (anim.active) {
        anim.speed += (targetSpeed - anim.speed) * 0.05; // smooth acceleration
      }
    };

    gsap.ticker.add(onTick);

    return () => {
      gsap.ticker.remove(onTick);
    };
  }, [rpm]);

  // Handle status transitions
  useEffect(() => {
    if (!sounds) sounds = initSounds();
    const anim = platterAnimRef.current;

    if (status === 'recording') {
      // 1. Move Start/Stop Lever
      gsap.to(leverRef.current, {
        rotation: 30,
        duration: 0.3,
        ease: 'power1.inOut',
      });

      // 2. Swing Tonearm onto record
      gsap.to(tonearmRef.current, {
        rotation: 55, // Pivot to touch the outer groove ring flush
        duration: 1.2,
        ease: 'power2.inOut',
        onComplete: () => {
          // Play needle drop sound timed with landing
          if (sounds) sounds.needleDrop();

          // 3. Start platter spinning once tonearm is in place
          anim.active = true;

          // 4. Subtle organic wobble on the spinning record
          recordWobbleRef.current = gsap.to(platterRef.current, {
            scaleX: 1.002,
            scaleY: 0.998,
            duration: 0.6,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        },
      });
    } else if (status === 'processing' || status === 'done' || status === 'idle' || status === 'error') {
      // Play needle lift immediately
      if (sounds) sounds.needleLift();

      // Stop record wobble animation
      if (recordWobbleRef.current) {
        recordWobbleRef.current.kill();
        recordWobbleRef.current = null;
      }

      // 1. Swing Tonearm back to rest
      gsap.to(tonearmRef.current, {
        rotation: 0,
        duration: 1.2,
        ease: 'power2.inOut',
      });

      // 2. Move Start/Stop Lever back
      gsap.to(leverRef.current, {
        rotation: 0,
        duration: 0.4,
        ease: 'power1.inOut',
        delay: 0.2,
      });

      // 3. Decelerate platter
      anim.active = false;
      gsap.to(anim, {
        speed: 0,
        duration: 2.2,
        ease: 'power2.out',
        onComplete: () => {
          // Reset platter scale to normal
          gsap.set(platterRef.current, { scale: 1 });
        },
      });
    }
  }, [status]);

  const recordRef = platterRef;

  // Pre-decode audio blob immediately on mount/isPlayback true
  useEffect(() => {
    if (isPlayback && playbackRecording?.audioBlob) {
      const decodeAndPlay = async () => {
        const audioCtx = getAudioContext();
        if (audioCtx) {
          if (audioCtx.state === 'suspended') await audioCtx.resume();
          const arrayBuffer = await playbackRecording.audioBlob.arrayBuffer();
          decodedBufferRef.current = await audioCtx.decodeAudioData(arrayBuffer);
        }
        // Auto-play on mount when entering playback
        handlePlayClick();
      };
      decodeAndPlay();
    } else {
      // Clean up when not in playback mode
      cleanupPlayback();
    }
  }, [isPlayback, playbackRecording]);

  // Format timer duration to MM:SS
  const formatTimer = (sec) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleLeverClick = () => {
    if (!sounds) sounds = initSounds();
    if (sounds) sounds.buttonClick();

    if (status === 'idle') {
      onStartRecording();
    } else if (status === 'recording') {
      onStopRecording();
    }
  };

  const handlePowerToggle = () => {
    if (!isPlayback) {
      handleLeverClick();
      return;
    }

    if (playbackState === 'idle') {
      handlePlayClick();
    } else if (playbackState === 'playing') {
      handleTurntablePause();
    } else if (playbackState === 'paused') {
      handleTurntableResume();
    }
  };

  const handlePlayClick = async () => {
    if (!sounds) sounds = initSounds();
    if (sounds) sounds.buttonClick();

    if (!isPlayback || !playbackRecording?.audioBlob) return;

    // Swing tonearm and move lever to ON
    gsap.to(leverRef.current, {
      rotation: 30,
      duration: 0.3,
      ease: 'power1.inOut',
    });

    gsap.to(tonearmRef.current, {
      rotation: 55,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: async () => {
        if (sounds) sounds.needleDrop();

        const anim = platterAnimRef.current;
        anim.active = true;

        recordWobbleRef.current = gsap.to(platterRef.current, {
          scaleX: 1.002,
          scaleY: 0.998,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        // Ensure pre-decoded buffer is ready
        if (!decodedBufferRef.current) {
          const arrayBuffer = await playbackRecording.audioBlob.arrayBuffer();
          const audioCtx = getAudioContext();
          decodedBufferRef.current = await audioCtx.decodeAudioData(arrayBuffer);
        }

        const url = URL.createObjectURL(playbackRecording.audioBlob);
        const audio = new Audio(url);
        audioPlayerRef.current = audio;

        // Apply selected speed rate (rpm)
        audio.playbackRate = rpm === 45 ? 1.36 : 1.0;

        audio.ontimeupdate = () => {
          setSessionTimer(Math.floor(audio.currentTime));
        };

        audio.play();
        setPlaybackState('playing');

        audio.onended = () => {
          cleanupPlayback();
          URL.revokeObjectURL(url);
        };
      }
    });
  };

  const handleTurntablePause = () => {
    if (!audioPlayerRef.current) return;

    if (isRewinding.current) stopBackspin();

    // Pitch drag-down effect using Web Audio API
    const audioCtx = getAudioContext();
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        40, audioCtx.currentTime + 0.4
      );
      const dragGain = audioCtx.createGain();
      dragGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      dragGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
      osc.connect(dragGain);
      dragGain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }

    audioPlayerRef.current.pause();
    setPlaybackState('paused');

    // Tonearm lifts slightly (30% of full lift, which is 55 - 8 = 47)
    gsap.to(tonearmRef.current, {
      rotation: 47,
      duration: 0.4,
      ease: 'power2.out'
    });

    // Record decelerates and stops
    const anim = platterAnimRef.current;
    anim.active = false;
    gsap.to(anim, {
      speed: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        gsap.killTweensOf(platterRef.current);
      }
    });
  };

  const handleTurntableResume = () => {
    if (!audioPlayerRef.current) return;

    if (isRewinding.current) stopBackspin();

    // Pitch ramp-up effect
    const audioCtx = getAudioContext();
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(40, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        200, audioCtx.currentTime + 0.3
      );
      const rampGain = audioCtx.createGain();
      rampGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      rampGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      osc.connect(rampGain);
      rampGain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }

    audioPlayerRef.current.play();
    setPlaybackState('playing');

    // Tonearm drops back to groove
    gsap.to(tonearmRef.current, {
      rotation: 55,
      duration: 0.4,
      ease: 'power2.in'
    });

    // Record spins back up to speed
    const anim = platterAnimRef.current;
    anim.active = true;
  };

  const handlePlayToggle = () => {
    if (playbackState === 'idle') {
      handlePlayClick();
    } else if (playbackState === 'playing') {
      handleTurntablePause();
    } else if (playbackState === 'paused') {
      handleTurntableResume();
    }
  };

  const handleBackspin = async () => {
    if (!isPlayback || !decodedBufferRef.current) return;

    if (isRewinding.current) {
      stopBackspin();
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setPlaybackState('paused');

    const audioCtx = getAudioContext();
    const audioBuffer = decodedBufferRef.current;

    const reversed = audioCtx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const original = audioBuffer.getChannelData(ch);
      const reversedData = reversed.getChannelData(ch);
      for (let i = 0; i < original.length; i++) {
        reversedData[i] = original[original.length - 1 - i];
      }
    }

    const currentTime = audioPlayerRef.current?.currentTime || 0;
    const startOffset = Math.max(0, audioBuffer.duration - currentTime);

    const reverseSource = audioCtx.createBufferSource();
    reverseSource.buffer = reversed;
    reverseSource.playbackRate.value = 2.0;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.85;
    reverseSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    reversePlayerRef._startCtxTime = audioCtx.currentTime;
    reversePlayerRef._startPosition = currentTime;

    reverseSource.start(0, startOffset);
    reversePlayerRef.current = reverseSource;
    isRewinding.current = true;

    // Platter spins BACKWARDS visually
    const anim = platterAnimRef.current;
    anim.active = false;
    anim.speed = 0;

    gsap.killTweensOf(recordRef.current);
    gsap.to(recordRef.current, {
      rotation: '-=360',
      duration: 1.0,
      repeat: -1,
      ease: 'none',
      transformOrigin: '50% 50%'
    });

    if (rewindCounterRef.current) {
      clearInterval(rewindCounterRef.current);
    }
    rewindCounterRef.current = setInterval(() => {
      setSessionTimer(prev => Math.max(0, prev - 2));
    }, 1000);

    reverseSource.onended = () => {
      if (isRewinding.current) {
        stopBackspin();
        if (audioPlayerRef.current) {
          audioPlayerRef.current.currentTime = 0;
        }
        setSessionTimer(0);
      }
    };
  };

  const stopBackspin = () => {
    if (reversePlayerRef.current) {
      try { reversePlayerRef.current.stop(); } catch (e) {}
      reversePlayerRef.current = null;
    }

    const audioCtx = getAudioContext();
    const elapsed = audioCtx.currentTime - (reversePlayerRef._startCtxTime || audioCtx.currentTime);
    const rewoundSeconds = elapsed * 2.0;
    const newPosition = Math.max(0, (reversePlayerRef._startPosition || 0) - rewoundSeconds);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newPosition;
    }

    if (rewindCounterRef.current) {
      clearInterval(rewindCounterRef.current);
      rewindCounterRef.current = null;
    }

    isRewinding.current = false;

    gsap.killTweensOf(recordRef.current);
  };

  const handleSpeedChange = (targetRpm) => {
    if (!sounds) sounds = initSounds();
    if (sounds) sounds.buttonClick();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = targetRpm === 45 ? 1.36 : 1.0;
    }
    setRpm(targetRpm);
  };

  const cleanupPlayback = () => {
    if (sounds) sounds.needleLift();
    if (recordWobbleRef.current) {
      recordWobbleRef.current.kill();
      recordWobbleRef.current = null;
    }

    gsap.to(tonearmRef.current, {
      rotation: 0,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    gsap.to(leverRef.current, {
      rotation: 0,
      duration: 0.4,
      ease: 'power1.inOut',
      delay: 0.2,
    });

    const anim = platterAnimRef.current;
    anim.active = false;
    gsap.to(anim, {
      speed: 0,
      duration: 2.2,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(platterRef.current, { scale: 1 });
      },
    });

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (reversePlayerRef.current) {
      try { reversePlayerRef.current.stop(); } catch (e) {}
      reversePlayerRef.current = null;
    }
    if (rewindCounterRef.current) {
      clearInterval(rewindCounterRef.current);
      rewindCounterRef.current = null;
    }
    isRewinding.current = false;
    decodedBufferRef.current = null;
    setPlaybackState('idle');
    setSessionTimer(0);
    if (onPlaybackEnd) {
      onPlaybackEnd();
    } else if (setIsPlayback) {
      setIsPlayback(false);
    }
  };

  return (
    <div className="turntable-screen">
      {/* Wood grain housing */}
      <div className="turntable-housing">
        <div className="turntable-inner">
          {/* Left: Platter area */}
          <div className="platter-area">
            <div className="platter-wrapper">
              <div className="platter">
                <div className="platter-mat">
                  <div
                    ref={platterRef}
                    className={`vinyl-record ${isPlayback ? 'playback-active' : ''}`}
                    onClick={handleBackspin}
                    style={{ cursor: isPlayback ? 'pointer' : 'default' }}
                  >
                    {/* Groove rings */}
                    <div className="vinyl-grooves" />
                    {/* Dead wax ring */}
                    <div className="vinyl-deadwax" />
                    {/* Center label */}
                    <div className="vinyl-label">
                      <span className="vinyl-label-name">
                        {isPlayback ? playbackRecording?.title : 'RETROVAULT'}
                      </span>
                      <span className="vinyl-label-rpm">
                        {isPlayback ? 'PLAYBACK' : `${rpm} RPM`}
                      </span>
                    </div>
                    {/* Center spindle */}
                    <div className="vinyl-spindle" />
                  </div>
                </div>
              </div>

              {/* Tonearm positioned relative to platter size */}
              <div ref={tonearmRef} className="tonearm-container">
                <div className="tonearm-pivot" />
                <div className="tonearm-counterweight" />
                <div className="tonearm-arm" />
                <div className="tonearm-headshell">
                  <div className="tonearm-stylus" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Controls area */}
          <div className="controls-area">
            {/* Controls panel */}
            <div className="turntable-controls">
              {/* Speed selector stacked vertically */}
              <div className="control-group speed-controls">
                <div className="controls-label">SPEED</div>
                <button
                  type="button"
                  className={`speed-btn ${rpm === 33 ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(33)}
                  disabled={status === 'recording'}
                >
                  33
                </button>
                <button
                  type="button"
                  className={`speed-btn ${rpm === 45 ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(45)}
                  disabled={status === 'recording'}
                >
                  45
                </button>
              </div>

              {/* Power lever */}
              <div className="control-group power-controls">
                <div className="controls-label">POWER</div>
                <div className="lever-housing" onClick={handlePowerToggle}>
                  <div ref={leverRef} className="mechanical-lever" />
                </div>
                <div className="lever-marks">
                  <span>OFF</span>
                  <span>ON</span>
                </div>
              </div>

              {/* Playback buttons (only when isPlayback) */}
              {isPlayback && (
                <div className="playback-buttons">
                  <button
                    type="button"
                    className="playback-btn play-btn"
                    onClick={handlePlayToggle}
                  >
                    {playbackState === 'playing' ? '⏸' : playbackState === 'paused' ? '▶' : '▶'}
                  </button>
                  <button
                    type="button"
                    className="playback-btn stop-btn"
                    onClick={cleanupPlayback}
                  >
                    ■
                  </button>
                </div>
              )}

              {/* Session timer */}
              <div className="control-group">
                <div className="controls-label">SESSION TIME</div>
                <div className="session-timer-display font-mono">
                  {formatTimer(isPlayback ? sessionTimer : duration)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ═══ SCREEN WRAPPER ═══ */
        .turntable-screen {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 16px 56px;
          overflow: hidden;
          width: 100%;
        }

        /* ═══ CABINET HOUSING ═══ */
        .turntable-housing {
          background: linear-gradient(
            145deg,
            #1a0f08 0%,
            #0f0a05 40%,
            #1a0f08 100%
          );
          border: 3px solid #2a1a0e;
          border-radius: 6px;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.9),
            0 2px 4px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.04),
            inset 0 -1px 0 rgba(0,0,0,0.5);
          padding: 16px;
          position: relative;
          width: 100%;
          max-width: min(520px, calc(100vw - 32px));
          min-height: 0;
          display: flex;
          align-items: stretch;
          box-sizing: border-box;
        }

        /* Wood grain texture */
        .turntable-housing::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 4px;
          background: repeating-linear-gradient(
            92deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.08) 3px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
          z-index: 1;
        }

        /* Cabinet bottom edge depth */
        .turntable-housing::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 4px;
          right: 4px;
          height: 6px;
          background: #0a0603;
          border-radius: 0 0 4px 4px;
          z-index: 1;
        }

        /* ═══ INNER LAYOUT ═══ */
        .turntable-inner {
          display: grid;
          grid-template-columns: 1fr 110px;
          gap: 12px;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 100%;
          flex: 1;
        }

        /* ═══ PLATTER & WRAPPER ═══ */
        .platter-area {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .platter-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .platter {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(
            circle at 50% 50%,
            #1a1a1a 0%,
            #141414 60%,
            #0a0a0a 70%,
            #1a1a1a 72%,
            #0d0d0d 74%,
            #0d0d0d 100%
          );
          box-shadow:
            0 4px 16px rgba(0,0,0,0.9),
            0 0 0 3px #1a1a1a,
            0 0 0 5px #0a0a0a,
            0 0 0 7px #222,
            inset 0 2px 4px rgba(255,255,255,0.05);
        }

        .platter-mat {
          position: absolute;
          inset: 6px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            #1a1208 0%,
            #0f0d08 100%
          );
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          height: calc(100% - 12px);
          width: calc(100% - 12px);
        }

        /* ═══ VINYL RECORD ═══ */
        .vinyl-record {
          width: 92%;
          height: 92%;
          border-radius: 50%;
          background: #0d0d0d;
          position: relative;
          overflow: hidden;
          transform-origin: center center;
        }

        .vinyl-record.playback-active {
          box-shadow: 0 0 0 2px var(--crimson-deep),
                      0 0 12px var(--crimson-glow);
        }

        .vinyl-grooves {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle at 50% 50%,
            transparent 0px,
            transparent 2px,
            rgba(255,255,255,0.018) 2px,
            rgba(255,255,255,0.018) 3px
          );
          pointer-events: none;
        }

        .vinyl-deadwax {
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          box-shadow: 0 0 0 6px rgba(255,255,255,0.03);
          pointer-events: none;
        }

        .vinyl-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32%;
          height: 32%;
          border-radius: 50%;
          background: radial-gradient(
            circle at 40% 35%,
            var(--crimson) 0%,
            #5a0000 100%
          );
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          pointer-events: none;
        }

        .vinyl-label-name {
          font-family: var(--font-display);
          font-size: clamp(5px, 1.5vw, 8px);
          color: rgba(212,197,176,0.9);
          letter-spacing: 0.08em;
          text-align: center;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vinyl-label-rpm {
          font-family: var(--font-mono);
          font-size: clamp(4px, 1vw, 6px);
          color: rgba(212,197,176,0.5);
          letter-spacing: 0.1em;
        }

        .vinyl-spindle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0a0a0a;
          box-shadow: 0 0 0 1px #333;
          z-index: 2;
          pointer-events: none;
        }

        /* ═══ TONEARM ═══ */
        .tonearm-container {
          position: absolute;
          top: 4%;
          right: -4%;
          width: 18%;
          height: 65%;
          transform-origin: top center;
          z-index: 10;
          pointer-events: none;
        }

        /* Pivot base */
        .tonearm-pivot {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 35%,
            #5a5a5a,
            #1a1a1a
          );
          border: 2px solid #444;
          box-shadow:
            0 2px 6px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.15);
          z-index: 2;
        }

        /* Inner pin of pivot */
        .tonearm-pivot::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #0a0a0a;
          border: 1px solid #555;
        }

        /* Arm body connects FROM pivot downward */
        .tonearm-arm {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: calc(100% - 10px);
          background: linear-gradient(
            to bottom,
            #5a5a5a,
            #3a3a3a 40%,
            #2a2a2a
          );
          border-radius: 2px;
          box-shadow: 1px 0 3px rgba(0,0,0,0.5);
        }

        .tonearm-counterweight {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 14px;
          border-radius: 3px;
          background: radial-gradient(
            circle at 35% 35%,
            #555,
            #1a1a1a
          );
          border: 1px solid #333;
        }

        .tonearm-headshell {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-60%) rotate(-15deg);
          width: 16px;
          height: 10px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-radius: 2px 2px 0 0;
        }

        .tonearm-stylus {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 1.5px;
          height: 10px;
          background: linear-gradient(
            to bottom,
            #888,
            var(--crimson)
          );
        }

        /* ═══ CONTROLS AREA ═══ */
        .controls-area {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 100px;
          justify-content: center;
        }

        .turntable-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
          height: 100%;
          justify-content: center;
          padding: 8px 4px;
          background: rgba(0,0,0,0.3);
          border: 1px solid #1a1a1a;
          border-radius: 3px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
          box-sizing: border-box;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          width: 100%;
        }

        .controls-label {
          font-family: var(--font-mono);
          font-size: 8px;
          color: var(--muted);
          letter-spacing: 0.15em;
          text-align: center;
          white-space: nowrap;
        }

        /* Speed Stack */
        .speed-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .speed-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 35%,
            #4a4a4a,
            #1a1a1a
          );
          border: 2px solid #333;
          color: var(--off-white);
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: all 0.15s ease;
        }

        .speed-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .speed-btn.active {
          border-color: var(--crimson);
          box-shadow:
            0 0 8px var(--crimson-glow),
            0 2px 4px rgba(0,0,0,0.6);
          color: var(--off-white);
        }

        /* Power controls */
        .power-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .lever-housing {
          background: #050505;
          border: 2px solid #222;
          width: 56px;
          height: 28px;
          border-radius: 14px;
          position: relative;
          cursor: pointer;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
        }

        .mechanical-lever {
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #888, #ccc, #444);
          border: 1px solid #222;
          border-radius: 50%;
          position: absolute;
          top: 1px;
          left: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.6);
          transform-origin: center center;
        }

        .lever-marks {
          display: flex;
          justify-content: space-between;
          width: 56px;
          font-family: var(--font-mono);
          font-size: 7px;
          color: var(--muted);
          margin-top: 2px;
          padding: 0 4px;
        }

        /* Playback buttons */
        .playback-buttons {
          display: flex;
          gap: 6px;
          width: 100%;
          padding: 0 4px;
          box-sizing: border-box;
        }

        .playback-btn {
          flex: 1;
          height: 32px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 10px;
          cursor: pointer;
          border: 1px solid #333;
          background: var(--metal-shine);
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .play-btn {
          color: var(--gold-warm);
        }

        .stop-btn {
          color: var(--crimson-bright);
        }

        .playback-btn:hover {
          border-color: #555;
        }

        /* Timer */
        .session-timer-display {
          font-size: clamp(12px, 3.5vw, 16px);
          width: 100%;
          text-align: center;
          padding: 6px 4px;
          letter-spacing: 0.1em;
          color: var(--crimson-bright);
          background: #050505;
          border: 1px solid #1a1a1a;
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.8),
            0 0 8px var(--crimson-glow);
          text-shadow: 0 0 8px var(--crimson);
          box-sizing: border-box;
        }

        /* ═══ RESPONSIVE OVERRIDES ═══ */
        @media (max-height: 650px) {
          .turntable-inner {
            grid-template-columns: 1fr 80px;
            gap: 8px;
          }
          
          .speed-btn {
            width: 36px;
            height: 36px;
          }
          
          .session-timer-display {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
