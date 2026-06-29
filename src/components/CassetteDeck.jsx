import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { initSounds, getAudioContext } from '../lib/sounds';

let sounds = null;

export default function CassetteDeck({
  status, // 'idle' | 'recording' | 'processing' | 'done' | 'error'
  duration, // seconds
  onStartRecording,
  onStopRecording,
  savedRecording, // last saved recording metadata to display on label
  playClick,
  isPlayback,
  playbackRecording,
  setIsPlayback,
}) {
  const cassetteRef = useRef(null);
  const leftSpoolRef = useRef(null);
  const rightSpoolRef = useRef(null);
  const recButtonRef = useRef(null);
  const leftReelSpoolRef = useRef(null);
  const rightReelSpoolRef = useRef(null);
  const reelPanelRef = useRef(null);
  const tapeStrandRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [tapeCounter, setTapeCounter] = useState(0);
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [rewinding, setRewinding] = useState(false); // UI state for REW active indicator

  const reversePlayerRef = useRef(null); // Web Audio BufferSourceNode for backwards playback
  const isRewinding = useRef(false);     // mutable flag (avoids stale closure in async callbacks)
  const decodedBufferRef = useRef(null);
  const rewindCounterRef = useRef(null); // Interval reference for ticking counter backwards


  // Rotation animation variables for GSAP ticker
  const spoolAnimRef = useRef({
    angle: 0,
    speed: 0,
    active: false,
  });

  const safeAnimate = (ref, props) => {
    if (ref?.current) {
      return gsap.to(ref.current, props);
    }
  };

  const safeSet = (ref, props) => {
    if (ref?.current) {
      return gsap.set(ref.current, props);
    }
  };

  // Start reel spinning at playback speed
  const startReelAnimation = () => {
    spoolAnimRef.current.active = true;
    spoolAnimRef.current.speed = 3;
    if (tapeStrandRef.current) {
      gsap.killTweensOf(tapeStrandRef.current);
      gsap.fromTo(tapeStrandRef.current,
        { attr: { d: 'M 30 20 Q 100 32 170 20' } },
        { attr: { d: 'M 30 20 Q 100 40 170 20' }, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' }
      );
    }
  };

  // Stop reel spinning smoothly
  const stopReelAnimation = () => {
    spoolAnimRef.current.active = false;
    gsap.to(spoolAnimRef.current, { speed: 0, duration: 1.8, ease: 'power2.out' });
    if (tapeStrandRef.current) {
      gsap.killTweensOf(tapeStrandRef.current);
      gsap.to(tapeStrandRef.current, { attr: { d: 'M 30 20 Q 100 35 170 20' }, duration: 0.8, ease: 'power2.out' });
    }
  };

  // GSAP Ticker listener for spinning spools
  useEffect(() => {
    if (!leftSpoolRef.current || !rightSpoolRef.current) return;
    const anim = spoolAnimRef.current;

    const onTick = () => {
      if (!anim.active && anim.speed <= 0) return;

      // Update angle
      anim.angle += anim.speed;

      // Apply rotation to SVG spools with 50% transformOrigin to prevent orbit displacement
      if (leftSpoolRef.current) {
        safeSet(leftSpoolRef, { rotation: anim.angle, transformOrigin: '50% 50%' });
      }
      if (rightSpoolRef.current) {
        safeSet(rightSpoolRef, { rotation: anim.angle, transformOrigin: '50% 50%' });
      }
      if (leftReelSpoolRef.current) {
        safeSet(leftReelSpoolRef, { rotation: anim.angle, transformOrigin: '50% 50%' });
      }
      if (rightReelSpoolRef.current) {
        safeSet(rightReelSpoolRef, { rotation: anim.angle * 0.5, transformOrigin: '50% 50%' });
      }

      // If recording, speed slowly increases
      if (status === 'recording') {
        anim.speed = Math.min(anim.speed + 0.015, 6); // Max speed limit
      }
    };

    gsap.ticker.add(onTick);

    return () => {
      gsap.ticker.remove(onTick);
    };
  }, [status]);

  // Handle status transitions and trigger GSAP animations
  useEffect(() => {
    if (!cassetteRef.current || !recButtonRef.current || !reelPanelRef.current) return;
    const anim = spoolAnimRef.current;

    if (status === 'recording') {
      anim.active = true;
      anim.speed = 1.5; // Initial spin speed

      // Cassette insertion "click" animation
      safeAnimate(cassetteRef, {
        y: 8,
        z: -10,
        rotationX: -4,
        duration: 0.25,
        ease: 'back.out(2)',
      });

      // Pulse the REC button glow
      safeAnimate(recButtonRef, {
        boxShadow: '0 0 20px #ff0000, inset 0 2px 4px rgba(255,255,255,0.4)',
        borderColor: '#ff3333',
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });

      // Expand the Reel-to-Reel panel
      safeAnimate(reelPanelRef, {
        height: 112,
        opacity: 1,
        marginTop: 16,
        marginBottom: 16,
        duration: 0.4,
        ease: 'power2.out',
      });

      // Animate tape strand sag during recording
      if (tapeStrandRef.current) {
        gsap.killTweensOf(tapeStrandRef.current);
        gsap.fromTo(tapeStrandRef.current,
          { attr: { d: "M 30 20 Q 100 32 170 20" } },
          {
            attr: { d: "M 30 20 Q 100 40 170 20" },
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }
        );
      }
    } else if (status === 'processing' || status === 'done' || status === 'idle' || status === 'error') {
      if (anim.active) {
        anim.active = false;
        // Decelerate spinning reels
        gsap.to(anim, {
          speed: 0,
          duration: 1.8,
          ease: 'power2.out',
        });
      }

      // Stop the REC button glow animation
      if (recButtonRef.current) {
        gsap.killTweensOf(recButtonRef.current);
        gsap.set(recButtonRef.current, { clearProps: 'boxShadow,borderColor' });
      }

      // Reset tape strand sag
      if (tapeStrandRef.current) {
        gsap.killTweensOf(tapeStrandRef.current);
        gsap.to(tapeStrandRef.current, {
          attr: { d: "M 30 20 Q 100 35 170 20" },
          duration: 0.8,
          ease: 'power2.out',
        });
      }

      // If transition to idle (e.g. Saved / Discarded / Reset)
      if (status === 'idle') {
        const tl = gsap.timeline();
        
        // Collapse the Reel-to-Reel panel alongside cassette eject
        if (reelPanelRef.current) {
          tl.to(reelPanelRef.current, {
            height: 0,
            opacity: 0,
            marginTop: 0,
            marginBottom: 0,
            duration: 0.4,
            ease: 'power2.inOut',
          }, 0);
        }

        // Cassette physically ejects upward out of the slot (GSAP, y: -80px, opacity: 0, duration: 0.5s, ease: power2.in)
        if (cassetteRef.current) {
          tl.to(cassetteRef.current, {
            y: -80,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          }, 0);

          // New blank cassette slides in from bottom (y: 40px -> 0, duration: 0.4s)
          tl.fromTo(cassetteRef.current,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
            "+=0.15"
          );
        }
      }
    }
  }, [status]);

  // Handle panel expansion and spool whirs specifically during active playback
  useEffect(() => {
    if (isPlayback) {
      safeAnimate(reelPanelRef, {
        height: 112,
        opacity: 1,
        marginTop: 16,
        marginBottom: 16,
        duration: 0.4,
        ease: 'power2.out',
      });
    } else if (status === 'idle') {
      safeAnimate(reelPanelRef, {
        height: 0,
        opacity: 0,
        marginTop: 0,
        marginBottom: 0,
        duration: 0.4,
        ease: 'power2.inOut',
      });
    }
  }, [isPlayback, status]);

  // Format timer duration to "000" LED structure
  const formatCounter = (sec) => {
    return String(sec).padStart(3, '0');
  };

  const handleStopClick = () => {
    if (!sounds) sounds = initSounds();

    // Stop any active rewind first
    if (isRewinding.current) stopRewind();
    if (rewindCounterRef.current) {
      clearInterval(rewindCounterRef.current);
      rewindCounterRef.current = null;
    }

    if (isPlayback && audioPlayerRef.current) {
      if (sounds) {
        sounds.buttonClick();
        sounds.reelStop();
      }
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      decodedBufferRef.current = null; // clear cache
      setPlaybackState('idle');
      stopReelAnimation();
      setIsPlayback(false);
      return;
    }

    if (status === 'recording') {
      if (sounds) {
        sounds.buttonClick();
        sounds.reelStop();
        sounds.cassetteEject();
      }
      onStopRecording();
      // GSAP eject animation
      if (cassetteRef.current) {
        gsap.to(cassetteRef.current, {
          y: -80,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.in',
          onComplete: () => {
            // Reset cassette position for next recording
            setTimeout(() => {
              if (cassetteRef.current) {
                gsap.fromTo(cassetteRef.current,
                  { y: 40, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.4 }
                );
              }
            }, 50);
          }
        });
      }
    }
  };

  const handleRecClick = () => {
    if (!sounds) sounds = initSounds();
    if (status === 'recording') {
      handleStopClick();
    } else if (status === 'idle') {
      if (sounds) {
        sounds.buttonClick();
        sounds.cassetteInsert();
        sounds.reelStart();
      }
      onStartRecording();
    }
  };

  const handlePlayToggle = async () => {
    if (!sounds) sounds = initSounds();

    // Stop any active rewind before toggling play
    if (isRewinding.current) stopRewind();

    if (sounds) sounds.buttonClick();

    if (playbackState === 'idle' && isPlayback) {
      // ── START: create audio and begin playback ──
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (sounds) sounds.reelStart();

      // Pre-decode and cache immediately
      if (!decodedBufferRef.current && playbackRecording?.audioBlob) {
        const arrayBuffer = await playbackRecording.audioBlob.arrayBuffer();
        const audioCtx = getAudioContext();
        decodedBufferRef.current = await audioCtx.decodeAudioData(arrayBuffer);
      }

      const url = URL.createObjectURL(playbackRecording.audioBlob);
      const audio = new Audio(url);
      audioPlayerRef.current = audio;

      startReelAnimation();

      audio.ontimeupdate = () => {
        setTapeCounter(Math.floor(audio.currentTime));
      };

      audio.play();
      setPlaybackState('playing');

      audio.onended = () => {
        stopReelAnimation();
        if (sounds) sounds.reelStop();
        setPlaybackState('idle');
        decodedBufferRef.current = null; // clear cache on end
        URL.revokeObjectURL(url);
        setIsPlayback(false);
        audioPlayerRef.current = null;
      };
      return;
    }

    if (playbackState === 'playing') {
      // ── PAUSE ──
      audioPlayerRef.current?.pause();
      setPlaybackState('paused');
      stopReelAnimation();
      if (sounds) sounds.reelStop();
      return;
    }

    if (playbackState === 'paused') {
      // ── RESUME ──
      audioPlayerRef.current?.play();
      setPlaybackState('playing');
      startReelAnimation();
      if (sounds) sounds.reelStart();
      return;
    }
  };

  // ── STOP REWIND helper ──────────────────────────────────────────────────
  const stopRewind = () => {
    // Snapshot timing metadata before nulling .current
    const startCtxTime = reversePlayerRef._startCtxTime;
    const startPosition = reversePlayerRef._startPosition;

    if (reversePlayerRef.current) {
      try { reversePlayerRef.current.stop(); } catch (e) {}
      reversePlayerRef.current = null;
    }

    const audioCtx = getAudioContext();
    const elapsed = audioCtx.currentTime - (startCtxTime || audioCtx.currentTime);
    const rewoundSeconds = elapsed * 2.0;
    const newPosition = Math.max(0, (startPosition || 0) - rewoundSeconds);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newPosition;
    }

    isRewinding.current = false;
    setRewinding(false);
    setTapeCounter(Math.floor(newPosition));

    if (rewindCounterRef.current) {
      clearInterval(rewindCounterRef.current);
      rewindCounterRef.current = null;
    }

    // Kill backwards spin
    gsap.killTweensOf([leftReelSpoolRef.current, rightReelSpoolRef.current]);
  };

  // ── REWIND handler ──────────────────────────────────────────────────────
  const handleRewClick = async () => {
    if (!sounds) sounds = initSounds();

    // Toggle: press again stops rewind
    if (isRewinding.current) {
      stopRewind();
      return;
    }

    // Only rewind if playback is active and cached buffer exists
    if (!isPlayback || !decodedBufferRef.current) return;

    // Pause the forward player instantly — no gap
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setPlaybackState('paused');
    stopReelAnimation();

    const audioCtx = getAudioContext();
    const audioBuffer = decodedBufferRef.current;

    // Reverse the cached buffer
    const reversed = audioCtx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const original = audioBuffer.getChannelData(ch);
      const rev = reversed.getChannelData(ch);
      for (let i = 0; i < original.length; i++) {
        rev[i] = original[original.length - 1 - i];
      }
    }

    // Start offset: where we are from the END of the track
    const currentTime = audioPlayerRef.current?.currentTime || 0;
    const startOffset = Math.max(0, audioBuffer.duration - currentTime);

    // Create buffer source at 2x speed
    const reverseSource = audioCtx.createBufferSource();
    reverseSource.buffer = reversed;
    reverseSource.playbackRate.value = 2.0;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.85;
    reverseSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Store timing metadata on the ref object so stopRewind can read it
    reversePlayerRef._startCtxTime = audioCtx.currentTime;
    reversePlayerRef._startPosition = currentTime;

    reverseSource.start(0, startOffset);
    reversePlayerRef.current = reverseSource;
    isRewinding.current = true;
    setRewinding(true);

    // Clear any existing counter interval and start ticking counter backwards at 2x speed
    if (rewindCounterRef.current) {
      clearInterval(rewindCounterRef.current);
    }
    rewindCounterRef.current = setInterval(() => {
      setTapeCounter(prev => {
        return Math.max(0, prev - 2);
      });
    }, 1000);

    // Backwards reel spin animation immediately
    if (leftReelSpoolRef.current && rightReelSpoolRef.current) {
      gsap.killTweensOf([leftReelSpoolRef.current, rightReelSpoolRef.current]);
      gsap.to([leftReelSpoolRef.current, rightReelSpoolRef.current], {
        rotation: '-=360',
        duration: 1.0,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      });
    }

    // Auto-stop when reversed buffer reaches beginning of track
    reverseSource.onended = () => {
      if (isRewinding.current) {
        stopRewind();
        if (audioPlayerRef.current) {
          audioPlayerRef.current.currentTime = 0;
        }
        setTapeCounter(0);
      }
    };
  };

  // Calculate dynamic tape radii for reel-to-reel
  const r2rLeftTapeRadius = Math.max(42 - duration * 0.05, 26);
  const r2rRightTapeRadius = Math.min(26 + duration * 0.05, 42);

  return (
    <div className="cassette-deck brushed-metal">
      {/* Top Deck Trim & Logotype */}
      <div className="deck-header">
        <div className="brand-plate">RETROVAULT MODEL 1965</div>
        <div className="mechanical-meter">
          <div className="meter-label">TAPE COUNTER</div>
          <div className={`led-counter ${(!isPlayback && duration >= 540) ? 'near-limit' : ''}`}>
            <span className="counter-display">
              {String(isPlayback ? tapeCounter : duration).padStart(3, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Cassette Slot / Pocket */}
      <div className="cassette-pocket">
        <div className="cassette-pocket-shadow" />
        
        {/* Cassette Tape Entity */}
        <div ref={cassetteRef} className="cassette-tape">
          <div className="cassette-shell">
            {/* Cassette Label area */}
            <div className="cassette-sticker">
              <div className="sticker-header">
                <span className="side-indicator">A</span>
                <span className="brand-logo">RetroVault</span>
              </div>
              <div className="sticker-title-line">
                {isPlayback ? (
                  <span className="saved-title-text typewriter-label">{playbackRecording?.title}</span>
                ) : status === 'recording' ? (
                  <span className="recording-title-text pulse-text">RECORDING IN PROGRESS...</span>
                ) : savedRecording ? (
                  <span className="saved-title-text typewriter-label">{savedRecording.title}</span>
                ) : (
                  <span className="placeholder-title-text">INSERT TAPE / PRESS REC</span>
                )}
              </div>
              <div className="sticker-footer">
                <span>LN - LOW NOISE</span>
                <span>60 MIN</span>
              </div>
            </div>

            {/* Reels / Spools Center Window */}
            <div className="cassette-window">
              <div className="reel-bay left-bay">
                {/* Spinning Spool SVG */}
                <svg ref={leftSpoolRef} className="spool-svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="#111" stroke="#333" strokeWidth="2" />
                  <circle cx="50" cy="50" r="20" fill="#222" />
                  {/* Spool Teeth */}
                  {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <rect
                      key={deg}
                      x="47"
                      y="15"
                      width="6"
                      height="12"
                      fill="#e4d2b8"
                      transform={`rotate(${deg} 50 50)`}
                    />
                  ))}
                  {/* Tape wrap visual size (shrinks or grows) */}
                  <circle cx="50" cy="50" r={25 + Math.min(duration * 0.05, 10)} fill="rgba(68, 51, 34, 0.7)" />
                </svg>
              </div>

              <div className="reel-bay right-bay">
                <svg ref={rightSpoolRef} className="spool-svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="#111" stroke="#333" strokeWidth="2" />
                  <circle cx="50" cy="50" r="20" fill="#222" />
                  {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <rect
                      key={deg}
                      x="47"
                      y="15"
                      width="6"
                      height="12"
                      fill="#e4d2b8"
                      transform={`rotate(${deg} 50 50)`}
                    />
                  ))}
                  <circle cx="50" cy="50" r={35 - Math.min(duration * 0.05, 10)} fill="rgba(68, 51, 34, 0.7)" />
                </svg>
              </div>
            </div>

            {/* Trapezoidal tape guide details */}
            <div className="cassette-bottom-guide" />
          </div>
        </div>
      </div>

      {/* Reel-to-Reel Display Panel */}
      <div ref={reelPanelRef} className="reel-to-reel-panel reel-panel" data-visible={isPlayback || status === 'recording' ? 'true' : 'false'}>
        <div className="r2r-housing">
          <div className="r2r-well">
            {/* Left Reel */}
            <svg className="r2r-spool-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="#181818" stroke="#2c2c2c" strokeWidth="2.5" />
              {/* Tape Pack */}
              <circle cx="50" cy="50" r={r2rLeftTapeRadius} fill="#504238" opacity="0.85" />
              {/* Concentric lines */}
              <circle cx="50" cy="50" r={Math.max(r2rLeftTapeRadius - 4, 26)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <circle cx="50" cy="50" r={Math.max(r2rLeftTapeRadius - 8, 26)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <circle cx="50" cy="50" r={Math.max(r2rLeftTapeRadius - 12, 26)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              
              {/* Spokes */}
              <g ref={leftReelSpoolRef} style={{ transformOrigin: '50px 50px' }}>
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <line
                    key={deg}
                    x1="50"
                    y1="12"
                    x2="50"
                    y2="42"
                    stroke="#444"
                    strokeWidth="3.5"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
                <circle cx="50" cy="50" r="14" fill="#151515" stroke="#333" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="4.5" fill="#080808" />
                <circle cx="50" cy="50" r="3" fill="var(--crimson-bright)" />
              </g>
            </svg>
          </div>

          <svg className="tape-strand" viewBox="0 0 200 40">
            <path
              ref={tapeStrandRef}
              d="M 30 20 Q 100 35 170 20"
              stroke="#5a3a1a"
              strokeWidth="2.5"
              fill="none"
              opacity="0.9"
            />
          </svg>

          <div className="r2r-well">
            {/* Right Reel */}
            <svg className="r2r-spool-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="#181818" stroke="#2c2c2c" strokeWidth="2.5" />
              {/* Tape Pack */}
              <circle cx="50" cy="50" r={r2rRightTapeRadius} fill="#504238" opacity="0.85" />
              {/* Concentric lines */}
              <circle cx="50" cy="50" r={Math.min(r2rRightTapeRadius - 4, 42)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <circle cx="50" cy="50" r={Math.min(r2rRightTapeRadius - 8, 42)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              <circle cx="50" cy="50" r={Math.min(r2rRightTapeRadius - 12, 42)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              
              {/* Spokes */}
              <g ref={rightReelSpoolRef} style={{ transformOrigin: '50px 50px' }}>
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <line
                    key={deg}
                    x1="50"
                    y1="12"
                    x2="50"
                    y2="42"
                    stroke="#444"
                    strokeWidth="3.5"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
                <circle cx="50" cy="50" r="14" fill="#151515" stroke="#333" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="4.5" fill="#080808" />
                <circle cx="50" cy="50" r="3" fill="var(--crimson-bright)" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Buttons Panel */}
      <div className="deck-buttons-panel deck-buttons">
        <button
          ref={recButtonRef}
          type="button"
          className={`deck-btn btn-rec ${status === 'recording' ? 'pressed' : ''}`}
          disabled={isPlayback || (status !== 'idle' && status !== 'recording')}
          onClick={handleRecClick}
          style={{ opacity: isPlayback ? 0.3 : 1 }}
        >
          <span className="btn-icon-red">●</span>
          <span className="btn-label">REC</span>
        </button>

        <button
          type="button"
          className={`deck-btn btn-play ${
            !isPlayback && playbackState === 'idle' ? 'dimmed' : ''
          } ${
            playbackState === 'playing' ? 'active' : ''
          }`}
          disabled={!isPlayback && playbackState === 'idle'}
          onClick={handlePlayToggle}
          style={isPlayback ? { color: 'var(--gold-warm)', borderColor: '#554422' } : {}}
        >
          <span className="btn-icon" style={isPlayback ? { color: 'var(--gold-warm)' } : {}}>
            {playbackState === 'playing' ? '⏸' : '▶'}
          </span>
          <span className="btn-label">
            {playbackState === 'playing' ? 'PAUSE' : playbackState === 'paused' ? 'RESUME' : 'PLAY'}
          </span>
        </button>

        <button
          type="button"
          className={`deck-btn btn-stop ${status === 'recording' || isPlayback ? '' : 'disabled'}`}
          disabled={status !== 'recording' && !isPlayback}
          onClick={handleStopClick}
        >
          <span className="btn-icon">■</span>
          <span className="btn-label">STOP</span>
        </button>

        <button
          type="button"
          className={`deck-btn btn-rew ${rewinding ? 'active-rew' : ''}`}
          disabled={!isPlayback}
          onClick={handleRewClick}
          style={rewinding ? { borderColor: 'var(--crimson-bright)', color: 'var(--crimson-bright)' } : {}}
        >
          <span className="btn-icon" style={rewinding ? { color: 'var(--crimson-bright)' } : {}}>◀◀</span>
          <span className="btn-label">{rewinding ? 'STOP REW' : 'REW'}</span>
        </button>
      </div>

      <div className="recording-limit-notice">
        MAX 10:00 PER RECORDING
      </div>

      <style>{`
        .cassette-deck {
          border: 12px solid #222;
          border-radius: 8px;
          padding: 24px;
          width: 480px;
          max-width: 90%;
          margin: 0 auto;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Reel-to-Reel Panel */
        .reel-to-reel-panel {
          height: 0px;
          opacity: 0;
          overflow: hidden;
          background: #020202;
          border: 2px solid #1c1c1c;
          border-radius: 6px;
          box-shadow: inset 0 8px 16px rgba(0,0,0,0.9);
          position: relative;
        }

        .tape-strand {
          position: absolute;
          width: 140px;
          height: 30px;
          top: 35px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
          pointer-events: none;
        }

        .r2r-housing {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 24px;
          box-sizing: border-box;
        }

        .r2r-well {
          width: 82px;
          height: 82px;
          background: #080808;
          border-radius: 50%;
          border: 2px solid #222;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
        }

        .r2r-spool-svg {
          width: 100%;
          height: 100%;
        }

        .deck-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #2c251e;
          padding-bottom: 12px;
        }

        .brand-plate {
          font-family: var(--font-display);
          color: var(--muted);
          font-size: 14px;
          letter-spacing: 1px;
        }

        .mechanical-meter {
          text-align: right;
        }

        .meter-label {
          font-size: 8px;
          color: var(--muted);
          margin-bottom: 4px;
          letter-spacing: 1px;
        }

        /* Cassette Pocket Styling */
        .cassette-pocket {
          position: relative;
          background: #020202;
          border: 4px solid #1c1c1c;
          height: 220px;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 28px;
          box-shadow: inset 0 10px 20px rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cassette-pocket-shadow {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.9) 100%);
          pointer-events: none;
          z-index: 10;
        }

        /* Cassette Entity Styling */
        .cassette-tape {
          width: 360px;
          height: 180px;
          background: #111111;
          border-radius: 8px;
          border: 2px solid #222;
          box-shadow: 0 4px 10px rgba(0,0,0,0.9);
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transform-style: preserve-3d;
        }

        .cassette-shell {
          width: 100%;
          height: 100%;
          border: 2px dashed #1a1a1a;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          background: linear-gradient(135deg, #151515 0%, #1e1e1e 100%);
        }

        /* Cassette sticker */
        .cassette-sticker {
          width: 90%;
          height: 70px;
          background: #e4d2b8;
          border-radius: 4px;
          padding: 4px 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #2b231d;
          box-shadow: 1px 1px 3px rgba(0,0,0,0.4);
          position: relative;
        }

        .sticker-header {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-display);
          font-size: 10px;
          font-weight: bold;
          border-bottom: 1px solid rgba(0,0,0,0.2);
          padding-bottom: 2px;
        }

        .side-indicator {
          font-size: 14px;
        }

        .brand-logo {
          font-size: 11px;
          letter-spacing: 0.5px;
        }

        .sticker-title-line {
          font-family: var(--font-mono);
          font-size: 11px;
          text-align: center;
          font-weight: bold;
          color: #1a1a1a;
          padding: 4px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pulse-text {
          color: var(--crimson);
          animation: pulse-text-anim 1s infinite alternate;
        }

        @keyframes pulse-text-anim {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }

        .typewriter-label {
          font-family: var(--font-mono);
          letter-spacing: -0.5px;
        }

        .sticker-footer {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          font-weight: bold;
          opacity: 0.7;
        }

        /* Center window and spools */
        .cassette-window {
          width: 55%;
          height: 48px;
          background: rgba(0, 0, 0, 0.85);
          border: 2px solid #282828;
          border-radius: 4px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.9);
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 12px;
          overflow: hidden;
          position: relative;
        }

        .reel-bay {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spool-svg {
          width: 100%;
          height: 100%;
        }

        .cassette-bottom-guide {
          position: absolute;
          bottom: 2px;
          width: 120px;
          height: 10px;
          background: #0f0f0f;
          clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);
          border-top: 1px solid #222;
        }

        /* Mechanical Buttons Panel */
        .deck-buttons-panel {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .deck-btn {
          background: linear-gradient(to bottom, #444 0%, #222 100%);
          border: 1px solid #111;
          border-radius: 4px;
          box-shadow: 
            0 4px 6px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.05);
          color: var(--off-white);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 6px;
          font-family: var(--font-mono);
          font-weight: bold;
          transition: all 0.1s ease-in-out;
          user-select: none;
        }

        .deck-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .deck-btn:active:not(:disabled), .deck-btn.pressed {
          transform: translateY(4px);
          box-shadow: 
            0 1px 2px rgba(0,0,0,0.8),
            inset 0 2px 5px rgba(0,0,0,0.6);
          background: linear-gradient(to bottom, #222 0%, #111 100%);
        }

        .deck-btn:disabled, .deck-btn.disabled {
          opacity: 0.3;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .btn-icon {
          font-size: 16px;
          margin-bottom: 4px;
          color: var(--gold-warm);
        }

        .btn-icon-red {
          font-size: 16px;
          margin-bottom: 4px;
          color: var(--crimson-bright);
        }

        .btn-label {
          font-size: 9px;
          letter-spacing: 0.5px;
        }

        .btn-rec.pressed {
          border-color: var(--crimson-bright);
        }

        .btn-play.dimmed {
          opacity: 0.3;
          cursor: not-allowed;
          pointer-events: none;
        }

        .btn-play.active .btn-icon {
          color: var(--gold-warm);
        }
      `}</style>
    </div>
  );
}
