// src/hooks/useMessage.ts
import { useState, useCallback, useEffect } from 'react';
import useMessageStore from '@/stores/messageStore';
import useUIStore from '@/stores/uiStore';
import type { MessageDTO } from '@/types/message.types';
import useConversationStore from '@/stores/conversationStore';
import useAuth from '@/hooks/useAuth';
import WebSocketManager from '@/services/websocket/WebSocketManager';
import { useWebSocketContext } from '@/contexts/WebSocketContext';


/**
 * Hook สำหรับจัดการข้อความในการสนทนา
 *
 * Refactored to use:
 * - messageStore: for message data and API calls
 * - uiStore: for UI state (editing, replying)
 * - conversationStore: for conversation messages
 */
export const useMessage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNewMessage, updateMessage: updateConversationMessage } = useConversationStore();
  const { isConnected } = useWebSocketContext();
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // ✅ NEW: Use uiStore for UI state (editing, replying)
  const {
    editingMessage,
    replyingTo,
    setEditingMessage,
    setReplyingTo,
  } = useUIStore();

  // Message store - API calls and message data
  const {
    messages,
    // ⚠️ DEPRECATED: These are now in uiStore, but kept for backward compatibility
    editingMessageId: legacyEditingMessageId,
    replyingToMessageId: legacyReplyingToMessageId,
    sendTextMessage: storeSendTextMessage,
    sendStickerMessage: storeSendStickerMessage,
    sendImageMessage: storeSendImageMessage,
    sendFileMessage: storeSendFileMessage,
    uploadAndSendImage: storeUploadAndSendImage,
    uploadAndSendFile: storeUploadAndSendFile,
    editMessage: storeEditMessage,
    deleteMessage: storeDeleteMessage,
    replyToMessage: storeReplyToMessage,
    markMessageAsRead: storeMarkMessageAsRead,
    // ⚠️ DEPRECATED: These setters are now in uiStore
    setEditingMessageId: legacySetEditingMessageId,
    setReplyingToMessageId: legacySetReplyingToMessageId,
    updateMessage,
    removeMessage,
    markMessageAsReadInStore
  } = useMessageStore();

  const { updateMessageStatus } = useConversationStore();

  // ลงทะเบียนรับเหตุการณ์ WebSocket เมื่อ hook ถูกเรียกใช้
  useEffect(() => {
    if (!isConnected) return;

   // //console.log('Registering WebSocket event listeners for message events');

    // รับการอัปเดตข้อความ - ถ้ามี MessageUpdateData type ใน WebSocketEventMap แล้ว
    // สามารถใช้ addEventListener แทน onDynamic ได้
    const unsubMessageUpdate = WebSocketManager.onDynamic('message:message_update', (data) => {
      //console.log('Message updated via WebSocket:', data);
      
      // Type assertion แบบปลอดภัย
      const messageData = data as MessageDTO;
      
      // ตรวจสอบว่ามี id หรือไม่
      if (messageData?.id) {
        updateMessage(messageData.id, messageData as MessageDTO);
      } else {
        console.error('Invalid message update data: missing id property', data);
      }
    });

    // รับการลบข้อความ
    const unsubMessageDelete = WebSocketManager.onDynamic('message:message_delete', (data) => {
      //console.log('Message deleted via WebSocket:', data);
      
      // Type assertion แบบปลอดภัย
      const messageData = data as MessageDTO;
      
      // ตรวจสอบว่ามี id หรือไม่
      if (messageData?.id) {
        removeMessage(messageData.id);
      } else {
        console.error('Invalid message delete data: missing id property', data);
      }
    });

    // รับการอ่านข้อความ
    const unsubMessageRead = WebSocketManager.onDynamic('message:message_read', (data) => {
      //console.log('Message read via WebSocket:', data);
      
      // Type assertion แบบปลอดภัย
      const readData = data as { message_id?: string };
      
      // ตรวจสอบว่ามี message_id หรือไม่
      if (readData?.message_id) {
        markMessageAsReadInStore(readData.message_id);
      } else {
        console.error('Invalid message read data: missing message_id property', data);
      }
    });

    // คืนค่า function สำหรับยกเลิกการลงทะเบียน event listeners เมื่อ component unmount
    return () => {
      unsubMessageUpdate();
      unsubMessageDelete();
      unsubMessageRead();
    };
  }, [isConnected, updateMessage, removeMessage, markMessageAsReadInStore]);

  /**
   * ส่งข้อความแบบข้อความ
   */
  const sendTextMessage = useCallback(async (conversationId: string, content: string, metadata?: Record<string, unknown>) => {
    // ย้าย tempId ออกมาประกาศนอกบล็อก try เพื่อให้สามารถใช้ในบล็อก catch ได้
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    

    try {
      setLoading(true);
      setError(null);
      
      // สร้างข้อความชั่วคราว
      const tempMessage: MessageDTO = {
        id: tempId,
        temp_id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId || '',
        sender_type: 'user',
        sender_name: 'You',
        sender_avatar: '',
        message_type: 'text',
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edit_count: 0,
        is_read: false,
        read_count: 0,
        status: 'sending'
      };
      
      // เพิ่มข้อความชั่วคราวเข้าไปใน conversation store
      addNewMessage(tempMessage, tempMessage.sender_id || '');
      
      // เพิ่ม tempId และ sender_id เข้าไปใน metadata
      const updatedMetadata = { 
        ...metadata,
        tempId: tempId,
        sender_id: currentUserId // เพิ่ม sender_id เพื่อให้สามารถตรวจสอบได้ว่าเป็นข้อความของเราเอง
      };
      
      //console.log(`Sending message with tempId: ${tempId}`);
      
      // ส่งข้อความไปยัง server
      const message = await storeSendTextMessage(conversationId, content, updatedMetadata);
      
      if (message) {
        console.log(`✅ [useMessage] Message sent successfully, tempId: ${tempId}, realId: ${message.id}`);
        console.log(`✅ [useMessage] Message data:`, {
          id: message.id,
          temp_id: message.temp_id,
          status: message.status,
          read_count: message.read_count
        });

        // อัพเดทสถานะข้อความชั่วคราว
        updateMessageStatus(tempId, 'sent');

        // อัพเดทข้อมูลอื่นๆ ของข้อความใน conversationStore
        updateConversationMessage(tempId, {
          status: 'sent',
          ...message          // เนื่องจาก message มี id อยู่แล้ว
        });
      } else {
        console.error(`Failed to send message with tempId: ${tempId}`);
        // อัพเดทสถานะเป็นล้มเหลว
        updateMessageStatus(tempId, 'failed');
      }
  
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      console.error(`Error sending message with tempId: ${tempId}`, errorMessage);
      setError(errorMessage);
      
      // ตอนนี้ tempId มีค่าแน่นอนเพราะประกาศนอกบล็อก try
      updateMessageStatus(tempId, 'failed');
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeSendTextMessage, currentUserId, addNewMessage, updateConversationMessage, updateMessageStatus]);

  /**
   * ส่งข้อความแบบสติกเกอร์
   */
 /**
 * ส่งข้อความแบบสติกเกอร์
 */
const sendStickerMessage = useCallback(async (
  conversationId: string, 
  stickerId: string, 
  stickerSetId: string, 
  mediaUrl: string, 
  mediaThumbnailUrl?: string, 
  metadata?: Record<string, unknown>
) => {
  // สร้าง tempId เหมือนกับการส่งข้อความธรรมดา
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  try {
    setLoading(true);
    setError(null);
    
    // สร้างข้อความชั่วคราวสำหรับสติกเกอร์
    const tempMessage: MessageDTO = {
      id: tempId,
      temp_id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId || '',
      sender_type: 'user',
      sender_name: 'You', 
      sender_avatar: '',
      message_type: 'sticker',
      content: '',
      sticker_id: stickerId,
      sticker_set_id: stickerSetId,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_edited: false,
      edit_count: 0,
      is_read: false,
      read_count: 0,
      status: 'sending'
    };
    
    // เพิ่มข้อความชั่วคราวเข้าไปใน conversation store
    addNewMessage(tempMessage, tempMessage.sender_id || '');
    
    // เพิ่ม tempId และ sender_id เข้าไปใน metadata
    const updatedMetadata = { 
      ...metadata,
      tempId: tempId,
      sender_id: currentUserId
    };
    
    //console.log(`Sending sticker with tempId: ${tempId}`);
    
    // ส่งสติกเกอร์ไปยัง server
    const message = await storeSendStickerMessage(
      conversationId, 
      stickerId, 
      stickerSetId, 
      mediaUrl, 
      mediaThumbnailUrl, 
      updatedMetadata
    );
    
    if (message) {
      //console.log(`Sticker sent successfully, updating tempId: ${tempId} with server id: ${message.id}`);

      // อัพเดทสถานะข้อความชั่วคราว
      updateMessageStatus(tempId, 'delivered');

      // อัพเดทข้อมูลอื่นๆ ของข้อความใน conversationStore
      updateConversationMessage(tempId, {
        status: 'delivered',
        ...message
      });
    } else {
      console.error(`Failed to send sticker with tempId: ${tempId}`);
      // อัพเดทสถานะเป็นล้มเหลว
      updateMessageStatus(tempId, 'failed');
    }

    return message;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send sticker';
    console.error(`Error sending sticker with tempId: ${tempId}`, errorMessage);
    setError(errorMessage);
    
    // อัพเดทสถานะเป็นล้มเหลว
    updateMessageStatus(tempId, 'failed');
    
    return null;
  } finally {
    setLoading(false);
  }
}, [storeSendStickerMessage, currentUserId, addNewMessage, updateConversationMessage, updateMessageStatus]);

  /**
   * ส่งข้อความแบบรูปภาพ
   */
  const sendImageMessage = useCallback(async (conversationId: string, mediaUrl: string, mediaThumbnailUrl?: string, caption?: string, metadata?: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);

      const message = await storeSendImageMessage(conversationId, mediaUrl, mediaThumbnailUrl, caption, metadata);
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send image';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeSendImageMessage]);

  /**
   * ส่งข้อความแบบไฟล์
   */
  const sendFileMessage = useCallback(async (conversationId: string, mediaUrl: string, fileName: string, fileSize: number, fileType: string, metadata?: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);

      const message = await storeSendFileMessage(conversationId, mediaUrl, fileName, fileSize, fileType, metadata);
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send file';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeSendFileMessage]);

  /**
 * อัพโหลดรูปภาพและส่งข้อความ
 */
const uploadAndSendImage = useCallback(async (
  conversationId: string, 
  file: File, 
  caption?: string, 
  metadata?: Record<string, unknown>
) => {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  try {
    setLoading(true);
    setError(null);
    
    // สร้างข้อความชั่วคราวสำหรับรูปภาพ
    // สร้าง URL ชั่วคราวสำหรับแสดงรูปภาพระหว่างอัพโหลด
    const tempUrl = URL.createObjectURL(file);
    
    const tempMessage: MessageDTO = {
      id: tempId,
      temp_id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId || '',
      sender_type: 'user',
      sender_name: 'You', 
      sender_avatar: '',
      message_type: 'image',
      content: caption || '',
      media_url: tempUrl,
 
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_edited: false,
      edit_count: 0,
      is_read: false,
      read_count: 0,
      status: 'sending'
    };
    
    // เพิ่มข้อความชั่วคราวเข้าไปใน conversation store
    addNewMessage(tempMessage, tempMessage.sender_id || '');
    
    // เพิ่ม tempId และ sender_id เข้าไปใน metadata
    const updatedMetadata = { 
      ...metadata,
      tempId: tempId,
      sender_id: currentUserId
    };
    
    //console.log(`Uploading image with tempId: ${tempId}`);
    
    // อัพโหลดและส่งรูปภาพไปยัง server
    const message = await storeUploadAndSendImage(
      conversationId, 
      file, 
      caption, 
      updatedMetadata
    );
    
    if (message) {
      //console.log(`Image sent successfully, updating tempId: ${tempId} with server id: ${message.id}`);

      // อัพเดทสถานะข้อความชั่วคราว
      updateMessageStatus(tempId, 'delivered');

      // อัพเดทข้อมูลอื่นๆ ของข้อความใน conversationStore (รวม media_url จาก server)
      updateConversationMessage(tempId, {
        status: 'delivered',
        ...message
      });

      // ล้าง URL ชั่วคราว
      URL.revokeObjectURL(tempUrl);
    } else {
      console.error(`Failed to send image with tempId: ${tempId}`);
      // อัพเดทสถานะเป็นล้มเหลว
      updateMessageStatus(tempId, 'failed');
    }

    return message;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload and send image';
    console.error(`Error sending image with tempId: ${tempId}`, errorMessage);
    setError(errorMessage);
    
    // อัพเดทสถานะเป็นล้มเหลว
    updateMessageStatus(tempId, 'failed');
    
    return null;
  } finally {
    setLoading(false);
  }
}, [storeUploadAndSendImage, currentUserId, addNewMessage, updateConversationMessage, updateMessageStatus]);

/**
 * อัพโหลดไฟล์และส่งข้อความ
 */
const uploadAndSendFile = useCallback(async (
  conversationId: string, 
  file: File, 
  metadata?: Record<string, unknown>
) => {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  try {
    setLoading(true);
    setError(null);
    
    // สร้างข้อความชั่วคราวสำหรับไฟล์
    const tempMessage: MessageDTO = {
      id: tempId,
      temp_id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId || '',
      sender_type: 'user',
      sender_name: 'You', 
      sender_avatar: '',
      message_type: 'file',
      content: '',
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_edited: false,
      edit_count: 0,
      is_read: false,
      read_count: 0,
      status: 'sending'
    };
    
    // เพิ่มข้อความชั่วคราวเข้าไปใน conversation store
    addNewMessage(tempMessage, tempMessage.sender_id || '');
    
    // เพิ่ม tempId และ sender_id เข้าไปใน metadata
    const updatedMetadata = { 
      ...metadata,
      tempId: tempId,
      sender_id: currentUserId
    };
    
    //console.log(`Uploading file with tempId: ${tempId}`);
    
    // อัพโหลดและส่งไฟล์ไปยัง server
    const message = await storeUploadAndSendFile(
      conversationId, 
      file, 
      updatedMetadata
    );
    
    if (message) {
      //console.log(`File sent successfully, updating tempId: ${tempId} with server id: ${message.id}`);

      // อัพเดทสถานะข้อความชั่วคราว
      updateMessageStatus(tempId, 'delivered');

      // อัพเดทข้อมูลอื่นๆ ของข้อความใน conversationStore
      updateConversationMessage(tempId, {
        status: 'delivered',
        ...message
      });
    } else {
      console.error(`Failed to send file with tempId: ${tempId}`);
      // อัพเดทสถานะเป็นล้มเหลว
      updateMessageStatus(tempId, 'failed');
    }

    return message;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload and send file';
    console.error(`Error sending file with tempId: ${tempId}`, errorMessage);
    setError(errorMessage);
    
    // อัพเดทสถานะเป็นล้มเหลว
    updateMessageStatus(tempId, 'failed');
    
    return null;
  } finally {
    setLoading(false);
  }
}, [storeUploadAndSendFile, currentUserId, addNewMessage, updateConversationMessage, updateMessageStatus]);

  /**
   * แก้ไขข้อความ
   */
  const editMessage = useCallback(async (messageId: string, content: string, metadata?: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);

      const message = await storeEditMessage(messageId, content, metadata);
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit message';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeEditMessage]);

  /**
   * ลบข้อความ
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await storeDeleteMessage(messageId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeDeleteMessage]);

  /**
   * ตอบกลับข้อความ
   */
  // ฟังก์ชันสำหรับตอบกลับข้อความ
// ฟังก์ชันสำหรับตอบกลับข้อความใน useMessage.ts
// ฟังก์ชันสำหรับตอบกลับข้อความใน useMessage.ts
const replyToMessage = useCallback(async (messageId: string, messageType: 'text' | 'image' | 'file' | 'sticker', content?: string, mediaUrl?: string, mediaThumbnailUrl?: string, metadata?: Record<string, unknown>) => {
  // สร้าง tempId สำหรับ optimistic update
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  try {
    setLoading(true);
    setError(null);
    
    // ดึง active conversation id จาก conversationStore
    const { conversationMessages, activeConversationId } = useConversationStore.getState();
    
    if (!activeConversationId) {
      console.error('No active conversation selected');
      setError('No active conversation selected');
      return null;
    }
    
    // ค้นหาข้อความที่จะตอบกลับจาก active conversation
    const convMessages = conversationMessages[activeConversationId] || [];
    const replyToMessage = convMessages.find(msg => msg.id === messageId);
    
    // ถ้าไม่พบข้อความในรายการปัจจุบัน ให้ใช้ข้อมูลขั้นต่ำและดำเนินการต่อไป
    if (!replyToMessage) {
      console.warn(`Message to reply (${messageId}) not found in current conversation messages. Using minimal data.`);
      
      // สร้างข้อความชั่วคราวสำหรับการตอบกลับโดยมีข้อมูลเท่าที่จำเป็น
      const tempMessage: MessageDTO = {
        id: tempId,
        temp_id: tempId,
        conversation_id: activeConversationId,
        sender_id: currentUserId || '',
        sender_type: 'user',
        sender_name: 'You',
        sender_avatar: '',
        message_type: messageType,
        content: content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edit_count: 0,
        is_read: false,
        read_count: 0,
        status: 'sending',
        // สร้าง reply_to_id ไว้ แต่ไม่มีข้อมูล reply_to_message เพราะไม่พบ
        reply_to_id: messageId
      };
      
      // กรณีข้อความมีรูปภาพหรือไฟล์
      if (mediaUrl) {
        tempMessage.media_url = mediaUrl;
      }
      if (mediaThumbnailUrl) {
        tempMessage.media_thumbnail_url = mediaThumbnailUrl;
      }
      
      // เพิ่มข้อความชั่วคราวเข้าไปใน conversation store
      addNewMessage(tempMessage, tempMessage.sender_id || '');
      
      // เพิ่ม tempId และ sender_id เข้าไปใน metadata
      const updatedMetadata = {
        ...metadata,
        tempId: tempId,
        sender_id: currentUserId,
        reply_to_id: messageId
      };
      
      //console.log(`Sending reply message with tempId: ${tempId} to message: ${messageId}`);
      
      // ส่งข้อความตอบกลับไปยัง server
      const message = await storeReplyToMessage(messageId, messageType, content, mediaUrl, mediaThumbnailUrl, updatedMetadata);

      if (message) {
        //console.log(`Reply message sent successfully, updating tempId: ${tempId} with server id: ${message.id}`);

        // อัพเดทสถานะข้อความชั่วคราว
        updateMessageStatus(tempId, 'sent');

        // อัพเดทข้อมูลอื่นๆ ของข้อความใน conversationStore
        updateConversationMessage(tempId, {
          status: 'sent',
          ...message  // เนื่องจาก message มี id อยู่แล้ว
        });
      } else {
        console.error(`Failed to send reply message with tempId: ${tempId}`);
        // อัพเดทสถานะเป็นล้มเหลว
        updateMessageStatus(tempId, 'failed');
      }

      return message;
    } else {
      // กรณีพบข้อความที่จะตอบกลับในรายการปัจจุบัน
      // สร้างข้อความชั่วคราวสำหรับการตอบกลับ
      const tempMessage: MessageDTO = {
        id: tempId,
        temp_id: tempId,
        conversation_id: activeConversationId,
        sender_id: currentUserId || '',
        sender_type: 'user',
        sender_name: 'You',
        sender_avatar: '',
        message_type: messageType,
        content: content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edit_count: 0,
        is_read: false,
        read_count: 0,
        status: 'sending',
        // สร้าง reply_to_message สำหรับการแสดงผลก่อนได้รับข้อมูลจาก server
        reply_to_message: {
          id: replyToMessage.id,
          message_type: replyToMessage.message_type,
          content: replyToMessage.content,
          sender_id: replyToMessage.sender_id,
          sender_name: replyToMessage.sender_name
        },
        reply_to_id: replyToMessage.id,
      };
      
      // กรณีข้อความมีรูปภาพหรือไฟล์
      if (mediaUrl) {
        tempMessage.media_url = mediaUrl;
      }
      if (mediaThumbnailUrl) {
        tempMessage.media_thumbnail_url = mediaThumbnailUrl;
      }
      
      // เพิ่มข้อความชั่วคราวเข้าไปใน conversation store
      addNewMessage(tempMessage, tempMessage.sender_id || '');
      
      // เพิ่ม tempId และ sender_id เข้าไปใน metadata
      const updatedMetadata = {
        ...metadata,
        tempId: tempId,
        sender_id: currentUserId,
        reply_to_id: messageId
      };
      
      //console.log(`Sending reply message with tempId: ${tempId} to message: ${messageId}`);

      // ส่งข้อความตอบกลับไปยัง server
      const message = await storeReplyToMessage(messageId, messageType, content, mediaUrl, mediaThumbnailUrl, updatedMetadata);

      if (message) {
        //console.log(`Reply message sent successfully, updating tempId: ${tempId} with server id: ${message.id}`);

        // อัพเดทสถานะข้อความชั่วคราว
        updateMessageStatus(tempId, 'sent');

        // อัพเดทข้อมูลอื่นๆ ของข้อความใน conversationStore
        updateConversationMessage(tempId, {
          status: 'sent',
          ...message  // เนื่องจาก message มี id อยู่แล้ว
        });
      } else {
        console.error(`Failed to send reply message with tempId: ${tempId}`);
        // อัพเดทสถานะเป็นล้มเหลว
        updateMessageStatus(tempId, 'failed');
      }

      return message;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reply to message';
    console.error(`Error sending reply message with tempId: ${tempId}`, errorMessage);
    setError(errorMessage);
    
    // อัพเดทสถานะเป็นล้มเหลว
    updateMessageStatus(tempId, 'failed');
    
    return null;
  } finally {
    setLoading(false);
  }
}, [currentUserId, addNewMessage, updateConversationMessage, updateMessageStatus, storeReplyToMessage]);




  /**
   * มาร์คข้อความว่าอ่านแล้ว
   */
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await storeMarkMessageAsRead(messageId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark message as read';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeMarkMessageAsRead]);

  

  /**
   * ดึงข้อความในการสนทนา
   */
  const getMessages = useCallback((conversationId: string): MessageDTO[] => {
    return messages[conversationId] || [];
  }, [messages]);

  /**
   * เริ่มการแก้ไขข้อความ
   * ✅ NEW: Uses uiStore instead of messageStore
   */
  const startEditingMessage = useCallback((messageId: string, content?: string, conversationId?: string) => {
    // Find message content if not provided
    let messageContent = content;
    if (!messageContent) {
      // Search in conversation messages
      const { conversationMessages } = useConversationStore.getState();
      for (const [, msgs] of Object.entries(conversationMessages)) {
        const found = msgs.find(m => m.id === messageId);
        if (found) {
          messageContent = found.content || '';
          break;
        }
      }
    }

    setEditingMessage({
      id: messageId,
      content: messageContent || '',
      conversationId
    });

    // Also update legacy store for backward compatibility
    legacySetEditingMessageId(messageId);
  }, [setEditingMessage, legacySetEditingMessageId]);

  /**
   * ยกเลิกการแก้ไขข้อความ
   * ✅ NEW: Uses uiStore instead of messageStore
   */
  const cancelEditingMessage = useCallback(() => {
    setEditingMessage(null);
    legacySetEditingMessageId(null);
  }, [setEditingMessage, legacySetEditingMessageId]);

  /**
   * เริ่มการตอบกลับข้อความ
   * ✅ NEW: Uses uiStore with full message info
   */
  const startReplyingToMessage = useCallback((messageId: string, text?: string, sender?: string) => {
    // Find message info if not provided
    let messageText = text;
    let senderName = sender;

    if (!messageText || !senderName) {
      const { conversationMessages } = useConversationStore.getState();
      for (const [, msgs] of Object.entries(conversationMessages)) {
        const found = msgs.find(m => m.id === messageId);
        if (found) {
          messageText = messageText || found.content || '[Media]';
          senderName = senderName || found.sender_name || 'Unknown';
          break;
        }
      }
    }

    setReplyingTo({
      id: messageId,
      text: messageText || '[Message]',
      sender: senderName || 'Unknown'
    });

    // Also update legacy store for backward compatibility
    legacySetReplyingToMessageId(messageId);
  }, [setReplyingTo, legacySetReplyingToMessageId]);

  /**
   * ยกเลิกการตอบกลับข้อความ
   * ✅ NEW: Uses uiStore instead of messageStore
   */
  const cancelReplyingToMessage = useCallback(() => {
    setReplyingTo(null);
    legacySetReplyingToMessageId(null);
  }, [setReplyingTo, legacySetReplyingToMessageId]);

  return {
    // สถานะ
    messages,
    // ✅ NEW: Prefer uiStore values, fallback to legacy for backward compatibility
    editingMessageId: editingMessage?.id || legacyEditingMessageId,
    replyingToMessageId: replyingTo?.id || legacyReplyingToMessageId,
    // ✅ NEW: Full UI state objects from uiStore
    editingMessage,
    replyingTo,
    loading,
    error,
    isWebSocketConnected: isConnected,

    // การดึงข้อมูล
    getMessages,

    // การส่งข้อความ
    sendTextMessage,
    sendStickerMessage,
    sendImageMessage,
    sendFileMessage,
    uploadAndSendImage,
    uploadAndSendFile,

    // การจัดการข้อความ
    editMessage,
    deleteMessage,
    replyToMessage,
    markMessageAsRead,


    // การจัดการสถานะ
    startEditingMessage,
    cancelEditingMessage,
    startReplyingToMessage,
    cancelReplyingToMessage,
    // ✅ NEW: Direct uiStore setters for more control
    setEditingMessage,
    setReplyingTo,
    setError,
  };
};

export default useMessage;