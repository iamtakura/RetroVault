import React from 'react';

export default function VinylItem({ recording, index, onSelect, active }) {
  const { title, duration } = recording;

  // Format duration to M:SS
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Stack offsets: 28px left, 4px top per record in the crate
  const offsetStyle = {
    position: 'absolute',
    left: `${index * 28}px`,
    top: `${index * 4}px`,
    zIndex: index,
  };

  return (
    <div
      className={`vinyl-item ${active ? 'active' : ''}`}
      style={offsetStyle}
      onClick={() => onSelect(recording)}
    >
      {/* Vinyl Record Circle */}
      <div className="vinyl-disc">
        <div className="vinyl-grooves-overlay" />
        
        {/* Center Label sticker */}
        <div className="vinyl-label">
          <div className="label-spindle-hole" />
          <div className="label-title-text font-display">{title}</div>
          {recording.status === 'pending' ? (
            <div className="vinyl-pending-badge font-mono">PENDING</div>
          ) : (
            <div className="label-duration font-mono">{formatDuration(duration)}</div>
          )}
        </div>
      </div>

      <style>{`
        .vinyl-item {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s ease, z-index 0s, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        /* Hover animation: slide up and out of the crate */
        .vinyl-item:hover {
          transform: translateY(-12px) !important;
          z-index: 999 !important; /* bring to front */
        }

        .vinyl-item.active {
          transform: translateY(-8px) !important;
          z-index: 998 !important;
        }

        .vinyl-item.active .vinyl-label {
          border-color: var(--crimson-bright);
          box-shadow: 0 0 8px rgba(176, 16, 32, 0.6);
        }

        /* The physical disc */
        .vinyl-disc {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, #242424 0%, #111 60%, #050505 100%);
          border-radius: 50%;
          box-shadow: 0 4px 8px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Subtle record groove lines */
        .vinyl-grooves-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            transparent,
            transparent 3px,
            rgba(255, 255, 255, 0.03) 3px,
            rgba(255, 255, 255, 0.03) 4px
          );
          pointer-events: none;
        }

        /* Center Paper Label */
        .vinyl-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: #c0392b; /* Crimson red label */
          border-radius: 50%;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2px;
          color: var(--off-white);
          text-align: center;
          line-height: 1.2;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
          box-sizing: border-box;
        }

        .label-spindle-hole {
          width: 4px;
          height: 4px;
          background: #eae3d2;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 1px solid #111;
          z-index: 10;
        }

        .label-title-text {
          font-size: 5px;
          letter-spacing: 0.1px;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 90%;
          margin-bottom: 2px;
          font-weight: bold;
          opacity: 0.9;
          margin-top: 2px;
        }

        .label-duration {
          font-size: 5px;
          opacity: 0.7;
          font-weight: bold;
        }

        .vinyl-pending-badge {
          font-size: 4px;
          background: var(--crimson-deep);
          color: var(--off-white);
          padding: 0px 2px;
          border-radius: 1px;
          font-weight: bold;
          border: 0.5px solid var(--crimson-bright);
        }
      `}</style>
    </div>
  );
}
