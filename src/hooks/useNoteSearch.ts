// Hook for searching notes with debouncing

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotesStore } from '@/stores/notesStore';
import { NOTE_TIMINGS } from '@/constants/noteConstants';
import type { SearchNotesParams } from '@/types/note.types';

/**
 * Hook for searching notes with debounced query
 *
 * @example
 * ```tsx
 * const { searchQuery, searchResults, isSearching, setSearchQuery, clearSearch } = useNoteSearch();
 *
 * <input
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 *   placeholder="Search notes..."
 * />
 * ```
 */
export const useNoteSearch = () => {
  const {
    searchNotes,
    searchResults,
    isLoading,
    filters,
    setFilters,
    clearFilters,
  } = useNotesStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(filters.searchQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSearchingRef = useRef(false);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if query is too short
    if (localSearchQuery.trim().length > 0 && localSearchQuery.trim().length < 2) {
      return;
    }

    // Set new debounced timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch();
    }, NOTE_TIMINGS.SEARCH_DEBOUNCE);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localSearchQuery, filters.selectedTags, filters.showPinnedOnly]);

  // Perform search
  const performSearch = useCallback(async () => {
    const trimmedQuery = localSearchQuery.trim();

    // Update filters
    setFilters({ searchQuery: trimmedQuery });

    // Empty query = show all notes
    if (!trimmedQuery && filters.selectedTags.length === 0 && !filters.showPinnedOnly) {
      return;
    }

    isSearchingRef.current = true;

    const params: SearchNotesParams = {
      query: trimmedQuery || undefined,
      tags: filters.selectedTags.length > 0 ? filters.selectedTags : undefined,
      is_pinned: filters.showPinnedOnly || undefined,
      page: 1,
      limit: 20,
    };

    await searchNotes(params);
    isSearchingRef.current = false;
  }, [localSearchQuery, filters.selectedTags, filters.showPinnedOnly, searchNotes, setFilters]);

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    setLocalSearchQuery(query);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setLocalSearchQuery('');
    clearFilters();
  }, [clearFilters]);

  // Toggle tag filter
  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = filters.selectedTags.includes(tag)
        ? filters.selectedTags.filter((t) => t !== tag)
        : [...filters.selectedTags, tag];

      setFilters({ selectedTags: newTags });
    },
    [filters.selectedTags, setFilters]
  );

  // Toggle pinned filter
  const togglePinnedFilter = useCallback(() => {
    setFilters({ showPinnedOnly: !filters.showPinnedOnly });
  }, [filters.showPinnedOnly, setFilters]);

  // Check if actively searching
  const isActiveSearch =
    localSearchQuery.trim().length > 0 ||
    filters.selectedTags.length > 0 ||
    filters.showPinnedOnly;

  return {
    // State
    searchQuery: localSearchQuery,
    searchResults,
    isSearching: isLoading && isSearchingRef.current,
    isActiveSearch,

    // Filters
    selectedTags: filters.selectedTags,
    showPinnedOnly: filters.showPinnedOnly,

    // Actions
    setSearchQuery,
    clearSearch,
    toggleTag,
    togglePinnedFilter,
    performSearch,
  };
};
