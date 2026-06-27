import React from 'react';
import CassetteItem from './CassetteItem';
import PlaquesWall from './PlaquesWall';
import EmptyVault from './EmptyVault';

export default function ShelfView({ recordings, selectedRecording, onSelectRecording }) {
  const cassettes = recordings ? recordings.filter((r) => r.format === 'cassette') : [];
  const vinyls = recordings ? recordings.filter((r) => r.format === 'vinyl') : [];

  const isSelected = (rec) => selectedRecording && selectedRecording.id === rec.id;
  const isAllEmpty = cassettes.length === 0 && vinyls.length === 0;

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
      `}</style>
    </div>
  );
}
