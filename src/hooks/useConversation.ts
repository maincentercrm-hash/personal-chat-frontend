// src/hooks/useConversation.ts
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useConversationStore, { conversationSelectors } from '@/stores/conversationStore';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import messageService from '@/services/messageService';
import WebSocketManager from '@/services/websocket/WebSocketManager';
import type {
  ConversationDTO,
  ConversationQueryRequest,
  ConversationMessagesQueryRequest,
  UpdateConversationRequest,
  MessageReadDTO,
  MessageReadAllDTO
} from '@/types/conversation.types';
import type { MessageDTO } from '@/types/message.types';
import useAuth from '@/hooks/useAuth';

import useMessageStore from '@/stores/messageStore';
import type { WebSocketEnvelope } from '@/types/user-friendship.types';
import { toast } from '@/utils/toast';
import { useInvalidateMedia } from '@/hooks/useMediaQueries';

/**
 * Hook สำหรับจัดการการสนทนา
 * ✅ OPTIMIZED: ใช้ selectors เพื่อลด re-render
 */
export const useConversation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const currentUserId = user?.id || '';
  // เข้าถึง WebSocket context
  const { addEventListener, isConnected } = useWebSocketContext();

  // ✅ React Query: ดึงฟังก์ชัน invalidate media cache
  const invalidateMedia = useInvalidateMedia();

  // ✅ OPTIMIZED: ใช้ selectors แยก - แต่ละตัวจะ subscribe เฉพาะ state ที่ต้องการ
  const conversations = useConversationStore(conversationSelectors.conversations);
  const activeConversationId = useConversationStore(conversationSelectors.activeConversationId);
  const conversationMessages = useConversationStore(state => state.conversationMessages);
  const hasMoreMessages = useConversationStore(state => state.hasMoreMessages);
  const hasAfterMessages = useConversationStore(state => state.hasAfterMessages);

  // ✅ FIXED: Subscribe to individual actions directly (stable references)
  const fetchConversations = useConversationStore(state => state.fetchConversations);
  const fetchMoreConversations = useConversationStore(state => state.fetchMoreConversations);
  const fetchConversationMessages = useConversationStore(state => state.fetchConversationMessages);
  const fetchMoreMessages = useConversationStore(state => state.fetchMoreMessages);
  const createDirectConversation = useConversationStore(state => state.createDirectConversation);
  const createGroupConversation = useConversationStore(state => state.createGroupConversation);
  const updateConversationInStore = useConversationStore(state => state.updateConversation);
  const togglePinConversation = useConversationStore(state => state.togglePinConversation);
  const toggleMuteConversation = useConversationStore(state => state.toggleMuteConversation);
  const setActiveConversation = useConversationStore(state => state.setActiveConversation);
  const addNewMessage = useConversationStore(state => state.addNewMessage);
  const updateMessage = useConversationStore(state => state.updateMessage);
  const deleteMessage = useConversationStore(state => state.deleteMessage);
  const addNewConversation = useConversationStore(state => state.addNewConversation);
  const updateConversationData = useConversationStore(state => state.updateConversationData);
  const removeConversation = useConversationStore(state => state.removeConversation);
  const updateMessageStatus = useConversationStore(state => state.updateMessageStatus);
  const markAllMessagesAsReadInConversation = useConversationStore(state => state.markAllMessagesAsReadInConversation);
  const replaceMessagesWithContext = useConversationStore(state => state.replaceMessagesWithContext);
  const setStoreError = useConversationStore(state => state.setError);

  const markMessageAsRead = useMessageStore(state => state.markMessageAsReadInStore);

  // ล้างข้อความผิดพลาดใน store เมื่อ component unmount
  useEffect(() => {
    return () => {
      setStoreError(null);
    };
  }, [setStoreError]);




  // ลงทะเบียนรับเหตุการณ์ WebSocket เมื่อ hook ถูกเรียกใช้
  useEffect(() => {
    if (!isConnected) return;

    // Listen for conversation list from WebSocket
    const unsubConversationList = addEventListener('message:conversation.list' as any, (rawData: WebSocketEnvelope<ConversationDTO[]>) => {

      const newConversations = rawData.data;

      // Update store with conversations from WebSocket
      // ⚠️ IMPORTANT: Merge with existing data instead of replacing
      if (newConversations && Array.isArray(newConversations)) {
        const currentState = useConversationStore.getState();
        const existingConversations = currentState.conversations;

        // Create a map of existing conversations by ID
        const existingMap = new Map(existingConversations.map(conv => [conv.id, conv]));

        // Merge: preserve existing data (especially icon_url, contact_info, etc.)
        // but update fields that might have changed (unread_count, last_message, etc.)
        const mergedConversations = newConversations.map(newConv => {
          const existing = existingMap.get(newConv.id);

          if (existing) {
            // Merge: keep existing data that might be missing from WebSocket
            return {
              ...existing,           // Keep all existing data
              ...newConv,            // Override with new data
              icon_url: newConv.icon_url || existing.icon_url,  // Preserve icon if missing
              contact_info: newConv.contact_info || existing.contact_info,  // Preserve contact_info
            };
          }

          return newConv; // New conversation not in store yet
        });

        useConversationStore.setState({ conversations: mergedConversations });
      }
    });

    // ใน useConversation.ts ที่ handler สำหรับ message.receive
    const unsubNewMessage = addEventListener('message:message.receive', (rawData: WebSocketEnvelope<MessageDTO>) => {
    
      // สำคัญ: สร้าง copy ของข้อมูลเพื่อป้องกันการแก้ไขข้อมูลต้นฉบับ
      const originalMessage = rawData.data;
      const message = JSON.parse(JSON.stringify(originalMessage)); // deep clone
    
      // ตรวจสอบว่าข้อความนี้มาจากธุรกิจหรือไม่ (business_id มีค่า)
      const isBusinessMessage = message.business_id !== undefined && message.business_id !== null;
      
      // ปรับชื่อผู้ส่งในกรณีที่เป็นข้อความจากธุรกิจ (เฉพาะเมื่อผู้ส่งเป็นธุรกิจ)
      if (isBusinessMessage && message.business_info && message.sender_type === 'business') {
        const businessName = message.business_info.display_name || message.business_info.name || 'Business';
        message.sender_name = businessName;
        //console.log(`Updated sender name to business name: ${businessName}`);
        
        // ปรับชื่อผู้ส่งในข้อความที่ตอบกลับด้วย (ถ้ามี)
        if (message.reply_to_message && message.reply_to_message.sender_type === 'business') {
          message.reply_to_message.sender_name = businessName;
          //console.log(`Updated reply_to_message sender name to business name: ${businessName}`);
        }
      }
    
      // ดึง tempId จาก metadata (ถ้ามี)
      const tempId = message.metadata && typeof message.metadata === 'object' ?
        (message.metadata as { tempId?: string }).tempId :
        undefined;

      // ✅ ใช้ addNewMessage แทน updateMessage เพื่อให้ store จัดการ replace
      // ถ้ามี tempId และ id ที่แตกต่างกัน → Real message ที่ replace temp message
      if (tempId && message.id && tempId !== message.id) {
        // เพิ่ม temp_id ให้ message (backend now sends status, no need to set fallback)
        const messageWithTempId = {
          ...message,
          temp_id: tempId
        };

        // ✅ ใช้ addNewMessage เพื่อให้ store replace temp message
        addNewMessage(messageWithTempId, currentUserId);

        // Mark as read ถ้าอยู่ใน active conversation
        if (message.sender_id !== currentUserId && activeConversationId === message.conversation_id) {
          markMessageAsRead(message.id);
        }

        // ✅ React Query: Invalidate media cache ถ้าเป็นข้อความที่มี media หรือ links
        const hasMedia = ['image', 'video', 'file'].includes(message.message_type);
        const hasLinks = message.metadata && typeof message.metadata === 'object' &&
                        Array.isArray((message.metadata as { links?: string[] }).links) &&
                        (message.metadata as { links?: string[] }).links!.length > 0;

        if (hasMedia || hasLinks) {
          console.log('[Media Cache] Detected media/links message:', {
            messageType: message.message_type,
            hasMedia,
            hasLinks,
            metadata: message.metadata,
          });
          invalidateMedia(message.conversation_id);
        }
      } else if (message?.id) {
        // ถ้าไม่มี tempId → ข้อความจากคนอื่น
        // ดำเนินการต่อตามปกติ (เฉพาะข้อความจากคนอื่น)
        if (message.sender_id !== currentUserId) {
          addNewMessage(message, currentUserId);

          if (activeConversationId === message.conversation_id) {
            markMessageAsRead(message.id);
          }

          // ✅ React Query: Invalidate media cache ถ้าเป็นข้อความที่มี media หรือ links
          const hasMedia = ['image', 'video', 'file'].includes(message.message_type);
          const hasLinks = message.metadata && typeof message.metadata === 'object' &&
                          Array.isArray((message.metadata as { links?: string[] }).links) &&
                          (message.metadata as { links?: string[] }).links!.length > 0;

          if (hasMedia || hasLinks) {
            console.log('[Media Cache] Detected media/links message from other user:', {
              messageType: message.message_type,
              hasMedia,
              hasLinks,
              metadata: message.metadata,
            });
            invalidateMedia(message.conversation_id);
          }
        }
      } else {
        console.error('Invalid message update data: missing id property', message);
      }
    });

    const unsubMessageRead = addEventListener('message:message.read', (rawData: WebSocketEnvelope<MessageReadDTO>) => {
      const messageRead = rawData.data;

      // ✅ Backend now sends read_count - update both status and read_count
      updateMessage(messageRead.message_id, {
        status: 'read',
        read_count: messageRead.read_count
      });
    });

    const unsubMessageReadAll = addEventListener('message:message.read_all', (rawData: WebSocketEnvelope<MessageReadAllDTO>) => {
    
      const messageReadAll = rawData.data;
      
      // ตรวจสอบว่ามี conversation_id หรือไม่
      if (messageReadAll.conversation_id) {
        //console.log(`Received read_all event for conversation: ${messageReadAll.conversation_id}`);
        
        // เพิ่มฟังก์ชันนี้ใน conversationStore เพื่ออัพเดทข้อความทั้งหมดในการสนทนา
        markAllMessagesAsReadInConversation(messageReadAll.conversation_id);
      } else {
        console.warn('Cannot mark messages as read: No conversation ID in data');
      }
    });


    // สำหรับ events ที่ยังไม่ได้กำหนดใน WebSocketEventMap เราใช้ onDynamic

    // รับการอัปเดตข้อความ
    const unsubMessageUpdate = addEventListener('message:message.edit', (rawData: WebSocketEnvelope<MessageDTO>) => {
      //console.log('Message message.edit via WebSocket:', rawData);

      // Type assertion แบบปลอดภัย
      const message = rawData.data;

      // ใช้ optional chaining + nullish coalescing
      if (message?.id) {
        updateMessage(message.id, message);
      } else {
        console.error('Invalid message update data: missing id property', rawData);
      }
    });

    // รับการลบข้อความ
    const unsubMessageDelete = addEventListener('message:message.delete', (rawData: WebSocketEnvelope<{ message_id: string; deleted_at: string }>) => {
      const data = rawData.data;
      const messageId = data.message_id;
      const deletedAt = data.deleted_at;

      if (messageId) {
        // อัพเดท message เป็น deleted แทนการลบออก
        updateMessage(messageId, {
          content: 'ข้อความนี้ถูกลบแล้ว',
          is_deleted: true,
          deleted_at: deletedAt
        } as Partial<MessageDTO>);
      } else {
        console.error('Invalid message delete data: missing message_id property', data);
      }
    });




    // รับการอัปเดตการสนทนา
    const unsubConversationCreate = addEventListener('message:conversation.create', (rawData: WebSocketEnvelope<ConversationDTO>) => {
      //console.log('conversation.create HOOK:', rawData);

      const data = rawData.data;

      // ตรวจสอบความถูกต้องของข้อมูล
      if (!data || !data.id) {
        console.error('Invalid conversation data received:', data);
        return;
      }

      if (data.creator_id === currentUserId) {
        //console.log('DUPLICATE CONVERSATION');
        return;
      }

      // เพิ่มการสนทนาใหม่เข้าไปในระบบ
      addNewConversation(data);


      WebSocketManager.subscribeToConversation(data.id);

      // อาจมีการเปลี่ยนไปยังการสนทนาใหม่โดยอัตโนมัติ หากต้องการ
      // navigateToConversation(data.id);
    });


    const unsubConversationJoin = addEventListener('message:conversation.join', (rawData: WebSocketEnvelope<ConversationDTO>) => {
      //console.log('conversation.join HOOK:', rawData);

      const data = rawData.data;

      // ตรวจสอบความถูกต้องของข้อมูล
      if (!data || !data.id) {
        console.error('Invalid conversation data received:', data);
        return;
      }

      WebSocketManager.subscribeToConversation(data.id);

      // อาจมีการเปลี่ยนไปยังการสนทนาใหม่โดยอัตโนมัติ หากต้องการ
      // navigateToConversation(data.id);
    });

    // รับการอัปเดตข้อมูลกลุ่ม (ชื่อกลุ่ม, ไอคอน)
    const unsubConversationUpdate = addEventListener('message:conversation.update', (rawData) => {
      console.log('📝 [useConversation] conversation.update event:', rawData);

      const data = rawData.data;

      if (!data || !data.conversation_id) {
        console.error('[useConversation] Invalid conversation.update data:', data);
        return;
      }

      // อัปเดตข้อมูลในสโตร์
      const updates: Partial<ConversationDTO> = {};
      if (data.title !== undefined) updates.title = data.title;
      if (data.icon_url !== undefined) updates.icon_url = data.icon_url;

      updateConversationData(data.conversation_id, updates);

      // แสดง toast แจ้งเตือนการอัปเดต (เฉพาะถ้าไม่ใช่ active conversation เพื่อไม่ให้รบกวน)
      if (data.conversation_id !== activeConversationId) {
        if (data.title) {
          toast.info('อัปเดตข้อมูลกลุ่ม', `ชื่อกลุ่มเปลี่ยนเป็น "${data.title}"`);
        } else if (data.icon_url) {
          toast.info('อัปเดตข้อมูลกลุ่ม', 'ไอคอนกลุ่มได้รับการอัปเดต');
        }
      }
    });

    // รับการเพิ่มสมาชิกในกลุ่ม
    const unsubUserAdded = addEventListener('message:conversation.user_added', (rawData) => {
      const data = rawData.data;

      // ถ้าเป็น conversation ที่กำลังเปิดอยู่ ให้ refetch conversation list
      if (data.conversation_id === activeConversationId) {
        fetchConversations();
      }

      // แสดง toast
      toast.info('สมาชิกใหม่เข้าร่วม', `${data.user.display_name} เข้าร่วมการสนทนา`);
    });

    // รับการลบสมาชิกออกจากกลุ่ม
    const unsubUserRemoved = addEventListener('message:conversation.user_removed', (rawData) => {
      const data = rawData.data;

      // 🔍 Debug: Log event data
      console.log('[DEBUG] conversation.user_removed event received:', {
        conversation_id: data.conversation_id,
        current_user_id: currentUserId,
        removed_at: data.removed_at,
        payload: data
      });

      // Backend ส่ง event ให้เฉพาะคนที่ถูก remove เท่านั้น (BroadcastToUser)
      // ดังนั้นไม่ต้องเช็ค user_id
      console.log('[DEBUG] Current user was removed from conversation:', data.conversation_id);

      // ลบ conversation ออกจาก list
      removeConversation(data.conversation_id);

      // ถ้ากำลังเปิด conversation นี้อยู่ ให้ปิดและกลับไปหน้า dashboard
      if (data.conversation_id === activeConversationId) {
        navigate('/dashboard');
      }

      toast.warning('คุณถูกลบออกจากกลุ่ม', 'คุณไม่สามารถเข้าถึงการสนทนานี้ได้อีกต่อไป');
    });



    // รับการอัปเดตการสนทนา (เดิม - deprecated, ใช้ conversation.update แทน)
    const unsubConversationUpdateOld = WebSocketManager.onDynamic('message:conversation_update', (data) => {
      //console.log('Conversation conversation.updated via WebSocket:', data);

      // Type assertion แบบปลอดภัย
      const conversationData = data as Partial<ConversationDTO>;

      // ตรวจสอบว่ามี id หรือไม่
      if (conversationData?.id) {
        updateConversationData(conversationData.id, conversationData as ConversationDTO);
      } else {
        console.error('Invalid conversation update data: missing id property', data);
      }
    });

    // รับการลบการสนทนา
    const unsubConversationDelete = WebSocketManager.onDynamic('message:conversation_delete', (data) => {
      //console.log('Conversation conversation.deleted via WebSocket:', data);

      // Type assertion แบบปลอดภัย
      const conversationData = data as Partial<ConversationDTO>;

      // ตรวจสอบว่ามี id หรือไม่
      if (conversationData?.id) {
        removeConversation(conversationData.id);
      } else {
        console.error('Invalid conversation delete data: missing id property', data);
      }
    });

    // คืนค่า function สำหรับยกเลิกการลงทะเบียน event listeners เมื่อ component unmount
    return () => {
      unsubConversationList();
      unsubNewMessage();
      unsubMessageRead();
      unsubMessageReadAll();
      unsubMessageUpdate();
      unsubMessageDelete();
      unsubConversationCreate();
      unsubConversationJoin();
      unsubConversationUpdate(); // ใหม่: อัปเดตข้อมูลกลุ่ม (ชื่อ, ไอคอน)
      unsubUserAdded();
      unsubUserRemoved();
      unsubConversationUpdateOld(); // เดิม: conversation_update event (deprecated)
      unsubConversationDelete();
    };
  }, [
    isConnected,
    addEventListener,
    currentUserId,
    activeConversationId,
    addNewMessage,
    updateMessage,
    deleteMessage,
    addNewConversation,
    updateConversationData,
    removeConversation,
    markMessageAsRead,
    updateMessageStatus,
    navigate,
    fetchConversations
  ]);





  /**
   * ดึงการสนทนาทั้งหมดของผู้ใช้
   */
  const getConversations = useCallback(async (params?: ConversationQueryRequest) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchConversations(params);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงการสนทนา';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchConversations]);

  /**
   * ดึงข้อความในการสนทนา
   */
  const getMessages = useCallback(async (conversationId: string, params?: ConversationMessagesQueryRequest) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchConversationMessages(conversationId, params);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อความ';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchConversationMessages]);

  /**
   * สร้างการสนทนาแบบ direct (1:1)
   */
  const createDirect = useCallback(async (memberId: string) => {
    try {
      setLoading(true);
      setError(null);

      // แปลง memberId เป็น array ก่อนส่งไปยัง store
      const result = await createDirectConversation([memberId]);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างการสนทนา';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [createDirectConversation]);

  /**
   * สร้างการสนทนาแบบกลุ่ม
   */
  const createGroup = useCallback(async (title: string, memberIds?: string[], iconUrl?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await createGroupConversation(title, memberIds, iconUrl);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างกลุ่มสนทนา';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [createGroupConversation]);


  /**
   * อัปเดตข้อมูลการสนทนา
   */
  const updateConversation = useCallback(async (conversationId: string, data: UpdateConversationRequest) => {
    try {
      setLoading(true);
      setError(null);

      const result = await updateConversationInStore(conversationId, data);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตการสนทนา';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateConversationInStore]);

  /**
   * เปลี่ยนสถานะปักหมุดของการสนทนา
   */
  const togglePin = useCallback(async (conversationId: string, isPinned: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const result = await togglePinConversation(conversationId, isPinned);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะปักหมุด';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [togglePinConversation]);

  /**
   * เปลี่ยนสถานะการปิดเสียงของการสนทนา
   */
  const toggleMute = useCallback(async (conversationId: string, isMuted: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const result = await toggleMuteConversation(conversationId, isMuted);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะปิดเสียง';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [toggleMuteConversation]);

  /**
   * ดึงข้อความเพิ่มเติม (infinity scroll)
   */
  const loadMoreMessages = useCallback(async (conversationId: string, params?: ConversationMessagesQueryRequest) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchMoreMessages(conversationId, params);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อความเพิ่มเติม';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchMoreMessages]);

  /**
   * ดึงการสนทนาเพิ่มเติม (infinity scroll)
   */
  const loadMoreConversations = useCallback(async (params?: ConversationQueryRequest) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchMoreConversations(params);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงการสนทนาเพิ่มเติม';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchMoreConversations]);

  /**
   * เลือกการสนทนา
   */
  const selectConversation = useCallback((conversationId: string | null) => {
    setActiveConversation(conversationId);
  }, [setActiveConversation]);

  /**
   * ดึงข้อความในการสนทนาที่เลือก
   */
  const getActiveConversationMessages = useCallback(() => {
    if (!activeConversationId) return [];
    return conversationMessages[activeConversationId] || [];
  }, [activeConversationId, conversationMessages]);

  /**
   * ดึงข้อมูลการสนทนาที่เลือก
   */
  const getActiveConversation = useCallback(() => {
    if (!activeConversationId) return null;
    return conversations.find(conv => conv.id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  /**
   * มี "ดูเพิ่มเติม" สำหรับข้อความหรือไม่
   */
  const hasMoreMessagesAvailable = useCallback((conversationId: string) => {
    return hasMoreMessages[conversationId] || false;
  }, [hasMoreMessages]);

  // ⬇️ Check if has newer messages (for Jump context)
  const hasAfterMessagesAvailable = useCallback((conversationId: string) => {
    return hasAfterMessages[conversationId] || false;
  }, [hasAfterMessages]);

  /**
   * มาร์คข้อความทั้งหมดในการสนทนาว่าอ่านแล้ว (เพิ่มเข้ามาเพื่อแก้ไขปัญหา)
   */
  // src/hooks/useConversation.ts
  const markAllMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);

      // เรียกใช้ messageService สำหรับการมาร์คข้อความทั้งหมดเป็นอ่านแล้ว
      const result = await messageService.markAllMessagesAsRead(conversationId);

      // อัปเดต UI หรือ state อื่นๆ ที่เกี่ยวข้อง
      if (result.success) {
        // อัพเดทสถานะการอ่านข้อความทั้งหมดในการสนทนา
        // และตั้งค่า unread_count เป็น 0
        updateConversationData(conversationId, { unread_count: 0 });
        //console.log(`Marked all messages as read in conversation ${conversationId}. Resetting unread_count to 0.`);
      }

      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการมาร์คข้อความว่าอ่านแล้ว';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setError, updateConversationData]);

  return {
    // ข้อมูล
    conversations,
    activeConversationId,
    conversationMessages,
    loading,
    error,
    isWebSocketConnected: isConnected,



    getConversations,
    getMessages,
    loadMoreMessages,
    loadMoreConversations,
    hasMoreMessagesAvailable,
    hasAfterMessagesAvailable, // ⬇️ For Jump context

    // การสร้างและอัปเดต
    createDirect,
    createGroup,
    updateConversation,
    togglePin,
    toggleMute,

    // การเลือกการสนทนา
    selectConversation,
    getActiveConversationMessages,
    getActiveConversation,

    // การจัดการข้อความ
    markMessageAsRead,
    markAllMessagesAsRead, // เพิ่มฟังก์ชันนี้เข้าไปในส่วน return
    replaceMessagesWithContext,

    // การจัดการสถานะ
    setError,
  };
};

export default useConversation;