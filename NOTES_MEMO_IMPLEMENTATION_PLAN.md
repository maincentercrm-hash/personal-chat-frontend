# Notes/Memo Feature - Frontend Implementation Plan

**Date:** 2025-01-02
**Backend Status:** ✅ 100% Complete & Ready
**Frontend Status:** 🚧 Planning Phase
**Target Completion:** TBD

---

## 📋 Overview

พัฒนา **Notes/Memo App** (แอปบันทึกส่วนตัว) บน Frontend ให้สามารถใช้งานร่วมกับ Backend API ที่พร้อมแล้ว

### Core Features
- ✅ Create/Edit/Delete บันทึก
- ✅ Pin/Unpin บันทึกสำคัญ
- ✅ Full-text Search
- ✅ Tag filtering
- ✅ Pagination
- ✅ Rich text editing (optional)

### Non-Features
- ❌ **No WebSocket** (เป็น personal feature ไม่ต้อง real-time)
- ❌ No collaboration/sharing
- ❌ No comments

---

## 🎯 Goals & Objectives

### Primary Goals
1. **Simple & Fast** - UX เหมือน iOS Notes (minimal, clean)
2. **Offline-ready** - Support offline editing (localStorage cache)
3. **Search-focused** - ค้นหาเร็ว, ง่าย
4. **Tag organization** - จัดกลุ่มด้วย tags

### Secondary Goals
1. **Markdown support** - เขียน Markdown ได้ (optional)
2. **Export/Import** - Export to JSON/Markdown
3. **Keyboard shortcuts** - เร็วขึ้นด้วย hotkeys

---

## 📁 Project Structure

```
src/
├── types/
│   └── note.types.ts                    # Type definitions
│
├── services/
│   ├── api/
│   │   └── notesApi.ts                  # API client
│   └── noteService.ts                   # Business logic layer
│
├── stores/
│   └── noteStore.ts                     # Zustand store
│
├── hooks/
│   ├── useNotes.ts                      # Main hook
│   ├── useNoteEditor.ts                 # Editor hook
│   ├── useNoteSearch.ts                 # Search hook
│   └── useNoteTags.ts                   # Tags hook
│
├── components/
│   ├── notes/
│   │   ├── NoteCard.tsx                 # Note preview card
│   │   ├── NoteList.tsx                 # List of notes
│   │   ├── NoteEditor.tsx               # Editor component
│   │   ├── NoteSearch.tsx               # Search bar
│   │   ├── NoteTags.tsx                 # Tags component
│   │   ├── TagInput.tsx                 # Tag input field
│   │   ├── NoteToolbar.tsx              # Editor toolbar
│   │   └── EmptyNoteState.tsx           # Empty state
│   │
│   └── ui/
│       ├── badge.tsx                    # Tag badge
│       └── skeleton.tsx                 # Loading skeleton
│
├── pages/
│   ├── notes/
│   │   ├── NotesPage.tsx                # Main page (list + editor)
│   │   ├── NewNotePage.tsx              # Create new note
│   │   └── NoteDetailPage.tsx           # View/edit note
│   │
│   └── index.ts                         # Page exports
│
├── utils/
│   ├── noteUtils.ts                     # Helper functions
│   └── markdown.ts                      # Markdown parser (if used)
│
└── constants/
    └── noteConstants.ts                 # Constants (limits, defaults)
```

---

## 🔷 Phase 1: Foundation (Week 1)

### 1.1 Type Definitions

**File:** `src/types/note.types.ts`

```typescript
// ============ Core Types ============

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotePagination {
  total: number;
  limit: number;
  offset: number;
}

export interface NotesResponse {
  success: boolean;
  message?: string;
  data: {
    notes: Note[];
    pagination: NotePagination;
  };
}

export interface NoteResponse {
  success: boolean;
  message?: string;
  data: Note;
}

export interface SearchNotesResponse {
  success: boolean;
  data: {
    notes: Note[];
    query: string;
    pagination: NotePagination;
  };
}

// ============ Request Types ============

export interface CreateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

// ============ State Types ============

export interface NotesState {
  // Data
  notes: Note[];
  pinnedNotes: Note[];
  currentNote: Note | null;
  selectedTags: string[];

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Pagination
  pagination: NotePagination;
  hasMore: boolean;

  // Error
  error: string | null;

  // Actions
  fetchNotes: (limit?: number, offset?: number) => Promise<void>;
  fetchPinnedNotes: () => Promise<void>;
  fetchNote: (id: string) => Promise<void>;
  createNote: (data: CreateNoteRequest) => Promise<Note | null>;
  updateNote: (id: string, data: UpdateNoteRequest) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
  pinNote: (id: string) => Promise<boolean>;
  unpinNote: (id: string) => Promise<boolean>;
  searchNotes: (query: string) => Promise<void>;
  filterByTag: (tag: string) => Promise<void>;
  clearCurrentNote: () => void;
  clearError: () => void;
}

// ============ UI Types ============

export interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onClick?: (note: Note) => void;
}

export interface NoteEditorProps {
  note?: Note | null;
  onSave: (data: CreateNoteRequest | UpdateNoteRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}
```

---

### 1.2 API Service Layer

**File:** `src/services/api/notesApi.ts`

```typescript
import { apiClient } from '@/config/apiClient';
import type {
  Note,
  NotesResponse,
  NoteResponse,
  SearchNotesResponse,
  CreateNoteRequest,
  UpdateNoteRequest
} from '@/types/note.types';

const BASE_URL = '/api/v1/notes';

export const notesApi = {
  /**
   * สร้างบันทึกใหม่
   */
  createNote: async (data: CreateNoteRequest): Promise<NoteResponse> => {
    const response = await apiClient.post<NoteResponse>(BASE_URL, data);
    return response.data;
  },

  /**
   * ดึงรายการบันทึกทั้งหมด
   */
  getNotes: async (limit = 20, offset = 0): Promise<NotesResponse> => {
    const response = await apiClient.get<NotesResponse>(
      `${BASE_URL}?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  /**
   * ดึงบันทึกเฉพาะ ID
   */
  getNote: async (id: string): Promise<NoteResponse> => {
    const response = await apiClient.get<NoteResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * อัปเดตบันทึก
   */
  updateNote: async (id: string, data: UpdateNoteRequest): Promise<NoteResponse> => {
    const response = await apiClient.put<NoteResponse>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * ลบบันทึก
   */
  deleteNote: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  /**
   * ปักหมุดบันทึก
   */
  pinNote: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put<{ success: boolean; message: string }>(
      `${BASE_URL}/${id}/pin`
    );
    return response.data;
  },

  /**
   * ยกเลิกการปักหมุด
   */
  unpinNote: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `${BASE_URL}/${id}/pin`
    );
    return response.data;
  },

  /**
   * ดึงรายการบันทึกที่ปักหมุด
   */
  getPinnedNotes: async (limit = 20, offset = 0): Promise<NotesResponse> => {
    const response = await apiClient.get<NotesResponse>(
      `${BASE_URL}/pinned?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  /**
   * ค้นหาบันทึก
   */
  searchNotes: async (query: string, limit = 20, offset = 0): Promise<SearchNotesResponse> => {
    const response = await apiClient.get<SearchNotesResponse>(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  /**
   * ดึงบันทึกตาม Tag
   */
  getNotesByTag: async (tag: string, limit = 20, offset = 0): Promise<SearchNotesResponse> => {
    const response = await apiClient.get<SearchNotesResponse>(
      `${BASE_URL}/by-tag?tag=${encodeURIComponent(tag)}&limit=${limit}&offset=${offset}`
    );
    return response.data;
  }
};
```

---

### 1.3 Constants

**File:** `src/constants/noteConstants.ts`

```typescript
export const NOTE_CONSTANTS = {
  // Pagination
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // Limits
  MAX_TITLE_LENGTH: 255,
  MAX_CONTENT_LENGTH: 50000, // 50k chars
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 30,

  // Debounce
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_SAVE_DEBOUNCE_MS: 1000,

  // Cache
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

  // UI
  NOTE_PREVIEW_LENGTH: 150, // chars to show in preview
  PINNED_NOTES_LIMIT: 50 // max pinned notes to show
};

export const NOTE_PLACEHOLDERS = {
  TITLE: 'Untitled Note',
  CONTENT: 'Start typing...',
  SEARCH: 'Search notes...',
  TAG_INPUT: 'Add tags...'
};

export const NOTE_ERRORS = {
  CREATE_FAILED: 'Failed to create note',
  UPDATE_FAILED: 'Failed to update note',
  DELETE_FAILED: 'Failed to delete note',
  FETCH_FAILED: 'Failed to fetch notes',
  NOT_FOUND: 'Note not found',
  NETWORK_ERROR: 'Network error. Please try again.'
};
```

---

## 🔷 Phase 2: State Management (Week 1-2)

### 2.1 Zustand Store

**File:** `src/stores/noteStore.ts`

```typescript
import { create } from 'zustand';
import { notesApi } from '@/services/api/notesApi';
import type { NotesState, CreateNoteRequest, UpdateNoteRequest } from '@/types/note.types';
import { NOTE_CONSTANTS, NOTE_ERRORS } from '@/constants/noteConstants';

export const useNoteStore = create<NotesState>((set, get) => ({
  // Initial state
  notes: [],
  pinnedNotes: [],
  currentNote: null,
  selectedTags: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  pagination: {
    total: 0,
    limit: NOTE_CONSTANTS.DEFAULT_LIMIT,
    offset: 0
  },
  hasMore: false,
  error: null,

  // Actions
  fetchNotes: async (limit = NOTE_CONSTANTS.DEFAULT_LIMIT, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesApi.getNotes(limit, offset);
      if (response.success) {
        set({
          notes: response.data.notes,
          pagination: response.data.pagination,
          hasMore: offset + limit < response.data.pagination.total,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: NOTE_ERRORS.FETCH_FAILED,
        isLoading: false
      });
    }
  },

  fetchPinnedNotes: async () => {
    try {
      const response = await notesApi.getPinnedNotes(NOTE_CONSTANTS.PINNED_NOTES_LIMIT, 0);
      if (response.success) {
        set({ pinnedNotes: response.data.notes });
      }
    } catch (error) {
      console.error('Failed to fetch pinned notes:', error);
    }
  },

  fetchNote: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesApi.getNote(id);
      if (response.success) {
        set({
          currentNote: response.data,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: NOTE_ERRORS.NOT_FOUND,
        isLoading: false
      });
    }
  },

  createNote: async (data: CreateNoteRequest) => {
    set({ isCreating: true, error: null });
    try {
      const response = await notesApi.createNote(data);
      if (response.success) {
        set(state => ({
          notes: [response.data, ...state.notes],
          currentNote: response.data,
          isCreating: false
        }));
        return response.data;
      }
    } catch (error) {
      set({
        error: NOTE_ERRORS.CREATE_FAILED,
        isCreating: false
      });
    }
    return null;
  },

  updateNote: async (id: string, data: UpdateNoteRequest) => {
    set({ isUpdating: true, error: null });
    try {
      const response = await notesApi.updateNote(id, data);
      if (response.success) {
        set(state => ({
          notes: state.notes.map(note =>
            note.id === id ? response.data : note
          ),
          currentNote: response.data,
          isUpdating: false
        }));
        return response.data;
      }
    } catch (error) {
      set({
        error: NOTE_ERRORS.UPDATE_FAILED,
        isUpdating: false
      });
    }
    return null;
  },

  deleteNote: async (id: string) => {
    set({ isDeleting: true, error: null });
    try {
      const response = await notesApi.deleteNote(id);
      if (response.success) {
        set(state => ({
          notes: state.notes.filter(note => note.id !== id),
          pinnedNotes: state.pinnedNotes.filter(note => note.id !== id),
          currentNote: state.currentNote?.id === id ? null : state.currentNote,
          isDeleting: false
        }));
        return true;
      }
    } catch (error) {
      set({
        error: NOTE_ERRORS.DELETE_FAILED,
        isDeleting: false
      });
    }
    return false;
  },

  pinNote: async (id: string) => {
    try {
      const response = await notesApi.pinNote(id);
      if (response.success) {
        set(state => ({
          notes: state.notes.map(note =>
            note.id === id ? { ...note, is_pinned: true } : note
          )
        }));
        // Refresh pinned notes
        get().fetchPinnedNotes();
        return true;
      }
    } catch (error) {
      set({ error: 'Failed to pin note' });
    }
    return false;
  },

  unpinNote: async (id: string) => {
    try {
      const response = await notesApi.unpinNote(id);
      if (response.success) {
        set(state => ({
          notes: state.notes.map(note =>
            note.id === id ? { ...note, is_pinned: false } : note
          ),
          pinnedNotes: state.pinnedNotes.filter(note => note.id !== id)
        }));
        return true;
      }
    } catch (error) {
      set({ error: 'Failed to unpin note' });
    }
    return false;
  },

  searchNotes: async (query: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesApi.searchNotes(query);
      if (response.success) {
        set({
          notes: response.data.notes,
          pagination: response.data.pagination,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: 'Search failed',
        isLoading: false
      });
    }
  },

  filterByTag: async (tag: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesApi.getNotesByTag(tag);
      if (response.success) {
        set({
          notes: response.data.notes,
          selectedTags: [tag],
          pagination: response.data.pagination,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        error: 'Filter failed',
        isLoading: false
      });
    }
  },

  clearCurrentNote: () => set({ currentNote: null }),
  clearError: () => set({ error: null })
}));
```

---

## 🔷 Phase 3: Custom Hooks (Week 2)

### 3.1 Main Hook

**File:** `src/hooks/useNotes.ts`

```typescript
import { useNoteStore } from '@/stores/noteStore';

export const useNotes = () => {
  const {
    notes,
    pinnedNotes,
    isLoading,
    pagination,
    hasMore,
    error,
    fetchNotes,
    fetchPinnedNotes,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    unpinNote,
    clearError
  } = useNoteStore();

  return {
    notes,
    pinnedNotes,
    isLoading,
    pagination,
    hasMore,
    error,
    fetchNotes,
    fetchPinnedNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePin: async (id: string, isPinned: boolean) => {
      return isPinned ? unpinNote(id) : pinNote(id);
    },
    clearError
  };
};
```

### 3.2 Editor Hook

**File:** `src/hooks/useNoteEditor.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useDebouncedCallback } from 'use-debounce';
import { NOTE_CONSTANTS } from '@/constants/noteConstants';
import type { Note } from '@/types/note.types';

export const useNoteEditor = (noteId?: string) => {
  const { currentNote, isCreating, isUpdating, fetchNote, createNote, updateNote } = useNoteStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Load note if editing
  useEffect(() => {
    if (noteId) {
      fetchNote(noteId);
    }
  }, [noteId]);

  // Populate form when note loads
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setTags(currentNote.tags);
      setIsDirty(false);
    }
  }, [currentNote]);

  // Mark as dirty when edited
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
    setIsDirty(true);
  }, []);

  // Auto-save (debounced)
  const autoSave = useDebouncedCallback(
    async () => {
      if (!isDirty) return;

      const data = { title, content, tags };

      if (noteId) {
        await updateNote(noteId, data);
      } else {
        await createNote(data);
      }

      setIsDirty(false);
    },
    NOTE_CONSTANTS.AUTO_SAVE_DEBOUNCE_MS
  );

  // Manual save
  const save = async () => {
    const data = { title, content, tags };

    if (noteId) {
      return await updateNote(noteId, data);
    } else {
      return await createNote(data);
    }
  };

  return {
    // State
    title,
    content,
    tags,
    isDirty,
    isLoading: isCreating || isUpdating,
    currentNote,

    // Handlers
    setTitle: handleTitleChange,
    setContent: handleContentChange,
    setTags: handleTagsChange,
    save,
    autoSave,

    // Reset
    reset: () => {
      setTitle('');
      setContent('');
      setTags([]);
      setIsDirty(false);
    }
  };
};
```

### 3.3 Search Hook

**File:** `src/hooks/useNoteSearch.ts`

```typescript
import { useState, useCallback } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useDebouncedCallback } from 'use-debounce';
import { NOTE_CONSTANTS } from '@/constants/noteConstants';

export const useNoteSearch = () => {
  const { searchNotes, fetchNotes } = useNoteStore();
  const [query, setQuery] = useState('');

  // Debounced search
  const debouncedSearch = useDebouncedCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim()) {
        await searchNotes(searchQuery);
      } else {
        // Empty query → fetch all notes
        await fetchNotes();
      }
    },
    NOTE_CONSTANTS.SEARCH_DEBOUNCE_MS
  );

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    fetchNotes();
  }, [fetchNotes]);

  return {
    query,
    search: handleSearch,
    clearSearch
  };
};
```

### 3.4 Tags Hook

**File:** `src/hooks/useNoteTags.ts`

```typescript
import { useState, useCallback, useMemo } from 'react';
import { useNoteStore } from '@/stores/noteStore';

export const useNoteTags = () => {
  const { notes, filterByTag, fetchNotes } = useNoteStore();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags from notes
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [notes]);

  // Tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [notes]);

  const selectTag = useCallback(async (tag: string) => {
    setSelectedTag(tag);
    await filterByTag(tag);
  }, [filterByTag]);

  const clearTagFilter = useCallback(() => {
    setSelectedTag(null);
    fetchNotes();
  }, [fetchNotes]);

  return {
    allTags,
    tagCounts,
    selectedTag,
    selectTag,
    clearTagFilter
  };
};
```

---

## 🔷 Phase 4: UI Components (Week 2-3)

### 4.1 Note Card

**File:** `src/components/notes/NoteCard.tsx`

```typescript
import React from 'react';
import { Pin, Trash2, Edit } from 'lucide-react';
import type { NoteCardProps } from '@/types/note.types';
import { NOTE_CONSTANTS } from '@/constants/noteConstants';
import { Badge } from '@/components/ui/badge';

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onClick
}) => {
  const previewContent = note.content.substring(0, NOTE_CONSTANTS.NOTE_PREVIEW_LENGTH);
  const hasMore = note.content.length > NOTE_CONSTANTS.NOTE_PREVIEW_LENGTH;

  return (
    <div
      className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => onClick?.(note)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg truncate flex-1">
          {note.title || 'Untitled'}
        </h3>

        <div className="flex items-center gap-2 ml-2">
          {/* Pin button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id, note.is_pinned);
            }}
            className={`p-1 rounded hover:bg-accent ${
              note.is_pinned ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Edit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(note);
            }}
            className="p-1 rounded hover:bg-accent text-muted-foreground"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this note?')) {
                onDelete(note.id);
              }
            }}
            className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content preview */}
      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
        {previewContent}
        {hasMore && '...'}
      </p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-muted-foreground">
        {new Date(note.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
};
```

### 4.2 Note Editor

**File:** `src/components/notes/NoteEditor.tsx`

```typescript
import React from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from './TagInput';
import type { NoteEditorProps } from '@/types/note.types';

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [title, setTitle] = React.useState(note?.title || '');
  const [content, setContent] = React.useState(note?.content || '');
  const [tags, setTags] = React.useState<string[]>(note?.tags || []);

  const handleSave = async () => {
    await onSave({ title, content, tags });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {note ? 'Edit Note' : 'New Note'}
        </h2>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>

          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-1" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Title */}
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold border-0 focus-visible:ring-0 px-0"
          />

          {/* Tags */}
          <TagInput
            tags={tags}
            onChange={setTags}
            placeholder="Add tags..."
          />

          {/* Content */}
          <Textarea
            placeholder="Start typing..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[500px] border-0 focus-visible:ring-0 resize-none px-0"
          />
        </div>
      </div>
    </div>
  );
};
```

### 4.3 Tag Input

**File:** `src/components/notes/TagInput.tsx`

```typescript
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { TagInputProps } from '@/types/note.types';

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add tags...',
  suggestions = []
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();

      const newTag = inputValue.trim().toLowerCase();

      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }

      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:bg-accent rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Suggestions (optional) */}
      {suggestions.length > 0 && inputValue && (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .filter(s => s.includes(inputValue.toLowerCase()) && !tags.includes(s))
            .map(suggestion => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  onChange([...tags, suggestion]);
                  setInputValue('');
                }}
              >
                {suggestion}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
};
```

---

## 🔷 Phase 5: Pages (Week 3)

### 5.1 Notes Page (Main)

**File:** `src/pages/notes/NotesPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteSearch } from '@/components/notes/NoteSearch';
import { useNotes } from '@/hooks/useNotes';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import type { Note } from '@/types/note.types';

export const NotesPage: React.FC = () => {
  const { notes, pinnedNotes, fetchNotes, fetchPinnedNotes } = useNotes();
  const { query, search, clearSearch } = useNoteSearch();
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchPinnedNotes();
  }, []);

  const handleNewNote = () => {
    setEditingNote(null);
    setIsEditing(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditing(true);
  };

  const handleCloseEditor = () => {
    setIsEditing(false);
    setEditingNote(null);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar: Note List */}
      <div className="w-96 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Notes</h1>
            <Button size="sm" onClick={handleNewNote}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>

          {/* Search */}
          <NoteSearch
            query={query}
            onSearch={search}
            onClear={clearSearch}
          />
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-auto">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="p-4 border-b">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                Pinned
              </h2>
              <NoteList
                notes={pinnedNotes}
                onEdit={handleEditNote}
              />
            </div>
          )}

          {/* All Notes */}
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              All Notes
            </h2>
            <NoteList
              notes={notes}
              onEdit={handleEditNote}
            />
          </div>
        </div>
      </div>

      {/* Main: Editor or Empty State */}
      <div className="flex-1">
        {isEditing ? (
          <NoteEditor
            note={editingNote}
            onSave={async () => {
              handleCloseEditor();
              fetchNotes();
              fetchPinnedNotes();
            }}
            onCancel={handleCloseEditor}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Select a note or create a new one
              </p>
              <Button onClick={handleNewNote}>
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 🔷 Phase 6: Advanced Features (Week 4)

### 6.1 Markdown Support (Optional)

```bash
npm install react-markdown remark-gfm
```

### 6.2 Offline Support (Optional)

```typescript
// Use localForage or IndexedDB for offline cache
import localforage from 'localforage';
```

### 6.3 Keyboard Shortcuts

```typescript
// Use react-hotkeys-hook
import { useHotkeys } from 'react-hotkeys-hook';

useHotkeys('ctrl+n', () => handleNewNote());
useHotkeys('ctrl+s', () => handleSave());
useHotkeys('ctrl+f', () => focusSearch());
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] API service tests
- [ ] Store tests (Zustand)
- [ ] Hook tests
- [ ] Component tests

### Integration Tests
- [ ] Create → Read → Update → Delete flow
- [ ] Search functionality
- [ ] Tag filtering
- [ ] Pin/Unpin

### E2E Tests (Playwright)
- [ ] Full user journey
- [ ] Keyboard shortcuts
- [ ] Error handling

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Build passes
- [ ] Tests pass
- [ ] Performance optimized
- [ ] Accessibility checked

---

## 📊 Timeline Summary

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | Week 1 | Types, API, Constants |
| Phase 2 | Week 1-2 | State management |
| Phase 3 | Week 2 | Custom hooks |
| Phase 4 | Week 2-3 | UI Components |
| Phase 5 | Week 3 | Pages & Routes |
| Phase 6 | Week 4 | Advanced features |
| Testing | Week 4 | Unit + Integration tests |

**Total:** ~4 weeks

---

## ✅ Success Criteria

- [ ] Create/Edit/Delete notes
- [ ] Search works fast
- [ ] Tags filtering works
- [ ] Pin/Unpin works
- [ ] Pagination works
- [ ] Mobile responsive
- [ ] Keyboard shortcuts
- [ ] No data loss (auto-save)

---

**Created:** 2025-01-02
**Status:** 📋 Planning Complete
**Ready to Start:** ✅ Yes
