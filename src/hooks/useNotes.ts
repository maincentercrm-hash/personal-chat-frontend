// Main hook for Notes feature

import { useEffect, useCallback } from 'react';
import { useNotesStore } from '@/stores/notesStore';
import type { GetNotesParams } from '@/types/note.types';

/**
 * Main hook for accessing and managing notes
 *
 * @example
 * ```tsx
 * const { notes, isLoading, fetchNotes, deleteNote } = useNotes();
 *
 * useEffect(() => {
 *   fetchNotes({ page: 1, limit: 20 });
 * }, [fetchNotes]);
 * ```
 */
export const useNotes = () => {
  const {
    notes,
    selectedNote,
    currentPage,
    totalPages,
    totalNotes,
    limit,
    isLoading,
    isSaving,
    error,
    fetchNotes,
    fetchNoteById,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    unpinNote,
    selectNote,
    clearError,
  } = useNotesStore();

  // Fetch notes on mount
  useEffect(() => {
    if (notes.length === 0) {
      fetchNotes();
    }
  }, []);

  // Toggle pin/unpin
  const togglePin = useCallback(
    async (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return false;

      if (note.is_pinned) {
        return await unpinNote(noteId);
      } else {
        return await pinNote(noteId);
      }
    },
    [notes, pinNote, unpinNote]
  );

  // Load more notes (pagination)
  const loadMore = useCallback(
    async (params?: Omit<GetNotesParams, 'page'>) => {
      if (currentPage < totalPages) {
        await fetchNotes({ ...params, page: currentPage + 1 });
      }
    },
    [currentPage, totalPages, fetchNotes]
  );

  // Refresh notes
  const refresh = useCallback(async () => {
    await fetchNotes({ page: 1 });
  }, [fetchNotes]);

  return {
    // Data
    notes,
    selectedNote,
    currentPage,
    totalPages,
    totalNotes,
    limit,

    // State
    isLoading,
    isSaving,
    error,

    // Actions
    fetchNotes,
    fetchNoteById,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    unpinNote,
    togglePin,
    selectNote,
    loadMore,
    refresh,
    clearError,

    // Computed
    hasMore: currentPage < totalPages,
    isEmpty: notes.length === 0,
  };
};
