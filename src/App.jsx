import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import AgingOverlay from './components/AgingOverlay';
import ModeToggle from './components/ModeToggle';
import CassetteDeck from './components/CassetteDeck';
import Turntable from './components/Turntable';
import TranscriptCard from './components/TranscriptCard';
import VaultScreen from './components/Vault/VaultScreen';
import InstallBanner from './components/InstallBanner';
import OfflineIndicator from './components/OfflineIndicator';
import { useAudioFeedback } from './hooks/useAudioFeedback';
import { useRecorder } from './hooks/useRecorder';
import { usePWAInstall } from './hooks/usePWAInstall';
import { generateTags } from './lib/tagging';
import { getRecordings } from './lib/db';
import { initSounds } from './lib/sounds';
import './App.css';

export default function App() {
  const [mode, setMode] = useState('tape'); // 'tape' | 'session'
  const [view, setView] = useState('recorder'); // 'recorder' | 'vault'
  const [isVaultMounted, setIsVaultMounted] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [playbackRecording, setPlaybackRecording] = useState(null);
  const [isPlayback, setIsPlayback] = useState(false);

  const recorderViewRef = useRef(null);
  const vaultViewRef = useRef(null);

  // Initialize Web Audio feedback
  const { playClick, startHiss, stopHiss } = useAudioFeedback();

  // Initialize recording state machine
  const {
    status,
    duration,
    transcriptRef,
    error,
    pendingRecording,
    startRecording,
    stopRecording,
    saveCurrentRecording,
    discardCurrentRecording,
    resetRecorder,
  } = useRecorder({
    playClick,
    startHiss,
    stopHiss,
    mode,
  });

  // Initialize PWA Install prompt hook
  const { isInstallable, installApp, dismissPrompt } = usePWAInstall();

  // Global Web Audio Context Unlock
  useEffect(() => {
    const unlock = () => {
      initSounds();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Load last saved note metadata to display on tape label
  const loadLastSaved = async () => {
    try {
      const list = await getRecordings();
      if (list && list.length > 0) {
        setLastSaved(list[0]);
      }
    } catch (err) {
      console.error('Failed to load last saved recording:', err);
    }
  };

  useEffect(() => {
    loadLastSaved();
  }, []);

  // Micro-interaction: Auto-switch view to Turntable if recording duration exceeds 5 mins (300s)
  useEffect(() => {
    if (status === 'recording' && duration >= 300 && mode === 'tape') {
      setMode('session');
    }
  }, [duration, status, mode]);

  // Handle Save with Auto-Tagging via Groq
  const handleSave = async (titleOverride) => {
    try {
      // Generate tags via Groq LLM (falls back to ["untagged"] if unconfigured)
      const tags = await generateTags(transcriptRef.current);
      const saved = await saveCurrentRecording(titleOverride, tags);
      if (saved) {
        setLastSaved(saved);
      }
    } catch (err) {
      console.error('Save failed, saving with fallback tags:', err);
      const saved = await saveCurrentRecording(titleOverride, ['untagged']);
      if (saved) {
        setLastSaved(saved);
      }
    }
  };

  const handleDiscard = () => {
    discardCurrentRecording();
  };

  const setCurrentView = (targetView) => {
    transitionTo(targetView);
  };

  const handlePlayback = (recording) => {
    setPlaybackRecording(recording);
    setMode(recording.type === 'session' ? 'session' : 'tape');
    setIsPlayback(true);
    setCurrentView('recorder');
  };

  // GSAP View transitions: Mechanical slide from right (no fade)
  const transitionTo = (targetView) => {
    if (playClick) playClick();
    if (targetView === 'vault') {
      setIsVaultMounted(true);
      setView('vault');
      gsap.timeline()
        .to(recorderViewRef.current, { x: '-100vw', duration: 0.5, ease: 'power2.inOut' })
        .to(vaultViewRef.current, { x: '0', duration: 0.5, ease: 'power2.inOut' }, 0);
    } else {
      gsap.timeline({
        onComplete: () => {
          setIsVaultMounted(false);
          setView('recorder');
        }
      })
        .to(recorderViewRef.current, { x: '0', duration: 0.5, ease: 'power2.inOut' })
        .to(vaultViewRef.current, { x: '100vw', duration: 0.5, ease: 'power2.inOut' }, 0);
    }
  };

  return (
    <>
      {/* Global Retro Aging Overlay */}
      <AgingOverlay />

      <div className="app-wrapper">
        {/* Top Header Logotype */}
        <header className="app-header">
          <div className="header-top-row">
            <div className="header-left">
              <h1 className="logo-text header-title font-display">
                RETROVAULT
                <span className={`recording-dot ${status === 'recording' ? 'active' : status === 'processing' ? 'processing' : 'idle'}`}>●</span>
              </h1>
            </div>

            {/* Archive / Vault badge toggle */}
            <button
              type="button"
              className={`worn-metal-badge btn-vault-toggle vault-btn font-mono ${view === 'vault' ? 'active' : ''}`}
              onClick={() => transitionTo(view === 'recorder' ? 'vault' : 'recorder')}
              disabled={status === 'recording' || status === 'processing'}
              title="Open Vault Archives"
            >
              <span className="vault-badge-icon">🗄</span> VAULT
            </button>
          </div>
          <div className="header-subtitle font-mono">MAGNETIC DICTATION SYSTEM</div>
        </header>

        {/* Sliding Stage Area */}
        <main className="app-main">
          <div className="views-slider-container">
            {/* Recorder View (Left Slide) */}
            <div ref={recorderViewRef} className="view-slide recorder-slide">
              <div className="main-content recorder-screen">
              {error ? (
                /* Worn Mechanical Error Plate */
                <div className="error-plate">
                  <div className="error-header font-display">SYSTEM ERROR</div>
                  <div className="error-body font-mono">{error}</div>
                  <button
                    type="button"
                    className="error-btn"
                    onClick={resetRecorder}
                  >
                    RESET SYSTEM
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode Toggle Switch (disabled during active recording) */}
                  <ModeToggle
                    activeMode={mode}
                    onModeChange={setMode}
                    playClick={playClick}
                    disabled={status === 'recording' || status === 'processing' || status === 'done'}
                  />

                  {/* Device Stage */}
                  <div className="device-stage">
                    {mode === 'tape' ? (
                      <CassetteDeck
                        status={status}
                        duration={duration}
                        onStartRecording={startRecording}
                        onStopRecording={stopRecording}
                        savedRecording={lastSaved}
                        playClick={playClick}
                        isPlayback={isPlayback}
                        playbackRecording={playbackRecording}
                        setIsPlayback={setIsPlayback}
                        onPlaybackEnd={() => {
                          setIsPlayback(false);
                          setPlaybackRecording(null);
                        }}
                      />
                    ) : (
                      <Turntable
                        status={status}
                        duration={duration}
                        onStartRecording={startRecording}
                        onStopRecording={stopRecording}
                        playClick={playClick}
                        isPlayback={isPlayback}
                        playbackRecording={playbackRecording}
                        setIsPlayback={setIsPlayback}
                        onPlaybackEnd={() => {
                          setIsPlayback(false);
                          setPlaybackRecording(null);
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Vault View (Right Slide) */}
          <div ref={vaultViewRef} className="view-slide vault-slide">
            {isVaultMounted && (
              <VaultScreen
                onClose={() => transitionTo('recorder')}
                playClick={playClick}
                onPlayback={handlePlayback}
              />
            )}
          </div>
        </div>
      </main>

        {/* Footer Status Indicators */}
        <footer className="app-footer">
          <span className="footer-left">
            SYS_STATUS: <span className={`status-val status-${status}`}>{status.toUpperCase()}</span>
          </span>
          <span className="footer-right">
            <OfflineIndicator />
          </span>
        </footer>

        {/* Post-Recording Slide-up Card */}
        <TranscriptCard
          status={status}
          transcript={transcriptRef.current}
          onSave={handleSave}
          onDiscard={handleDiscard}
          playClick={playClick}
        />

        {/* PWA Install Banner */}
        <InstallBanner
          isVisible={isInstallable}
          onInstall={installApp}
          onDismiss={dismissPrompt}
        />
      </div>

      <style>{`
        .logo-text {
          font-size: 38px;
          letter-spacing: 3.5px;
          color: var(--off-white);
          text-shadow: 0 0 10px rgba(212, 197, 176, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .recording-dot {
          font-size: 24px;
          transition: all 0.3s ease;
          user-select: none;
        }
        .recording-dot.idle {
          color: rgba(176, 16, 32, 0.25);
          animation: none;
        }
        .recording-dot.active {
          color: var(--crimson-bright);
          text-shadow: 0 0 8px var(--crimson-glow);
          animation: pulse-crimson 1s infinite alternate ease-in-out;
        }
        .recording-dot.processing {
          color: #c4820a;
          text-shadow: 0 0 8px rgba(196, 130, 10, 0.5);
          animation: pulse-amber 2s infinite alternate ease-in-out;
        }

        @keyframes pulse-crimson {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @keyframes pulse-amber {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }

        .header-subtitle {
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 2px;
          margin-top: 4px;
          text-align: center;
        }

        .device-stage {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 380px;
        }

        .app-main {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 60px; /* clears footer height */
          width: 100%;
        }

        /* App Footer status bars */
        .app-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          background: rgba(10, 10, 10, 0.95);
          border-top: 1px solid #1a1a1a;
          z-index: 100;
          box-sizing: border-box;
        }

        .footer-left, .footer-right {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
        }

        .status-val {
          font-weight: bold;
        }

        .status-idle {
          color: var(--gold-warm);
        }

        .status-recording {
          color: var(--crimson-bright);
          text-shadow: 0 0 4px var(--crimson-glow);
        }

        .status-processing {
          color: #f39c12;
        }

        .status-done {
          color: #2ecc71;
        }

        .status-error {
          color: var(--crimson-bright);
        }
      `}</style>
    </>
  );
}
