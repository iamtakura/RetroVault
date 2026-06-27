import React from 'react';

export default function CassetteItem({ recording, onSelect, active }) {
  const { id, title, duration, createdAt } = recording;

  // Consistent random rotation between -2 and +2 degrees seeded from ID
  const rotation = (id.charCodeAt(0) % 5) - 2;

  // Format duration to M:SS
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Format date to short readable string
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const truncateTitle = (text) => {
    if (!text) return '';
    return text.length > 24 ? text.substring(0, 24) + '...' : text;
  };

  // Proportional tape packs: left pack shrinks and right pack grows based on duration percentage
  // Map percentage from 0 to 300s
  const percent = Math.min(duration / 300, 1);
  const leftTapeRadius = 10 - (percent * 5); // 10px to 5px
  const rightTapeRadius = 5 + (percent * 5);  // 5px to 10px

  const displayMeta = `${formatDate(createdAt)} — ${formatDuration(duration)}`;

  return (
    <div
      className={`cassette-item ${active ? 'active' : ''}`}
      style={{ '--tilt': `${(id.charCodeAt(0) % 5) - 2}deg` }}
      onClick={() => onSelect(recording)}
    >
      {recording.status === 'pending' && (
        <div className="pending-badge-overlay font-mono">PENDING</div>
      )}

      <div className="cassette-label-sticker">
        <div className="label-side">A</div>
        <div className="label-content">
          <div className="label-title font-mono" title={title}>{truncateTitle(title)}</div>
          <div className="label-meta font-mono">{displayMeta}</div>
        </div>
      </div>
      <div className="cassette-window-detail">
        <div className="window-spindle-reel left-reel">
          <div className="tape-pack-wrap" style={{ width: `${leftTapeRadius * 2}px`, height: `${leftTapeRadius * 2}px` }} />
          <div className="window-spindle" />
        </div>
        <div className="window-spindle-reel right-reel">
          <div className="tape-pack-wrap" style={{ width: `${rightTapeRadius * 2}px`, height: `${rightTapeRadius * 2}px` }} />
          <div className="window-spindle" />
        </div>
      </div>

      <style>{`
        .cassette-item {
          position: relative;
          width: 140px;
          height: 80px;
          background: #1e1e1e;
          border: 2px solid #111;
          border-radius: 4px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          box-shadow: 0 4px 6px rgba(0,0,0,0.6);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          transform-origin: bottom center;
          transform: rotate(var(--tilt));
          flex-shrink: 0;
        }

        .cassette-item:hover {
          transform: rotate(var(--tilt)) translateY(-8px);
          box-shadow: 
            0 10px 15px rgba(0,0,0,0.7),
            0 0 4px var(--crimson-glow);
          border-color: #2b2b2b;
          z-index: 10;
        }

        .cassette-item.active {
          border-color: var(--crimson-bright);
          box-shadow: 
            0 0 10px var(--crimson-glow),
            0 4px 6px rgba(0,0,0,0.6);
          transform: rotate(var(--tilt)) translateY(-4px);
        }

        .pending-badge-overlay {
          position: absolute;
          top: 2px;
          right: 2px;
          background: var(--crimson-deep);
          color: var(--off-white);
          font-size: 6px;
          padding: 1px 4px;
          border-radius: 1px;
          letter-spacing: 0.5px;
          z-index: 10;
          border: 1px solid var(--crimson-bright);
        }

        /* Worn sticker label */
        .cassette-label-sticker {
          background: #e4d2b8;
          border-radius: 2px;
          height: 46px;
          display: flex;
          padding: 2px 4px;
          color: #2b231d;
          gap: 4px;
          overflow: hidden;
          box-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        .label-side {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: bold;
          border-right: 1px solid rgba(0,0,0,0.15);
          padding-right: 4px;
          display: flex;
          align-items: center;
        }

        .label-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0; /* allows text truncation */
        }

        .label-title {
          font-size: 9px;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .label-meta {
          font-size: 7px;
          opacity: 0.7;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Tiny windows detail */
        .cassette-window-detail {
          width: 55%;
          height: 18px;
          background: #090909;
          border: 1px solid #282828;
          border-radius: 2px;
          align-self: center;
          margin-top: 4px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .window-spindle-reel {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 22px;
          height: 22px;
        }

        .window-spindle {
          width: 6px;
          height: 6px;
          background: #eae3d2;
          border-radius: 50%;
          border: 1px solid #111;
          z-index: 5;
        }

        .tape-pack-wrap {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, #504238 60%, #30261f 100%);
          opacity: 0.85;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
