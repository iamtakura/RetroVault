import React from 'react';

export default function PlaquesWall({ sessions, selectedRecording, onSelectRecording }) {
  const isSelected = (session) => selectedRecording && selectedRecording.id === session.id;

  return (
    <div className="plaques-wall">
      {sessions.map((session) => {
        const active = isSelected(session);
        return (
          <div
            className={`plaque-frame ${active ? 'active' : ''}`}
            key={session.id}
            onClick={() => onSelectRecording(session)}
          >
            {/* Outer frame */}
            <div className="plaque-inner">
              
              {/* Vinyl record */}
              <div className="plaque-record">
                <div className="plaque-record-grooves" />
                <div className="plaque-record-label">
                  <span className="plaque-label-title">
                    {session.title.slice(0, 12)}
                  </span>
                  <span className="plaque-label-sub">RETROVAULT</span>
                </div>
              </div>

              {/* Plaque text below record */}
              <div className="plaque-text">
                <div className="plaque-title">
                  {session.title.length > 20 ? `${session.title.slice(0, 20)}...` : session.title}
                </div>
                <div className="plaque-meta">
                  {session.duration}s · {session.createdAt.slice(0, 10)}
                </div>
                <div className="plaque-tags">
                  {session.tags.map(tag => (
                    <span key={tag} className="plaque-tag">#{tag}</span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        );
      })}

      <style>{`
        .plaques-wall {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 16px 0;
          width: 100%;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .plaques-wall {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .plaque-frame {
          background: linear-gradient(145deg, #1c1008, #0f0a05);
          border: 2px solid #3a2510;
          border-radius: 4px;
          padding: 20px 12px 12px;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

          /* Outer frame shadow — makes it look wall-mounted */
          box-shadow:
            0 2px 4px rgba(0,0,0,0.6),
            0 6px 16px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .plaque-frame:hover {
          transform: translateY(-4px) rotate(0.5deg);
          box-shadow:
            0 8px 24px rgba(0,0,0,0.7),
            0 2px 4px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .plaque-frame.active {
          border-color: var(--crimson-bright);
          box-shadow:
            0 8px 24px rgba(176,16,32,0.3),
            0 2px 4px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.04);
          transform: translateY(-2px);
        }

        .plaque-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        /* The vinyl record inside the plaque */
        .plaque-record {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #0d0d0d;
          position: relative;
          flex-shrink: 0;

          /* Subtle metallic sheen — gold/bronze frame border for award feel */
          box-shadow:
            0 0 0 3px #2a1a08,
            0 0 0 4px #4a2e10,
            0 2px 8px rgba(0,0,0,0.8);
        }

        /* Groove rings */
        .plaque-record-grooves {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            transparent,
            transparent 4px,
            rgba(255, 255, 255, 0.025) 4px,
            rgba(255, 255, 255, 0.025) 5px
          );
        }

        /* Center label */
        .plaque-record-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: radial-gradient(circle, #8b0000, #5a0000);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }

        .plaque-label-title {
          font-family: var(--font-mono);
          font-size: 4px;
          color: rgba(212, 197, 176, 0.9);
          text-align: center;
          line-height: 1.2;
          padding: 0 2px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .plaque-label-sub {
          font-family: var(--font-mono);
          font-size: 3px;
          color: rgba(212, 197, 176, 0.5);
          letter-spacing: 0.05em;
        }

        /* Text section below record */
        .plaque-text {
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .plaque-title {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--off-white);
          letter-spacing: 0.05em;
          line-height: 1.3;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .plaque-meta {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--muted);
          letter-spacing: 0.08em;
        }

        .plaque-tags {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 3px;
          margin-top: 2px;
        }

        .plaque-tag {
          font-family: var(--font-mono);
          font-size: 8px;
          color: var(--crimson-bright);
          border: 1px solid var(--crimson-deep);
          border-radius: 2px;
          padding: 1px 4px;
          letter-spacing: 0.05em;
        }

        /* Wall mounting screw detail — top corners */
        .plaque-frame::before,
        .plaque-frame::after {
          content: '';
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, #4a3520, #2a1a08);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.8);
          top: 6px;
        }

        .plaque-frame::before { left: 6px; }
        .plaque-frame::after { right: 6px; }
      `}</style>
    </div>
  );
}
