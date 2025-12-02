// src/services/notesService.ts
import apiService from './apiService';
import { NOTES_API } from '@/constants/api/standardApiConstants';
import type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  SearchNotesParams,
  GetNotesParams,
  NoteResponse,
  NotesListResponse,
  SearchNotesResponse,
  TagsResponse,
} from '@/types/note.types';

/**
 * Service สำหรับจัดการ Notes/Memo feature
 */
const notesService = {
  /**
   * สร้าง Note ใหม่
   * @param data - ข้อมูล Note ที่ต้องการสร้าง
   * @returns Note ที่สร้างเสร็จ
   */
  createNote: async (data: CreateNoteRequest): Promise<Note> => {
    const response = await apiService.post<NoteResponse>(NOTES_API.CREATE_NOTE, data);
    return response.data;
  },

  /**
   * ดึงรายการ Notes ทั้งหมด พร้อม pagination
   * @param params - Query parameters (page, limit, is_pinned)
   * @returns รายการ Notes พร้อม pagination info
   */
  getNotes: async (params?: GetNotesParams): Promise<NotesListResponse['data']> => {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    // ✅ Backend uses offset, so convert page to offset
    const offset = (page - 1) * limit;

    const queryParams = {
      limit,
      offset, // Backend expects offset, not page
      ...(params?.is_pinned !== undefined && { is_pinned: params.is_pinned }),
      ...(params?.conversation_id && { conversation_id: params.conversation_id }), // 🆕 Filter by conversation
      ...(params?.scope && { scope: params.scope }), // 🆕 Filter scope
    };

    const response = await apiService.get<NotesListResponse>(
      NOTES_API.GET_NOTES,
      queryParams
    );
    return response.data;
  },

  /**
   * ดึง Note ตาม ID
   * @param noteId - ID ของ Note
   * @returns Note ที่ต้องการ
   */
  getNoteById: async (noteId: string): Promise<Note> => {
    const response = await apiService.get<NoteResponse>(
      NOTES_API.GET_NOTE_BY_ID(noteId)
    );
    return response.data;
  },

  /**
   * อัปเดต Note
   * @param noteId - ID ของ Note ที่ต้องการแก้ไข
   * @param data - ข้อมูลที่ต้องการอัปเดต
   * @returns Note ที่อัปเดตแล้ว
   */
  updateNote: async (
    noteId: string,
    data: UpdateNoteRequest
  ): Promise<Note> => {
    const response = await apiService.put<NoteResponse>(
      NOTES_API.UPDATE_NOTE(noteId),
      data
    );
    return response.data;
  },

  /**
   * ลบ Note
   * @param noteId - ID ของ Note ที่ต้องการลบ
   */
  deleteNote: async (noteId: string): Promise<void> => {
    await apiService.delete(NOTES_API.DELETE_NOTE(noteId));
  },

  /**
   * ค้นหา Notes ด้วย full-text search
   * @param params - Query parameters (query, tags, is_pinned, page, limit)
   * @returns ผลการค้นหา Notes พร้อม pagination
   */
  searchNotes: async (params: SearchNotesParams): Promise<SearchNotesResponse['data']> => {
    const queryParams = {
      ...(params.query && { query: params.query }),
      ...(params.tags && params.tags.length > 0 && { tags: params.tags }),
      ...(params.is_pinned !== undefined && { is_pinned: params.is_pinned }),
      ...(params.conversation_id && { conversation_id: params.conversation_id }), // 🆕 Filter by conversation
      ...(params.scope && { scope: params.scope }), // 🆕 Filter scope
      page: params.page || 1,
      limit: params.limit || 20,
    };

    const response = await apiService.get<SearchNotesResponse>(
      NOTES_API.SEARCH_NOTES,
      queryParams
    );
    return response.data;
  },

  /**
   * ดึง Tags ทั้งหมดที่ใช้ใน Notes
   * @returns รายการ Tags ทั้งหมด
   */
  getAllTags: async (): Promise<string[]> => {
    const response = await apiService.get<TagsResponse>(NOTES_API.GET_ALL_TAGS);
    return response.data.tags;
  },

  /**
   * ปักหมุด Note
   * @param noteId - ID ของ Note ที่ต้องการปักหมุด
   * @returns void (backend returns success message only, no data)
   */
  pinNote: async (noteId: string): Promise<void> => {
    await apiService.post(
      NOTES_API.PIN_NOTE(noteId),
      {}
    );
    // Backend returns { success: true, message: "..." } without data
  },

  /**
   * ยกเลิกการปักหมุด Note
   * @param noteId - ID ของ Note ที่ต้องการยกเลิกปักหมุด
   * @returns void (backend returns success message only, no data)
   */
  unpinNote: async (noteId: string): Promise<void> => {
    await apiService.delete(
      NOTES_API.UNPIN_NOTE(noteId)
    );
    // Backend returns { success: true, message: "..." } without data
  },
};

export default notesService;
