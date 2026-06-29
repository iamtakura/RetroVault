import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { gsap } from 'gsap';
import { initSounds, getAudioContext } from '../../lib/sounds';

const keyRows = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M']
];

export default function Typewriter({
  status,
  duration,
  stream,
  onStartRecording,
  onStopRecording,
  isPlayback,
  playbackRecording,
  setIsPlayback,
  onPlaybackEnd,
  transcript,
  onTypingStart,
  onTypingComplete
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [gibberishLines, setGibberishLines] = useState([]);
  const [activeKeys, setActiveKeys] = useState([]);
  const [carriagePosition, setCarriagePosition] = useState(10); // percent
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isTypingRealText, setIsTypingRealText] = useState(false);
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [isTranscribed, setIsTranscribed] = useState(false);

  const paperRef = useRef(null);
  const paperContentRef = useRef(null);
  const carriageRef = useRef(null);
  const typingHeadRef = useRef(null);
  const dictateBtnRef = useRef(null);
  const keyRefs = useRef({});

  // Core visual state refs to prevent stale loops
  const isRecordingRef = useRef(false);
  const activeKeysRef = useRef([]);
  const paperBufferRef = useRef('');
  const linesRef = useRef([]);
  const lastClickTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const isPageTurningRef = useRef(false);

  const audioAnalyserRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const typingAbortControllerRef = useRef(null);
  const durationRef = useRef(0);

  const sounds = initSounds();

  // Keep durationRef in sync
  useEffect(() => {
    durationRef.current = duration;
    if (status === 'recording') {
      setElapsed(duration);
    }
  }, [duration, status]);

  // Sync state with recording status
  useEffect(() => {
    const recording = status === 'recording';
    if (recording !== isRecording) {
      setIsRecording(recording);
      isRecordingRef.current = recording;
      if (recording) {
        if (!animationFrameRef.current) {
          setGibberishLines([]);
          paperBufferRef.current = '';
          linesRef.current = [];
          setCurrentPage(1);
          setTotalPages(1);
          setElapsed(0);
          setCarriagePosition(10);
          setIsTranscribed(false);
          isPageTurningRef.current = false;
          if (paperRef.current) {
            gsap.set(paperRef.current, { y: 0, opacity: 1 });
          }
          if (stream) {
            setupAnalyser(stream);
          }
          runTypingAnimation();
        }
      } else {
        isRecordingRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setActiveKeys([]);
      }
    }
  }, [status, stream]);

  // Handle stream state changes for analyzer
  useEffect(() => {
    if (stream) {
      setupAnalyser(stream);
    } else {
      audioAnalyserRef.current = null;
    }
  }, [stream]);

  // Handle playback toggle changes
  useEffect(() => {
    if (isPlayback && playbackRecording?.audioBlob) {
      const startAutoplay = async () => {
        cleanupPlayback();
        const url = URL.createObjectURL(playbackRecording.audioBlob);
        const audio = new Audio(url);
        audioPlayerRef.current = audio;

        audio.ontimeupdate = () => {
          setElapsed(Math.floor(audio.currentTime));
        };

        audio.onended = () => {
          cleanupPlayback();
          URL.revokeObjectURL(url);
          if (onPlaybackEnd) onPlaybackEnd();
        };

        try {
          const audioCtx = getAudioContext();
          if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          await audio.play();
          setPlaybackState('playing');

          if (playbackRecording.transcript) {
            typeRealText(playbackRecording.transcript);
          }
        } catch (e) {
          setPlaybackState('paused');
        }
      };
      startAutoplay();
    } else {
      cleanupPlayback();
    }
  }, [isPlayback, playbackRecording]);

  // Visual keys pressing loop during playback
  useEffect(() => {
    let interval = null;
    if (isPlayback && playbackState === 'playing') {
      interval = setInterval(() => {
        const numKeys = Math.floor(Math.random() * 3) + 3;
        const allKeys = keyRows.flat();
        const keysToPress = Array.from(
          { length: numKeys },
          () => allKeys[Math.floor(Math.random() * allKeys.length)]
        );
        setActiveKeys(keysToPress);
        setTimeout(() => setActiveKeys([]), 65);
      }, 75);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayback, playbackState]);

  // Clean up typing and animations on unmount
  useEffect(() => {
    return () => {
      if (typingAbortControllerRef.current) {
        typingAbortControllerRef.current.abort = true;
      }
      cancelAnimationFrame(animationFrameRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Watch for Whisper transcription arrival
  useEffect(() => {
    if (status === 'done' && transcript) {
      typeRealText(transcript);
    }
  }, [status, transcript]);

  // ── Audio Amplitude Analyser ──
  const setupAnalyser = (streamObj) => {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    try {
      const source = audioCtx.createMediaStreamSource(streamObj);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
    } catch (e) {
      // Analyser setup failure
    }
  };

  const getAmplitude = () => {
    if (!audioAnalyserRef.current) return 0;
    const data = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
    audioAnalyserRef.current.getByteFrequencyData(data);
    return data.reduce((a, b) => a + b, 0) / data.length;
  };

  // ── Gibberish Generation & Typing animation loop ──
  const GIBBERISH_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,;:\'"!?-()[]{}@#$%^&*+=<>/\\|~`';

  const runTypingAnimation = () => {
    if (!isRecordingRef.current) return;

    // Don't add content while page is turning
    if (isPageTurningRef.current) {
      animationFrameRef.current = requestAnimationFrame(runTypingAnimation);
      return;
    }

    // Only fire animation every other frame
    frameCountRef.current = (frameCountRef.current || 0) + 1;
    if (frameCountRef.current % 2 !== 0) {
      animationFrameRef.current = requestAnimationFrame(runTypingAnimation);
      return;
    }

    const amplitude = getAmplitude();
    const isSpeaking = amplitude > 12;

    if (isSpeaking) {
      const allKeys = [
        'Q','W','E','R','T','Y','U','I','O','P',
        'A','S','D','F','G','H','J','K','L',
        'Z','X','C','V','B','N','M'
      ];
      
      const numKeys = Math.floor(amplitude / 20) + 1;
      const keysToPress = Array.from(
        { length: Math.min(numKeys, 5) },
        () => allKeys[Math.floor(Math.random() * allKeys.length)]
      );

      // Update active keys via ref to avoid stale closure
      activeKeysRef.current = keysToPress;
      setActiveKeys([...keysToPress]);

      // Generate gibberish characters (halved from amplitude / 15)
      const charsToAdd = Math.max(1, Math.floor(amplitude / 30));
      const newChars = Array.from(
        { length: charsToAdd },
        () => GIBBERISH_CHARS[
          Math.floor(Math.random() * GIBBERISH_CHARS.length)
        ]
      ).join('');

      // Update paper content via ref first
      paperBufferRef.current += newChars;

      // Check line length — 36 chars per line
      if (paperBufferRef.current.length >= 36) {
        const overflow = paperBufferRef.current.slice(36);
        const completeLine = paperBufferRef.current.slice(0, 36);
        
        linesRef.current = [...linesRef.current, completeLine];
        paperBufferRef.current = overflow;

        // Trigger carriage return
        triggerCarriageReturn();

        // Check page turn — every 10 lines
        if (linesRef.current.length % 10 === 0) {
          isPageTurningRef.current = true;
          triggerPageTurnAsync().then(() => {
            isPageTurningRef.current = false;
          });
        }

        // Update displayed lines
        setGibberishLines([...linesRef.current, overflow]);
      } else {
        // Update last line in progress
        setGibberishLines([
          ...linesRef.current, 
          paperBufferRef.current
        ]);
      }

      // Move carriage right
      setCarriagePosition(prev => {
        const next = prev + (charsToAdd * 1.6);
        if (next >= 85) {
          return 10;
        }
        return next;
      });

      // Play soft click sound (throttled from 80ms to 160ms)
      const now = Date.now();
      if (now - lastClickTimeRef.current > 160) {
        if (sounds && sounds.typewriterKeyClick) {
          sounds.typewriterKeyClick();
        }
        lastClickTimeRef.current = now;
      }
    } else {
      // Silence — release all keys
      activeKeysRef.current = [];
      setActiveKeys([]);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(runTypingAnimation);
  };

  // ── Animations: Carriage return & Page scroll ──
  const triggerCarriageReturn = () => {
    if (sounds && sounds.typewriterBell) {
      sounds.typewriterBell();
    }
    if (typingHeadRef.current) {
      gsap.to(typingHeadRef.current, {
        left: '10%',
        duration: 0.15,
        ease: 'power3.out',
        onComplete: () => {
          setCarriagePosition(10);
        }
      });
    } else {
      setCarriagePosition(10);
    }
  };

  const triggerPageTurnAsync = () => {
    return new Promise((resolve) => {
      if (!paperRef.current) {
        resolve();
        return;
      }

      // CRITICAL: Kill any existing GSAP tweens on this element first
      gsap.killTweensOf(paperRef.current);

      const wrapper = paperRef.current;

      gsap.timeline({
        onComplete: () => {
          // Clear lines AFTER animation completes
          linesRef.current = [];
          paperBufferRef.current = '';
          
          // Batch state update after animation using flushSync to prevent stale re-renders
          flushSync(() => {
            setGibberishLines([]);
            setCurrentPage(prev => prev + 1);
            setTotalPages(prev => prev + 1);
          });
          resolve();
        }
      })
      // Page rolls UP and out
      .to(wrapper, {
        y: '-105%',
        duration: 0.4,
        ease: 'power2.inOut'
      })
      // Brief pause at top
      .to(wrapper, {
        opacity: 0,
        duration: 0.08
      })
      // Snap to bottom, invisible
      .set(wrapper, { 
        y: '30px', 
        opacity: 0 
      })
      // New page slides UP into view
      .to(wrapper, {
        y: '0px',
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out'
      });

      // Bell rings as page exits
      if (sounds && sounds.typewriterBell) {
        sounds.typewriterBell();
      }
    });
  };

  // ── Typewriter real text typewriter playback ──
  const typeRealText = async (text) => {
    if (typingAbortControllerRef.current) {
      typingAbortControllerRef.current.abort = true;
    }
    const abortToken = { abort: false };
    typingAbortControllerRef.current = abortToken;

    // Clear gibberish first with a page turn animation
    isPageTurningRef.current = true;
    await triggerPageTurnAsync();
    isPageTurningRef.current = false;

    if (onTypingStart) onTypingStart();
    setIsTypingRealText(true);
    setIsTranscribed(true); // switch to dark ink mode
    setGibberishLines([]);
    linesRef.current = [];
    paperBufferRef.current = '';
    setCurrentPage(1);
    setTotalPages(1);
    if (paperRef.current) {
      gsap.set(paperRef.current, { y: 0, opacity: 1 });
    }

    const chars = text.split('');
    let lineBuffer = '';
    let lineCount = 0;

    // Character by character typing loop
    for (let i = 0; i < chars.length; i++) {
      if (abortToken.abort) return;

      // If page is turning, wait for it
      while (isPageTurningRef.current) {
        await new Promise(r => setTimeout(r, 50));
      }

      const char = chars[i];
      lineBuffer += char;

      // Type each character with delay
      await new Promise(r => setTimeout(r, 40));
      if (abortToken.abort) return;

      if (sounds && sounds.typewriterKeyClick) {
        sounds.typewriterKeyClick();
      }

      setGibberishLines([
        ...linesRef.current,
        lineBuffer
      ]);

      // Move carriage right
      setCarriagePosition(prev => {
        const next = prev + 2.5;
        return next >= 85 ? 10 : next;
      });

      // Line wrap at 36 chars
      if (lineBuffer.length >= 36 || char === '\n') {
        linesRef.current = [
          ...linesRef.current,
          lineBuffer
        ];
        lineBuffer = '';
        lineCount++;
        triggerCarriageReturn();
        await new Promise(r => setTimeout(r, 100));
        if (abortToken.abort) return;

        // Page turn every 10 lines
        if (lineCount > 0 && lineCount % 10 === 0) {
          isPageTurningRef.current = true;
          await triggerPageTurnAsync();
          isPageTurningRef.current = false;
          lineCount = 0; // reset line count for new page
        }
      }
    }

    // Push final partial line
    if (lineBuffer.length > 0 && !abortToken.abort) {
      linesRef.current = [...linesRef.current, lineBuffer];
      setGibberishLines([...linesRef.current]);
    }

    setIsTypingRealText(false);
    if (onTypingComplete) onTypingComplete();
  };

  const handleDictateClick = async () => {
    if (isPlayback) {
      if (playbackState === 'playing') {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        setPlaybackState('paused');
        if (typingAbortControllerRef.current) {
          typingAbortControllerRef.current.abort = true;
        }
        setIsTypingRealText(false);
      } else {
        setPlaybackState('playing');
        if (audioPlayerRef.current) {
          const audioCtx = getAudioContext();
          if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          audioPlayerRef.current.play();
        }
        if (playbackRecording?.transcript) {
          typeRealText(playbackRecording.transcript);
        }
      }
      return;
    }

    if (isRecording) {
      // STOP
      isRecordingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setActiveKeys([]);
      setIsRecording(false);
      onStopRecording();
      return;
    }

    // START — order matters critically:
    try {
      // 1. Get mic stream first
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // 2. Set up analyser BEFORE starting animation
      setupAnalyser(micStream);

      // 3. Start MediaRecorder with the same stream
      await onStartRecording(micStream); 

      // 4. Reset paper state
      setGibberishLines([]);
      paperBufferRef.current = '';
      linesRef.current = [];
      setElapsed(0);
      setCurrentPage(1);
      setTotalPages(1);
      setCarriagePosition(10);
      setIsTranscribed(false);
      isPageTurningRef.current = false;
      if (paperRef.current) {
        gsap.set(paperRef.current, { y: 0, opacity: 1 });
      }

      // 5. Set recording state
      setIsRecording(true);
      isRecordingRef.current = true;

      // 6. Start animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(runTypingAnimation);
    } catch (e) {
      // User cancelled mic permission or error
    }
  };

  const cleanupPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlaybackState('idle');
    if (typingAbortControllerRef.current) {
      typingAbortControllerRef.current.abort = true;
    }
    setIsTypingRealText(false);
    setGibberishLines([]);
    setCarriagePosition(10);
    setCurrentPage(1);
    setTotalPages(1);
    setElapsed(0);
    isPageTurningRef.current = false;
    if (paperRef.current) {
      gsap.set(paperRef.current, { y: 0, opacity: 1 });
    }
  };

  const isNearLimit = elapsed >= 540;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="typewriter-screen">
      <div className="typewriter-housing">
        
        {/* Paper roll emerging from top */}
        <div className="typewriter-paper-assembly">
          <div className="paper-roll-holder" />
          <div className="typewriter-paper">
            {isPlayback && playbackRecording && (
              <div className="paper-header font-mono">
                {playbackRecording.title || 'Untitled Recording'}
              </div>
            )}
            {/* GSAP animates this inner wrapper only */}
            <div className="paper-scroll-wrapper" ref={paperRef}>
              <div className="paper-content" ref={paperContentRef} style={{ paddingTop: isPlayback ? '24px' : '8px' }}>
                {gibberishLines.map((line, i) => (
                  <div
                    key={i}
                    className={`paper-line ${isTranscribed ? 'real-ink' : 'gibberish-ink'}`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Platen (the rubber roller) */}
        <div className="typewriter-platen">
          <div className="platen-roller" />
          <div className="platen-knob left" />
          <div className="platen-knob right" />
        </div>

        {/* Carriage with typing head */}
        <div className="typewriter-carriage" ref={carriageRef}>
          <div className="carriage-rail" />
          <div
            className="typing-head"
            ref={typingHeadRef}
            style={{ left: `${carriagePosition}%` }}
          >
            <div className="ink-ribbon" />
          </div>
        </div>

        {/* Key rows */}
        <div className="typewriter-keyboard">
          {keyRows.map((row, rowIndex) => (
            <div key={rowIndex} className="key-row">
              {row.map((key, keyIndex) => (
                <div
                  key={keyIndex}
                  className={`typewriter-key ${activeKeys.includes(key) ? 'pressed' : ''}`}
                  ref={el => keyRefs.current[key] = el}
                >
                  <div className="key-top">
                    <span>{key}</span>
                  </div>
                  <div className="key-stem" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* DICTATE button area */}
        <div className="dictate-btn-area">
          <button
            className={`dictate-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleDictateClick}
            ref={dictateBtnRef}
            disabled={status === 'processing'}
          >
            <span className="dictate-btn-label">
              {isPlayback 
                ? (playbackState === 'playing' ? 'PAUSE' : 'RESUME') 
                : (isRecording ? 'DONE' : 'DICTATE')}
            </span>
          </button>
          
          {/* Timer */}
          {(isRecording || isPlayback || isTypingRealText) && (
            <div className={`typewriter-timer ${isNearLimit ? 'warning' : ''}`}>
              {formatTime(elapsed)}
            </div>
          )}
          
          {/* Page indicator */}
          {totalPages > 1 && (
            <div className="page-indicator font-mono">
              PAGE {currentPage} / {totalPages}
            </div>
          )}

          {/* Limit notice */}
          <div className="recording-limit-notice">
            MAX 10:00 PER RECORDING
          </div>
        </div>

      </div>

      <style>{`
        .typewriter-screen {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          box-sizing: border-box;
        }

        .typewriter-housing {
          width: 100%;
          max-width: min(480px, calc(100vw - 24px));
          background: linear-gradient(
            145deg,
            #2a1f10 0%,
            #1a1208 50%,
            #2a1f10 100%
          );
          border: 3px solid #3a2a14;
          border-radius: 8px;
          padding: 16px 16px 20px;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.9),
            0 2px 4px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          box-sizing: border-box;
        }

        .typewriter-paper-assembly {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 100%;
        }

        .paper-roll-holder {
          width: 80%;
          height: 8px;
          background: linear-gradient(
            to bottom,
            #4a3a28,
            #2a1f10
          );
          border-radius: 4px;
          border: 1px solid #5a4a30;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .typewriter-paper {
          width: 85%;
          min-height: 120px;
          max-height: 160px;
          height: 140px;
          background: #ede0c4;
          border-left: 1px solid #d4c5a8;
          border-right: 1px solid #d4c5a8;
          overflow: hidden;
          position: relative;
          box-shadow:
            0 2px 8px rgba(0,0,0,0.4),
            inset 0 0 20px rgba(0,0,0,0.05);
        }

        .paper-scroll-wrapper {
          width: 100%;
          will-change: transform;
        }

        .paper-header {
          position: absolute;
          top: 4px;
          left: 28px;
          right: 8px;
          font-family: var(--font-mono);
          font-size: 8px;
          color: var(--crimson);
          border-bottom: 1px solid rgba(180,160,130,0.4);
          padding-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.8;
          z-index: 5;
          text-align: left;
        }

        .typewriter-paper::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 19px,
            rgba(180,160,130,0.3) 19px,
            rgba(180,160,130,0.3) 20px
          );
          pointer-events: none;
          z-index: 1;
        }

        .typewriter-paper::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 20px;
          width: 1px;
          background: rgba(200,100,100,0.2);
          z-index: 1;
        }

        .paper-content {
          padding: 8px 12px 8px 28px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: #1a0a02;
          line-height: 20px;
          letter-spacing: 0.06em;
          text-align: left;
          position: relative;
          z-index: 2;
        }

        .paper-line {
          min-height: 20px;
          word-break: break-all;
          white-space: pre-wrap;
          font-family: var(--font-mono);
          text-shadow: 0.3px 0.3px 0 rgba(0,0,0,0.3);
        }

        .paper-line.gibberish-ink {
          color: #3a2510;
          opacity: 0.85;
          font-style: normal;
        }

        .paper-line.real-ink {
          color: #0a0500;
          opacity: 1;
          font-weight: 600;
        }

        .typewriter-platen {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          width: 100%;
          box-sizing: border-box;
        }

        .platen-roller {
          flex: 1;
          height: 16px;
          background: linear-gradient(
            to bottom,
            #3a3a3a,
            #1a1a1a 40%,
            #2a2a2a
          );
          border-radius: 8px;
          border: 1px solid #4a4a4a;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .platen-knob {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 35%,
            #5a5a5a,
            #1a1a1a
          );
          border: 2px solid #3a3a3a;
          box-shadow: 0 2px 4px rgba(0,0,0,0.6);
          flex-shrink: 0;
          margin: 0 4px;
        }

        .typewriter-carriage {
          position: relative;
          height: 20px;
          margin: 0 4px;
          width: calc(100% - 8px);
        }

        .carriage-rail {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 4px;
          transform: translateY(-50%);
          background: linear-gradient(
            to bottom,
            #4a4a4a,
            #2a2a2a
          );
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .typing-head {
          position: absolute;
          top: 50%;
          left: 10%;
          transform: translateY(-50%);
          width: 24px;
          height: 16px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-radius: 2px;
          transition: left 0.1s linear;
        }

        .ink-ribbon {
          position: absolute;
          top: 50%;
          left: 2px;
          right: 2px;
          height: 4px;
          transform: translateY(-50%);
          background: var(--crimson-deep);
          opacity: 0.8;
        }

        .typewriter-keyboard {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }

        .key-row {
          display: flex;
          gap: 3px;
          justify-content: center;
          width: 100%;
        }

        .typewriter-key {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
          transition: transform 0.05s ease;
        }

        .key-top {
          width: clamp(18px, 4.5vw, 26px);
          height: clamp(18px, 4.5vw, 26px);
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 30%,
            #4a4a4a,
            #1a1a1a 70%,
            #0a0a0a
          );
          border: 1px solid #3a3a3a;
          box-shadow:
            0 3px 0 #0a0a0a,
            0 4px 6px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        }

        .key-top span {
          font-family: var(--font-mono);
          font-size: clamp(6px, 1.5vw, 8px);
          color: var(--off-white);
          letter-spacing: 0;
          opacity: 0.8;
        }

        .key-stem {
          width: 4px;
          height: 6px;
          background: #2a2a2a;
          border-left: 1px solid #3a3a3a;
          border-right: 1px solid #3a3a3a;
        }

        .typewriter-key.pressed .key-top {
          transform: translateY(3px);
          box-shadow:
            0 0 0 #0a0a0a,
            0 1px 2px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.05);
          background: radial-gradient(
            circle at 35% 30%,
            #3a3a3a,
            #111 70%
          );
        }

        .dictate-btn-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        .dictate-btn {
          width: 70%;
          max-width: 200px;
          height: 40px;
          background: linear-gradient(
            to bottom,
            #3a3a3a,
            #1a1a1a 40%,
            #0a0a0a
          );
          border: 2px solid #4a4a4a;
          border-radius: 4px;
          color: var(--off-white);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.2em;
          cursor: pointer;
          box-shadow:
            0 4px 0 #050505,
            0 6px 8px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: transform 0.05s ease, box-shadow 0.05s ease;
          position: relative;
          outline: none;
        }

        .dictate-btn:active,
        .dictate-btn.recording {
          transform: translateY(3px);
          box-shadow:
            0 1px 0 #050505,
            0 2px 4px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .dictate-btn.recording {
          border-color: var(--crimson);
          box-shadow:
            0 1px 0 #050505,
            0 0 12px var(--crimson-glow),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .dictate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: 0 4px 0 #050505 !important;
        }

        .typewriter-timer {
          font-family: var(--font-mono);
          font-size: 14px;
          color: var(--crimson-bright);
          letter-spacing: 0.2em;
          text-shadow: 0 0 8px var(--crimson-glow);
        }

        .typewriter-timer.warning {
          color: #c4820a;
          text-shadow: 0 0 8px rgba(196,130,10,0.4);
          animation: pulse-warn 1s ease-in-out infinite;
        }

        .page-indicator {
          font-size: 8px;
          color: var(--muted);
          letter-spacing: 0.1em;
          opacity: 0.7;
          margin-top: 2px;
        }

        @keyframes pulse-warn {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
