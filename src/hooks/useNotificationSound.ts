// src/hooks/useNotificationSound.ts
import { useCallback, useState } from 'react';
import notificationSound from '@/services/notificationSoundService';

/**
 * Custom hook สำหรับจัดการเสียงแจ้งเตือน
 */
export function useNotificationSound() {
  const [isEnabled, setIsEnabled] = useState(() => notificationSound.isEnabled());
  const [volume, setVolume] = useState(() => notificationSound.getVolume());

  // Audio is initialized in constructor of notificationSoundService
  // First user interaction requirement is handled by browser autoplay policy

  // Toggle sound on/off
  const toggle = useCallback(() => {
    const newEnabled = notificationSound.toggle();
    setIsEnabled(newEnabled);
    return newEnabled;
  }, []);

  // Enable sound
  const enable = useCallback(() => {
    notificationSound.setEnabled(true);
    setIsEnabled(true);
  }, []);

  // Disable sound
  const disable = useCallback(() => {
    notificationSound.setEnabled(false);
    setIsEnabled(false);
  }, []);

  // Change volume
  const changeVolume = useCallback((newVolume: number) => {
    notificationSound.setVolume(newVolume);
    setVolume(newVolume);
  }, []);

  // Play test sound
  const playTest = useCallback(() => {
    notificationSound.playTest();
  }, []);

  return {
    isEnabled,
    volume,
    toggle,
    enable,
    disable,
    changeVolume,
    playTest,
  };
}

export default useNotificationSound;
