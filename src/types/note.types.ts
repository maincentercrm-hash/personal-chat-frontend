// Frontend TypeScript types for Notes/Memo

// ============ Core Types ============

export type NoteVisibility = 'private' | 'shared';

export interface Note {
  id: string;
  user_id: string;
  conversation_id?: string | null; // 🆕 Optional - null = global, uuid = conversation-scoped
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  visibility: NoteVisibility; // 🆕 private = เห็นแค่เจ้าของ, shared = เห็นทุกคนใน conversation
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

// ============ Request Types ============

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  conversation_id?: string | null; // 🆕 Optional - attach to conversation
  visibility?: NoteVisibility; // 🆕 private (default) หรือ shared
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  visibility?: NoteVisibility; // 🆕 เปลี่ยน visibility
}

export interface SearchNotesParams {
  query?: string;
  tags?: string[];
  is_pinned?: boolean;
  conversation_id?: string; // 🆕 Filter by conversation
  scope?: 'all' | 'global' | 'conversation'; // 🆕 Filter scope
  page?: number;
  limit?: number;
}

export interface GetNotesParams {
  page?: number;
  limit?: number;
  is_pinned?: boolean;
  conversation_id?: string; // 🆕 Filter by conversation
  scope?: 'all' | 'global' | 'conversation'; // 🆕 Filter scope
}

// ============ Response Types ============

export interface NoteResponse {
  success: boolean;
  message: string;
  data: Note;
}

export interface NotesListResponse {
  success: boolean;
  message: string;
  data: {
    notes: Note[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface SearchNotesResponse {
  success: boolean;
  message: string;
  data: {
    notes: Note[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface TagsResponse {
  success: boolean;
  message: string;
  data: {
    tags: string[];
  };
}

export interface DeleteNoteResponse {
  success: boolean;
  message: string;
}

// ============ UI State Types ============

export type NoteViewMode = 'list' | 'editor' | 'both';

export interface NoteEditorState {
  isEditing: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  currentNoteId: string | null;
  draftTitle: string;
  draftContent: string;
  draftTags: string[];
  draftVisibility: NoteVisibility;
  draftConversationId: string | null;
}

export interface NoteFilters {
  searchQuery: string;
  selectedTags: string[];
  showPinnedOnly: boolean;
}

export interface NotesUIState {
  viewMode: NoteViewMode;
  selectedNoteId: string | null;
  filters: NoteFilters;
  isSearching: boolean;
  editorState: NoteEditorState;
}

// ============ Store State Types ============

export interface NotesState {
  // Notes data
  notes: Note[];
  selectedNote: Note | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalNotes: number;
  limit: number;

  // Search & Filter
  searchResults: Note[];
  allTags: string[];
  filters: NoteFilters;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Editor State
  editorState: NoteEditorState;

  // Actions
  fetchNotes: (params?: GetNotesParams) => Promise<void>;
  fetchNoteById: (noteId: string) => Promise<void>;
  createNote: (data: CreateNoteRequest) => Promise<Note | null>;
  updateNote: (noteId: string, data: UpdateNoteRequest) => Promise<Note | null>;
  deleteNote: (noteId: string) => Promise<boolean>;

  searchNotes: (params: SearchNotesParams) => Promise<void>;
  fetchAllTags: () => Promise<void>;

  pinNote: (noteId: string) => Promise<boolean>;
  unpinNote: (noteId: string) => Promise<boolean>;

  // UI Actions
  selectNote: (note: Note | null) => void;
  setFilters: (filters: Partial<NoteFilters>) => void;
  clearFilters: () => void;

  // Editor Actions
  startEditing: (note?: Note) => void;
  cancelEditing: () => void;
  updateDraft: (field: 'title' | 'content' | 'tags' | 'visibility', value: string | string[]) => void;
  saveDraft: () => Promise<boolean>;

  // Utility
  clearError: () => void;
  reset: () => void;

  // WebSocket Event Handlers
  handleNoteCreated: (note: Note) => void;
  handleNoteUpdated: (note: Note) => void;
  handleNoteDeleted: (noteId: string) => void;
}
