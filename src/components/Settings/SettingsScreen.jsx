import React, { useState, useRef, useCallback } from 'react';
import { THEMES } from '../../lib/themes';
import './SettingsScreen.css';

// ── Constants ──
const LANGUAGES = [
  { code: 'auto', label: 'AUTO' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'ja', label: 'JA' },
  { code: 'zh', label: 'ZH' },
  { code: 'pt', label: 'PT' },
  { code: 'ru', label: 'RU' },
  { code: 'ar', label: 'AR' },
  { code: 'hi', label: 'HI' },
  { code: 'ko', label: 'KO' },
  { code: 'it', label: 'IT' },
  { code: 'nl', label: 'NL' },
];

// ── Helpers ──
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatBytes(bytes) {
  if (bytes == null) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
const modes = [
  {
    id: 'tape',
    name: 'THE TAPE',
    description: 'Cassette deck recording',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24">
        {/* Cassette body */}
        <rect x="1" y="5" width="22" height="14" rx="2"
          fill="#1a1a1a" stroke="#3a3a3a" strokeWidth="1"/>
        {/* Tape window */}
        <rect x="4" y="8" width="16" height="8" rx="1"
          fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="0.5"/>
        {/* Left reel */}
        <circle cx="8" cy="12" r="3"
          fill="#0a0a0a" stroke="#3a3a3a" strokeWidth="0.8"/>
        <circle cx="8" cy="12" r="1.2"
          fill="currentColor"/>
        {/* Right reel */}
        <circle cx="16" cy="12" r="3"
          fill="#0a0a0a" stroke="#3a3a3a" strokeWidth="0.8"/>
        <circle cx="16" cy="12" r="1.2"
          fill="currentColor"/>
        {/* Tape strand */}
        <path d="M 8 14.5 Q 12 16 16 14.5"
          stroke="#5a3a1a" strokeWidth="0.8"
          fill="none"/>
      </svg>
    )
  },
  {
    id: 'session',
    name: 'THE SESSION',
    description: 'Turntable recording',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24">
        {/* Outer vinyl */}
        <circle cx="12" cy="12" r="11"
          fill="#0d0d0d" stroke="#3a3a3a" strokeWidth="1"/>
        {/* Groove rings */}
        <circle cx="12" cy="12" r="9"
          fill="none" stroke="rgba(255,255,255,0.06)" 
          strokeWidth="0.5"/>
        <circle cx="12" cy="12" r="7"
          fill="none" stroke="rgba(255,255,255,0.06)" 
          strokeWidth="0.5"/>
        <circle cx="12" cy="12" r="5"
          fill="none" stroke="rgba(255,255,255,0.06)" 
          strokeWidth="0.5"/>
        {/* Center label */}
        <circle cx="12" cy="12" r="3.5"
          fill="currentColor" opacity="0.9"/>
        {/* Spindle hole */}
        <circle cx="12" cy="12" r="0.8"
          fill="#0a0a0a"/>
      </svg>
    )
  },
  {
    id: 'typewriter',
    name: 'THE TYPEWRITER',
    description: 'Typewriter dictation',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24">
        {/* Housing */}
        <rect x="1" y="8" width="22" height="14" rx="2"
          fill="#1a1a1a" stroke="#3a3a3a" strokeWidth="1"/>
        {/* Paper */}
        <rect x="6" y="2" width="12" height="8" rx="1"
          fill="#d4c5b0" stroke="#b8a898" strokeWidth="0.5"/>
        {/* Paper lines */}
        <line x1="8" y1="5" x2="16" y2="5"
          stroke="#5a4a38" strokeWidth="0.4" opacity="0.4"/>
        <line x1="8" y1="7" x2="14" y2="7"
          stroke="#5a4a38" strokeWidth="0.4" opacity="0.4"/>
        {/* Keys row 1 */}
        <circle cx="6" cy="14" r="1.5"
          fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="10" cy="14" r="1.5"
          fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="14" cy="14" r="1.5"
          fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="18" cy="14" r="1.5"
          fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="0.5"/>
        {/* Keys row 2 */}
        <circle cx="8" cy="18" r="1.5"
          fill="currentColor" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="12" cy="18" r="1.5"
          fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="0.5"/>
        <circle cx="16" cy="18" r="1.5"
          fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="0.5"/>
      </svg>
    )
  }
];

export default function SettingsScreen({
  onClose,
  playClick,
  settings,
  onUpdateSetting,
  onResetSettings,
  storageInfo,
  onExportAll,
  onClearAll,
  preferredMode,
  setPreferredMode,
}) {
  // ── Clear-all confirmation state ──
  const [clearConfirming, setClearConfirming] = useState(false);
  const clearTimerRef = useRef(null);

  // ── Rotary knob drag state ──
  const knobRef = useRef(null);
  const isDraggingRef = useRef(false);

  // ── Knob pointer handlers ──
  const getAngleFromPointer = useCallback((clientX, clientY) => {
    const knob = knobRef.current;
    if (!knob) return null;
    const rect = knob.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2 gives angle from positive-x axis; we want 0° at top (12 o'clock)
    let angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI); // -180..180, 0 = up
    return angleDeg;
  }, []);

  const angleToValue = useCallback((angleDeg) => {
    // Map -135° (left) to 0  and +135° (right) to 100
    // Dead zone at the bottom (from -180 to -135 and 135 to 180)
    const clamped = clamp(angleDeg, -135, 135);
    return Math.round(((clamped + 135) / 270) * 100);
  }, []);

  const valueToRotation = useCallback((value) => {
    // 0 → -135°, 100 → +135°
    return -135 + (value / 100) * 270;
  }, []);

  const handleKnobPointerDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    knobRef.current?.setPointerCapture(e.pointerId);

    const angle = getAngleFromPointer(e.clientX, e.clientY);
    if (angle !== null) {
      // Only update if in the valid range (not in the dead zone at the bottom)
      if (angle >= -135 && angle <= 135) {
        onUpdateSetting('soundVolume', angleToValue(angle));
      }
    }
  }, [getAngleFromPointer, angleToValue, onUpdateSetting]);

  const handleKnobPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const angle = getAngleFromPointer(e.clientX, e.clientY);
    if (angle !== null) {
      if (angle >= -135 && angle <= 135) {
        onUpdateSetting('soundVolume', angleToValue(angle));
      }
    }
  }, [getAngleFromPointer, angleToValue, onUpdateSetting]);

  const handleKnobPointerUp = useCallback((e) => {
    isDraggingRef.current = false;
    knobRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  // ── Clear-all handler ──
  const handleClearClick = useCallback(() => {
    if (clearConfirming) {
      // Second click — execute
      clearTimeout(clearTimerRef.current);
      setClearConfirming(false);
      onClearAll();
    } else {
      // First click — enter confirmation
      setClearConfirming(true);
      clearTimerRef.current = setTimeout(() => {
        setClearConfirming(false);
      }, 3000);
    }
  }, [clearConfirming, onClearAll]);

  // ── Storage bar computation ──
  const storagePercent = storageInfo
    ? storageInfo.quota > 0
      ? (storageInfo.used / storageInfo.quota) * 100
      : 0
    : 0;

  const totalSegments = 40;
  const filledSegments = Math.round((storagePercent / 100) * totalSegments);

  const getSegmentColor = (index) => {
    if (index >= filledSegments) return 'settings-storage-segment--empty';
    const segPercent = (index / totalSegments) * 100;
    if (segPercent >= 85) return 'settings-storage-segment--red';
    if (segPercent >= 60) return 'settings-storage-segment--amber';
    return 'settings-storage-segment--green';
  };

  // ── Knob rotation ──
  const knobRotation = valueToRotation(settings.soundVolume);

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════
  return (
    <div className="settings-overlay">
      <div className="settings-container">

        {/* ── TOP BAR ── */}
        <div className="settings-top-bar">
          <button
            className="settings-back-btn"
            onClick={() => { playClick(); onClose(); }}
          >
            ◄ BACK
          </button>
          <span className="settings-screen-title">SETTINGS</span>
        </div>

        {/* ═══════════════════════════════════
            PANEL 1: SOUND & FEEDBACK
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">Sound &amp; Feedback</div>
          <div className="settings-panel-body">

            {/* Rotary Volume Knob */}
            <div className="settings-knob-wrapper">
              <span className="settings-knob-label">VOLUME</span>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div className="settings-knob-ring" />
                <div
                  ref={knobRef}
                  className="settings-knob"
                  style={{ transform: `rotate(${knobRotation}deg)` }}
                  onPointerDown={handleKnobPointerDown}
                  onPointerMove={handleKnobPointerMove}
                  onPointerUp={handleKnobPointerUp}
                  onPointerCancel={handleKnobPointerUp}
                >
                  <div className="settings-knob-notch" />
                </div>
              </div>
              <span className="settings-knob-value">{settings.soundVolume}</span>
            </div>

            {/* Sound FX Toggle */}
            <div className="settings-row">
              <span className="settings-label">Sound FX</span>
              <div
                className={`settings-toggle ${settings.soundEnabled ? 'settings-toggle--on' : ''}`}
                onClick={() => { playClick(); onUpdateSetting('soundEnabled', !settings.soundEnabled); }}
                role="switch"
                aria-checked={settings.soundEnabled}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playClick(); onUpdateSetting('soundEnabled', !settings.soundEnabled); } }}
              >
                <div className="settings-toggle-lever" />
                <div className="settings-toggle-led" />
              </div>
            </div>

            {/* Tape Hiss Toggle */}
            <div className="settings-row">
              <span className="settings-label">Tape Hiss</span>
              <div
                className={`settings-toggle ${settings.hissEnabled ? 'settings-toggle--on' : ''}`}
                onClick={() => { playClick(); onUpdateSetting('hissEnabled', !settings.hissEnabled); }}
                role="switch"
                aria-checked={settings.hissEnabled}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playClick(); onUpdateSetting('hissEnabled', !settings.hissEnabled); } }}
              >
                <div className="settings-toggle-lever" />
                <div className="settings-toggle-led" />
              </div>
            </div>

            {/* Test Sound */}
            <div className="settings-row">
              <span className="settings-label">Test Sound</span>
              <button
                className="settings-test-btn"
                onClick={() => playClick()}
              >
                ▶ TEST
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            PANEL 2: TRANSCRIPTION
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">Transcription</div>
          <div className="settings-panel-body">
            <span className="settings-label" style={{ marginBottom: 8, display: 'block' }}>Language</span>
            <div className="settings-lang-strip">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className={`settings-lang-badge ${settings.transcriptionLang === lang.code ? 'settings-lang-badge--active' : ''}`}
                  onClick={() => { playClick(); onUpdateSetting('transcriptionLang', lang.code); }}
                >
                  {lang.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            PANEL: PREFERRED MODE
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">Preferred Mode</div>
          <div className="settings-panel-body">
            <div className="mode-preference-grid">
              {modes.map(mode => (
                <div
                  key={mode.id}
                  className={`mode-preference-card ${preferredMode === mode.id ? 'active' : ''}`}
                  onClick={() => {
                    playClick();
                    setPreferredMode(mode.id);
                    localStorage.setItem('rv_preferred_mode', mode.id);
                  }}
                >
                  <span className="mode-pref-icon">{mode.icon}</span>
                  <span className="mode-pref-name">{mode.name}</span>
                  <span className="mode-pref-desc">
                    {mode.description}
                  </span>
                  {preferredMode === mode.id && (
                    <span className="mode-pref-active">● ACTIVE</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            PANEL 3: RECORDING
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">Recording</div>
          <div className="settings-panel-body">

            {/* Auto-save Toggle */}
            <div className="settings-row">
              <span className="settings-label">Auto-Save</span>
              <div
                className={`settings-toggle ${settings.autoSave ? 'settings-toggle--on' : ''}`}
                onClick={() => { playClick(); onUpdateSetting('autoSave', !settings.autoSave); }}
                role="switch"
                aria-checked={settings.autoSave}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playClick(); onUpdateSetting('autoSave', !settings.autoSave); } }}
              >
                <div className="settings-toggle-lever" />
                <div className="settings-toggle-led" />
              </div>
            </div>

            {/* Max Duration Readout */}
            <div className="settings-row">
              <span className="settings-label">Max Duration</span>
              <span className="settings-led-readout">∞</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            PANEL 4: THEME
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">Theme</div>
          <div className="settings-panel-body">
            <div className="settings-theme-grid">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={`settings-theme-swatch ${settings.theme === theme.id ? 'settings-theme-swatch--active' : ''}`}
                  style={{
                    '--theme-accent': theme.accent,
                    '--theme-glow': `${theme.accent}33`,
                  }}
                  onClick={() => { playClick(); onUpdateSetting('theme', theme.id); }}
                >
                  <div className="theme-preview" style={{
                    background: theme.bg,
                    border: `1px solid ${theme.accent}`
                  }}>
                    <svg viewBox="0 0 64 32" width="80" height="40">
                      {/* Cassette body */}
                      <rect x="4" y="4" width="56" height="24" rx="3"
                        fill={theme.surface}
                        stroke={theme.accent}
                        strokeWidth="1.5"/>
                      {/* Tape window */}
                      <rect x="10" y="8" width="44" height="14" rx="2"
                        fill={theme.bg}
                        stroke={theme.accent}
                        strokeWidth="0.8"
                        opacity="0.8"/>
                      {/* Left reel */}
                      <circle cx="22" cy="15" r="5"
                        fill={theme.bg}
                        stroke={theme.accent}
                        strokeWidth="1"/>
                      <circle cx="22" cy="15" r="2"
                        fill={theme.accentBright}/>
                      {/* Right reel */}
                      <circle cx="42" cy="15" r="5"
                        fill={theme.bg}
                        stroke={theme.accent}
                        strokeWidth="1"/>
                      <circle cx="42" cy="15" r="2"
                        fill={theme.accentBright}/>
                      {/* Tape strand */}
                      <path d={`M 22 19 Q 32 22 42 19`}
                        stroke={theme.accent}
                        strokeWidth="1"
                        fill="none"
                        opacity="0.6"/>
                      {/* Accent bar */}
                      <rect x="4" y="25" width="56" height="2" rx="1"
                        fill={theme.accentBright}
                        opacity="0.8"/>
                    </svg>
                  </div>
                  <span className="settings-theme-name">{theme.name}</span>
                  <span className="settings-theme-desc">{theme.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            PANEL 5: STORAGE
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">Storage</div>
          <div className="settings-panel-body">

            {/* Storage usage bar */}
            <div className="settings-storage-bar-wrapper">
              <div className="settings-storage-bar-labels">
                <span className="settings-storage-label">
                  {storageInfo ? formatBytes(storageInfo.used) : '—'}
                </span>
                <span className="settings-storage-label">
                  {storageInfo ? formatBytes(storageInfo.quota) : '—'}
                </span>
              </div>
              <div className="settings-storage-bar">
                {Array.from({ length: totalSegments }, (_, i) => (
                  <div
                    key={i}
                    className={`settings-storage-segment ${getSegmentColor(i)}`}
                  />
                ))}
              </div>
            </div>

            {/* Recording count */}
            <div className="settings-storage-count">
              {storageInfo ? storageInfo.count : 0} RECORDINGS
            </div>

            {/* Action buttons */}
            <div className="settings-storage-actions">
              <button
                className="settings-export-btn"
                onClick={() => { playClick(); onExportAll(); }}
              >
                ⬆ EXPORT ALL
              </button>
              <button
                className={`settings-clear-btn ${clearConfirming ? 'settings-clear-btn--confirming' : ''}`}
                onClick={() => { playClick(); handleClearClick(); }}
              >
                {clearConfirming ? '⚠ CONFIRM CLEAR?' : '✕ CLEAR ALL'}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════
            PANEL 6: ABOUT
            ═══════════════════════════════════ */}
        <div className="settings-panel">
          <div className="settings-panel-header">About</div>
          <div className="settings-panel-body">
             <div className="settings-about">
               <div className="settings-about-title">RETROVAULT</div>
               <div className="settings-about-subtitle">MAGNETIC DICTATION SYSTEM</div>
               <div className="settings-about-version">v1.0.0</div>
               <div className="settings-about-built">
                 Built by: <span className="settings-velvetmark">VELVETMARK</span>
               </div>
               <div className="settings-about-year">Year: {new Date().getFullYear()}</div>
               <div className="settings-about-stack">Stack: REACT · GROQ · INDEXEDDB · GSAP</div>
               <div className="settings-about-copyright">
                 © {new Date().getFullYear()} VELVETMARK. ALL RIGHTS RESERVED.
               </div>
             </div>
          </div>
        </div>

        {/* ── RESET DEFAULTS ── */}
        <div className="settings-reset-row">
          <button
            className="settings-reset-btn"
            onClick={() => { playClick(); onResetSettings(); }}
          >
            ↺ RESET DEFAULTS
          </button>
        </div>

      </div>
    </div>
  );
}
