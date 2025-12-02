// src/stores/draftStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DraftState {
  drafts: Record<string, string>; // เก็บ draft แยกตาม conversationId

  // Actions
  setDraft: (conversationId: string, content: string) => void;
  getDraft: (conversationId: string) => string;
  clearDraft: (conversationId: string) => void;
  clearAllDrafts: () => void;
}

/**
 * Store สำหรับจัดการ draft messages
 * ใช้ persist middleware เพื่อเก็บใน localStorage
 */
export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      // ตั้งค่า draft สำหรับ conversation
      setDraft: (conversationId: string, content: string) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [conversationId]: content
          }
        }));
      },

      // ดึง draft สำหรับ conversation
      getDraft: (conversationId: string) => {
        return get().drafts[conversationId] || '';
      },

      // ลบ draft สำหรับ conversation (เมื่อส่งข้อความแล้ว)
      clearDraft: (conversationId: string) => {
        set((state) => {
          const newDrafts = { ...state.drafts };
          delete newDrafts[conversationId];
          return { drafts: newDrafts };
        });
      },

      // ลบ draft ทั้งหมด
      clearAllDrafts: () => {
        set({ drafts: {} });
      }
    }),
    {
      name: 'draft-storage', // ชื่อใน localStorage
    }
  )
);
