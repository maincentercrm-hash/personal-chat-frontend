// src/hooks/useMentionNotification.ts
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import eventEmitter from '@/services/websocket/WebSocketEventEmitter';

interface MentionNotificationData {
  type: 'mention';
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  message_preview: string;
}

interface NotificationMessage {
  type: 'notification';
  data: MentionNotificationData;
}

/**
 * Hook สำหรับจัดการ Mention Notification จาก WebSocket
 *
 * ✅ รับ notification เมื่อถูก mention
 * ✅ แสดง toast notification
 * ✅ Navigate to conversation เมื่อคลิก
 * ✅ Play notification sound (optional)
 */
export function useMentionNotification() {
  const navigate = useNavigate();

  /**
   * แสดง toast notification เมื่อถูก mention
   */
  const showMentionToast = useCallback((data: MentionNotificationData) => {
    toast(`${data.sender_name} mentioned you`, {
      description: data.message_preview,
      duration: 5000,
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to conversation with target message
          navigate(`/chat/${data.conversation_id}?target=${data.message_id}`);
        },
      },
      onDismiss: () => {
        console.log('[MentionNotification] Toast dismissed');
      },
      onAutoClose: () => {
        console.log('[MentionNotification] Toast auto-closed');
      },
    });
  }, [navigate]);

  /**
   * เล่นเสียงแจ้งเตือน (optional)
   */
  const playNotificationSound = useCallback(() => {
    try {
      // สร้าง Audio object สำหรับเล่นเสียง
      // ถ้ามีไฟล์เสียง สามารถใส่ path ที่นี่
      // const audio = new Audio('/sounds/notification.mp3');
      // audio.play();

      console.log('[MentionNotification] 🔔 Notification sound (disabled)');
    } catch (error) {
      console.error('[MentionNotification] Error playing notification sound:', error);
    }
  }, []);

  /**
   * จัดการ notification message จาก WebSocket
   */
  const handleNotification = useCallback((message: NotificationMessage) => {
    console.log('[MentionNotification] 📨 Received notification:', message);

    // ตรวจสอบว่าเป็น mention notification
    if (message.data?.type === 'mention') {
      console.log('[MentionNotification] 🎯 Mention notification:', {
        sender: message.data.sender_name,
        message: message.data.message_preview,
        conversation: message.data.conversation_id,
      });

      // แสดง toast notification
      showMentionToast(message.data);

      // เล่นเสียงแจ้งเตือน (optional)
      playNotificationSound();

      // TODO: เพิ่ม mention badge counter
      // incrementMentionBadge();

      // TODO: แสดง browser notification (ถ้า user อนุญาต)
      // showBrowserNotification(message.data);
    }
  }, [showMentionToast, playNotificationSound]);

  /**
   * Register WebSocket event listener
   */
  useEffect(() => {
    console.log('[MentionNotification] 🎧 Registering notification listener');

    // Listen to notification event
    eventEmitter.on('message:notification', handleNotification);

    return () => {
      console.log('[MentionNotification] 🔇 Unregistering notification listener');
      eventEmitter.off('message:notification', handleNotification);
    };
  }, [handleNotification]);

  return {
    // สามารถ return functions สำหรับใช้ภายนอกได้
    showMentionToast,
    playNotificationSound,
  };
}
