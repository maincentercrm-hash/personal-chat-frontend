// src/services/notificationSoundService.ts

/**
 * Notification Sound Service
 * จัดการเสียงแจ้งเตือนเมื่อมีข้อความใหม่
 * ใช้ไฟล์ MP3 จาก public/sound/noti.mp3
 */

const STORAGE_KEY = 'notification_sound_enabled';
const SOUND_PATH = '/sound/noti.mp3';

class NotificationSoundService {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.loadSettings();
    this.initAudio();
  }

  /**
   * Initialize Audio element
   */
  private initAudio(): void {
    try {
      this.audio = new Audio(SOUND_PATH);
      this.audio.volume = this.volume;
      this.audio.preload = 'auto';
      console.log('[NotificationSound] Audio initialized with:', SOUND_PATH);
    } catch (error) {
      console.warn('[NotificationSound] Failed to initialize audio:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    } catch (error) {
      console.warn('[NotificationSound] Failed to load settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.enabled));
    } catch (error) {
      console.warn('[NotificationSound] Failed to save settings:', error);
    }
  }

  /**
   * Play notification sound
   */
  play(): void {
    if (!this.enabled) {
      console.log('[NotificationSound] Sound is disabled, skipping');
      return;
    }

    if (!this.audio) {
      console.warn('[NotificationSound] Audio not initialized');
      this.initAudio();
      if (!this.audio) return;
    }

    try {
      // Reset to beginning if already playing
      this.audio.currentTime = 0;
      this.audio.volume = this.volume;

      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[NotificationSound] Playing noti.mp3');
          })
          .catch(error => {
            console.warn('[NotificationSound] Playback failed:', error);
          });
      }
    } catch (error) {
      console.warn('[NotificationSound] Failed to play sound:', error);
    }
  }

  /**
   * Set whether notification sound is enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveSettings();
    console.log('[NotificationSound] Enabled:', enabled);
  }

  /**
   * Get whether notification sound is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Toggle notification sound on/off
   */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Play a test sound
   */
  playTest(): void {
    const wasEnabled = this.enabled;
    this.enabled = true;
    this.play();
    this.enabled = wasEnabled;
  }
}

// Export singleton instance
export const notificationSound = new NotificationSoundService();

export default notificationSound;
