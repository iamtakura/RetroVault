import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

export default function TranscriptPanel({ recording, onDelete, onClose, playClick, onPlayback }) {
  const panelRef = useRef(null);
  const [displayedText, setDisplayedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Keep track of which recording has already been typewritten in this session to skip repeats
  const typewrittenRecordingsRef = useRef(new Set());

  // Format duration to M:SS
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Format date to detailed local string
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // GSAP slide-in when the recording changes
  useEffect(() => {
    if (recording && panelRef.current) {
      setShowConfirm(false);
      setCopied(false);

      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        gsap.fromTo(
          panelRef.current,
          { y: '100%', opacity: 1 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
        );
      } else {
        gsap.fromTo(
          panelRef.current,
          { x: 40, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
        );
      }
    }
  }, [recording]);

  // Monospace Typewriter effect
  useEffect(() => {
    if (!recording) return;

    const transcript = recording.transcript || '';
    const hasAlreadyTyped = typewrittenRecordingsRef.current.has(recording.id);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Skip typewriter if already rendered or if user prefers reduced motion
    if (hasAlreadyTyped || prefersReducedMotion) {
      setDisplayedText(transcript);
      return;
    }

    // Otherwise, perform typewriter effect
    let index = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        if (index < transcript.length) {
          const char = transcript.charAt(index);
          index++;
          return prev + char;
        } else {
          clearInterval(interval);
          // Add to completed set
          typewrittenRecordingsRef.current.add(recording.id);
          return prev;
        }
      });
    }, 18); // 18ms delay as requested

    return () => clearInterval(interval);
  }, [recording]);

  const handleCopy = () => {
    if (playClick) playClick();
    if (!recording) return;

    navigator.clipboard.writeText(recording.transcript || '');
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDeleteClick = () => {
    if (playClick) playClick();
    setShowConfirm(true);
  };

  const handleDelete = () => {
    handleDeleteClick();
  };

  const handleCancelDelete = () => {
    if (playClick) playClick();
    setShowConfirm(false);
  };

  const handleConfirmDelete = () => {
    if (playClick) playClick();
    if (recording) {
      onDelete(recording.id);
    }
  };

  if (!recording) {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return null;

    return (
      <div className="transcript-panel-placeholder font-mono">
        SELECT AN ITEM FROM THE ARCHIVE TO VIEW TRANSCRIPT
      </div>
    );
  }

  // Determine format display label
  const formatLabels = {
    cassette: 'TAPE',
    vinyl: 'SESSION',
    reel: 'REEL'
  };
  const formatLabel = formatLabels[recording.format] || 'RECORDING';

  return (
    <div ref={panelRef} className="transcript-panel-card">
      <div className="bottom-sheet-drag-handle" onClick={onClose} title="Close Sheet" />
      {/* Header Panel */}
      <div className="panel-header">
        <div className="badge-row">
          <span className="format-badge font-mono">{formatLabel}</span>
          <span className="panel-duration font-mono">{formatDuration(recording.duration)}</span>
        </div>
        <h2 className="panel-title font-display">{recording.title}</h2>
        <div className="panel-date font-mono">{formatDate(recording.createdAt)}</div>
        
        {recording.tags && recording.tags.length > 0 && (
          <div className="panel-tags-list">
            {recording.tags.map((tag) => (
              <span key={tag} className="tag-pill-badge font-mono">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body transcript text */}
      <div className="panel-body font-mono">
        <p className="transcript-content">
          {displayedText}
          {displayedText.length < (recording.transcript || '').length && (
            <span className="typewriter-cursor">_</span>
          )}
        </p>
      </div>

      {/* Actions Row / Delete Confirmations */}
      <div className="panel-actions">
        {showConfirm ? (
          /* Inline warning label delete prompt */
          <div className="delete-confirm-prompt">
            <span className="confirm-label font-mono">ERASE THIS RECORDING?</span>
            <div className="confirm-buttons">
              <button
                type="button"
                className="confirm-btn btn-no font-mono"
                onClick={handleCancelDelete}
              >
                [NO]
              </button>
              <button
                type="button"
                className="confirm-btn btn-yes font-mono"
                onClick={handleConfirmDelete}
              >
                [YES]
              </button>
            </div>
          </div>
        ) : (
          <div className="transcript-actions">
            <button
              className="btn-action btn-playback"
              style={!recording.audioBlob ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
              title={!recording.audioBlob ? 'No audio saved for this recording' : 'Play back the audio recording'}
              onClick={() => {
                if (recording.audioBlob) onPlayback(recording);
              }}
            >
              ▶ PLAY RECORDING
            </button>
            <button
              className="btn-action btn-copy"
              onClick={handleCopy}
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
            <button
              className="btn-action btn-delete"
              onClick={handleDelete}
            >
              DELETE
            </button>
          </div>
        )}
      </div>

      <style>{`
        .transcript-panel-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--muted);
          font-size: 11px;
          border: 2px dashed #1a1a1a;
          border-radius: 4px;
          padding: 40px 24px;
          box-sizing: border-box;
          opacity: 0.8;
        }

        .transcript-panel-card {
          background: linear-gradient(180deg, #161616 0%, #0d0d0d 100%);
          border: 2px solid #222;
          border-radius: 6px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
          box-sizing: border-box;
        }

        .panel-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-bottom: 2px solid #222;
          padding-bottom: 16px;
        }

        .badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .format-badge {
          background: transparent;
          border: 1.5px solid var(--crimson-bright);
          color: var(--crimson-bright);
          font-weight: bold;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 2px;
          letter-spacing: 1px;
        }

        .panel-duration {
          font-size: 11px;
          color: var(--muted);
        }

        .panel-title {
          font-size: 20px;
          color: var(--off-white);
          margin-top: 4px;
          line-height: 120%;
        }

        .panel-date {
          font-size: 10px;
          color: var(--muted);
        }

        .panel-tags-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .tag-pill-badge {
          font-size: 10px;
          border: 1px solid var(--crimson-deep);
          color: var(--muted);
          background: transparent;
          border-radius: 10px;
          padding: 1px 6px;
        }

        /* Body Area */
        .panel-body {
          flex: 1;
          overflow-y: auto;
          min-height: 180px;
          max-height: 380px;
          padding-right: 8px;
        }

        .transcript-content {
          font-size: 14px;
          color: var(--off-white);
          line-height: 1.8; /* readable, not cramped */
          text-align: left;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .typewriter-cursor {
          display: inline-block;
          font-weight: bold;
          color: var(--crimson-bright);
          animation: cursor-blink 0.8s infinite;
        }

        @keyframes cursor-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        /* Actions row */
        .panel-actions {
          border-top: 1.5px solid #222;
          padding-top: 16px;
          margin-top: auto;
        }

        .transcript-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
        }

        .btn-action {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--off-white);
          background: transparent;
          border: 1px solid var(--muted);
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .btn-action:hover {
          background: #1c1c1c;
          border-color: var(--off-white);
        }

        .btn-playback {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--off-white);
          background: transparent;
          border: 1px solid var(--crimson);
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .btn-playback:hover {
          background: var(--crimson);
          color: var(--black);
        }

        .btn-delete {
          color: var(--crimson-bright);
          border-color: var(--crimson-deep);
        }

        .btn-delete:hover {
          background: rgba(176, 16, 32, 0.08);
          border-color: var(--crimson-bright);
          color: var(--crimson-bright);
        }

        /* Delete Confirm Box */
        .delete-confirm-prompt {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #2b1111;
          border: 2px solid var(--crimson-deep);
          border-radius: 3px;
          padding: 10px 16px;
          color: #ff5555;
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
        }

        .confirm-label {
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
        }

        .confirm-btn {
          background: transparent;
          border: none;
          color: #ff5555;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 6px;
          transition: all 0.1s ease;
        }

        .confirm-btn:hover {
          text-shadow: 0 0 5px #ff5555;
          transform: scale(1.05);
        }

        .btn-yes {
          color: #ff3b30;
        }

        .bottom-sheet-drag-handle {
          display: none;
        }

        @media (max-width: 768px) {
          .bottom-sheet-drag-handle {
            display: block;
            width: 40px;
            height: 5px;
            background: #444;
            border-radius: 3px;
            margin: 0 auto 10px auto;
            cursor: pointer;
            border: 1px solid #222;
          }
          
          .transcript-panel-card {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 70vh;
            border-radius: 12px 12px 0 0;
            border: none;
            border-top: 2px solid #222;
            z-index: 1100;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.9);
            padding: 16px 20px 24px 20px;
            display: flex;
            flex-direction: column;
          }

          .panel-body {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 70px;
          }

          .panel-actions {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #0d0d0d;
            padding: 16px 20px;
            border-top: 1px solid #222;
            z-index: 10;
          }
        }
      `}</style>
    </div>
  );
}
