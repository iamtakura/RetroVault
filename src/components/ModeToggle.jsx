import React from 'react';

export default function ModeToggle({ activeMode, onModeChange, playClick, disabled }) {
  const handleToggle = (mode) => {
    if (disabled) return;
    if (playClick) playClick();
    onModeChange(mode);
  };

  return (
    <div className="mode-toggle-container">
      <button
        type="button"
        className={`tape-label-btn ${activeMode === 'tape' ? 'active' : ''}`}
        onClick={() => handleToggle('tape')}
        disabled={disabled}
      >
        <span className="tape-label-text">THE TAPE</span>
        <div className="tape-tear-left" />
        <div className="tape-tear-right" />
      </button>

      <button
        type="button"
        className={`tape-label-btn ${activeMode === 'session' ? 'active' : ''}`}
        onClick={() => handleToggle('session')}
        disabled={disabled}
      >
        <span className="tape-label-text">THE SESSION</span>
        <div className="tape-tear-left" />
        <div className="tape-tear-right" />
      </button>

      <style>{`
        .mode-toggle-container {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin: 20px 0;
          perspective: 600px;
        }

        .tape-label-btn {
          position: relative;
          background: linear-gradient(
            to bottom,
            #e4d2b8 0%,
            #d4c5b0 40%,
            #bfaea0 100%
          );
          border: 1px solid rgba(139, 95, 82, 0.4);
          color: #2b231d;
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: bold;
          padding: 8px 24px;
          cursor: pointer;
          user-select: none;
          box-shadow: 
            0 3px 6px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 3px rgba(0, 0, 0, 0.2);
          transition: all 0.15s ease-out;
          transform: rotateX(5deg) rotateY(-2deg) rotateZ(1deg);
          min-width: 140px;
        }

        /* Worn masking tape texture overlay */
        .tape-label-btn::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(
            45deg,
            rgba(0, 0, 0, 0.02),
            rgba(0, 0, 0, 0.02) 2px,
            transparent 2px,
            transparent 4px
          );
          pointer-events: none;
          opacity: 0.8;
        }

        .tape-label-btn:hover:not(:disabled) {
          transform: translate3d(0, -1px, 5px) rotateX(2deg);
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          filter: brightness(1.05);
        }

        .tape-label-btn:active:not(:disabled) {
          transform: translate3d(0, 1px, -2px) rotateX(8deg);
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.6),
            inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .tape-label-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Active underline / marker state */
        .tape-label-btn.active {
          transform: translate3d(0, 0, 8px) rotateX(-2deg);
          box-shadow: 
            0 5px 12px rgba(0, 0, 0, 0.6),
            0 0 2px rgba(176, 16, 32, 0.3);
          border-color: rgba(176, 16, 32, 0.5);
        }

        .tape-label-btn.active::after {
          content: "";
          position: absolute;
          bottom: 4px;
          left: 10%;
          width: 80%;
          height: 3px;
          background: var(--crimson);
          box-shadow: 0 0 4px rgba(176, 16, 32, 0.6);
          border-radius: 2px;
          opacity: 0.85;
        }

        /* Text details */
        .tape-label-text {
          position: relative;
          z-index: 2;
          letter-spacing: 1px;
          opacity: 0.85;
          text-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
        }

        /* Decayed torn tape edge styling */
        .tape-tear-left {
          position: absolute;
          top: 0; left: -4px; bottom: 0; width: 4px;
          background: inherit;
          clip-path: polygon(100% 0, 0 10%, 100% 20%, 0 35%, 100% 50%, 0 65%, 100% 80%, 0 95%, 100% 100%);
          border-left: 1px solid rgba(139, 95, 82, 0.3);
        }

        .tape-tear-right {
          position: absolute;
          top: 0; right: -4px; bottom: 0; width: 4px;
          background: inherit;
          clip-path: polygon(0 0, 100% 8%, 0 18%, 100% 30%, 0 48%, 100% 63%, 0 78%, 100% 92%, 0 100%);
          border-right: 1px solid rgba(139, 95, 82, 0.3);
        }
      `}</style>
    </div>
  );
}
