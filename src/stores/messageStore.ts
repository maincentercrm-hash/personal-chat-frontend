// src/stores/messageStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import messageService from '@/services/messageService';
import type { MessageDTO } from '@/types/message.types';

interface MessageState {
  messages: Record<string, MessageDTO[]>; // ข้อความแยกตาม conversationId
  editingMessageId: string | null; // ID ของข้อความที่กำลังแก้ไข
  replyingToMessageId: string | null; // ID ของข้อความที่กำลังตอบกลับ
  isLoading: boolean;
  error: string | null;
  
  // Actions - การส่งข้อความ
  sendTextMessage: (conversationId: string, content: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  sendStickerMessage: (conversationId: string, stickerId: string, stickerSetId: string, mediaUrl: string, mediaThumbnailUrl?: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  sendImageMessage: (conversationId: string, mediaUrl: string, mediaThumbnailUrl?: string, caption?: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  sendFileMessage: (conversationId: string, mediaUrl: string, fileName: string, fileSize: number, fileType: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  uploadAndSendImage: (conversationId: string, file: File, caption?: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  uploadAndSendFile: (conversationId: string, file: File, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  
  // Actions - การจัดการข้อความ
  editMessage: (messageId: string, content: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  replyToMessage: (messageId: string, messageType: 'text' | 'image' | 'file' | 'sticker', content?: string, mediaUrl?: string, mediaThumbnailUrl?: string, metadata?: Record<string, unknown>) => Promise<MessageDTO | null>;
  
  // Actions - การอ่านข้อความ
  markMessageAsRead: (messageId: string) => Promise<boolean>;
  markAllMessagesAsRead: (conversationId: string) => Promise<boolean>;
  
  // State management
  setEditingMessageId: (messageId: string | null) => void;
  setReplyingToMessageId: (messageId: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearMessages: (conversationId?: string) => void;
  
  // WebSocket event handlers
  addMessage: (message: MessageDTO) => void;
  updateMessage: (messageId: string, updates: Partial<MessageDTO>) => void;
  removeMessage: (messageId: string) => void;
  markMessageAsReadInStore: (messageId: string) => void;


  
}

export const useMessageStore = create<MessageState>()( devtools((set) => ({
  messages: {},
  editingMessageId: null,
  replyingToMessageId: null,
  isLoading: false,
  error: null,

  /**
   * ส่งข้อความแบบข้อความ
   */
  sendTextMessage: async (conversationId: string, content: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.sendTextMessage(conversationId, content, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * ส่งข้อความแบบสติกเกอร์
   */
  sendStickerMessage: async (conversationId: string, stickerId: string, stickerSetId: string, mediaUrl: string, mediaThumbnailUrl?: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.sendStickerMessage(conversationId, stickerId, stickerSetId, mediaUrl, mediaThumbnailUrl, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send sticker';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * ส่งข้อความแบบรูปภาพ
   */
  sendImageMessage: async (conversationId: string, mediaUrl: string, mediaThumbnailUrl?: string, caption?: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.sendImageMessage(conversationId, mediaUrl, mediaThumbnailUrl, caption, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send image';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * ส่งข้อความแบบไฟล์
   */
  sendFileMessage: async (conversationId: string, mediaUrl: string, fileName: string, fileSize: number, fileType: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.sendFileMessage(conversationId, mediaUrl, fileName, fileSize, fileType, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send file';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * อัพโหลดรูปภาพและส่งข้อความ
   */
  uploadAndSendImage: async (conversationId: string, file: File, caption?: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.uploadAndSendImage(conversationId, file, caption, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload and send image';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * อัพโหลดไฟล์และส่งข้อความ
   */
  uploadAndSendFile: async (conversationId: string, file: File, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.uploadAndSendFile(conversationId, file, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload and send file';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * แก้ไขข้อความ
   */
  editMessage: async (messageId: string, content: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.editMessage(messageId, content, metadata);
      
      if (response.success) {
        const updatedMessage = response.data;
        
        // ค้นหาและอัปเดตข้อความใน store
        set((state) => {
          const newMessages = { ...state.messages };
          
          // ค้นหา conversation ที่มีข้อความนี้
          for (const [convId, messages] of Object.entries(state.messages)) {
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            
            if (messageIndex !== -1) {
              // อัปเดตข้อความ
              newMessages[convId] = [
                ...messages.slice(0, messageIndex),
                updatedMessage,
                ...messages.slice(messageIndex + 1)
              ];
              break;
            }
          }
          
          return {
            messages: newMessages,
            editingMessageId: null, // ล้างการแก้ไข
            isLoading: false
          };
        });
        
        return updatedMessage;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit message';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * ลบข้อความ
   */
  deleteMessage: async (messageId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.deleteMessage(messageId);
      
      if (response.success) {
        // ค้นหาและอัปเดตข้อความใน store (เปลี่ยนสถานะเป็นถูกลบ)
        set((state) => {
          const newMessages = { ...state.messages };
          
          // ค้นหา conversation ที่มีข้อความนี้
          for (const [convId, messages] of Object.entries(state.messages)) {
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            
            if (messageIndex !== -1) {
              // อัปเดตข้อความเป็นถูกลบ
              const updatedMessage = {
                ...messages[messageIndex],
                is_deleted: true,
                deleted_at: new Date().toISOString()
              };
              
              newMessages[convId] = [
                ...messages.slice(0, messageIndex),
                updatedMessage,
                ...messages.slice(messageIndex + 1)
              ];
              break;
            }
          }
          
          return {
            messages: newMessages,
            isLoading: false
          };
        });
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  /**
   * ตอบกลับข้อความ
   */
  replyToMessage: async (messageId: string, messageType: 'text' | 'image' | 'file' | 'sticker', content?: string, mediaUrl?: string, mediaThumbnailUrl?: string, metadata?: Record<string, unknown>) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.replyToMessage(messageId, messageType, content, mediaUrl, mediaThumbnailUrl, metadata);
      
      if (response.success) {
        const message = response.data;
        
        // เพิ่มข้อความใหม่ลงใน store
        set((state) => {
          const conversationId = message.conversation_id;
          const conversationMessages = state.messages[conversationId] || [];
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message]
            },
            replyingToMessageId: null, // ล้างการตอบกลับ
            isLoading: false
          };
        });
        
        return message;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reply to message';
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  /**
   * มาร์คข้อความว่าอ่านแล้ว
   */
  markMessageAsRead: async (messageId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.markMessageAsRead(messageId);
      
      if (response.success) {
        // อัปเดตสถานะการอ่านข้อความใน store
        set((state) => {
          const newMessages = { ...state.messages };
          
          // ค้นหา conversation ที่มีข้อความนี้
          for (const [convId, messages] of Object.entries(state.messages)) {
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            
            if (messageIndex !== -1) {
              // อัปเดตสถานะการอ่าน
              const updatedMessage = {
                ...messages[messageIndex],
                is_read: true,
                read_count: (messages[messageIndex].read_count || 0) + 1
              };
              
              newMessages[convId] = [
                ...messages.slice(0, messageIndex),
                updatedMessage,
                ...messages.slice(messageIndex + 1)
              ];
              break;
            }
          }
          
          return {
            messages: newMessages,
            isLoading: false
          };
        });
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark message as read';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  /**
   * มาร์คข้อความทั้งหมดในการสนทนาว่าอ่านแล้ว
   */
  markAllMessagesAsRead: async (conversationId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messageService.markAllMessagesAsRead(conversationId);
      
      if (response.success) {
        // อัปเดตสถานะการอ่านข้อความทั้งหมดในการสนทนา
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          
          // อัปเดตทุกข้อความเป็นอ่านแล้ว
          const updatedMessages = conversationMessages.map(msg => ({
            ...msg,
            is_read: true
          }));
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: updatedMessages
            },
            isLoading: false
          };
        });
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all messages as read';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  /**
   * ตั้งค่า ID ของข้อความที่กำลังแก้ไข
   */
  setEditingMessageId: (messageId: string | null) => {
    set({ editingMessageId: messageId });
  },

  /**
   * ตั้งค่า ID ของข้อความที่กำลังตอบกลับ
   */
  setReplyingToMessageId: (messageId: string | null) => {
    set({ replyingToMessageId: messageId });
  },

  /**
   * ตั้งค่าข้อความผิดพลาด
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * ล้างข้อความผิดพลาด
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * ล้างข้อความทั้งหมด หรือเฉพาะการสนทนาที่ระบุ
   */
  clearMessages: (conversationId?: string) => {
    if (conversationId) {
      // ล้างข้อความเฉพาะการสนทนา
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: []
        }
      }));
    } else {
      // ล้างข้อความทั้งหมด
      set({ messages: {} });
    }
  },

  /**
   * เพิ่มข้อความใหม่ (สำหรับ WebSocket)
   */
  addMessage: (message: MessageDTO) => {
    set((state) => {
      const conversationId = message.conversation_id;
      const conversationMessages = state.messages[conversationId] || [];
      
      // ตรวจสอบว่ามีข้อความนี้อยู่แล้วหรือไม่
      const exists = conversationMessages.some(msg => msg.id === message.id);
      
      if (exists) {
        return state; // ไม่มีการเปลี่ยนแปลง
      }
      
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...conversationMessages, message]
        }
      };
    });
  },

  /**
   * อัปเดตข้อความ (สำหรับ WebSocket)
   */
  updateMessage: (messageId: string, updates: Partial<MessageDTO>) => {
    set((state) => {
      const newMessages = { ...state.messages };
      
      // ค้นหา conversation ที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.messages)) {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
          // อัปเดตข้อความ
          const updatedMessage = {
            ...messages[messageIndex],
            ...updates
          };
          
          newMessages[convId] = [
            ...messages.slice(0, messageIndex),
            updatedMessage,
            ...messages.slice(messageIndex + 1)
          ];
          break;
        }
      }
      
      return {
        messages: newMessages
      };
    });
  },

  /**
   * ลบข้อความ (สำหรับ WebSocket)
   */
  removeMessage: (messageId: string) => {
    set((state) => {
      const newMessages = { ...state.messages };
      
      // ค้นหา conversation ที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.messages)) {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
          // ทำเครื่องหมายข้อความว่าถูกลบ (ไม่ลบจริง)
          const updatedMessage = {
            ...messages[messageIndex],
            is_deleted: true,
            deleted_at: new Date().toISOString()
          };
          
          newMessages[convId] = [
            ...messages.slice(0, messageIndex),
            updatedMessage,
            ...messages.slice(messageIndex + 1)
          ];
          break;
        }
      }
      
      return {
        messages: newMessages
      };
    });
  },

  /**
   * มาร์คข้อความว่าอ่านแล้วใน store (สำหรับ WebSocket)
   */
  markMessageAsReadInStore: (messageId: string) => {
    set((state) => {
      const newMessages = { ...state.messages };
      
      // ค้นหา conversation ที่มีข้อความนี้
      for (const [convId, messages] of Object.entries(state.messages)) {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
          // อัปเดตสถานะการอ่าน
          const updatedMessage = {
            ...messages[messageIndex],
            is_read: true,
            read_count: (messages[messageIndex].read_count || 0) + 1
          };
          
          newMessages[convId] = [
            ...messages.slice(0, messageIndex),
            updatedMessage,
            ...messages.slice(messageIndex + 1)
          ];
          break;
        }
      }
      
      return {
        messages: newMessages
      };
    });
  }
}), {
  name: 'MessageStore', // ชื่อใน Redux DevTools
  enabled: import.meta.env.DEV // เปิดเฉพาะตอน development
})
);

// ✅ PERFORMANCE OPTIMIZATION: Selectors
// ใช้ selectors เหล่านี้แทนการ subscribe ทั้ง store

/**
 * Selectors สำหรับดึงข้อมูล state โดยตรง
 * ใช้แบบนี้: const editingId = useMessageStore(messageSelectors.editingMessageId)
 */
export const messageSelectors = {
  // Basic state
  editingMessageId: (state: MessageState) => state.editingMessageId,
  replyingToMessageId: (state: MessageState) => state.replyingToMessageId,
  isLoading: (state: MessageState) => state.isLoading,
  error: (state: MessageState) => state.error,

  // Get messages by conversation ID
  getMessagesByConversationId: (conversationId: string) => (state: MessageState) => {
    return state.messages[conversationId] || [];
  },

  // Get editing message
  editingMessage: (state: MessageState) => {
    if (!state.editingMessageId) return null;

    // Search in all conversations
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === state.editingMessageId);
      if (message) return message;
    }

    return null;
  },

  // Get replying to message
  replyingToMessage: (state: MessageState) => {
    if (!state.replyingToMessageId) return null;

    // Search in all conversations
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === state.replyingToMessageId);
      if (message) return message;
    }

    return null;
  },
};

/**
 * Actions selector - stable reference ไม่เปลี่ยน
 * ใช้แบบนี้: const actions = useMessageStore(messageActions)
 */
export const messageActions = (state: MessageState) => ({
  // Sending messages
  sendTextMessage: state.sendTextMessage,
  sendStickerMessage: state.sendStickerMessage,
  sendImageMessage: state.sendImageMessage,
  sendFileMessage: state.sendFileMessage,
  uploadAndSendImage: state.uploadAndSendImage,
  uploadAndSendFile: state.uploadAndSendFile,

  // Managing messages
  editMessage: state.editMessage,
  deleteMessage: state.deleteMessage,
  replyToMessage: state.replyToMessage,

  // Reading messages
  markMessageAsRead: state.markMessageAsRead,
  markAllMessagesAsRead: state.markAllMessagesAsRead,

  // State management
  setEditingMessageId: state.setEditingMessageId,
  setReplyingToMessageId: state.setReplyingToMessageId,
  setError: state.setError,
  clearError: state.clearError,
  clearMessages: state.clearMessages,

  // WebSocket handlers
  addMessage: state.addMessage,
  updateMessage: state.updateMessage,
  removeMessage: state.removeMessage,
  markMessageAsReadInStore: state.markMessageAsReadInStore,
});

export default useMessageStore;