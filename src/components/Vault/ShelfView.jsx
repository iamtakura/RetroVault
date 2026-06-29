import React from 'react';
import CassetteItem from './CassetteItem';
import PlaquesWall from './PlaquesWall';
import EmptyVault from './EmptyVault';

const ManuscriptItem = ({ recording, onClick }) => {
  const pageCount = Math.ceil((recording.transcript || '').length / 400) || 1;
  const stackDepth = Math.min(pageCount, 4);

  return (
    <div className="manuscript-item" onClick={onClick}>
      {/* Stack of pages effect */}
      <div className="manuscript-pages">
        {[...Array(stackDepth)].map((_, i) => {
          const isFront = i === (stackDepth - 1);
          const topOffset = i * 3;
          const leftOffset = i * 3;
          const bgColors = ['#c2a888', '#cbb89e', '#d4c5b0', '#dfd5c4'];
          const bgColor = bgColors[Math.min(i, bgColors.length - 1)];

          if (isFront) {
            return (
              <div 
                key={i}
                className="manuscript-page page-front"
                style={{
                  top: `${topOffset}px`,
                  left: `${leftOffset}px`,
                  zIndex: 10,
                  background: '#d4c5b0',
                  padding: '8px 6px'
                }}
              >
                {/* Typed text lines */}
                <div className="manuscript-lines">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="manuscript-line"
                      style={{ 
                        width: `${70 + Math.random() * 25}%`,
                        opacity: 1 - (idx * 0.1)
                      }}
                    />
                  ))}
                </div>
                {/* Paperclip */}
                <div className="manuscript-clip" />
              </div>
            );
          } else {
            return (
              <div 
                key={i}
                className="manuscript-page page-bg"
                style={{
                  top: `${topOffset}px`,
                  left: `${leftOffset}px`,
                  zIndex: i + 1,
                  background: bgColor
                }}
              />
            );
          }
        })}
      </div>
      <div className="manuscript-meta">
        <span className="manuscript-title">
          {recording.title ? (recording.title.length > 20 ? `${recording.title.slice(0, 20)}...` : recording.title) : 'Untitled'}
        </span>
        <span className="manuscript-pages-count">
          {pageCount} {pageCount === 1 ? 'PAGE' : 'PAGES'}
        </span>
        <span className="manuscript-date">
          {recording.createdAt ? recording.createdAt.slice(0, 10) : ''}
        </span>
      </div>
    </div>
  );
};

export default function ShelfView({ recordings, selectedRecording, onSelectRecording }) {
  const cassettes = recordings ? recordings.filter((r) => r.format === 'cassette') : [];
  const vinyls = recordings ? recordings.filter((r) => r.format === 'vinyl') : [];
  const manuscripts = recordings ? recordings.filter((r) => r.format === 'manuscript') : [];

  const isSelected = (rec) => selectedRecording && selectedRecording.id === rec.id;
  const isAllEmpty = cassettes.length === 0 && vinyls.length === 0 && manuscripts.length === 0;

  return (
    <div className="shelf-view-container">
      {/* 1. Cassette Shelf */}
      <div className="vault-shelf-section">
        <div className="shelf-header font-mono">TAPES</div>
        <div className="tapes-shelf">
          {cassettes.length > 0 ? (
            cassettes.map((rec) => (
              <CassetteItem
                key={rec.id}
                recording={rec}
                onSelect={onSelectRecording}
                active={isSelected(rec)}
              />
            ))
          ) : (
            /* Empty Cassette Slots Outlines */
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="empty-slot empty-cassette-slot pulse-slot" />
            ))
          )}
        </div>
      </div>

      {/* 2. Framed Plaques Wall */}
      <div className="vault-shelf-section">
        <div className="shelf-header font-mono">SESSIONS</div>
        <div className="vinyl-crate-container">
          {vinyls.length === 0 ? (
            <div className="plaques-wall-empty">
              <span>NO SESSIONS RECORDED</span>
            </div>
          ) : (
            <PlaquesWall
              sessions={vinyls}
              selectedRecording={selectedRecording}
              onSelectRecording={onSelectRecording}
            />
          )}
        </div>
      </div>

      {/* 3. Manuscripts Section */}
      <div className="vault-shelf-section">
        <div className="shelf-header font-mono">| MANUSCRIPTS</div>
        {manuscripts.length === 0 ? (
          <div className="crate-empty">
            NO MANUSCRIPTS RECORDED
          </div>
        ) : (
          <div className="manuscripts-desk">
            {manuscripts.map(m => (
              <ManuscriptItem 
                key={m.id} 
                recording={m}
                onClick={() => onSelectRecording(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Empty State Text sits BELOW the shelf structure */}
      {isAllEmpty && <EmptyVault />}

      <style>{`
        .shelf-view-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          width: 100%;
          padding-bottom: 24px;
        }

        .vault-shelf-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .shelf-header {
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border-left: 2px solid var(--crimson-bright);
          padding-left: 8px;
          line-height: 1;
        }

        /* Tapes Grid Layout */
        .tapes-shelf {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 3px solid #2a1f1a;
          margin-bottom: 24px;
        }

        /* Plaque Wall container */
        .vinyl-crate-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px 0;
          width: 100%;
        }

        .plaques-wall-empty {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.1em;
          opacity: 0.5;
          border: 1px dashed var(--crimson-deep);
          display: inline-block;
          padding: 10px 20px;
          border-radius: 3px;
          margin: 0 auto;
        }

        /* Empty placeholder visual items */
        .empty-slot {
          width: 140px;
          height: 80px;
          border: 2px dashed var(--crimson-bright);
          border-radius: 4px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        /* Pulsing wait-state animation */
        .pulse-slot {
          animation: pulse-space 3s ease-in-out infinite;
        }

        @keyframes pulse-space {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.18; }
        }

        /* Manuscripts Desk Grid */
        .manuscripts-desk {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 20px;
          padding: 12px 0;
        }

        .manuscript-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .manuscript-pages {
          position: relative;
          width: 80px;
          height: 100px;
        }

        .manuscript-page {
          position: absolute;
          width: 72px;
          height: 92px;
          background: #d4c5b0;
          border: 1px solid #b8a898;
          box-sizing: border-box;
        }

        .page-1 {
          top: 0; left: 0;
          z-index: 3;
          padding: 8px 6px;
        }

        .page-2 {
          top: 3px; left: 3px;
          z-index: 2;
          background: #cbb89e;
        }

        .page-3 {
          top: 6px; left: 6px;
          z-index: 1;
          background: #c2a888;
        }

        .manuscript-line {
          height: 2px;
          background: #3a2a1a;
          margin-bottom: 6px;
          border-radius: 1px;
          opacity: 0.4;
        }

        .manuscript-clip {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 20px;
          border: 2px solid #888;
          border-bottom: none;
          border-radius: 4px 4px 0 0;
        }

        .manuscript-title {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--off-white);
          letter-spacing: 0.05em;
          text-align: center;
        }

        .manuscript-date {
          font-family: var(--font-mono);
          font-size: 8px;
          color: var(--muted);
        }

        .manuscript-pages-count {
          font-family: var(--font-mono);
          font-size: 8px;
          color: var(--gold-warm);
          letter-spacing: 0.05em;
        }

        .crate-empty {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.1em;
          opacity: 0.5;
          border: 1px dashed var(--crimson-deep);
          display: inline-block;
          padding: 10px 20px;
          border-radius: 3px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
