import React, { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageWarning, setStorageWarning] = useState(false);

  const checkStorage = async () => {
    if (navigator.storage?.estimate) {
      try {
        const { usage, quota } = await navigator.storage.estimate();
        const percentUsed = (usage / quota) * 100;
        if (percentUsed > 80) {
          console.warn('[STORAGE] Vault is over 80% full');
          setStorageWarning(true);
        } else {
          setStorageWarning(false);
        }
      } catch (err) {
        console.error('Failed to estimate storage:', err);
      }
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkStorage();

    const handleStorageChange = () => {
      checkStorage();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('retrovault-saved', handleStorageChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('retrovault-saved', handleStorageChange);
    };
  }, []);

  return (
    <div className="db-indicator">
      {isOnline ? (
        storageWarning ? (
          <>
            VAULT STORAGE:{' '}
            <span className="status-val font-mono" style={{ color: '#c4820a', fontWeight: 'bold' }}>
              80% FULL — CONSIDER CLEARING OLD RECORDINGS
            </span>
          </>
        ) : (
          <>
            LOCAL STORAGE: <span className="status-val status-idle">ACTIVE</span>
          </>
        )
      ) : (
        <span className="status-offline font-mono pulsing-offline">
          OFFLINE MODE — RECORDINGS SAVED LOCALLY
        </span>
      )}
      <style>{`
        .status-offline {
          color: var(--crimson-bright);
          text-shadow: 0 0 6px var(--crimson-glow);
          font-weight: bold;
        }

        .pulsing-offline {
          animation: offline-glow-pulse 1.5s infinite alternate ease-in-out;
        }

        @keyframes offline-glow-pulse {
          from { opacity: 0.65; filter: brightness(0.8); }
          to { opacity: 1; filter: brightness(1.2); }
        }
      `}</style>
    </div>
  );
}
