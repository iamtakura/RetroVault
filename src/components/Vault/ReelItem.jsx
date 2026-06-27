import React from 'react';

export default function ReelItem({ recording, onSelect, active }) {
  const { title } = recording;

  return (
    <div
      className={`vault-reel-item ${active ? 'active' : ''}`}
      onClick={() => onSelect(recording)}
    >
      <div className="reel-item-container">
        {/* Label Strip */}
        <div className="reel-label-strip font-mono">
          <div className="reel-label-text">{title}</div>
        </div>

        {/* Dual Spools Housing Window */}
        <div className="reel-spool-window">
          {/* Left Spool */}
          <div className="reel-mini-spool">
            <svg viewBox="0 0 60 60" className="mini-spool-svg">
              <circle cx="30" cy="30" r="28" fill="#181818" stroke="#333" strokeWidth="1.5" />
              <circle cx="30" cy="30" r="20" fill="#443322" opacity="0.8" />
              <circle cx="30" cy="30" r="6" fill="#111" />
              {/* Spindle teeth details */}
              {[0, 90, 180, 270].map((deg) => (
                <rect
                  key={deg}
                  x="28.5"
                  y="8"
                  width="3"
                  height="6"
                  fill="#777"
                  transform={`rotate(${deg} 30 30)`}
                />
              ))}
            </svg>
          </div>

          {/* Right Spool */}
          <div className="reel-mini-spool">
            <svg viewBox="0 0 60 60" className="mini-spool-svg">
              <circle cx="30" cy="30" r="28" fill="#181818" stroke="#333" strokeWidth="1.5" />
              <circle cx="30" cy="30" r="16" fill="#443322" opacity="0.8" />
              <circle cx="30" cy="30" r="6" fill="#111" />
              {[0, 90, 180, 270].map((deg) => (
                <rect
                  key={deg}
                  x="28.5"
                  y="8"
                  width="3"
                  height="6"
                  fill="#777"
                  transform={`rotate(${deg} 30 30)`}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        .vault-reel-item {
          width: 140px;
          height: 54px;
          perspective: 400px;
          cursor: pointer;
          user-select: none;
        }

        .reel-item-container {
          width: 100%;
          height: 100%;
          background: #151515;
          border: 2px solid #222;
          border-radius: 3px;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 4px;
          box-sizing: border-box;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          transform-origin: bottom center;
        }

        /* Hover animation: slight 3D forward tilt */
        .vault-reel-item:hover .reel-item-container {
          transform: rotateX(15deg) translateY(-2px);
          box-shadow: 
            0 8px 12px rgba(0, 0, 0, 0.7),
            0 0 3px var(--crimson-glow);
          border-color: #333;
        }

        .vault-reel-item.active .reel-item-container {
          border-color: var(--crimson-bright);
          box-shadow: 
            0 0 8px var(--crimson-glow),
            0 3px 6px rgba(0, 0, 0, 0.5);
          transform: rotateX(10deg) translateY(-1px);
        }

        /* Label Strip above reels */
        .reel-label-strip {
          background: #e4d2b8;
          color: #2b231d;
          font-size: 8px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          box-shadow: inset 0 -1px 2px rgba(0,0,0,0.1);
        }

        .reel-label-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Spool Window container */
        .reel-spool-window {
          height: 26px;
          background: #090909;
          border: 1px solid #1a1a1a;
          border-radius: 2px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 10px;
        }

        .reel-mini-spool {
          width: 22px;
          height: 22px;
        }

        .mini-spool-svg {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
