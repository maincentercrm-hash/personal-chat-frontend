// src/pages/standard/conversation/hooks/useConversationPageLogic.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// นำเข้า custom hooks
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useConversation } from '@/hooks/useConversation';
import { useMessage } from '@/hooks/useMessage';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

//import type { MessageDTO } from '@/types/message.types';
import type { ConversationMessagesQueryRequest } from '@/types/conversation.types';
import type { MentionMetadata } from '@/types/mention.types'; // ✅ เพิ่ม
import conversationService from '@/services/conversationService';
import type { MessageAreaRef } from '@/components/shared/MessageArea';

/**
 * Custom hook สำหรับจัดการ logic ของหน้า ConversationPage
 * แยก business logic ออกจาก UI component
 */
export function useConversationPageLogic(conversationId?: string) {
  const navigate = useNavigate();
  
  // ใช้ custom hooks
  const {
    conversations,
    activeConversationId,
    conversationMessages,
    togglePin,
    toggleMute,
    getConversations,
    getMessages,
    selectConversation,
    getActiveConversation,
    hasMoreMessagesAvailable,
    hasAfterMessagesAvailable, // ⬇️ For Jump context
    loadMoreMessages,
    markAllMessagesAsRead,
    replaceMessagesWithContext,
  } = useConversation();

  const {
    sendTextMessage,
    sendStickerMessage,
    uploadAndSendImage,
    uploadAndSendFile,
    editMessage,
    replyToMessage,
    startReplyingToMessage,
    cancelReplyingToMessage,
    replyingToMessageId
  } = useMessage();

  // สถานะต่างๆ
  const [isSending, setIsSending] = useState(false);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [showMessageView, setShowMessageView] = useState(!!conversationId);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string } | null>(null);

  // Refs
  const lastLoadedMessageIdRef = useRef<string | null>(null);
  const messageAreaRef = useRef<MessageAreaRef>(null);

  // Hooks อื่นๆ
  const { user } = useAuth();
  const currentUserId = user?.id || '';
  const isMobile = useIsMobile();

  // ดึง userIds ทั้งหมดจากการสนทนาแบบ direct สำหรับติดตามสถานะออนไลน์
  const allDirectUserIds = useMemo(() => {
    const userIds: string[] = [];
    
    // เพิ่ม userIds จากทุกการสนทนาแบบ 1:1
    conversations.forEach(conv => {
      if (conv.type === 'direct' && conv.contact_info?.user_id) {
        userIds.push(conv.contact_info.user_id);
      }
    });
    
    // เพิ่ม userId ของคู่สนทนาปัจจุบัน (ถ้ามี)
    const activeChat = getActiveConversation();
    if (activeChat?.type === 'direct' && activeChat?.contact_info?.user_id) {
      if (!userIds.includes(activeChat.contact_info.user_id)) {
        userIds.push(activeChat.contact_info.user_id);
      }
    }
    
    return userIds;
  }, [conversations, getActiveConversation]);
  
  // เรียกใช้ useOnlineStatus เพียงครั้งเดียวสำหรับทุก userIds
  const { isUserOnline } = useOnlineStatus(allDirectUserIds);




  // ✅ สร้าง editingMessage object สำหรับส่งไปยัง MessageInput
  const editingMessage = useMemo(() => {
    console.log('[editingMessage] 🎯 สร้าง editingMessage object:', {
      editingMessageId,
      editingContent,
      willReturnNull: !editingMessageId || !editingContent
    });

    if (!editingMessageId || !editingContent) return null;

    const result = {
      id: editingMessageId,
      content: editingContent
    };

    console.log('[editingMessage] ✅ Return:', result);
    return result;
  }, [editingMessageId, editingContent]);

  // ข้อมูลการสนทนาที่เลือก
  const activeChat = useMemo(() => {
    return activeConversationId ? getActiveConversation() : null;
  }, [activeConversationId, getActiveConversation]);

  // ข้อความในการสนทนาที่เลือก - ✅ ใช้ conversationId จาก parameter
  const activeConversationMessages = useMemo(() => {
    return conversationId ? conversationMessages[conversationId] || [] : [];
  }, [conversationId, conversationMessages]);

  // ดึง userId ของคู่สนทนา
  const chatPartnerId = useMemo(() => {
    if (!activeChat || activeChat.type !== 'direct' || !activeChat.contact_info) {
      return undefined;
    }
    return activeChat.contact_info.user_id;
  }, [activeChat]);

  // Effect hooks
  useEffect(() => {
    getConversations();
  }, [getConversations]);

  useEffect(() => {
    //console.log("ConversationPage mounted");
    
    return () => {
      //console.log("ConversationPage unmounted, clearing state");
      selectConversation(null);
      lastLoadedMessageIdRef.current = null;
      setIsLoadingMoreMessages(false);
    };
  }, [selectConversation]);

  useEffect(() => {
    if (conversationId) {
      selectConversation(conversationId);
      setShowMessageView(true);
      setInitialMessagesLoaded(false);

      getMessages(conversationId).then(() => {
        setInitialMessagesLoaded(true);
        markAllMessagesAsRead(conversationId);
      });
    }
  }, [conversationId, getMessages, selectConversation, markAllMessagesAsRead]);

  // ❌ REMOVED: This useEffect causes auto-navigate loop
  // When user navigates to /chat, activeConversationId is still set from previous conversation
  // causing auto-redirect back to the conversation
  //
  // useEffect(() => {
  //   if (activeConversationId && isMobile) {
  //     setShowMessageView(true);
  //     navigate(`/chat/${activeConversationId}`);
  //   }
  // }, [activeConversationId, isMobile, navigate]);

  useEffect(() => {
    // ✅ ใช้ conversationId จาก parameter
    const activeConversationMessages = conversationId
      ? conversationMessages[conversationId] || []
      : [];

    if (activeConversationMessages.length > 0) {
      const message = activeConversationMessages.find(msg => msg.id === replyingToMessageId);
      if (message) {
        let messageText = '';

        // กำหนดข้อความตามประเภทข้อความ
        switch (message.message_type) {
          case 'text':
            messageText = message.content || '';
            break;
          case 'sticker':
            messageText = '[สติกเกอร์]';
            break;
          case 'image':
            messageText = message.content ? `[รูปภาพ] ${message.content}` : '[รูปภาพ]';
            break;
          case 'file':
            messageText = `[ไฟล์] ${message.file_name || ''}`;
            break;
          default:
            messageText = '[ข้อความ]';
        }

        setReplyingTo({
          id: message.id,
          text: messageText,
          sender: message.sender_name || 'ผู้ใช้'
        });
      } else {
        setReplyingTo(null);
      }
    }
  }, [replyingToMessageId, conversationMessages, conversationId]);

  // Handlers
  const handleSelectConversation = useCallback((id: string) => {
    //console.log(`Selecting conversation: ${id} , ${initialMessagesLoaded}`);

    lastLoadedMessageIdRef.current = null;
    setIsLoadingMoreMessages(false);

    selectConversation(id);
    setInitialMessagesLoaded(false);

    navigate(`/chat/${id}`);

    if (isMobile) {
      setShowMessageView(true);
    }

    markAllMessagesAsRead(id);
  }, [isMobile, navigate, selectConversation, markAllMessagesAsRead, initialMessagesLoaded]);

  const handleBackToList = useCallback(() => {
    if (isMobile) {
      setShowMessageView(false);
      selectConversation(null);

      setTimeout(() => {
        navigate('/chat');
      }, 0);
    }
  }, [isMobile, navigate, selectConversation]);

  const handleSendMessage = useCallback((messageText: string, mentions?: MentionMetadata[]) => {
    console.log('[useConversationPageLogic] 📨 handleSendMessage called:', {
      messageText,
      mentions,
      mentionsIsArray: Array.isArray(mentions),
      mentionsLength: mentions?.length,
      conversationId
    });

    // ✅ ใช้ conversationId จาก parameter แทน activeConversationId จาก store
    if (!conversationId) return;

    setIsSending(true);

    // ✅ สร้าง metadata object สำหรับส่ง mentions
    const metadata = mentions && mentions.length > 0 ? { mentions } : undefined;
    console.log('[useConversationPageLogic] 📨 Prepared metadata:', {
      metadata,
      hasMetadata: !!metadata,
      mentionsInMetadata: metadata?.mentions
    });

    // ถ้ามีการตอบกลับข้อความ
    if (replyingTo) {
      replyToMessage(replyingTo.id, 'text', messageText, undefined, undefined, metadata)
        .then(() => {
          cancelReplyingToMessage();
          setReplyingTo(null);
          // ✅ Scroll to bottom after sending
          setTimeout(() => {
            messageAreaRef.current?.scrollToBottom(true);
          }, 100);
        })
        .catch((error) => {
          // ✅ Handle block errors
          const errorCode = error?.response?.data?.error_code;
          const errorMessage = error?.response?.data?.message;

          if (errorCode === 'BLOCKED_BY_USER') {
            toast.error(errorMessage || 'คุณถูกผู้ใช้นี้บล็อก');
          } else if (errorCode === 'USER_BLOCKED') {
            toast.error(errorMessage || 'คุณได้บล็อกผู้ใช้นี้แล้ว');
          } else {
            toast.error('ส่งข้อความล้มเหลว กรุณาลองใหม่อีกครั้ง');
          }
          console.error('[handleSendMessage] Error:', error);
        })
        .finally(() => {
          setIsSending(false);
        });
    } else {
      // ส่งข้อความปกติ - ✅ ใช้ conversationId จาก parameter พร้อม mentions metadata
      sendTextMessage(conversationId, messageText, metadata)
        .then(() => {
          // ✅ Scroll to bottom after sending
          setTimeout(() => {
            messageAreaRef.current?.scrollToBottom(true);
          }, 100);
        })
        .catch((error) => {
          // ✅ Handle block errors
          const errorCode = error?.response?.data?.error_code;
          const errorMessage = error?.response?.data?.message;

          if (errorCode === 'BLOCKED_BY_USER') {
            toast.error(errorMessage || 'คุณถูกผู้ใช้นี้บล็อก');
          } else if (errorCode === 'USER_BLOCKED') {
            toast.error(errorMessage || 'คุณได้บล็อกผู้ใช้นี้แล้ว');
          } else {
            toast.error('ส่งข้อความล้มเหลว กรุณาลองใหม่อีกครั้ง');
          }
          console.error('[handleSendMessage] Error:', error);
        })
        .finally(() => {
          setIsSending(false);
        });
    }
  }, [conversationId, replyingTo, sendTextMessage, replyToMessage, cancelReplyingToMessage]);

  const handleSendSticker = useCallback((stickerId: string, stickerUrl: string, stickerSetId: string) => {
    // ✅ ใช้ conversationId จาก parameter
    if (!conversationId) return;

    setIsSending(true);
    sendStickerMessage(
      conversationId,
      stickerId,
      stickerSetId,
      stickerUrl
    ).then(() => {
      // ✅ Scroll to bottom after sending sticker
      setTimeout(() => {
        messageAreaRef.current?.scrollToBottom(true);
      }, 100);
    }).finally(() => {
      setIsSending(false);
    });
  }, [conversationId, sendStickerMessage]);

  const handleUploadImage = useCallback((file: File) => {
    // ✅ ใช้ conversationId จาก parameter
    if (!conversationId) return;

    setIsSending(true);
    uploadAndSendImage(conversationId, file)
      .then(() => {
        // ✅ Scroll to bottom after sending image
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom(true);
        }, 100);
      })
      .finally(() => {
        setIsSending(false);
      });
  }, [conversationId, uploadAndSendImage]);

  const handleUploadFile = useCallback((file: File) => {
    // ✅ ใช้ conversationId จาก parameter
    if (!conversationId) return;

    setIsSending(true);
    uploadAndSendFile(conversationId, file)
      .then(() => {
        // ✅ Scroll to bottom after sending file
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom(true);
        }, 100);
      })
      .finally(() => {
        setIsSending(false);
      });
  }, [conversationId, uploadAndSendFile]);

  const handleLoadMoreMessages = useCallback(async () => {
    // ✅ ใช้ conversationId จาก parameter
    console.log('🔄 handleLoadMoreMessages called | conversationId:', conversationId, '| isLoading:', isLoadingMoreMessages);

    if (!conversationId || isLoadingMoreMessages) {
      console.log('⛔ Cannot load more: No active conversation or already loading');
      return;
    }

    const currentMessages = conversationMessages[conversationId] || [];
    console.log('📊 Current messages count:', currentMessages.length);

    if (currentMessages.length === 0) {
      //console.log('No messages to use as reference for loading more');
      try {
        setIsLoadingMoreMessages(true);
        await getMessages(conversationId);
      } catch (error) {
        console.error('Error getting initial messages:', error);
      } finally {
        setIsLoadingMoreMessages(false);
      }
      return;
    }

    // ✅ ใช้ message เก่าสุด (oldest) สำหรับโหลดข้อความเก่ากว่า
    // หลังจาก sort ASC ใน conversationStore: messages[0] = oldest, messages[length-1] = newest
    const oldestMessage = currentMessages[0]; // First message after ASC sort = oldest
    console.log('📍 Oldest message ID:', oldestMessage?.id, '| created_at:', oldestMessage?.created_at);

    if (lastLoadedMessageIdRef.current === oldestMessage.id) {
      console.log(`♻️ Already loaded messages before ${oldestMessage.id}, resetting ref`);
      lastLoadedMessageIdRef.current = null;
    }

    const hasMore = hasMoreMessagesAvailable(conversationId);
    console.log('🔍 hasMoreMessages:', hasMore);

    if (oldestMessage && hasMore) {
      try {
        //console.log(`Loading more messages before ID: ${oldestMessage.id}`);
        setIsLoadingMoreMessages(true);

        lastLoadedMessageIdRef.current = oldestMessage.id;

        const params: ConversationMessagesQueryRequest = {
          before: oldestMessage.id,
          limit: 50 // ⬆️ Balanced: good performance without overloading
        };

        const result = await loadMoreMessages(conversationId, params);

        //console.log(`Loaded ${result.length} more messages`);

        if (result.length === 0 && hasMoreMessagesAvailable(conversationId)) {
          //console.log(`No new messages loaded, but still has more. Will reset reference ID.`);
          lastLoadedMessageIdRef.current = null;
        }

      } catch (error) {
        console.error('Error loading more messages:', error);
      } finally {
        setTimeout(() => {
          setIsLoadingMoreMessages(false);
        }, 500);
      }
    } else {
      console.log(`❌ Cannot load more: oldestMessage=${!!oldestMessage}, hasMore=${hasMore}`);
    }
  }, [
    conversationId,
    conversationMessages,
    hasMoreMessagesAvailable,
    loadMoreMessages,
    isLoadingMoreMessages,
    getMessages
  ]);

  // ⬇️ Load more at bottom (for Jump context - newer messages)
  const handleLoadMoreMessagesAtBottom = useCallback(async () => {
    // ✅ ใช้ conversationId จาก parameter
    if (!conversationId || isLoadingMoreMessages) {
      return;
    }

    const currentMessages = conversationMessages[conversationId] || [];
    if (currentMessages.length === 0) return;

    // ใช้ message ใหม่สุด (newest) สำหรับโหลดข้อความใหม่กว่า
    const newestMessage = currentMessages[currentMessages.length - 1];
    const hasAfter = hasAfterMessagesAvailable(conversationId);

    if (newestMessage && hasAfter) {
      try {
        setIsLoadingMoreMessages(true);
        await loadMoreMessages(conversationId, {
          after: newestMessage.id,
          limit: 50 // ⬇️ Balanced: good performance without overloading
        });
      } catch (error) {
        console.error('Error loading more messages at bottom:', error);
      } finally {
        setTimeout(() => {
          setIsLoadingMoreMessages(false);
        }, 500);
      }
    }
  }, [
    conversationId,
    conversationMessages,
    hasAfterMessagesAvailable,
    loadMoreMessages,
    isLoadingMoreMessages
  ]);

  const handleEditMessage = useCallback((messageId: string) => {
    // ✅ ใช้ conversationId จาก parameter
    const activeConversationMessages = conversationId
      ? conversationMessages[conversationId] || []
      : [];

    const message = activeConversationMessages.find(msg => msg.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditingContent(message.content);
    }
  }, [conversationMessages, conversationId]);
  
  const handleConfirmEdit = useCallback(async (content: string) => {
    console.log('[handleConfirmEdit] 💾 บันทึกการแก้ไข:', {
      editingMessageId,
      content,
      originalContent: editingContent
    });

    if (editingMessageId && content.trim()) {
      const result = await editMessage(editingMessageId, content);
      if (result) {
        console.log('[handleConfirmEdit] ✅ บันทึกสำเร็จ');
        setEditingMessageId(null);
        setEditingContent('');
        toast.success('แก้ไขข้อความสำเร็จ');
      } else {
        toast.error('ไม่สามารถแก้ไขข้อความได้');
      }
    }
  }, [editingMessageId, editingContent, editMessage]);
  
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent('');
  }, []);
  
  const handleReplyToMessage = useCallback((messageId: string) => {
    startReplyingToMessage(messageId);
  }, [startReplyingToMessage]);
  
  const handleCancelReply = useCallback(() => {
    cancelReplyingToMessage();
    setReplyingTo(null);
  }, [cancelReplyingToMessage]);
  
  const handleResendMessage = useCallback((messageId: string) => {
    // ✅ ใช้ conversationId จาก parameter
    const activeConversationMessages = conversationId
      ? conversationMessages[conversationId] || []
      : [];

    const message = activeConversationMessages.find(msg => msg.id === messageId);
    if (message && conversationId) {
      sendTextMessage(conversationId, message.content);
    }
  }, [conversationMessages, conversationId, sendTextMessage]);

  /**
   * Jump to specific message (Telegram-like feature)
   * ใช้ API เพื่อดึง context messages และ scroll ไปที่ข้อความเป้าหมาย
   */
  const handleJumpToMessage = useCallback(async (messageId: string) => {
    // ✅ ใช้ conversationId จาก parameter
    if (!conversationId) return;

    try {
      // 1. Check if message exists in current messages
      const currentMessages = conversationMessages[conversationId] || [];
      const messageExists = currentMessages.some(m => m.id === messageId);

      if (messageExists) {
        // ✅ Message exists in memory - just scroll (no API call)
        console.log('[Jump] Message exists in memory, scrolling directly');

        // Wait for Virtuoso to be ready (especially important after F5)
        await new Promise(resolve => setTimeout(resolve, 150));

        messageAreaRef.current?.scrollToMessage(messageId);
        return;
      }

      // ❌ Message not in memory - fetch context from API
      console.log('[Jump] Message not in memory, fetching context from API');

      const response = await conversationService.getMessageContext(conversationId, {
        targetId: messageId,
        before: 50, // 🎯 Balanced: enough context without overloading
        after: 50   // 🎯 Balanced: enough context without overloading
      });

      if (!response.success) {
        toast.error('ไม่สามารถไปยังข้อความนี้ได้');
        return;
      }

      // 2. Replace current messages with context messages
      replaceMessagesWithContext(
        conversationId,
        response.data,
        response.has_before,
        response.has_after
      );

      // 3. Wait for DOM update (longer wait after replace)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 4. Scroll to target message using MessageArea ref
      messageAreaRef.current?.scrollToMessage(messageId);

      // 5. Highlight will be handled by scrollToMessage function

    } catch (error) {
      console.error('Jump to message failed:', error);
      toast.error('เกิดข้อผิดพลาดในการไปยังข้อความ');
    }
  }, [conversationId, conversationMessages, replaceMessagesWithContext]);

  return {
    // State
    conversations,
    activeConversationId,
    conversationMessages: activeConversationMessages,
    isSending,
    isLoadingMoreMessages,
    initialMessagesLoaded, // ✅ เพิ่ม - บอกว่า messages โหลดเสร็จหรือยัง
    showMessageView,
    editingMessageId,
    editingContent,
    editingMessage, // ✅ เพิ่ม editingMessage object
    replyingTo,

    // Data
    currentUserId,
    isMobile,
    activeChat,
    chatPartnerId,
    isUserOnline,

    // Handlers
    handleSelectConversation,
    handleBackToList,
    handleSendMessage,
    handleSendSticker,
    handleUploadImage,
    handleUploadFile,
    handleLoadMoreMessages,
    handleLoadMoreMessagesAtBottom, // ⬇️ Load newer messages (for Jump context)
    handleEditMessage,
    handleConfirmEdit,
    handleCancelEdit,
    handleReplyToMessage,
    handleCancelReply,
    handleResendMessage,
    handleJumpToMessage,
    setEditingContent,
    togglePin,
    toggleMute,

    // Refs
    messageAreaRef
  };
}