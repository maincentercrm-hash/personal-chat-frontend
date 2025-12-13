// src/stores/pinnedMessageStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import messageService from '@/services/messageService';
import type { PinnedMessageDTO, PinType } from '@/types/pinned-message.types';
import useConversationStore from './conversationStore';

interface PinnedMessageState {
  // State
  pinnedMessages: Record<string, PinnedMessageDTO[]>; // conversationId -> pinned messages
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPinnedMessages: (conversationId: string, pinType?: 'all' | 'personal' | 'public') => Promise<void>;
  pinMessage: (conversationId: string, messageId: string, pinType?: PinType) => Promise<boolean>;
  unpinMessage: (conversationId: string, messageId: string, pinType?: PinType) => Promise<boolean>;

  // Store mutations (for WebSocket events)
  addPinnedMessage: (conversationId: string, pinnedMessage: PinnedMessageDTO) => void;
  removePinnedMessage: (conversationId: string, messageId: string, pinType?: PinType) => void;
  clearPinnedMessages: (conversationId?: string) => void;

  // Selectors
  getPinnedMessages: (conversationId: string, pinType?: 'all' | 'personal' | 'public') => PinnedMessageDTO[];
  getPinnedCount: (conversationId: string, pinType?: 'all' | 'personal' | 'public') => number;
}

export const usePinnedMessageStore = create<PinnedMessageState>()(
  devtools(
    (set, get) => ({
      pinnedMessages: {},
      isLoading: false,
      error: null,

      /**
       * ดึงรายการข้อความที่ปักหมุดจาก API
       */
      fetchPinnedMessages: async (conversationId: string, pinType: 'all' | 'personal' | 'public' = 'all') => {
        try {
          set({ isLoading: true, error: null });
          const response = await messageService.getPinnedMessages(conversationId, pinType);

          if (response.success && response.data) {
            // API returns { pinned_messages: [...], total: number }
            const data = response.data as { pinned_messages?: PinnedMessageDTO[]; total?: number };
            const pinnedList = data.pinned_messages || [];

            set((state) => ({
              pinnedMessages: {
                ...state.pinnedMessages,
                [conversationId]: pinnedList
              },
              isLoading: false
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pinned messages';
          set({ isLoading: false, error: errorMessage });
        }
      },

      /**
       * ปักหมุดข้อความ
       */
      pinMessage: async (conversationId: string, messageId: string, pinType: PinType = 'personal') => {
        try {
          set({ isLoading: true, error: null });
          const response = await messageService.pinMessage(conversationId, messageId, pinType);

          if (response.success && response.data) {
            const pinnedMessage = response.data as unknown as PinnedMessageDTO;
            // เพิ่มข้อความที่ pin เข้าไปใน store
            set((state) => {
              const currentPinned = state.pinnedMessages[conversationId] || [];
              // ตรวจสอบว่ามีอยู่แล้วหรือไม่ (same message + same pin_type)
              const exists = currentPinned.some(
                m => m.message_id === pinnedMessage.message_id && m.pin_type === pinnedMessage.pin_type
              );
              if (exists) return { isLoading: false };

              return {
                pinnedMessages: {
                  ...state.pinnedMessages,
                  [conversationId]: [...currentPinned, pinnedMessage]
                },
                isLoading: false
              };
            });

            // ✅ อัปเดต is_pinned ใน conversationStore (สำหรับ public pins)
            if (pinType === 'public') {
              useConversationStore.getState().updateMessage(messageId, {
                is_pinned: true,
                pinned_at: pinnedMessage.pinned_at
              });
            }

            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to pin message';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      /**
       * เลิกปักหมุดข้อความ
       */
      unpinMessage: async (conversationId: string, messageId: string, pinType: PinType = 'personal') => {
        try {
          set({ isLoading: true, error: null });
          const response = await messageService.unpinMessage(conversationId, messageId, pinType);

          if (response.success) {
            // ลบข้อความออกจาก pinned list (match both message_id and pin_type)
            set((state) => {
              const currentPinned = state.pinnedMessages[conversationId] || [];
              return {
                pinnedMessages: {
                  ...state.pinnedMessages,
                  [conversationId]: currentPinned.filter(
                    m => !(m.message_id === messageId && m.pin_type === pinType)
                  )
                },
                isLoading: false
              };
            });

            // ✅ อัปเดต is_pinned ใน conversationStore (สำหรับ public pins)
            if (pinType === 'public') {
              useConversationStore.getState().updateMessage(messageId, {
                is_pinned: false,
                pinned_at: null
              });
            }

            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to unpin message';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      /**
       * เพิ่มข้อความที่ pin (สำหรับ WebSocket event)
       */
      addPinnedMessage: (conversationId: string, pinnedMessage: PinnedMessageDTO) => {
        set((state) => {
          const currentPinned = state.pinnedMessages[conversationId] || [];
          const exists = currentPinned.some(
            m => m.message_id === pinnedMessage.message_id && m.pin_type === pinnedMessage.pin_type
          );
          if (exists) return state;

          return {
            pinnedMessages: {
              ...state.pinnedMessages,
              [conversationId]: [...currentPinned, pinnedMessage]
            }
          };
        });
      },

      /**
       * ลบข้อความที่ pin (สำหรับ WebSocket event)
       */
      removePinnedMessage: (conversationId: string, messageId: string, pinType?: PinType) => {
        set((state) => {
          const currentPinned = state.pinnedMessages[conversationId] || [];
          return {
            pinnedMessages: {
              ...state.pinnedMessages,
              [conversationId]: currentPinned.filter(m => {
                if (pinType) {
                  return !(m.message_id === messageId && m.pin_type === pinType);
                }
                return m.message_id !== messageId;
              })
            }
          };
        });
      },

      /**
       * ล้างข้อความที่ pin
       */
      clearPinnedMessages: (conversationId?: string) => {
        if (conversationId) {
          set((state) => ({
            pinnedMessages: {
              ...state.pinnedMessages,
              [conversationId]: []
            }
          }));
        } else {
          set({ pinnedMessages: {} });
        }
      },

      /**
       * Selector: ดึงข้อความที่ pin
       */
      getPinnedMessages: (conversationId: string, pinType?: 'all' | 'personal' | 'public') => {
        const allPinned = get().pinnedMessages[conversationId] || [];
        if (!pinType || pinType === 'all') {
          return allPinned;
        }
        return allPinned.filter(m => m.pin_type === pinType);
      },

      /**
       * Selector: นับจำนวนข้อความที่ pin
       */
      getPinnedCount: (conversationId: string, pinType?: 'all' | 'personal' | 'public') => {
        const allPinned = get().pinnedMessages[conversationId] || [];
        if (!pinType || pinType === 'all') {
          return allPinned.length;
        }
        return allPinned.filter(m => m.pin_type === pinType).length;
      }
    }),
    {
      name: 'PinnedMessageStore',
      enabled: import.meta.env.DEV
    }
  )
);

export default usePinnedMessageStore;
