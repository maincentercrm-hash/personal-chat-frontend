// Hook for Note Editor with auto-save functionality

import { useEffect, useCallback, useRef } from 'react';
import { useNotesStore } from '@/stores/notesStore';
import { NOTE_TIMINGS } from '@/constants/noteConstants';

/**
 * Hook for managing note editor state with auto-save
 *
 * @example
 * ```tsx
 * const {
 *   isEditing,
 *   draftTitle,
 *   draftContent,
 *   hasUnsavedChanges,
 *   updateTitle,
 *   updateContent,
 *   save,
 *   cancel
 * } = useNoteEditor();
 * ```
 */
export const useNoteEditor = () => {
  const {
    editorState,
    isSaving,
    startEditing,
    cancelEditing,
    updateDraft,
    saveDraft,
    selectedNote,
  } = useNotesStore();

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save when content changes
  useEffect(() => {
    if (editorState.hasUnsavedChanges && editorState.isEditing) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new auto-save timer
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, NOTE_TIMINGS.AUTO_SAVE_DELAY);
    }

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editorState.hasUnsavedChanges, editorState.draftTitle, editorState.draftContent, editorState.draftTags]);

  // Warn user about unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editorState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Do you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editorState.hasUnsavedChanges]);

  // Update title
  const updateTitle = useCallback(
    (title: string) => {
      updateDraft('title', title);
    },
    [updateDraft]
  );

  // Update content
  const updateContent = useCallback(
    (content: string) => {
      updateDraft('content', content);
    },
    [updateDraft]
  );

  // Update tags
  const updateTags = useCallback(
    (tags: string[]) => {
      updateDraft('tags', tags);
    },
    [updateDraft]
  );

  // Update visibility
  const updateVisibility = useCallback(
    (visibility: 'private' | 'shared') => {
      updateDraft('visibility', visibility);
    },
    [updateDraft]
  );

  // Add a single tag
  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim();
      if (trimmedTag && !editorState.draftTags.includes(trimmedTag)) {
        updateDraft('tags', [...editorState.draftTags, trimmedTag]);
      }
    },
    [editorState.draftTags, updateDraft]
  );

  // Remove a tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      updateDraft('tags', editorState.draftTags.filter((tag) => tag !== tagToRemove));
    },
    [editorState.draftTags, updateDraft]
  );

  // Manual save
  const save = useCallback(async () => {
    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    return await saveDraft();
  }, [saveDraft]);

  // Cancel editing
  const cancel = useCallback(() => {
    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Warn if unsaved changes
    if (editorState.hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirm) return;
    }

    cancelEditing();
  }, [editorState.hasUnsavedChanges, cancelEditing]);

  return {
    // State
    isEditing: editorState.isEditing,
    isSaving,
    hasUnsavedChanges: editorState.hasUnsavedChanges,
    currentNoteId: editorState.currentNoteId,
    draftTitle: editorState.draftTitle,
    draftContent: editorState.draftContent,
    draftTags: editorState.draftTags,
    draftVisibility: editorState.draftVisibility,
    draftConversationId: editorState.draftConversationId,
    selectedNote,

    // Actions
    startEditing,
    updateTitle,
    updateContent,
    updateTags,
    updateVisibility,
    addTag,
    removeTag,
    save,
    cancel,
  };
};
