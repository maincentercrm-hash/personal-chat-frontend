// src/contexts/ActiveConversationContext.tsx
import React, { createContext, useContext, useCallback, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { ConversationDTO, MessageDTO } from '@/types/conversation.types';
import useConversationStore from '@/stores/conversationStore';
import { useMessage } from '@/hooks/useMessage';

/**
 * Active Conversation Context
 *
 * เก็บ state และ actions สำหรับ conversation ที่กำลังใช้งานอยู่
 * ✅ conversationId มาจาก useParams (stable, single source of truth)
 * ✅ Callbacks มี stable references (useCallback)
 * ✅ Components subscribe เฉพาะสิ่งที่ต้องการ
 */

interface ReplyingTo {
  id: string;
  text: string;
  sender: string;
}

interface ActiveConversationContextValue {
  // Conversation Info
  conversationId: string | null;
  conversation: ConversationDTO | null;

  // Messages
  messages: MessageDTO[];
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;

  // Message Actions (stable references)
  sendMessage: (content: string) => Promise<void>;
  sendSticker: (stickerId: string, url: string, setId: string) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  replyToMessage: (messageId: string, content: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Reply State
  replyingTo: ReplyingTo | null;
  setReplyingTo: (message: ReplyingTo | null) => void;

  // Loading States
  isSending: boolean;
}

const ActiveConversationContext = createContext<ActiveConversationContextValue | null>(null);

export function ActiveConversationProvider({ children }: { children: React.ReactNode }) {
  // ✅ Single source of truth: conversationId จาก URL
  const { conversationId } = useParams<{ conversationId: string }>();

  // Local state
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages] = useState(false);

  // ✅ Subscribe เฉพาะ conversation นี้ (stable selector)
  const conversation = useConversationStore((state) => {
    if (!conversationId) return null;
    return state.conversations.find(c => c.id === conversationId) || null;
  });

  // ✅ Subscribe เฉพาะ messages ของ conversation นี้
  const messages = useConversationStore((state) => {
    if (!conversationId) return [];
    return state.conversationMessages[conversationId] || [];
  });

  // ✅ hasMoreMessages
  const hasMoreMessages = useConversationStore((state) => {
    if (!conversationId) return false;
    return state.hasMoreMessages[conversationId] ?? true;
  });

  // Message hooks
  const {
    sendTextMessage,
    sendStickerMessage,
    uploadAndSendImage,
    uploadAndSendFile,
    replyToMessage: replyToMessageHook,
    editMessage: editMessageHook,
  } = useMessage();

  // Message area ref for scrolling
  const messageAreaRef = useRef<any>(null);

  // ✅ Stable callbacks using conversationId from useParams
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot send message');
        return;
      }

      console.log('[ActiveConversationContext] Sending message to conversation:', conversationId);
      setIsSending(true);

      try {
        // ถ้ามีการตอบกลับ
        if (replyingTo) {
          await replyToMessageHook(replyingTo.id, 'text', content);
          setReplyingTo(null);
        } else {
          // ส่งข้อความปกติ
          await sendTextMessage(conversationId, content);
        }

        // Scroll to bottom after sending
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom?.(true);
        }, 100);
      } catch (error) {
        console.error('[ActiveConversationContext] Error sending message:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, replyingTo, sendTextMessage, replyToMessageHook]
  );

  const sendSticker = useCallback(
    async (stickerId: string, url: string, setId: string) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot send sticker');
        return;
      }

      console.log('[ActiveConversationContext] Sending sticker to conversation:', conversationId);
      setIsSending(true);

      try {
        await sendStickerMessage(conversationId, stickerId, setId, url);

        // Scroll to bottom after sending
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom?.(true);
        }, 100);
      } catch (error) {
        console.error('[ActiveConversationContext] Error sending sticker:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, sendStickerMessage]
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot upload image');
        return;
      }

      console.log('[ActiveConversationContext] Uploading image to conversation:', conversationId);
      setIsSending(true);

      try {
        await uploadAndSendImage(conversationId, file);

        // Scroll to bottom after sending
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom?.(true);
        }, 100);
      } catch (error) {
        console.error('[ActiveConversationContext] Error uploading image:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, uploadAndSendImage]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot upload file');
        return;
      }

      console.log('[ActiveConversationContext] Uploading file to conversation:', conversationId);
      setIsSending(true);

      try {
        await uploadAndSendFile(conversationId, file);

        // Scroll to bottom after sending
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom?.(true);
        }, 100);
      } catch (error) {
        console.error('[ActiveConversationContext] Error uploading file:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, uploadAndSendFile]
  );

  const replyToMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot reply to message');
        return;
      }

      console.log('[ActiveConversationContext] Replying to message in conversation:', conversationId);
      setIsSending(true);

      try {
        await replyToMessageHook(messageId, 'text', content);
        setReplyingTo(null);

        // Scroll to bottom after sending
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom?.(true);
        }, 100);
      } catch (error) {
        console.error('[ActiveConversationContext] Error replying to message:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, replyToMessageHook]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot edit message');
        return;
      }

      console.log('[ActiveConversationContext] Editing message in conversation:', conversationId);

      try {
        await editMessageHook(messageId, newContent);
      } catch (error) {
        console.error('[ActiveConversationContext] Error editing message:', error);
        throw error;
      }
    },
    [conversationId, editMessageHook]
  );

  const deleteMessage = useCallback(
    async (_messageId: string) => {
      if (!conversationId) {
        console.error('[ActiveConversationContext] No conversationId - cannot delete message');
        return;
      }

      console.log('[ActiveConversationContext] Deleting message in conversation:', conversationId);

      try {
        // TODO: Implement delete message
        console.warn('[ActiveConversationContext] Delete message not implemented yet');
      } catch (error) {
        console.error('[ActiveConversationContext] Error deleting message:', error);
        throw error;
      }
    },
    [conversationId]
  );

  // ✅ Memoize context value (ลด dependencies ที่ไม่จำเป็น)
  const value = useMemo<ActiveConversationContextValue>(
    () => ({
      // Conversation Info
      conversationId: conversationId || null,
      conversation,

      // Messages
      messages,
      hasMoreMessages,
      isLoadingMessages,

      // Message Actions (stable callbacks)
      sendMessage,
      sendSticker,
      uploadImage,
      uploadFile,
      replyToMessage,
      editMessage,
      deleteMessage,

      // Reply State
      replyingTo,
      setReplyingTo,

      // Loading States
      isSending,
    }),
    [
      conversationId,
      conversation,
      messages,
      hasMoreMessages,
      sendMessage,
      sendSticker,
      uploadImage,
      uploadFile,
      replyToMessage,
      editMessage,
      deleteMessage,
      replyingTo,
      isSending,
      // ❌ ลบ isLoadingMessages, setReplyingTo ออก (ไม่จำเป็น)
    ]
  );

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

/**
 * Hook สำหรับใช้ ActiveConversationContext
 *
 * @throws Error ถ้าใช้นอก ActiveConversationProvider
 */
export function useActiveConversation() {
  const context = useContext(ActiveConversationContext);

  if (!context) {
    throw new Error(
      'useActiveConversation must be used within ActiveConversationProvider'
    );
  }

  return context;
}
