import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import AgingOverlay from './components/AgingOverlay';
import ModeToggle from './components/ModeToggle';
import CassetteDeck from './components/CassetteDeck';
import Turntable from './components/Turntable';
import TranscriptCard from './components/TranscriptCard';
import VaultScreen from './components/Vault/VaultScreen';
import SettingsScreen from './components/Settings/SettingsScreen';
import InstallBanner from './components/InstallBanner';
import OfflineIndicator from './components/OfflineIndicator';
import { useAudioFeedback } from './hooks/useAudioFeedback';
import { useRecorder } from './hooks/useRecorder';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useSettings } from './hooks/useSettings';
import { generateTags } from './lib/tagging';
import { getRecordings, clearAllRecordings, getStorageEstimate } from './lib/db';
import { initSounds, setMasterVolume, setMasterEnabled } from './lib/sounds';
import './App.css';

export default function App() {
  const [mode, setMode] = useState('tape'); // 'tape' | 'session'
  const [view, setView] = useState('recorder'); // 'recorder' | 'vault' | 'settings'
  const [isVaultMounted, setIsVaultMounted] = useState(false);
  const [isSettingsMounted, setIsSettingsMounted] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [playbackRecording, setPlaybackRecording] = useState(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);

  const recorderViewRef = useRef(null);
  const vaultViewRef = useRef(null);
  const settingsViewRef = useRef(null);

  // Initialize settings
  const { settings, updateSetting, resetSettings } = useSettings();

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
    language: settings.transcriptionLang,
  });

  // Initialize PWA Install prompt hook
  const { isInstallable, installApp, dismissPrompt } = usePWAInstall();

  // Global Web Audio Context Unlock
  useEffect(() => {
    const unlock = () => {
      initSounds();
      // Apply persisted sound settings
      setMasterVolume(settings.soundVolume);
      setMasterEnabled(settings.soundEnabled);
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

  // Load storage info for settings panel
  const refreshStorageInfo = useCallback(async () => {
    try {
      const info = await getStorageEstimate();
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to get storage estimate:', err);
    }
  }, []);

  useEffect(() => {
    refreshStorageInfo();
  }, [refreshStorageInfo]);

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

  // Handle Export All recordings as JSON
  const handleExportAll = async () => {
    try {
      const recordings = await getRecordings();
      // Convert audio blobs to base64 for portability
      const exportData = await Promise.all(
        recordings.map(async (rec) => {
          let audioBase64 = null;
          if (rec.audioBlob instanceof Blob) {
            const buffer = await rec.audioBlob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            audioBase64 = btoa(binary);
          }
          return { ...rec, audioBlob: audioBase64 };
        })
      );
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retrovault-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Handle Clear All recordings
  const handleClearAll = async () => {
    try {
      await clearAllRecordings();
      setLastSaved(null);
      refreshStorageInfo();
      window.dispatchEvent(new Event('retrovault-saved'));
    } catch (err) {
      console.error('Clear all failed:', err);
    }
  };

  // GSAP View transitions: Mechanical slide
  const transitionTo = (targetView) => {
    if (playClick) playClick();

    if (targetView === 'vault') {
      setIsVaultMounted(true);
      setView('vault');
      gsap.timeline()
        .to(recorderViewRef.current, { x: '-100vw', duration: 0.5, ease: 'power2.inOut' })
        .to(vaultViewRef.current, { x: '0', duration: 0.5, ease: 'power2.inOut' }, 0);
    } else if (targetView === 'settings') {
      setIsSettingsMounted(true);
      setView('settings');
      refreshStorageInfo();
      gsap.timeline()
        .to(recorderViewRef.current, { x: '100vw', duration: 0.5, ease: 'power2.inOut' })
        .fromTo(settingsViewRef.current,
          { x: '-100vw' },
          { x: '0', duration: 0.5, ease: 'power2.inOut' }, 0);
    } else {
      // Going back to recorder
      const tl = gsap.timeline({
        onComplete: () => {
          setIsVaultMounted(false);
          setIsSettingsMounted(false);
          setView('recorder');
        }
      });
      tl.to(recorderViewRef.current, { x: '0', duration: 0.5, ease: 'power2.inOut' });

      // Slide out whichever overlay is open
      if (vaultViewRef.current) {
        tl.to(vaultViewRef.current, { x: '100vw', duration: 0.5, ease: 'power2.inOut' }, 0);
      }
      if (settingsViewRef.current) {
        tl.to(settingsViewRef.current, { x: '-100vw', duration: 0.5, ease: 'power2.inOut' }, 0);
      }
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

            {/* Header right buttons */}
            <div className="header-right-btns">
              {/* Settings gear button */}
              <button
                type="button"
                className={`worn-metal-badge header-settings-btn font-mono ${view === 'settings' ? 'active' : ''}`}
                onClick={() => transitionTo(view === 'settings' ? 'recorder' : 'settings')}
                disabled={status === 'recording' || status === 'processing'}
                title="Settings"
              >
                ⚙
              </button>

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
          </div>
          <div className="header-subtitle font-mono">MAGNETIC DICTATION SYSTEM</div>
        </header>

        {/* Sliding Stage Area */}
        <main className="app-main">
          <div className="views-slider-container">
            {/* Recorder View (Center Slide) */}
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

          {/* Settings View (Left Slide) */}
          <div ref={settingsViewRef} className="view-slide settings-slide">
            {isSettingsMounted && (
              <SettingsScreen
                onClose={() => transitionTo('recorder')}
                playClick={playClick}
                settings={settings}
                onUpdateSetting={updateSetting}
                onResetSettings={resetSettings}
                storageInfo={storageInfo}
                onExportAll={handleExportAll}
                onClearAll={handleClearAll}
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

        .header-right-btns {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-settings-btn {
          font-size: 16px;
          padding: 7px 10px;
          line-height: 1;
        }

        .header-settings-btn.active {
          border-color: var(--crimson-bright);
          color: var(--crimson-bright);
          box-shadow:
            0 0 10px var(--crimson-glow),
            inset 0 1px 0 rgba(255,255,255,0.08);
          text-shadow: 0 0 4px var(--crimson-glow);
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

        /* Settings slide */
        .settings-slide {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 110;
          transform: translateX(-100vw);
          background: var(--black, #0a0a0a);
        }
      `}</style>
    </>
  );
}
