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
  TITLE: 'หัวข้อโน้ต...',
  CONTENT: 'เริ่มเขียนโน้ตของคุณ...',
  SEARCH: 'ค้นหาโน้ต...',
  TAG_INPUT: 'เพิ่มแท็ก...',
  EMPTY_STATE: 'ยังไม่มีโน้ต สร้างโน้ตแรกของคุณ!',
  EMPTY_SEARCH: 'ไม่พบโน้ตที่ตรงกับการค้นหา',
  EMPTY_TAG: 'ไม่มีโน้ตที่มีแท็กนี้',
} as const;

// ============ Timing ============

export const NOTE_TIMINGS = {
  AUTO_SAVE_DELAY: 2000, // 2 seconds
  SEARCH_DEBOUNCE: 300, // 300ms
  TOAST_DURATION: 3000, // 3 seconds
} as const;

// ============ Error Messages ============

export const NOTE_ERRORS = {
  FETCH_FAILED: 'โหลดโน้ตล้มเหลว',
  CREATE_FAILED: 'สร้างโน้ตล้มเหลว',
  UPDATE_FAILED: 'อัปเดตโน้ตล้มเหลว',
  DELETE_FAILED: 'ลบโน้ตล้มเหลว',
  SEARCH_FAILED: 'ค้นหาโน้ตล้มเหลว',
  PIN_FAILED: 'ปักหมุดโน้ตล้มเหลว',
  UNPIN_FAILED: 'ยกเลิกปักหมุดโน้ตล้มเหลว',
  TAGS_FETCH_FAILED: 'โหลดแท็กล้มเหลว',
  TITLE_REQUIRED: 'กรุณากรอกหัวข้อ',
  TITLE_TOO_LONG: `หัวข้อต้องมีความยาวไม่เกิน ${NOTE_LIMITS.TITLE_MAX_LENGTH} ตัวอักษร`,
  CONTENT_TOO_LONG: `เนื้อหาต้องมีความยาวไม่เกิน ${NOTE_LIMITS.CONTENT_MAX_LENGTH} ตัวอักษร`,
  TOO_MANY_TAGS: `สามารถเพิ่มแท็กได้สูงสุด ${NOTE_LIMITS.TAGS_MAX_COUNT} แท็ก`,
  TAG_TOO_LONG: `แท็กต้องมีความยาวไม่เกิน ${NOTE_LIMITS.TAG_MAX_LENGTH} ตัวอักษร`,
  NETWORK_ERROR: 'เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ',
  UNSAVED_CHANGES: 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการยกเลิกหรือไม่?',
} as const;

// ============ Success Messages ============

export const NOTE_SUCCESS = {
  CREATED: 'สร้างโน้ตสำเร็จ',
  UPDATED: 'อัปเดตโน้ตสำเร็จ',
  DELETED: 'ลบโน้ตสำเร็จ',
  PINNED: 'ปักหมุดโน้ตแล้ว',
  UNPINNED: 'ยกเลิกปักหมุดโน้ตแล้ว',
  AUTO_SAVED: 'บันทึกอัตโนมัติแล้ว',
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
