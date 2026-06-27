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
    <div className="turntable-cabinet">
      {/* Wood Finish Border & Metallic Faceplate */}
      <div className="turntable-deck brushed-metal">
        
        {/* Left Side: Vinyl Platter Area */}
        <div className="platter-well">
          {/* Vinyl Record */}
          <div
            ref={platterRef}
            className={`vinyl-record platter-record ${isPlayback ? 'playback-active' : ''}`}
            onClick={handleBackspin}
            style={{ cursor: isPlayback ? 'pointer' : 'default' }}
          >
            {/* Grooves concentric lines */}
            <div className="vinyl-grooves" />
            
            {/* Record Label */}
            <div className="vinyl-label">
              <div className="label-text-top font-display" style={isPlayback ? { fontSize: '7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '90%' } : {}}>
                {isPlayback ? playbackRecording?.title : 'RETROVAULT'}
              </div>
              <div className="label-center-spindle" />
              <div className="label-text-bottom font-mono">
                {isPlayback ? 'PLAYBACK' : `${rpm} RPM`}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Control Panels & Tonearm */}
        <div className="control-column">
          {/* Tonearm Assembly */}
          <div className="tonearm-assembly">
            {/* Pivot Base */}
            <div className="tonearm-base" />
            
            {/* Sweeping Tonearm Vector */}
            <div ref={tonearmRef} className="tonearm-body">
              <div className="tonearm-rod" />
              <div className="tonearm-counterweight" />
              <div className="tonearm-headshell" />
            </div>
          </div>

          {/* Speed Selector Buttons */}
          <div className="rpm-selector">
            <div className="rpm-label">SPEED</div>
            <div className="rpm-buttons">
              <button
                type="button"
                className={`rpm-btn speed-btn ${rpm === 33 ? 'active' : ''}`}
                onClick={() => handleSpeedChange(33)}
                disabled={status === 'recording'}
              >
                33
              </button>
              <button
                type="button"
                className={`rpm-btn speed-btn ${rpm === 45 ? 'active' : ''}`}
                onClick={() => handleSpeedChange(45)}
                disabled={status === 'recording'}
              >
                45
              </button>
            </div>
          </div>

          {/* Start/Stop Lever */}
          <div className="lever-panel">
            <div className="lever-label">POWER / START</div>
            <div className="lever-housing" onClick={handlePowerToggle}>
              <div ref={leverRef} className="mechanical-lever" />
            </div>
            <div className="lever-marks">
              <span>OFF</span>
              <span>ON</span>
            </div>
          </div>

          {/* PLAY / STOP Unified Buttons (only visible during playback mode) */}
          {isPlayback && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="rpm-btn speed-btn btn-play"
                onClick={handlePlayToggle}
                style={{ flex: 1, borderRadius: '4px', height: '36px', fontSize: '11px', color: 'var(--gold-warm)', border: '1px solid #333' }}
              >
                {playbackState === 'playing' ? '⏸ PAUSE' : playbackState === 'paused' ? '▶ RESUME' : '▶ PLAY'}
              </button>
              <button
                type="button"
                className="rpm-btn speed-btn btn-stop"
                onClick={cleanupPlayback}
                style={{ flex: 1, borderRadius: '4px', height: '36px', fontSize: '11px', color: 'var(--crimson-bright)', border: '1px solid #333' }}
              >
                ■ STOP
              </button>
            </div>
          )}

          {/* Timer Display */}
          <div className="session-timer-panel">
            <div className="timer-label">SESSION TIME</div>
            <div className="led-counter timer-display">
              <span className="counter-display">
                {formatTimer(isPlayback ? sessionTimer : duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .turntable-cabinet {
          background: linear-gradient(135deg, hsl(20, 15%, 14%) 0%, hsl(20, 15%, 10%) 100%);
          border: 14px solid hsl(20, 15%, 6%);
          border-radius: 12px;
          padding: 16px;
          width: 580px;
          max-width: 95%;
          margin: 0 auto;
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.9),
            inset 0 2px 4px rgba(255,255,255,0.05);
        }

        .turntable-deck {
          border: 4px solid #151515;
          border-radius: 6px;
          padding: 24px;
          display: flex;
          gap: 28px;
          height: 340px;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8);
          align-items: center;
        }

        /* Vinyl Platter Well */
        .platter-well {
          flex: 1.2;
          aspect-ratio: 1;
          background: #050505;
          border-radius: 50%;
          border: 8px solid #222;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            inset 0 4px 10px rgba(0, 0, 0, 0.9),
            0 1px 1px rgba(255,255,255,0.05);
          overflow: hidden;
        }

        .vinyl-record {
          width: 94%;
          height: 94%;
          background: radial-gradient(circle, #222 0%, #0d0d0d 60%, #050505 100%);
          border-radius: 50%;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: center center;
        }

        .vinyl-record.playback-active {
          box-shadow: 0 0 0 2px var(--crimson-deep),
                      0 0 12px var(--crimson-glow);
          cursor: pointer;
        }


        /* Concentric Grooves */
        .vinyl-grooves {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.015) 2.5px,
            transparent 3px
          );
          pointer-events: none;
        }

        /* Center Label */
        .vinyl-label {
          width: 35%;
          height: 35%;
          background: linear-gradient(135deg, #c0392b 0%, #8b0000 100%);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-around;
          border: 2px dashed rgba(255,255,255,0.2);
          color: var(--off-white);
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.4);
          padding: 6px;
        }

        .label-text-top {
          font-size: 8px;
          letter-spacing: 1px;
          font-weight: bold;
        }

        .label-center-spindle {
          width: 8px;
          height: 8px;
          background: #e4d2b8;
          border-radius: 50%;
          border: 2px solid #222;
        }

        .label-text-bottom {
          font-size: 6px;
          opacity: 0.8;
        }

        /* Controls Column */
        .control-column {
          flex: 0.8;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          position: relative;
        }

        /* Tonearm Assembly */
        .tonearm-assembly {
          position: absolute;
          top: 0;
          right: 10px;
          width: 80px;
          height: 250px;
          pointer-events: none;
          z-index: 20;
        }
 
        .tonearm-base {
          position: absolute;
          top: 0;
          right: 20px;
          width: 44px;
          height: 44px;
          background: radial-gradient(circle, #555 0%, #222 70%);
          border: 2px solid #111;
          border-radius: 50%;
          box-shadow: 0 4px 6px rgba(0,0,0,0.5);
        }
 
        /* Rotatable Tonearm Container */
        .tonearm-body {
          position: absolute;
          top: 22px; /* Center of base */
          right: 42px; /* Pivot center */
          width: 20px;
          height: 220px;
          transform-origin: center 0px; /* Pivot around top base */
          transform: rotate(0deg);
        }
 
        .tonearm-rod {
          position: absolute;
          top: 0;
          left: 8px;
          width: 4px;
          height: 190px;
          background: linear-gradient(to right, #aaa, #ddd, #666);
          border-radius: 2px;
          box-shadow: 1px 2px 4px rgba(0,0,0,0.4);
        }

        .tonearm-counterweight {
          position: absolute;
          top: -15px;
          left: 2px;
          width: 16px;
          height: 22px;
          background: repeating-linear-gradient(to bottom, #222, #444 4px);
          border: 1px solid #111;
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.6);
        }

        .tonearm-headshell {
          position: absolute;
          bottom: 12px;
          left: 2px;
          width: 16px;
          height: 26px;
          background: #111;
          border: 1px solid #333;
          border-radius: 2px;
          transform: rotate(-10deg);
          box-shadow: 1px 1px 3px rgba(0,0,0,0.4);
        }

        .tonearm-headshell::after {
          content: "";
          position: absolute;
          bottom: -3px;
          left: 6px;
          width: 4px;
          height: 6px;
          background: #b01020; /* Red cartridge indicator */
        }

        /* Speed buttons */
        .rpm-selector {
          margin-top: 50px;
        }

        .rpm-label {
          font-size: 8px;
          color: var(--muted);
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }

        .rpm-buttons {
          display: flex;
          gap: 12px;
        }

        .rpm-btn {
          background: #222;
          border: 1px solid #111;
          color: var(--muted);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          transition: all 0.15s ease;
        }

        .rpm-btn.active {
          background: #e4d2b8;
          color: #222;
          border-color: #e4d2b8;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.4), 0 0 5px rgba(228, 210, 184, 0.4);
        }

        /* Start/Stop Lever */
        .lever-panel {
          margin-top: 20px;
        }

        .lever-label {
          font-size: 8px;
          color: var(--muted);
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }

        .lever-housing {
          background: #050505;
          border: 2px solid #222;
          width: 60px;
          height: 30px;
          border-radius: 15px;
          position: relative;
          cursor: pointer;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
        }

        .mechanical-lever {
          width: 24px;
          height: 24px;
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
          width: 60px;
          font-size: 7px;
          color: var(--muted);
          margin-top: 4px;
          padding: 0 4px;
        }

        /* Timer Panel */
        .session-timer-panel {
          margin-top: auto;
          text-align: left;
        }

        .timer-label {
          font-size: 8px;
          color: var(--muted);
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .timer-display {
          display: block;
          text-align: center;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
