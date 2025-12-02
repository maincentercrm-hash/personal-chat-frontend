// Zustand store for Notes/Memo feature

import { create } from 'zustand';
import type {
  NotesState,
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  SearchNotesParams,
  GetNotesParams,
  NoteFilters,
} from '@/types/note.types';
import notesService from '@/services/notesService';
import { PAGINATION } from '@/constants/noteConstants';

const initialFilters: NoteFilters = {
  searchQuery: '',
  selectedTags: [],
  showPinnedOnly: false,
};

const initialEditorState = {
  isEditing: false,
  isSaving: false,
  hasUnsavedChanges: false,
  currentNoteId: null,
  draftTitle: '',
  draftContent: '',
  draftTags: [] as string[],
};

export const useNotesStore = create<NotesState>((set, get) => ({
  // Initial State
  notes: [],
  selectedNote: null,
  currentPage: 1,
  totalPages: 1,
  totalNotes: 0,
  limit: PAGINATION.DEFAULT_LIMIT,
  searchResults: [],
  allTags: [],
  filters: initialFilters,
  isLoading: false,
  isSaving: false,
  error: null,
  editorState: initialEditorState,

  // ============ Fetch Notes ============
  fetchNotes: async (params?: GetNotesParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesService.getNotes({
        page: params?.page || get().currentPage,
        limit: params?.limit || get().limit,
        is_pinned: params?.is_pinned,
        conversation_id: params?.conversation_id, // 🆕 Pass conversation_id
        scope: params?.scope, // 🆕 Pass scope
      });

      set({
        notes: response.notes,
        currentPage: response.pagination.page,
        totalPages: response.pagination.total_pages,
        totalNotes: response.pagination.total,
        limit: response.pagination.limit,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notes';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // ============ Fetch Single Note ============
  fetchNoteById: async (noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const note = await notesService.getNoteById(noteId);
      set({
        selectedNote: note,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch note';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // ============ Create Note ============
  createNote: async (data: CreateNoteRequest) => {
    set({ isSaving: true, error: null });
    try {
      const newNote = await notesService.createNote(data);

      // Add to notes list (prepend to show at top)
      set((state) => ({
        notes: [newNote, ...state.notes],
        selectedNote: newNote,
        totalNotes: state.totalNotes + 1,
        isSaving: false,
      }));

      return newNote;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create note';
      set({ error: errorMessage, isSaving: false });
      return null;
    }
  },

  // ============ Update Note ============
  updateNote: async (noteId: string, data: UpdateNoteRequest) => {
    set({ isSaving: true, error: null });
    try {
      const updatedNote = await notesService.updateNote(noteId, data);

      // Update in notes list
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId ? updatedNote : note
        ),
        selectedNote:
          state.selectedNote?.id === noteId ? updatedNote : state.selectedNote,
        isSaving: false,
      }));

      return updatedNote;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note';
      set({ error: errorMessage, isSaving: false });
      return null;
    }
  },

  // ============ Delete Note ============
  deleteNote: async (noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      await notesService.deleteNote(noteId);

      // Remove from notes list
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== noteId),
        selectedNote:
          state.selectedNote?.id === noteId ? null : state.selectedNote,
        totalNotes: state.totalNotes - 1,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  // ============ Search Notes ============
  searchNotes: async (params: SearchNotesParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesService.searchNotes({
        query: params.query,
        tags: params.tags,
        is_pinned: params.is_pinned,
        conversation_id: params.conversation_id, // 🆕 Pass conversation_id
        scope: params.scope, // 🆕 Pass scope
        page: params.page || 1,
        limit: params.limit || get().limit,
      });

      set({
        searchResults: response.notes,
        currentPage: response.pagination.page,
        totalPages: response.pagination.total_pages,
        totalNotes: response.pagination.total,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search notes';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // ============ Fetch All Tags ============
  fetchAllTags: async () => {
    try {
      const tags = await notesService.getAllTags();
      set({ allTags: tags });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tags';
      set({ error: errorMessage });
    }
  },

  // ============ Pin Note ============
  pinNote: async (noteId: string) => {
    try {
      await notesService.pinNote(noteId);

      // ✅ Backend doesn't return updated note, so we update locally
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId ? { ...note, is_pinned: true } : note
        ),
        selectedNote:
          state.selectedNote?.id === noteId
            ? { ...state.selectedNote, is_pinned: true }
            : state.selectedNote,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pin note';
      set({ error: errorMessage });
      return false;
    }
  },

  // ============ Unpin Note ============
  unpinNote: async (noteId: string) => {
    try {
      await notesService.unpinNote(noteId);

      // ✅ Backend doesn't return updated note, so we update locally
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId ? { ...note, is_pinned: false } : note
        ),
        selectedNote:
          state.selectedNote?.id === noteId
            ? { ...state.selectedNote, is_pinned: false }
            : state.selectedNote,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unpin note';
      set({ error: errorMessage });
      return false;
    }
  },

  // ============ UI Actions ============

  selectNote: (note: Note | null) => {
    set({ selectedNote: note });
  },

  setFilters: (filters: Partial<NoteFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: initialFilters });
  },

  // ============ Editor Actions ============

  startEditing: (note?: Note) => {
    if (note) {
      // Edit existing note
      set({
        editorState: {
          isEditing: true,
          isSaving: false,
          hasUnsavedChanges: false,
          currentNoteId: note.id,
          draftTitle: note.title,
          draftContent: note.content,
          draftTags: note.tags,
        },
        selectedNote: note,
      });
    } else {
      // Create new note
      set({
        editorState: {
          isEditing: true,
          isSaving: false,
          hasUnsavedChanges: false,
          currentNoteId: null,
          draftTitle: '',
          draftContent: '',
          draftTags: [],
        },
        selectedNote: null,
      });
    }
  },

  cancelEditing: () => {
    set({
      editorState: initialEditorState,
    });
  },

  updateDraft: (field: 'title' | 'content' | 'tags', value: string | string[]) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        hasUnsavedChanges: true,
        [`draft${field.charAt(0).toUpperCase() + field.slice(1)}`]: value,
      },
    }));
  },

  saveDraft: async () => {
    const { editorState } = get();
    const { currentNoteId, draftTitle, draftContent, draftTags } = editorState;

    set((state) => ({
      editorState: { ...state.editorState, isSaving: true },
    }));

    try {
      let savedNote: Note | null = null;

      if (currentNoteId) {
        // Update existing note
        savedNote = await get().updateNote(currentNoteId, {
          title: draftTitle,
          content: draftContent,
          tags: draftTags,
        });
      } else {
        // Create new note
        savedNote = await get().createNote({
          title: draftTitle,
          content: draftContent,
          tags: draftTags,
        });
      }

      if (savedNote) {
        set((state) => ({
          editorState: {
            ...state.editorState,
            hasUnsavedChanges: false,
            isSaving: false,
            currentNoteId: savedNote!.id,
          },
          selectedNote: savedNote,
        }));
        return true;
      } else {
        set((state) => ({
          editorState: { ...state.editorState, isSaving: false },
        }));
        return false;
      }
    } catch (error) {
      set((state) => ({
        editorState: { ...state.editorState, isSaving: false },
      }));
      return false;
    }
  },

  // ============ Utility ============

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      notes: [],
      selectedNote: null,
      currentPage: 1,
      totalPages: 1,
      totalNotes: 0,
      limit: PAGINATION.DEFAULT_LIMIT,
      searchResults: [],
      allTags: [],
      filters: initialFilters,
      isLoading: false,
      isSaving: false,
      error: null,
      editorState: initialEditorState,
    });
  },
}));
