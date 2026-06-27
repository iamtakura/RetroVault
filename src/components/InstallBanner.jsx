import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function InstallBanner({ isVisible, onInstall, onDismiss }) {
  const bannerRef = useRef(null);

  useEffect(() => {
    if (isVisible && bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [isVisible]);

  const handleDismiss = () => {
    if (bannerRef.current) {
      gsap.to(bannerRef.current, {
        y: 80,
        opacity: 0,
        duration: 0.4,
        ease: 'power3.in',
        onComplete: onDismiss,
      });
    } else {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div ref={bannerRef} className="install-banner font-mono">
      <div className="install-label-container">
        <span className="install-text">INSTALL RETROVAULT TO YOUR DEVICE</span>
        <div className="install-actions">
          <button type="button" className="install-btn btn-confirm" onClick={onInstall}>
            [INSTALL]
          </button>
          <button type="button" className="install-btn btn-cancel" onClick={handleDismiss}>
            [NOT NOW]
          </button>
        </div>
      </div>
      <style>{`
        .install-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: #eae3d2;
          border: 1px solid #c5baa3;
          border-radius: 2px;
          padding: 10px 18px;
          width: 450px;
          max-width: 90%;
          box-shadow: 0 8px 30px rgba(0,0,0,0.6);
          color: #2b231d;
          transform-origin: bottom center;
        }

        .install-label-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .install-text {
          font-weight: bold;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .install-actions {
          display: flex;
          gap: 12px;
        }

        .install-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
          padding: 4px 8px;
          transition: opacity 0.15s ease;
        }

        .btn-confirm {
          color: #b01020;
        }

        .btn-confirm:hover {
          opacity: 0.8;
          text-shadow: 0 0 2px rgba(176, 16, 32, 0.2);
        }

        .btn-cancel {
          color: #5b4f43;
        }

        .btn-cancel:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
