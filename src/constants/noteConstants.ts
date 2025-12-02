// Constants for Notes/Memo feature

// ============ API Limits ============

export const NOTE_LIMITS = {
  TITLE_MAX_LENGTH: 200,
  CONTENT_MAX_LENGTH: 50000,
  TAGS_MAX_COUNT: 10,
  TAG_MAX_LENGTH: 50,
  SEARCH_MIN_LENGTH: 2,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============ UI Constants ============

export const NOTE_PLACEHOLDERS = {
  TITLE: 'Note title...',
  CONTENT: 'Start writing your note...',
  SEARCH: 'Search notes...',
  TAG_INPUT: 'Add tags...',
  EMPTY_STATE: 'No notes yet. Create your first note!',
  EMPTY_SEARCH: 'No notes found matching your search.',
  EMPTY_TAG: 'No notes with these tags.',
} as const;

// ============ Timing ============

export const NOTE_TIMINGS = {
  AUTO_SAVE_DELAY: 2000, // 2 seconds
  SEARCH_DEBOUNCE: 300, // 300ms
  TOAST_DURATION: 3000, // 3 seconds
} as const;

// ============ Error Messages ============

export const NOTE_ERRORS = {
  FETCH_FAILED: 'Failed to load notes',
  CREATE_FAILED: 'Failed to create note',
  UPDATE_FAILED: 'Failed to update note',
  DELETE_FAILED: 'Failed to delete note',
  SEARCH_FAILED: 'Failed to search notes',
  PIN_FAILED: 'Failed to pin note',
  UNPIN_FAILED: 'Failed to unpin note',
  TAGS_FETCH_FAILED: 'Failed to load tags',
  TITLE_REQUIRED: 'Title is required',
  TITLE_TOO_LONG: `Title must be less than ${NOTE_LIMITS.TITLE_MAX_LENGTH} characters`,
  CONTENT_TOO_LONG: `Content must be less than ${NOTE_LIMITS.CONTENT_MAX_LENGTH} characters`,
  TOO_MANY_TAGS: `Maximum ${NOTE_LIMITS.TAGS_MAX_COUNT} tags allowed`,
  TAG_TOO_LONG: `Tag must be less than ${NOTE_LIMITS.TAG_MAX_LENGTH} characters`,
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNSAVED_CHANGES: 'You have unsaved changes. Do you want to discard them?',
} as const;

// ============ Success Messages ============

export const NOTE_SUCCESS = {
  CREATED: 'Note created successfully',
  UPDATED: 'Note updated successfully',
  DELETED: 'Note deleted successfully',
  PINNED: 'Note pinned',
  UNPINNED: 'Note unpinned',
  AUTO_SAVED: 'Note auto-saved',
} as const;

// ============ View Modes ============

export const NOTE_VIEW_MODES = {
  LIST: 'list',
  EDITOR: 'editor',
  BOTH: 'both',
} as const;

// ============ Keyboard Shortcuts ============

export const NOTE_SHORTCUTS = {
  NEW_NOTE: { key: 'n', ctrl: true, description: 'Create new note' },
  SAVE_NOTE: { key: 's', ctrl: true, description: 'Save current note' },
  SEARCH: { key: 'f', ctrl: true, description: 'Focus search' },
  DELETE: { key: 'Delete', ctrl: false, description: 'Delete selected note' },
  TOGGLE_PIN: { key: 'p', ctrl: true, description: 'Toggle pin' },
} as const;

// ============ Local Storage Keys ============

export const STORAGE_KEYS = {
  NOTES_DRAFT: 'notes_draft',
  NOTES_VIEW_MODE: 'notes_view_mode',
  NOTES_FILTERS: 'notes_filters',
} as const;
