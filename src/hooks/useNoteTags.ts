// Hook for managing note tags

import { useEffect, useCallback } from 'react';
import { useNotesStore } from '@/stores/notesStore';

/**
 * Hook for managing tags across all notes
 *
 * @example
 * ```tsx
 * const { allTags, isLoading, fetchTags, getTagCount } = useNoteTags();
 *
 * {allTags.map(tag => (
 *   <Badge key={tag}>
 *     {tag} ({getTagCount(tag)})
 *   </Badge>
 * ))}
 * ```
 */
export const useNoteTags = () => {
  const {
    allTags,
    notes,
    isLoading,
    fetchAllTags,
  } = useNotesStore();

  // Fetch tags on mount
  useEffect(() => {
    if (allTags.length === 0) {
      fetchAllTags();
    }
  }, []);

  // Get tag count from notes
  const getTagCount = useCallback(
    (tag: string): number => {
      return notes.filter((note) => note.tags.includes(tag)).length;
    },
    [notes]
  );

  // Get popular tags (tags used most frequently)
  const getPopularTags = useCallback(
    (limit: number = 10): Array<{ tag: string; count: number }> => {
      const tagCounts = new Map<string, number>();

      // Count occurrences
      notes.forEach((note) => {
        note.tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      // Sort by count and return top N
      return Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    [notes]
  );

  // Get recent tags (tags used in recent notes)
  const getRecentTags = useCallback(
    (limit: number = 10): string[] => {
      const seenTags = new Set<string>();
      const recentTags: string[] = [];

      // Sort notes by updated_at (most recent first)
      const sortedNotes = [...notes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Collect unique tags
      for (const note of sortedNotes) {
        for (const tag of note.tags) {
          if (!seenTags.has(tag)) {
            seenTags.add(tag);
            recentTags.push(tag);

            if (recentTags.length >= limit) {
              return recentTags;
            }
          }
        }
      }

      return recentTags;
    },
    [notes]
  );

  // Get suggested tags based on current input
  const getSuggestedTags = useCallback(
    (input: string, currentTags: string[] = [], limit: number = 5): string[] => {
      const trimmedInput = input.trim().toLowerCase();

      if (!trimmedInput) {
        // If no input, return popular tags not already in current tags
        return getPopularTags(limit)
          .map((item) => item.tag)
          .filter((tag) => !currentTags.includes(tag));
      }

      // Filter tags that match input and not already selected
      return allTags
        .filter(
          (tag) =>
            tag.toLowerCase().includes(trimmedInput) &&
            !currentTags.includes(tag)
        )
        .slice(0, limit);
    },
    [allTags, getPopularTags]
  );

  // Validate tag
  const validateTag = useCallback(
    (tag: string): { valid: boolean; error?: string } => {
      const trimmedTag = tag.trim();

      if (!trimmedTag) {
        return { valid: false, error: 'Tag cannot be empty' };
      }

      if (trimmedTag.length > 50) {
        return { valid: false, error: 'Tag must be less than 50 characters' };
      }

      // Check for invalid characters (optional)
      if (!/^[a-zA-Z0-9ก-๙\s_-]+$/.test(trimmedTag)) {
        return {
          valid: false,
          error: 'Tag can only contain letters, numbers, spaces, and hyphens',
        };
      }

      return { valid: true };
    },
    []
  );

  // Normalize tag (trim and lowercase)
  const normalizeTag = useCallback((tag: string): string => {
    return tag.trim().toLowerCase();
  }, []);

  // Check if tag exists
  const tagExists = useCallback(
    (tag: string): boolean => {
      const normalized = normalizeTag(tag);
      return allTags.some((t) => normalizeTag(t) === normalized);
    },
    [allTags, normalizeTag]
  );

  return {
    // Data
    allTags,
    isLoading,

    // Actions
    fetchTags: fetchAllTags,

    // Utilities
    getTagCount,
    getPopularTags,
    getRecentTags,
    getSuggestedTags,
    validateTag,
    normalizeTag,
    tagExists,

    // Computed
    hasAnyTags: allTags.length > 0,
    tagCount: allTags.length,
  };
};
