/**
 * Storage migration and preservation across deployments.
 *
 * Ensures that player data doesn't get lost when the app is redeployed.
 * This is a safeguard against localStorage being cleared by browser caches.
 */

const STORAGE_CHECKPOINT_KEY = 'lok-lingu-storage-checkpoint';
const STORAGE_BACKUP_KEY = 'lok-lingu-storage-backup';

export function initializeStorageMigration(): void {
  try {
    const checkpoint = localStorage.getItem(STORAGE_CHECKPOINT_KEY);
    const now = Date.now();

    // If we have a checkpoint and it's recent (less than 1 hour old),
    // trust that storage is working normally.
    if (checkpoint) {
      const checkpointTime = parseInt(checkpoint, 10);
      if (now - checkpointTime < 3600000) {
        // Update checkpoint
        localStorage.setItem(STORAGE_CHECKPOINT_KEY, String(now));
        return;
      }
    }

    // Checkpoint is missing or stale. Check if critical keys exist.
    const criticalKeys = [
      'lok-lingu-lang',
      'lok-lingu-username',
    ];

    const hasCriticalData = criticalKeys.some(key => localStorage.getItem(key) !== null);

    if (!hasCriticalData) {
      // Try to restore from backup if it exists
      const backup = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (backup) {
        try {
          const restored = JSON.parse(backup) as Record<string, string>;
          for (const [key, value] of Object.entries(restored)) {
            localStorage.setItem(key, value);
          }
          console.log('✓ Storage restored from backup');
        } catch (e) {
          console.warn('Could not restore storage from backup:', e);
        }
      }
    }

    // Update checkpoint for next run
    localStorage.setItem(STORAGE_CHECKPOINT_KEY, String(now));

    // Create backup of current state (keep it compact - just critical data)
    const backup: Record<string, string> = {};
    const backupKeys = [
      'lok-lingu-lang',
      'lok-lingu-cat',
      'lok-lingu-username',
      'lok-lingu-userid',
      'lok-lingu-lifetime-tokens',
      'lok-lingu-lifetime-en',
      'lok-lingu-lifetime-es',
      'lok-lingu-lifetime-fr',
      'lok-lingu-lifetime-de',
      'lok-lingu-lifetime-ja',
    ];

    for (const key of backupKeys) {
      const value = localStorage.getItem(key);
      if (value) backup[key] = value;
    }

    if (Object.keys(backup).length > 0) {
      localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(backup));
    }
  } catch (e) {
    // Storage not available (private browsing, etc.)
    console.debug('Storage migration check failed (likely private browsing)', e);
  }
}
