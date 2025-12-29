// src/stores/conversationStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import conversationService from '@/services/conversationService';
import WebSocketManager from '@/services/websocket/WebSocketManager';
import type {
  ConversationDTO,
  MessageDTO,
  ConversationQueryRequest,
  ConversationMessagesQueryRequest,
  UpdateConversationRequest
} from '@/types/conversation.types';
import type { MessageStatus } from '@/types/message.types';
import { getLastMessageTextBySender } from '@/utils/messageTextUtils';

interface ConversationState {
  conversations: ConversationDTO[];

  activeConversationId: string | null;
  conversationMessages: Record<string, MessageDTO[]>;
  hasMoreMessages: Record<string, boolean>; // ⬆️ Scroll up (load older)
  hasAfterMessages: Record<string, boolean>; // ⬇️ Scroll down (load newer) - for Jump context
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConversations: (params?: ConversationQueryRequest) => Promise<ConversationDTO[]>;
  fetchMoreConversations: (params?: ConversationQueryRequest) => Promise<ConversationDTO[]>;
  fetchConversationMessages: (conversationId: string, params?: ConversationMessagesQueryRequest) => Promise<MessageDTO[]>;
  fetchMoreMessages: (conversationId: string, params?: ConversationMessagesQueryRequest) => Promise<MessageDTO[]>;
  createDirectConversation: (memberIds: string[]) => Promise<ConversationDTO | null>;
  createGroupConversation: (title: string, memberIds?: string[], iconUrl?: string) => Promise<ConversationDTO | null>;
  updateConversation: (conversationId: string, data: UpdateConversationRequest) => Promise<boolean>;
  togglePinConversation: (conversationId: string, isPinned: boolean) => Promise<boolean>;
  toggleMuteConversation: (conversationId: string, isMuted: boolean) => Promise<boolean>;
  deleteConversation: (conversationId: string, currentUserId: string) => Promise<boolean>;
  setActiveConversation: (conversationId: string | null) => void;

  // Helper methods
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearConversationStore: () => void;

  // WebSocket event handlers
  addNewMessage: (message: MessageDTO, currentUserId: string) => void;
  updateMessage: (messageId: string, updates: Partial<MessageDTO>) => void;
  deleteMessage: (messageId: string) => void;
  markMessageAsRead: (messageId: string) => void;
  addNewConversation: (conversation: ConversationDTO) => void;
  updateConversationData: (conversationId: string, updates: Partial<ConversationDTO>) => void;
  removeConversation: (conversationId: string) => void;

  updateMessageStatus: (messageId: string, status: MessageStatus) => void;
  markAllMessagesAsReadInConversation: (conversationId: string) => void;
  replaceMessagesWithContext: (conversationId: string, messages: MessageDTO[], hasBefore: boolean, hasAfter: boolean) => void;
}

export const useConversationStore = create<ConversationState>()( devtools((set) => ({
  conversations: [],
  activeConversationId: null,
  conversationMessages: {},
  hasMoreMessages: {},
  hasAfterMessages: {}, // ⬇️ Initialize empty
  isLoading: false,
  error: null,

  /**
   * ดึงการสนทนาทั้งหมดของผู้ใช้
   */
  fetchConversations: async (params?: ConversationQueryRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.getUserConversations(params);

      if (response.success) {
        const conversations = response.data.conversations;
        set({ conversations, isLoading: false });
        return conversations;
      }

      set({ isLoading: false });
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงการสนทนา';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ดึงการสนทนาเพิ่มเติม (เช่น Infinity scroll)
   */
  fetchMoreConversations: async (params?: ConversationQueryRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.getUserConversations(params);

      if (response.success) {
        const newConversations = response.data.conversations;
        set((state) => ({
          conversations: [...state.conversations, ...newConversations],
          isLoading: false
        }));
        return newConversations;
      }

      set({ isLoading: false });
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงการสนทนาเพิ่มเติม';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ดึงข้อความในการสนทนา
   */
  fetchConversationMessages: async (conversationId: string, params?: ConversationMessagesQueryRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.getConversationMessages(conversationId, params);

      if (response.success) {
        const messages = response.data.messages;
        const hasMore = response.data.has_more;

        // ✅ Sort messages ASC (เก่า → ใหม่) และเพิ่ม localKey
        const sortedMessages = [...messages]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(msg => ({
            ...msg,
            localKey: msg.localKey || msg.temp_id || msg.id
          }));

        set((state) => ({
          conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: sortedMessages
          },
          hasMoreMessages: {
            ...state.hasMoreMessages,
            [conversationId]: hasMore
          },
          isLoading: false
        }));

        return sortedMessages;
      }

      set({ isLoading: false });
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อความ';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ดึงข้อความเพิ่มเติม (เช่น Infinity scroll)
   */
  fetchMoreMessages: async (conversationId: string, params?: ConversationMessagesQueryRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.getConversationMessages(conversationId, params);

      if (response.success) {
        const newMessages = response.data.messages;
        const hasMore = response.data.has_more;
  
        set((state) => {
          // ดึงข้อความที่มีอยู่แล้ว
          const existingMessages = state.conversationMessages[conversationId] || [];

          // สร้าง Map ของข้อความที่มีอยู่แล้วเพื่อตรวจสอบการซ้ำกัน
          const existingMessageMap = new Map(
            existingMessages.map(msg => [msg.id, msg])
          );

          // กรองข้อความใหม่ที่ไม่ซ้ำกับข้อความเดิม
          const uniqueNewMessages = newMessages.filter(
            msg => !existingMessageMap.has(msg.id)
          );

          // กำหนดวิธีการรวมข้อความตามประเภทการโหลด
          let allMessages: MessageDTO[];
          let updatedState: any = {
            conversationMessages: {
              ...state.conversationMessages,
            },
            isLoading: false
          };

          // ถ้ากำลังโหลดข้อความเก่ากว่า (ใช้พารามิเตอร์ before)
          if (params?.before) {
            // เพิ่มข้อความใหม่ (เก่ากว่า) ไว้ด้านหน้า
            allMessages = [...uniqueNewMessages, ...existingMessages];

            // อัพเดต hasMoreMessages (มีข้อความเก่ากว่าอีกไหม)
            updatedState.hasMoreMessages = {
              ...state.hasMoreMessages,
              [conversationId]: hasMore
            };
          }
          // ถ้ากำลังโหลดข้อความใหม่กว่า (ใช้พารามิเตอร์ after)
          else if (params?.after) {
            // เพิ่มข้อความใหม่ไว้ด้านหลัง
            allMessages = [...existingMessages, ...uniqueNewMessages];

            // อัพเดต hasAfterMessages (มีข้อความใหม่กว่าอีกไหม)
            updatedState.hasAfterMessages = {
              ...state.hasAfterMessages,
              [conversationId]: hasMore
            };
          }
          // โหลดครั้งแรก (ไม่มีทั้ง before และ after)
          else {
            // เพิ่มข้อความใหม่ไว้ด้านหลัง
            allMessages = [...existingMessages, ...uniqueNewMessages];

            // อัพเดต hasMoreMessages
            updatedState.hasMoreMessages = {
              ...state.hasMoreMessages,
              [conversationId]: hasMore
            };
          }

          // เรียงลำดับข้อความตามเวลาและเพิ่ม localKey
          allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          allMessages = allMessages.map(msg => ({
            ...msg,
            localKey: msg.localKey || msg.temp_id || msg.id
          }));

          // เพิ่ม messages เข้า state
          updatedState.conversationMessages[conversationId] = allMessages;

          return updatedState;
        });
  
        return newMessages;
      }
  
      set({ isLoading: false });
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อความเพิ่มเติม';
      console.error('Error fetching more messages:', errorMessage);
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * สร้างการสนทนาแบบ direct (1:1)
   */
  createDirectConversation: async (memberIds: string[]) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.createDirectConversation(memberIds);

      if (response.success) {
        const newConversation = response.conversation;

        set((state) => {
          // ✅ FIX: ตรวจสอบว่ามี conversation นี้อยู่แล้วหรือไม่
          const existingIndex = state.conversations.findIndex(
            conv => conv.id === newConversation.id
          );

          if (existingIndex !== -1) {
            // ✅ ถ้ามีอยู่แล้ว → อัพเดตแทนการเพิ่มซ้ำ
            console.log('[createDirectConversation] Conversation exists, updating:', newConversation.id);
            const updatedConversations = [...state.conversations];
            updatedConversations[existingIndex] = {
              ...updatedConversations[existingIndex],
              ...newConversation
            };
            return {
              conversations: updatedConversations,
              isLoading: false
            };
          }

          // ✅ ถ้าไม่มี → เพิ่มใหม่
          console.log('[createDirectConversation] Adding new conversation:', newConversation.id);
          return {
            conversations: [newConversation, ...state.conversations],
            isLoading: false
          };
        });

        // ✅ FIX: Subscribe คนที่สร้างแชทให้ได้รับข้อความเรียลไทม์ทันที
        console.log('[createDirectConversation] Subscribing to new conversation:', newConversation.id);
        WebSocketManager.subscribeToConversation(newConversation.id);

        return newConversation;
      }

      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างการสนทนา';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  /**
   * สร้างการสนทนาแบบกลุ่ม
   */
  createGroupConversation: async (title: string, memberIds?: string[], iconUrl?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.createGroupConversation(title, memberIds, iconUrl);

      if (response.success) {
        const newConversation = response.conversation;

        set((state) => {
          // ✅ FIX: ตรวจสอบว่ามี conversation นี้อยู่แล้วหรือไม่
          const existingIndex = state.conversations.findIndex(
            conv => conv.id === newConversation.id
          );

          if (existingIndex !== -1) {
            // ✅ ถ้ามีอยู่แล้ว → อัพเดตแทนการเพิ่มซ้ำ
            console.log('[createGroupConversation] Group exists, updating:', newConversation.id);
            const updatedConversations = [...state.conversations];
            updatedConversations[existingIndex] = {
              ...updatedConversations[existingIndex],
              ...newConversation
            };
            return {
              conversations: updatedConversations,
              isLoading: false
            };
          }

          // ✅ ถ้าไม่มี → เพิ่มใหม่
          console.log('[createGroupConversation] Adding new group:', newConversation.id);
          return {
            conversations: [newConversation, ...state.conversations],
            isLoading: false
          };
        });

        // ✅ FIX: Subscribe คนที่สร้างกลุ่มให้ได้รับข้อความเรียลไทม์ทันที
        console.log('[createGroupConversation] Subscribing to new group:', newConversation.id);
        WebSocketManager.subscribeToConversation(newConversation.id);

        return newConversation;
      }

      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างกลุ่มสนทนา';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  /**
   * อัปเดตข้อมูลการสนทนา
   */
  updateConversation: async (conversationId: string, data: UpdateConversationRequest) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.updateConversation(conversationId, data);

      if (response.success) {
        // อัปเดต conversation ในรายการ
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, ...data, updated_at: new Date().toISOString() }
              : conv
          ),
          isLoading: false
        }));

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตการสนทนา';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * เปลี่ยนสถานะปักหมุดของการสนทนา
   */
  togglePinConversation: async (conversationId: string, isPinned: boolean) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.togglePinConversation(conversationId, isPinned);

      if (response.success) {
        // อัปเดต conversation ในรายการ
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, is_pinned: isPinned }
              : conv
          ),
          isLoading: false
        }));

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะปักหมุด';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * เปลี่ยนสถานะการปิดเสียงของการสนทนา
   */
  toggleMuteConversation: async (conversationId: string, isMuted: boolean) => {
    try {
      set({ isLoading: true, error: null });
      const response = await conversationService.toggleMuteConversation(conversationId, isMuted);

      if (response.success) {
        // อัปเดต conversation ในรายการ
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, is_muted: isMuted }
              : conv
          ),
          isLoading: false
        }));

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะปิดเสียง';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * ลบการสนทนา (Hide for Direct / Leave for Group)
   */
  deleteConversation: async (conversationId: string, currentUserId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get conversation type to determine action
      const conversation = useConversationStore.getState().conversations.find(c => c.id === conversationId);

      if (!conversation) {
        set({ isLoading: false, error: 'ไม่พบการสนทนา' });
        return false;
      }

      // Call appropriate API based on conversation type
      const response = conversation.type === 'group'
        ? await conversationService.leaveGroup(conversationId, currentUserId)
        : await conversationService.deleteConversation(conversationId);

      if (response.success) {
        // Remove conversation from list
        set((state) => ({
          conversations: state.conversations.filter(conv => conv.id !== conversationId),
          isLoading: false
        }));

        // Clear active conversation if it's the deleted one
        if (useConversationStore.getState().activeConversationId === conversationId) {
          set({ activeConversationId: null });
        }

        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบการสนทนา';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * ตั้งค่าการสนทนาที่เลือก
   */
  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });
  },

  /**
   * ตั้งค่าสถานะการโหลด
   */
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  /**
   * ตั้งค่าข้อความผิดพลาด
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * ล้างข้อมูลทั้งหมดใน store
   */
  clearConversationStore: () => {
    set({
      conversations: [],
      activeConversationId: null,
      conversationMessages: {},
      hasMoreMessages: {},
      hasAfterMessages: {}, // ⬇️ Clear this too
      isLoading: false,
      error: null,
    });
  },

  /**
   * เพิ่มข้อความใหม่
   */
  // src/stores/conversationStore.ts
  // ✅ Fixed version - handles all temp/real message scenarios
  addNewMessage: (message: MessageDTO, currentUserId: string) => {
    set((state) => {
      const conversationId = message.conversation_id;
      const currentMessages = state.conversationMessages[conversationId] || [];

      const isRealMessage = message.id && message.temp_id && message.id !== message.temp_id;
      const isTempMessage = message.id === message.temp_id;

      // ✅ Improved: Search by ID and temp_id (all cases)
      const existingIndex = currentMessages.findIndex(msg => {
        // Case 1: Match by real ID
        if (msg.id === message.id) return true;

        // Case 2: Match by temp_id (real message replacing temp)
        if (message.temp_id && msg.temp_id === message.temp_id) return true;

        // Case 3: Match temp message with incoming temp_id (temp replacing real - rare)
        if (message.id && msg.temp_id === message.id) return true;

        return false;
      });

      // ✅ If found existing message → decide to replace or skip
      if (existingIndex !== -1) {
        const existingMsg = currentMessages[existingIndex];

        // ✅ Cases to replace:
        // 1. Real message replacing temp message
        // 2. Update same message (same ID)
        const isExistingTemp = existingMsg.id === existingMsg.temp_id;
        const shouldReplace =
          (isRealMessage && isExistingTemp) ||  // Real replacing temp
          (message.id === existingMsg.id && !isTempMessage); // Update real message

        // ✅ Cases to skip:
        // 1. Temp message trying to replace real message (ignore temp)
        // 2. Duplicate message (same ID, same data)
        const shouldSkip =
          (isTempMessage && !isExistingTemp) || // Temp after real → Skip temp
          (message.id === existingMsg.id && message.temp_id === existingMsg.temp_id); // Exact duplicate

        if (shouldReplace) {
          const updatedMessages = [...currentMessages];

          // ✅ Backend now sends status - use it directly (no need to calculate)
          // ⚠️ IMPORTANT: Never downgrade status from 'read' to 'sent' (race condition fix)
          // Status priority: read > delivered > sent > sending
          const statusPriority: Record<string, number> = { 'sending': 0, 'sent': 1, 'delivered': 2, 'read': 3 };
          const existingPriority = statusPriority[existingMsg.status || 'sending'] || 0;
          const newPriority = statusPriority[message.status || 'sent'] || 1;
          const newStatus = newPriority >= existingPriority ? (message.status || 'sent') : existingMsg.status;

          // ✅ Same for read_count - never decrease it
          const newReadCount = Math.max(existingMsg.read_count || 0, message.read_count || 0);

          // ✅ Update in-place: spread existing + new fields (keeps localKey stable)
          updatedMessages[existingIndex] = {
            ...existingMsg,
            ...message,
            status: newStatus,
            read_count: newReadCount,
            localKey: existingMsg.localKey || message.localKey || existingMsg.temp_id || message.id
          };

          // Update conversation metadata
          const lastMessageText = getLastMessageTextBySender(message, currentUserId);
          const updatedConversations = state.conversations.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                last_message_text: lastMessageText,
                last_message_at: message.created_at
              };
            }
            return conv;
          });

          return {
            conversations: updatedConversations,
            conversationMessages: {
              ...state.conversationMessages,
              [conversationId]: updatedMessages
            }
          };
        }

        if (shouldSkip) {
          return state;
        }
      }

      // ✅ Not found → Append (new message)
      // Check conditions to increase unread_count
      const isFromOtherUser = message.sender_id !== currentUserId;
      const isInActiveConversation = state.activeConversationId === conversationId;
      const shouldIncreaseUnread = isFromOtherUser && !isInActiveConversation;

      const lastMessageText = getLastMessageTextBySender(message, currentUserId);

      // Update latest message in conversation
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === conversationId) {
          const newUnreadCount = shouldIncreaseUnread
            ? (conv.unread_count || 0) + 1
            : conv.unread_count || 0;

          return {
            ...conv,
            last_message_text: lastMessageText,
            last_message_at: message.created_at,
            unread_count: newUnreadCount
          };
        }
        return conv;
      });

      // Sort conversations (latest on top)
      const sortedConversations = [...updatedConversations].sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });

      // 🔍 Debug: Log conversation update
      console.log('📝 [Store] Conversations updated:', {
        conversationId,
        lastMessageText,
        totalConversations: sortedConversations.length
      });

      // Ensure message has localKey
      const messageWithLocalKey = {
        ...message,
        localKey: message.localKey || message.temp_id || message.id
      };

      return {
        conversations: sortedConversations,
        conversationMessages: {
          ...state.conversationMessages,
          [conversationId]: [...currentMessages, messageWithLocalKey]
        }
      };
    });
  },

  /**
   * อัปเดตข้อความ
   */
  updateMessage: (messageId: string, updates: Partial<MessageDTO>) => {
    set((state) => {
      // ค้นหาข้อความในทุกการสนทนา
      let conversationId = '';
      const updatedMessages: Record<string, MessageDTO[]> = { ...state.conversationMessages };

      // ค้นหาการสนทนาที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.conversationMessages)) {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
          conversationId = convId;

          // อัปเดตข้อความ (preserve status, read_count, and localKey if not in updates)
          updatedMessages[convId] = messages.map(msg => {
            if (msg.id === messageId) {
              // ⚠️ IMPORTANT: Never downgrade status (race condition fix)
              // Status priority: read > delivered > sent > sending
              const statusPriority: Record<string, number> = { 'sending': 0, 'sent': 1, 'delivered': 2, 'read': 3 };
              const existingPriority = statusPriority[msg.status || 'sending'] || 0;
              const updatePriority = statusPriority[updates.status || ''] || -1;

              // Only use new status if it's higher priority, otherwise keep existing
              const newStatus = updates.status !== undefined && updatePriority >= existingPriority
                ? updates.status
                : msg.status;

              // Never decrease read_count
              const newReadCount = updates.read_count !== undefined
                ? Math.max(msg.read_count || 0, updates.read_count)
                : msg.read_count;

              return {
                ...msg,
                ...updates,
                status: newStatus,
                read_count: newReadCount,
                localKey: msg.localKey || msg.temp_id || msg.id
              };
            }
            return msg;
          });

          break;
        }
      }

      if (!conversationId) {
        return state; // ไม่พบข้อความ
      }

      return {
        conversationMessages: updatedMessages
      };
    });
  },

  /**
   * ลบข้อความ
   */
  deleteMessage: (messageId: string) => {
    set((state) => {
      // ค้นหาข้อความในทุกการสนทนา
      let conversationId = '';
      const updatedMessages: Record<string, MessageDTO[]> = { ...state.conversationMessages };

      // ค้นหาการสนทนาที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.conversationMessages)) {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
          conversationId = convId;

          // มาร์คข้อความเป็นถูกลบ แทนที่จะลบจริงๆ (preserve localKey)
          updatedMessages[convId] = messages.map(msg =>
            msg.id === messageId
              ? { ...msg, is_deleted: true, localKey: msg.localKey || msg.temp_id || msg.id }
              : msg
          );

          break;
        }
      }

      if (!conversationId) {
        return state; // ไม่พบข้อความ
      }

      return {
        conversationMessages: updatedMessages
      };
    });
  },

  /**
   * มาร์คข้อความว่าอ่านแล้ว
   */
  markMessageAsRead: (messageId: string) => {
    set((state) => {
      // ค้นหาข้อความในทุกการสนทนา
      let conversationId = '';
      const updatedMessages: Record<string, MessageDTO[]> = { ...state.conversationMessages };

      // ค้นหาการสนทนาที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.conversationMessages)) {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
          conversationId = convId;

          // มาร์คข้อความว่าอ่านแล้ว (preserve localKey)
          updatedMessages[convId] = messages.map(msg =>
            msg.id === messageId
              ? { ...msg, is_read: true, localKey: msg.localKey || msg.temp_id || msg.id }
              : msg
          );

          break;
        }
      }

      if (!conversationId) {
        return state; // ไม่พบข้อความ
      }

      // อัปเดตการสนทนา (ลด unread_count)
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === conversationId && conv.unread_count > 0) {
          return {
            ...conv,
            unread_count: conv.unread_count - 1
          };
        }
        return conv;
      });

      return {
        conversations: updatedConversations,
        conversationMessages: updatedMessages
      };
    });
  },

  /**
   * เพิ่มการสนทนาใหม่
   */
  addNewConversation: (conversation: ConversationDTO) => {
    set((state) => {
      // ตรวจสอบว่ามีการสนทนานี้อยู่แล้วหรือไม่
      const exists = state.conversations.some(conv => conv.id === conversation.id);

      if (exists) {
        return state; // ไม่มีการเปลี่ยนแปลงถ้ามีการสนทนานี้อยู่แล้ว
      }

      return {
        conversations: [conversation, ...state.conversations]
      };
    });
  },

  /**
   * อัปเดตข้อมูลการสนทนา
   */
  updateConversationData: (conversationId: string, updates: Partial<ConversationDTO>) => {
    set((state) => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      )
    }));
  },

  /**
   * ลบการสนทนา
   */
  removeConversation: (conversationId: string) => {
    console.log('[DEBUG] removeConversation called for:', conversationId);

    set((state) => {
      const conversationExists = state.conversations.find(conv => conv.id === conversationId);

      if (!conversationExists) {
        console.warn('[DEBUG] Conversation not found in store:', conversationId);
        return state; // ไม่เปลี่ยนแปลง state
      }

      console.log('[DEBUG] Removing conversation from store:', conversationId);

      // สร้าง Object ใหม่โดยละเว้นคีย์ที่ต้องการลบ
      const newMessages = { ...state.conversationMessages };
      delete newMessages[conversationId];

      const newConversations = state.conversations.filter(conv => conv.id !== conversationId);

      console.log('[DEBUG] Conversations before remove:', state.conversations.length);
      console.log('[DEBUG] Conversations after remove:', newConversations.length);

      return {
        conversations: newConversations,
        conversationMessages: newMessages,
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        // เพิ่มคีย์อื่นๆ ที่จำเป็นแต่ไม่ต้องเปลี่ยนแปลง
        hasMoreMessages: state.hasMoreMessages,
        isLoading: state.isLoading,
        error: state.error
      };
    });
  },
  // src/stores/conversationStore.ts
  // ปรับปรุงฟังก์ชัน updateMessageStatus
  updateMessageStatus: (messageId: string, status: MessageStatus) => {
    set((state) => {
      const newMessages: Record<string, MessageDTO[]> = { ...state.conversationMessages };

      // ค้นหาการสนทนาที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.conversationMessages)) {
        const messageIndex = messages.findIndex(msg =>
          msg.id === messageId || msg.temp_id === messageId
        );

        if (messageIndex !== -1) {
          // อัพเดทสถานะข้อความ (preserve localKey and update read_count)
          newMessages[convId] = messages.map(msg => {
            if (msg.id === messageId || msg.temp_id === messageId) {
              // ⚠️ IMPORTANT: Never downgrade status (race condition fix)
              // Status priority: read > delivered > sent > sending
              const statusPriority: Record<string, number> = { 'sending': 0, 'sent': 1, 'delivered': 2, 'read': 3 };
              const existingPriority = statusPriority[msg.status || 'sending'] || 0;
              const newPriority = statusPriority[status] || 0;

              // Only update if new status has higher or equal priority
              const finalStatus = newPriority >= existingPriority ? status : msg.status;

              // ถ้า status เป็น 'read' ให้เพิ่ม read_count เป็น 2 (recipient has read)
              const newReadCount = finalStatus === 'read' && (msg.read_count || 0) < 2 ? 2 : (msg.read_count || 0);

              return {
                ...msg,
                status: finalStatus,
                read_count: newReadCount,
                localKey: msg.localKey || msg.temp_id || msg.id
              };
            }
            return msg;
          });

          break;
        }
      }

      return {
        conversationMessages: newMessages
      };
    });
  },
  markAllMessagesAsReadInConversation: (conversationId: string) => {
    set((state) => {
      //console.log(`Marking all messages as read in conversation: ${conversationId}`);
      
      // ตรวจสอบว่ามีข้อความในการสนทนานี้หรือไม่
      const messages = state.conversationMessages[conversationId];
      if (!messages || messages.length === 0) {
        //console.log('No messages found in this conversation');
        return state; // ไม่มีการเปลี่ยนแปลง
      }
      
      //console.log(`Found ${messages.length} messages to update`);
      
      // อัพเดตสถานะของข้อความทั้งหมดในการสนทนา (preserve localKey)
      const updatedMessages = messages.map(msg => ({
        ...msg,
        status: 'read' as const, // ระบุว่านี่คือค่าคงที่ 'read' ไม่ใช่ string ทั่วไป
        is_read: true,
        read_count: (msg.read_count || 0) + 1,
        localKey: msg.localKey || msg.temp_id || msg.id
      }));
      
      // อัพเดต unread_count ของการสนทนาเป็น 0
      const updatedConversations = state.conversations.map(conv => 
        conv.id === conversationId
          ? { ...conv, unread_count: 0 }
          : conv
      );
      
      //console.log(`Updated ${updatedMessages.length} messages to 'read' status`);
      
      return {
        conversationMessages: {
          ...state.conversationMessages,
          [conversationId]: updatedMessages
        },
        conversations: updatedConversations
      };
    });
  },

  /**
   * Replace messages in conversation with context messages (for jump to message feature)
   * @param conversationId - ID of the conversation
   * @param messages - Array of messages from context API
   * @param hasBefore - Whether there are more messages before
   * @param hasAfter - Whether there are more messages after
   */
  replaceMessagesWithContext: (conversationId: string, messages: MessageDTO[], hasBefore: boolean, hasAfter: boolean) => {
    set((state) => {
      // Sort messages by created_at (oldest first) and ensure localKey
      const sortedMessages = [...messages]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(msg => ({
          ...msg,
          localKey: msg.localKey || msg.temp_id || msg.id
        }));

      return {
        conversationMessages: {
          ...state.conversationMessages,
          [conversationId]: sortedMessages
        },
        hasMoreMessages: {
          ...state.hasMoreMessages,
          [conversationId]: hasBefore // ⬆️ มี messages เก่ากว่านี้อีกไหม
        },
        hasAfterMessages: {
          ...state.hasAfterMessages,
          [conversationId]: hasAfter // ⬇️ มี messages ใหม่กว่านี้อีกไหม
        }
      };
    });
  }
}), {
  name: 'ConversationStore', // ชื่อใน Redux DevTools
  enabled: import.meta.env.DEV // เปิดเฉพาะตอน development
})
);

// ✅ PERFORMANCE OPTIMIZATION: Selectors
// ใช้ selectors เหล่านี้แทนการ subscribe ทั้ง store
// จะทำให้ component re-render เฉพาะเมื่อ data ที่ต้องการเปลี่ยนแปลง

/**
 * Selectors สำหรับดึงข้อมูล state โดยตรง
 * ใช้แบบนี้: const conversations = useConversationStore(conversationSelectors.conversations)
 */
export const conversationSelectors = {
  // Basic state
  conversations: (state: ConversationState) => state.conversations,
  activeConversationId: (state: ConversationState) => state.activeConversationId,
  isLoading: (state: ConversationState) => state.isLoading,
  error: (state: ConversationState) => state.error,

  // Computed state - active conversation
  activeConversation: (state: ConversationState) => {
    if (!state.activeConversationId) return null;
    return state.conversations.find(c => c.id === state.activeConversationId) || null;
  },

  // Messages for active conversation
  activeMessages: (state: ConversationState) => {
    if (!state.activeConversationId) return [];
    return state.conversationMessages[state.activeConversationId] || [];
  },

  // Pagination state for active conversation
  hasMoreMessages: (state: ConversationState) => {
    if (!state.activeConversationId) return false;
    return state.hasMoreMessages[state.activeConversationId] ?? false;
  },

  hasAfterMessages: (state: ConversationState) => {
    if (!state.activeConversationId) return false;
    return state.hasAfterMessages[state.activeConversationId] ?? false;
  },

  // Get messages by conversation ID
  getMessagesByConversationId: (conversationId: string) => (state: ConversationState) => {
    return state.conversationMessages[conversationId] || [];
  },

  // Get conversation by ID
  getConversationById: (conversationId: string) => (state: ConversationState) => {
    return state.conversations.find(c => c.id === conversationId) || null;
  },

  // Unread conversations count
  unreadCount: (state: ConversationState) => {
    return state.conversations.filter(c => c.unread_count > 0).length;
  },

  // Pinned conversations
  pinnedConversations: (state: ConversationState) => {
    return state.conversations.filter(c => c.is_pinned);
  },
};

/**
 * Actions selector - stable reference ไม่เปลี่ยน
 * ใช้แบบนี้: const actions = useConversationStore(conversationActions)
 */
export const conversationActions = (state: ConversationState) => ({
  // Fetching
  fetchConversations: state.fetchConversations,
  fetchMoreConversations: state.fetchMoreConversations,
  fetchConversationMessages: state.fetchConversationMessages,
  fetchMoreMessages: state.fetchMoreMessages,

  // CRUD
  createDirectConversation: state.createDirectConversation,
  createGroupConversation: state.createGroupConversation,
  updateConversation: state.updateConversation,
  togglePinConversation: state.togglePinConversation,
  toggleMuteConversation: state.toggleMuteConversation,
  deleteConversation: state.deleteConversation,
  setActiveConversation: state.setActiveConversation,

  // Helpers
  setLoading: state.setLoading,
  setError: state.setError,
  clearConversationStore: state.clearConversationStore,

  // WebSocket handlers
  addNewMessage: state.addNewMessage,
  updateMessage: state.updateMessage,
  deleteMessage: state.deleteMessage,
  markMessageAsRead: state.markMessageAsRead,
  addNewConversation: state.addNewConversation,
  updateConversationData: state.updateConversationData,
  removeConversation: state.removeConversation,
  updateMessageStatus: state.updateMessageStatus,
  markAllMessagesAsReadInConversation: state.markAllMessagesAsReadInConversation,
  replaceMessagesWithContext: state.replaceMessagesWithContext,
});

export default useConversationStore;