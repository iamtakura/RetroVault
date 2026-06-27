import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

export default function TranscriptCard({
  status, // 'idle' | 'recording' | 'processing' | 'done' | 'error'
  transcript,
  onSave,
  onDiscard,
  playClick,
}) {
  const containerRef = useRef(null);
  const [title, setTitle] = useState('');
  const [displayedText, setDisplayedText] = useState('');

  // Auto-generate title from first 5 words when transcript changes
  useEffect(() => {
    if (transcript) {
      const words = transcript.trim().split(/\s+/);
      let autoTitle = words.slice(0, 5).join(' ');
      if (words.length > 5) {
        autoTitle += '...';
      }
      setTitle(autoTitle);
    } else {
      setTitle('');
    }
  }, [transcript]);

  // Monospace Typewriter effect
  useEffect(() => {
    if (!transcript) {
      setDisplayedText('');
      return;
    }
    
    setDisplayedText(''); // reset on new transcript
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < transcript.length) {
        setDisplayedText(transcript.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [transcript]);

  // GSAP slide-up / slide-down animation
  useEffect(() => {
    if (status === 'done' || status === 'processing') {
      gsap.to(containerRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
      });
    } else {
      gsap.to(containerRef.current, {
        y: 400,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.in',
      });
    }
  }, [status]);

  const handleSave = () => {
    if (playClick) playClick();
    onSave(title);
  };

  const handleDiscard = () => {
    if (playClick) playClick();
    onDiscard();
  };

  if (status !== 'done' && status !== 'processing') {
    return <div ref={containerRef} className="transcript-card-container hidden" style={{ transform: 'translateY(400px)', opacity: 0 }} />;
  }

  return (
    <div ref={containerRef} className="transcript-card-container">
      {status === 'processing' ? (
        <div className="processing-card">
          <div className="pulsing-led red-led" />
          <div className="processing-text font-display">
            DECODING AUDIO MEMO...
          </div>
          <div className="processing-subtext font-mono">
            Transcribing via Groq Whisper Large v3 Turbo
          </div>
        </div>
      ) : (
        <div className="transcript-card">
          {/* Tape sleeve cardboard header */}
          <div className="card-sleeve-header">
            <span className="card-brand font-display">RETROVAULT RECORDING LOG</span>
            <span className="card-stamp font-mono">CONFIDENTIAL</span>
          </div>

          <div className="card-body">
            {/* Title field (editable label) */}
            <div className="card-field-row">
              <label htmlFor="memo-title" className="card-field-label font-mono">TITLE:</label>
              <input
                id="memo-title"
                type="text"
                className="card-title-input font-mono"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Memo Title..."
              />
            </div>

            {/* Transcript text container */}
            <div className="card-transcript-box font-mono">
              <p className="transcript-body typewriter-text">
                {displayedText}
                <span className="typewriter-cursor">_</span>
              </p>
            </div>

            {/* Buttons Panel */}
            <div className="card-actions-row">
              <button
                type="button"
                className="card-btn btn-discard font-display"
                onClick={handleDiscard}
              >
                DISCARD
              </button>
              <button
                type="button"
                className="card-btn btn-save font-display"
                onClick={handleSave}
              >
                SAVE LOG
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .transcript-card-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 24px;
          z-index: 999;
          pointer-events: auto;
        }

        .transcript-card-container.hidden {
          display: none;
        }

        /* Processing/Transcribing Mode */
        .processing-card {
          background: #111;
          border: 3px solid #222;
          border-radius: 6px;
          padding: 20px 40px;
          width: 480px;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .pulsing-led {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: #ff3b30;
          box-shadow: 0 0 10px #ff3b30;
          animation: led-pulse 1s infinite alternate;
        }

        @keyframes led-pulse {
          from { opacity: 0.3; filter: brightness(0.6); }
          to { opacity: 1; filter: brightness(1.2); }
        }

        .processing-text {
          font-size: 16px;
          color: var(--off-white);
          letter-spacing: 1px;
        }

        .processing-subtext {
          font-size: 10px;
          color: var(--muted);
        }

        /* Transcript sleeve cardboard card */
        .transcript-card {
          background: linear-gradient(
            to bottom,
            #eae3d2 0%,
            #dfd7c2 100%
          );
          border: 1px solid #c5baa3;
          border-radius: 4px;
          width: 520px;
          max-width: 90%;
          box-shadow: 
            0 -10px 40px rgba(0, 0, 0, 0.7),
            0 5px 15px rgba(0, 0, 0, 0.5);
          color: #2b231d;
          overflow: hidden;
          transform: rotate(-0.5deg);
        }

        .card-sleeve-header {
          background: #2b231d;
          color: #dfd7c2;
          display: flex;
          justify-content: space-between;
          padding: 8px 16px;
          font-size: 11px;
          border-bottom: 2px solid #dfd7c2;
        }

        .card-brand {
          letter-spacing: 0.5px;
        }

        .card-stamp {
          font-weight: bold;
          border: 1px solid #b01020;
          color: #b01020;
          padding: 0 4px;
          border-radius: 2px;
          font-size: 9px;
          transform: rotate(-3deg);
        }

        .card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Title Line */
        .card-field-row {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px dashed rgba(43, 35, 29, 0.4);
          padding-bottom: 6px;
        }

        .card-field-label {
          font-size: 12px;
          font-weight: bold;
          color: #5b4f43;
        }

        .card-title-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #111;
          font-size: 14px;
          font-weight: bold;
          outline: none;
        }

        .card-title-input::placeholder {
          color: #8b7f70;
        }

        /* Transcript Content Area */
        .card-transcript-box {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(43, 35, 29, 0.15);
          border-radius: 2px;
          padding: 12px;
          min-height: 120px;
          max-height: 180px;
          overflow-y: auto;
          font-size: 13px;
          line-height: 145%;
          text-align: left;
          color: #1a1a1a;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }

        .typewriter-text {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .transcript-body {
          margin: 0;
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

        /* Action Buttons */
        .card-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 4px;
        }

        .card-btn {
          font-size: 13px;
          font-weight: bold;
          padding: 8px 20px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
          border: 1px solid #2b231d;
          user-select: none;
        }

        .btn-discard {
          background: transparent;
          color: #5b4f43;
          border-color: #9b8f7d;
        }

        .btn-discard:hover {
          background: rgba(0,0,0,0.05);
          color: #2b231d;
        }

        .btn-save {
          background: #2b231d;
          color: #dfd7c2;
        }

        .btn-save:hover {
          background: #463b33;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .card-btn:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
}
