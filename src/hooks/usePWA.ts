import { useState, useEffect } from 'react';

export function usePWA() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Connection listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Installation prompt capture
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event so it can be triggered later
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Track installation completion
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      console.log('LumiBooth PWA was installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Detect if already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPromptEvent) {
      console.warn('Install prompt not available yet');
      return;
    }
    
    // Show prompt
    installPromptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    }
  };

  return {
    isOnline,
    isInstalled,
    isInstallable: !!installPromptEvent,
    triggerInstall,
  };
}
export default usePWA;
