import React, { useEffect, useRef } from 'react';
import { useVault } from '../../hooks/useVault';
import SearchBar from './SearchBar';
import ShelfView from './ShelfView';
import TranscriptPanel from './TranscriptPanel';

export default function VaultScreen({ onClose, playClick, onPlayback }) {
  const {
    recordings,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    allTags,
    deleteRecording,
    selectedRecording,
    setSelectedRecording,
  } = useVault();

  const containerRef = useRef(null);

  // Escape key handler: deselect item, or close Vault if no item selected
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedRecording) {
          setSelectedRecording(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecording, onClose]);

  const handleBackClick = () => {
    if (playClick) playClick();
    onClose();
  };

  return (
    <div ref={containerRef} className="vault-screen">
      {/* Vault Header Bar */}
      <div className="vault-header">
        <button
          type="button"
          className="worn-metal-badge btn-vault-back font-display"
          onClick={handleBackClick}
        >
          ◀ RECORD
        </button>
        <div className="vault-title-container">
          <h1 className="vault-title font-display">THE VAULT</h1>
          <div className="vault-counter font-mono">{recordings ? recordings.length : 0} RECORDINGS ARCHIVED</div>
        </div>
        <div className="vault-header-cap font-mono">RETROVAULT ARCHIVES</div>
      </div>

      {/* Index card search area */}
      <div className="vault-search-bar">
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allTags={allTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
        />
      </div>

      {/* Main Two-Panel Layout */}
      <div className="vault-body">
        {/* Left Side: Shelf / Crate Visuals */}
        <div className="vault-archive">
          <ShelfView
            recordings={recordings}
            selectedRecording={selectedRecording}
            onSelectRecording={setSelectedRecording}
          />
        </div>

        {/* Right Side: Transcript Card details */}
        <div className={`vault-transcript ${selectedRecording ? 'visible' : ''}`}>
          {selectedRecording ? (
            <TranscriptPanel
              recording={selectedRecording}
              onDelete={deleteRecording}
              onClose={() => setSelectedRecording(null)}
              playClick={playClick}
              onPlayback={onPlayback}
            />
          ) : (
            <div className="transcript-empty font-mono">
              SELECT AN ITEM FROM THE ARCHIVE TO VIEW TRANSCRIPT
            </div>
          )}
        </div>
      </div>

      <style>{`
        .vault-screen {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
        }

        /* Vault Header styling */
        .vault-header {
          flex-shrink: 0;
          padding: 16px 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #222;
          padding-bottom: 12px;
          position: relative;
        }

        .vault-title-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .vault-title {
          font-size: 32px;
          color: var(--off-white);
          letter-spacing: 2px;
          text-shadow: 0 0 8px rgba(212, 197, 176, 0.15);
          line-height: 1;
        }

        .vault-counter {
          font-size: 11px;
          color: var(--muted);
          margin-top: 6px;
          letter-spacing: 0.5px;
        }

        .vault-header-cap {
          font-size: 9px;
          color: var(--muted);
          letter-spacing: 1px;
        }

        /* Worn metal badge back button */
        .worn-metal-badge {
          background: linear-gradient(135deg, #333 0%, #151515 100%);
          border: 1.5px solid #222;
          color: var(--off-white);
          font-size: 11px;
          font-weight: bold;
          padding: 6px 14px;
          cursor: pointer;
          border-radius: 3px;
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: all 0.15s ease;
          user-select: none;
        }

        .worn-metal-badge:hover {
          filter: brightness(1.15);
          box-shadow: 
            0 3px 6px rgba(0,0,0,0.7),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .worn-metal-badge:active {
          transform: translateY(1px);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
        }

        .vault-search-bar {
          flex-shrink: 0;
          padding: 12px 24px;
        }

        /* Main Body Grids */
        .vault-body {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 0;
          flex: 1;
          overflow: hidden;
          border-top: 1px solid #1a1a1a;
        }

        .vault-archive {
          overflow-y: auto;
          padding: 20px 24px;
          border-right: 1px solid #1a1a1a;
        }

        .vault-transcript {
          overflow-y: auto;
          padding: 20px 20px;
          background: #0d0d0d;
          display: flex;
          flex-direction: column;
        }

        .vault-transcript.visible {
          /* always visible on desktop */
        }

        .transcript-empty {
          margin: auto;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.1em;
          text-align: center;
          opacity: 0.4;
        }

        /* Mobile Responsive stacking (below 768px): */
        @media (max-width: 768px) {
          .vault-body {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }

          .vault-archive {
            border-right: none;
            border-bottom: 1px solid #1a1a1a;
            overflow-y: visible;
            padding: 16px;
          }

          .vault-transcript {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 70vh;
            border-radius: 12px 12px 0 0;
            border-top: 1px solid #2a1a1a;
            background: #0d0d0d;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            z-index: 200;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .vault-transcript.visible {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
