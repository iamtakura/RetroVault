import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if user dismissed it permanently in the past
    const isDismissed = localStorage.getItem('retrovault-pwa-dismissed') === 'true';
    if (isDismissed) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Clean up prompt
    setInstallPromptEvent(null);
    setIsInstallable(false);
  }, [installPromptEvent]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem('retrovault-pwa-dismissed', 'true');
    setInstallPromptEvent(null);
    setIsInstallable(false);
  }, []);

  return {
    isInstallable,
    installApp,
    dismissPrompt,
  };
}
