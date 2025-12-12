/**
 * useHeightCache - Caches measured heights for virtual scroll optimization
 *
 * Features:
 * - Stores measured item heights by message ID
 * - Persists between renders
 * - Cleans up old entries automatically
 * - Used by Virtuoso for accurate scroll position
 */

import { useRef, useCallback, useMemo } from 'react';
import type { HeightCache, HeightCacheEntry } from './types';

// ============================================
// Constants
// ============================================

/** Max number of entries before cleanup */
const MAX_CACHE_SIZE = 500;

/** Entries older than this (ms) get cleaned up */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Default height estimate for unmeasured items */
const DEFAULT_HEIGHT = 48;

// ============================================
// Types
// ============================================

interface UseHeightCacheOptions {
  /** Callback when cache is invalidated */
  onInvalidate?: () => void;
}

interface UseHeightCacheReturn extends HeightCache {
  /** Get height or default */
  getOrDefault: (messageId: string) => number;

  /** Invalidate specific entry */
  invalidate: (messageId: string) => void;

  /** Get all cached heights (for Virtuoso state) */
  getState: () => Map<string, number>;
}

// ============================================
// Hook
// ============================================

export function useHeightCache(
  options: UseHeightCacheOptions = {}
): UseHeightCacheReturn {
  const { onInvalidate } = options;

  // Cache storage
  const cacheRef = useRef<Map<string, HeightCacheEntry>>(new Map());
  const cleanupTimeRef = useRef<number>(Date.now());

  // Cleanup old entries
  const cleanup = useCallback(() => {
    const cache = cacheRef.current;
    const now = Date.now();

    // Only run cleanup if cache is large
    if (cache.size < MAX_CACHE_SIZE) return;

    // Remove old entries
    const cutoff = now - CACHE_TTL;
    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < cutoff) {
        cache.delete(key);
      }
    }

    cleanupTimeRef.current = now;
  }, []);

  // Get height from cache
  const get = useCallback((messageId: string): number | undefined => {
    const entry = cacheRef.current.get(messageId);
    return entry?.height;
  }, []);

  // Set height in cache
  const set = useCallback((messageId: string, height: number) => {
    // Skip invalid heights
    if (height <= 0 || !isFinite(height)) return;

    const cache = cacheRef.current;
    const existing = cache.get(messageId);

    // Skip if height hasn't changed significantly (within 1px)
    if (existing && Math.abs(existing.height - height) < 1) {
      return;
    }

    cache.set(messageId, {
      height,
      timestamp: Date.now(),
    });

    // Trigger cleanup periodically
    if (cache.size > MAX_CACHE_SIZE) {
      cleanup();
    }
  }, [cleanup]);

  // Check if exists in cache
  const has = useCallback((messageId: string): boolean => {
    return cacheRef.current.has(messageId);
  }, []);

  // Clear entire cache
  const clear = useCallback(() => {
    cacheRef.current.clear();
    onInvalidate?.();
  }, [onInvalidate]);

  // Get height or return default
  const getOrDefault = useCallback((messageId: string): number => {
    return get(messageId) ?? DEFAULT_HEIGHT;
  }, [get]);

  // Invalidate single entry
  const invalidate = useCallback((messageId: string) => {
    cacheRef.current.delete(messageId);
    onInvalidate?.();
  }, [onInvalidate]);

  // Get state for Virtuoso
  const getState = useCallback((): Map<string, number> => {
    const result = new Map<string, number>();
    for (const [key, entry] of cacheRef.current.entries()) {
      result.set(key, entry.height);
    }
    return result;
  }, []);

  // Return memoized object
  return useMemo(() => ({
    get,
    set,
    has,
    clear,
    getOrDefault,
    invalidate,
    getState,
  }), [get, set, has, clear, getOrDefault, invalidate, getState]);
}

export default useHeightCache;
