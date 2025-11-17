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




  // ข้อมูลการสนทนาที่เลือก
  const activeChat = useMemo(() => {
    return activeConversationId ? getActiveConversation() : null;
  }, [activeConversationId, getActiveConversation]);

  // ข้อความในการสนทนาที่เลือก
  const activeConversationMessages = useMemo(() => {
    return activeConversationId ? conversationMessages[activeConversationId] || [] : [];
  }, [activeConversationId, conversationMessages]);

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
    const activeConversationMessages = activeConversationId
      ? conversationMessages[activeConversationId] || []
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
  }, [replyingToMessageId, conversationMessages, activeConversationId]);

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

  const handleSendMessage = useCallback((messageText: string) => {
    if (!activeConversationId) return;

    setIsSending(true);

    // ถ้ามีการตอบกลับข้อความ
    if (replyingTo) {
      replyToMessage(replyingTo.id, 'text', messageText)
        .then(() => {
          cancelReplyingToMessage();
          setReplyingTo(null);
          // ✅ Scroll to bottom after sending
          setTimeout(() => {
            messageAreaRef.current?.scrollToBottom(true);
          }, 100);
        })
        .finally(() => {
          setIsSending(false);
        });
    } else {
      // ส่งข้อความปกติ
      sendTextMessage(activeConversationId, messageText)
        .then(() => {
          // ✅ Scroll to bottom after sending
          setTimeout(() => {
            messageAreaRef.current?.scrollToBottom(true);
          }, 100);
        })
        .finally(() => {
          setIsSending(false);
        });
    }
  }, [activeConversationId, replyingTo, sendTextMessage, replyToMessage, cancelReplyingToMessage]);

  const handleSendSticker = useCallback((stickerId: string, stickerUrl: string, stickerSetId: string) => {
    if (!activeConversationId) return;

    setIsSending(true);
    sendStickerMessage(
      activeConversationId,
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
  }, [activeConversationId, sendStickerMessage]);

  const handleUploadImage = useCallback((file: File) => {
    if (!activeConversationId) return;

    setIsSending(true);
    uploadAndSendImage(activeConversationId, file)
      .then(() => {
        // ✅ Scroll to bottom after sending image
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom(true);
        }, 100);
      })
      .finally(() => {
        setIsSending(false);
      });
  }, [activeConversationId, uploadAndSendImage]);

  const handleUploadFile = useCallback((file: File) => {
    if (!activeConversationId) return;

    setIsSending(true);
    uploadAndSendFile(activeConversationId, file)
      .then(() => {
        // ✅ Scroll to bottom after sending file
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom(true);
        }, 100);
      })
      .finally(() => {
        setIsSending(false);
      });
  }, [activeConversationId, uploadAndSendFile]);

  const handleLoadMoreMessages = useCallback(async () => {
    console.log('🔄 handleLoadMoreMessages called | activeConversationId:', activeConversationId, '| isLoading:', isLoadingMoreMessages);

    if (!activeConversationId || isLoadingMoreMessages) {
      console.log('⛔ Cannot load more: No active conversation or already loading');
      return;
    }

    const currentMessages = conversationMessages[activeConversationId] || [];
    console.log('📊 Current messages count:', currentMessages.length);

    if (currentMessages.length === 0) {
      //console.log('No messages to use as reference for loading more');
      try {
        setIsLoadingMoreMessages(true);
        await getMessages(activeConversationId);
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

    const hasMore = hasMoreMessagesAvailable(activeConversationId);
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
        
        const result = await loadMoreMessages(activeConversationId, params);
        
        //console.log(`Loaded ${result.length} more messages`);
        
        if (result.length === 0 && hasMoreMessagesAvailable(activeConversationId)) {
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
    activeConversationId,
    conversationMessages,
    hasMoreMessagesAvailable,
    loadMoreMessages,
    isLoadingMoreMessages,
    getMessages
  ]);

  // ⬇️ Load more at bottom (for Jump context - newer messages)
  const handleLoadMoreMessagesAtBottom = useCallback(async () => {
    if (!activeConversationId || isLoadingMoreMessages) {
      return;
    }

    const currentMessages = conversationMessages[activeConversationId] || [];
    if (currentMessages.length === 0) return;

    // ใช้ message ใหม่สุด (newest) สำหรับโหลดข้อความใหม่กว่า
    const newestMessage = currentMessages[currentMessages.length - 1];
    const hasAfter = hasAfterMessagesAvailable(activeConversationId);

    if (newestMessage && hasAfter) {
      try {
        setIsLoadingMoreMessages(true);
        await loadMoreMessages(activeConversationId, {
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
    activeConversationId,
    conversationMessages,
    hasAfterMessagesAvailable,
    loadMoreMessages,
    isLoadingMoreMessages
  ]);

  const handleEditMessage = useCallback((messageId: string) => {
    const activeConversationMessages = activeConversationId
      ? conversationMessages[activeConversationId] || []
      : [];
      
    const message = activeConversationMessages.find(msg => msg.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditingContent(message.content);
    }
  }, [conversationMessages, activeConversationId]);
  
  const handleConfirmEdit = useCallback(async (finalContent?: string) => {
    // ใช้ finalContent ถ้ามีการส่งมา ไม่งั้นใช้ editingContent
    const contentToSave = finalContent !== undefined ? finalContent : editingContent;

    if (editingMessageId && contentToSave.trim()) {
      const result = await editMessage(editingMessageId, contentToSave);
      if (result) {
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
    const activeConversationMessages = activeConversationId
      ? conversationMessages[activeConversationId] || []
      : [];

    const message = activeConversationMessages.find(msg => msg.id === messageId);
    if (message && activeConversationId) {
      sendTextMessage(activeConversationId, message.content);
    }
  }, [conversationMessages, activeConversationId, sendTextMessage]);

  /**
   * Jump to specific message (Telegram-like feature)
   * ใช้ API เพื่อดึง context messages และ scroll ไปที่ข้อความเป้าหมาย
   */
  const handleJumpToMessage = useCallback(async (messageId: string) => {
    if (!activeConversationId) return;

    try {
      // 1. Check if message exists in current messages
      const currentMessages = conversationMessages[activeConversationId] || [];
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

      const response = await conversationService.getMessageContext(activeConversationId, {
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
        activeConversationId,
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
  }, [activeConversationId, conversationMessages, replaceMessagesWithContext]);

  return {
    // State
    conversations,
    activeConversationId,
    conversationMessages: activeConversationMessages,
    isSending,
    isLoadingMoreMessages,
    showMessageView,
    editingMessageId,
    editingContent,
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