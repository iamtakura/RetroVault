import React from 'react';

export default function EmptyVault() {
  return (
    <div className="empty-vault-container">
      {/* Drifting Dust Particles */}
      <div className="dust-particle dust-1" />
      <div className="dust-particle dust-2" />

      <h3 className="empty-title font-display">THE VAULT IS EMPTY</h3>
      <p className="empty-subtext font-mono">START RECORDING TO FILL IT</p>

      <style>{`
        .empty-vault-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          position: relative;
          width: 100%;
          overflow: hidden;
          opacity: 0.65;
        }

        /* Dust particles */
        .dust-particle {
          position: absolute;
          background: rgba(212, 197, 176, 0.4);
          border-radius: 50%;
          pointer-events: none;
        }

        .dust-1 {
          width: 2px;
          height: 2px;
          top: 10%;
          left: 30%;
          animation: drift-slow 12s infinite linear;
        }

        .dust-2 {
          width: 3px;
          height: 3px;
          top: 20%;
          left: 70%;
          animation: drift-slower 16s infinite linear;
          animation-delay: 3s;
        }

        @keyframes drift-slow {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translate(40px, 160px);
            opacity: 0;
          }
        }

        @keyframes drift-slower {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          15% {
            opacity: 0.3;
          }
          85% {
            opacity: 0.3;
          }
          100% {
            transform: translate(-50px, 200px);
            opacity: 0;
          }
        }

        /* Typography */
        .empty-title {
          font-size: 18px;
          color: var(--muted);
          letter-spacing: 2px;
          margin-bottom: 8px;
        }

        .empty-subtext {
          font-size: 11px;
          color: var(--muted);
          opacity: 0.8;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
