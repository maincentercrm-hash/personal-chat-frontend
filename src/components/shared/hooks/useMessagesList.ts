// src/components/shared/hooks/useMessagesList.ts
import { useState, useRef, useMemo, useCallback } from 'react';
import type { MessageDTO } from '@/types/message.types';
import { getFormattedSenderInfo } from '@/utils/messageUtils';
import { useMessageScroll } from './useMessageScroll';

/**
 * Custom hook สำหรับจัดการ logic ของ MessagesList
 */
export function useMessagesList(
  messages: MessageDTO[],
  currentUserId: string,
  activeConversationId: string,
  isLoadingHistory = false,
  onLoadMore?: () => void,
  isBusinessView = false,
  isAdmin = false
) {
  // ใช้ hook จัดการ scroll
  const {
    messagesEndRef,
    messagesContainerRef,
    topSentinelRef,
    showScrollButton,
    newMessagesCount,
    scrollToMessage,
    scrollToBottom,
    isInitialRender
  } = useMessageScroll({
    messages,
    currentUserId,
    activeConversationId,
    isLoadingHistory,
    onLoadMore,
    isBusinessView
  });

  // Refs
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [albumLightbox, setAlbumLightbox] = useState<{
    messageId: string;
    initialIndex: number;
  } | null>(null);

  // ฟังก์ชันสำหรับดึงชื่อผู้ส่งที่ฟอร์แมตแล้ว
  const getFormattedSender = useCallback((message: MessageDTO, defaultName?: string) => {
    if (isBusinessView && message.sender_type === 'business') {
      // ใช้ getFormattedSenderInfo เฉพาะกับข้อความจากธุรกิจ
      return getFormattedSenderInfo(message);
    } else {
      // กรณีอื่นๆ ใช้ชื่อปกติ
      return defaultName || message.sender_name || 'ผู้ใช้';
    }
  }, [isBusinessView]);

  // ฟังก์ชันเพื่อตรวจสอบว่าข้อความเป็นของเรา (จะแสดงทางด้านขวา) หรือไม่
  const isOwnMessage = useCallback((message: MessageDTO) => {
    if (isBusinessView) {
      // ในมุมมองธุรกิจ:
      // - ข้อความที่ส่งโดย 'business' หรือ 'admin' จะถูกแสดงด้านขวา (เป็นของเรา)
      // - ข้อความที่ส่งโดย 'user' จะถูกแสดงด้านซ้าย (เป็นของลูกค้า)
      return message.sender_type === 'business' || message.sender_type === 'admin';
    } else {
      // ในมุมมองผู้ใช้ทั่วไป:
      // - ตรวจสอบจาก sender_id เทียบกับ currentUserId
      return message.sender_id === currentUserId;
    }
  }, [currentUserId, isBusinessView]);

  // ฟังก์ชันสำหรับ format เวลา
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // ฟังก์ชันสำหรับกำหนดสถานะข้อความ
  const getMessageStatus = useCallback((message: MessageDTO, isUser: boolean) => {
    if (!isUser) return undefined;

    if (message.is_deleted) {
      return undefined;
    }

    // Priority 1: Use explicit status if present
    if (message.status) {
      return message.status;
    }

    // Priority 2: Calculate from read_count
    // read_count >= 2 → recipient has read the message
    if (message.read_count >= 2) {
      return 'read';
    }

    // read_count === 1 → only sender has read (auto-read on send)
    if (message.read_count === 1) {
      return 'sent';
    }

    // read_count === 0 → just created
    // If temp_id equals id → still sending, otherwise sent
    if (message.id === message.temp_id) {
      return 'sending';
    }

    return 'sent';
  }, []);

  // แก้ไข type signature ให้ชัดเจน: ฟังก์ชันสำหรับแสดงสถานะข้อความ
  const renderMessageStatus = useCallback((status: string | null): string | null => {
    if (!status) return null;
    
    switch (status) {
      case 'sending':
        return 'sending';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      case 'failed':
        return 'failed';
      default:
        return null;
    }
  }, []);

  // ฟังก์ชันสำหรับเปิด/ปิด lightbox
  const openLightbox = useCallback((messageIdOrUrl: string, imageIndex?: number) => {
    // ✅ Check if this is an album (has imageIndex)
    if (imageIndex !== undefined) {
      // Album lightbox
      setAlbumLightbox({
        messageId: messageIdOrUrl,
        initialIndex: imageIndex
      });
    } else {
      // Single image lightbox (backward compatible)
      setLightboxImage(messageIdOrUrl);
    }
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    setAlbumLightbox(null);
  }, []);

  // ฟังก์ชันสำหรับคัดลอกข้อความ
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // จัดเรียงและจัดกลุ่มข้อความ
  const sortedAndGroupedMessages = useMemo(() => {
    if (messages.length === 0) return [];
    
    // จัดเรียงข้อความจากเก่าไปใหม่
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });
    
    // จัดกลุ่มข้อความ
    return sortedMessages.map((message, index, arr) => {
      const prevMessage = index > 0 ? arr[index - 1] : null;
      const nextMessage = index < arr.length - 1 ? arr[index + 1] : null;
      
      // ข้อความเป็นกลุ่มเดียวกันเมื่อส่งจากคนเดียวกันและห่างกันไม่เกิน 2 นาที
      const isFirstInGroup = !prevMessage || 
        prevMessage.sender_id !== message.sender_id || 
        (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 120000);
      
      const isLastInGroup = !nextMessage || 
        nextMessage.sender_id !== message.sender_id || 
        (new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 120000);
      
      return {
        ...message,
        isFirstInGroup,
        isLastInGroup
      };
    });
  }, [messages]);

  return {
    // Refs จาก useMessageScroll
    messagesEndRef,
    messagesContainerRef,
    topSentinelRef,
    messageRefs,
    
    // State
    lightboxImage,
    albumLightbox,
    showScrollButton,
    newMessagesCount,
    sortedAndGroupedMessages,
    
    // Handlers
    formatTime,
    scrollToMessage,
    getMessageStatus,
    renderMessageStatus,
    openLightbox,
    closeLightbox,
    handleCopyMessage,
    scrollToBottom,

    getFormattedSender,
    isAdmin,
    isOwnMessage,
    
    // Helpers
    isInitialRender
  };
}