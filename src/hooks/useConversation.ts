// src/hooks/useConversation.ts
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import type { MessageEditedData } from '@/types/websocket.types'; // ✅ เพิ่ม import
import { toast } from '@/utils/toast';
import { useInvalidateMedia } from '@/hooks/useMediaQueries';
import notificationSound from '@/services/notificationSoundService';

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
  const queryClient = useQueryClient();

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

      // 🔔 เล่นเสียงถ้าเป็นข้อความจากคนอื่น และ conversation ไม่ได้ถูก mute
      if (message.sender_id !== currentUserId) {
        // เช็คว่า conversation นี้ถูก mute หรือไม่
        const conversation = useConversationStore.getState().conversations.find(
          c => c.id === message.conversation_id
        );
        const isMuted = conversation?.is_muted || false;

        if (!isMuted) {
          console.log('🔔 [useConversation] Playing notification sound for message from:', message.sender_name);
          notificationSound.play();
        } else {
          console.log('🔇 [useConversation] Conversation is muted, skipping sound');
        }
      }
    
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

      // ✅ FIX: เช็ค sender ก่อน! Backend ส่ง tempId ไปให้ทุกคน
      // ถ้าเป็นข้อความจากคนอื่น → ไม่สนใจ tempId, เล่นเสียงเลย
      const isFromOther = message.sender_id !== currentUserId;

      console.log('🔔 [useConversation] Message routing:', {
        isFromOther,
        hasTempId: !!tempId,
        sender_id: message.sender_id,
        currentUserId
      });

      if (isFromOther && message?.id) {
        // ✅ ข้อความจากคนอื่น → เพิ่ม message
        // NOTE: เสียงแจ้งเตือนจัดการโดย useMessageNotification hook ใน ChatLayout แล้ว
        console.log('[DEBUG] Message from OTHER user - adding message');
        addNewMessage(message, currentUserId);

        // ✅ Auto mark as read ถ้าอยู่ใน active conversation และ tab เป็น active
        if (activeConversationId === message.conversation_id && !document.hidden) {
          messageService.markMessageAsRead(message.id).catch(err => {
            console.error('Failed to mark message as read:', err);
          });
          markMessageAsRead(message.id);
        }

        // ✅ React Query: Invalidate media cache
        const hasMedia = ['image', 'video', 'file'].includes(message.message_type);
        const hasLinks = message.metadata && typeof message.metadata === 'object' &&
                        Array.isArray((message.metadata as { links?: string[] }).links) &&
                        (message.metadata as { links?: string[] }).links!.length > 0;

        if (hasMedia || hasLinks) {
          invalidateMedia(message.conversation_id);
        }
      } else if (tempId && message.id && tempId !== message.id) {
        // ✅ ข้อความของตัวเอง ที่มี tempId → replace temp message ด้วย real message
        console.log('[DEBUG] Message from SELF with tempId - replacing temp message');
        const messageWithTempId = {
          ...message,
          temp_id: tempId
        };
        addNewMessage(messageWithTempId, currentUserId);

        // ✅ React Query: Invalidate media cache
        const hasMedia = ['image', 'video', 'file'].includes(message.message_type);
        const hasLinks = message.metadata && typeof message.metadata === 'object' &&
                        Array.isArray((message.metadata as { links?: string[] }).links) &&
                        (message.metadata as { links?: string[] }).links!.length > 0;

        if (hasMedia || hasLinks) {
          invalidateMedia(message.conversation_id);
        }
      } else if (message?.id) {
        // ✅ ข้อความของตัวเอง ไม่มี tempId → เพิ่มปกติ (ไม่เล่นเสียง)
        console.log('[DEBUG] Message from SELF without tempId - adding without sound');
        addNewMessage(message, currentUserId);
      } else {
        console.error('Invalid message update data: missing id property', message);
      }
    });

    const unsubMessageRead = addEventListener('message:message.read', (rawData: WebSocketEnvelope<MessageReadDTO>) => {
      const messageRead = rawData.data;

      console.log('[DEBUG] message.read event received:', {
        message_id: messageRead.message_id,
        user_id: messageRead.user_id,
        conversation_id: messageRead.conversation_id,
        read_count: messageRead.read_count,
        currentUserId: currentUserId,
        isCurrentUser: messageRead.user_id === currentUserId
      });

      // ✅ Backend now sends read_count - update both status and read_count
      updateMessage(messageRead.message_id, {
        status: 'read',
        read_count: messageRead.read_count
      });
    });

    const unsubMessageReadAll = addEventListener('message:message.read_all', (rawData: WebSocketEnvelope<MessageReadAllDTO>) => {

      const messageReadAll = rawData.data;

      console.log('[DEBUG] message.read_all event received:', {
        conversation_id: messageReadAll.conversation_id,
        user_id: messageReadAll.user_id,
        currentUserId: currentUserId,
        isCurrentUser: messageReadAll.user_id === currentUserId
      });

      // ⚠️ ตรวจสอบว่าเป็นตัวเองหรือไม่ ถ้าไม่ใช่ ไม่ควร update unread_count!
      if (messageReadAll.user_id !== currentUserId) {
        console.warn('[DEBUG] ⚠️ Received read_all event from another user! Should NOT update own unread_count!', {
          otherUserId: messageReadAll.user_id,
          currentUserId: currentUserId
        });
        return; // ❌ Don't update if it's from another user
      }

      // ตรวจสอบว่ามี conversation_id หรือไม่
      if (messageReadAll.conversation_id) {
        console.log(`[DEBUG] ✅ Marking all messages as read for conversation: ${messageReadAll.conversation_id}`);

        // เพิ่มฟังก์ชันนี้ใน conversationStore เพื่ออัพเดทข้อความทั้งหมดในการสนทนา
        markAllMessagesAsReadInConversation(messageReadAll.conversation_id);
      } else {
        console.warn('Cannot mark messages as read: No conversation ID in data');
      }
    });


    // สำหรับ events ที่ยังไม่ได้กำหนดใน WebSocketEventMap เราใช้ onDynamic

    // รับการอัปเดตข้อความ - ✅ ใช้ message.updated แทน message.edit
    const unsubMessageUpdate = addEventListener('message:message.updated', (rawData: WebSocketEnvelope<MessageEditedData>) => {
      console.log('Message message.updated via WebSocket:', rawData);

      // Backend ส่ง: { message_id, conversation_id, new_content, edited_at }
      const editData = rawData.data;

      if (editData?.message_id && editData?.new_content) {
        // อัปเดตข้อความด้วย new_content
        updateMessage(editData.message_id, {
          content: editData.new_content,
          is_edited: true,
          updated_at: editData.edited_at
        } as Partial<MessageDTO>);
      } else {
        console.error('Invalid message update data: missing required fields', rawData);
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
      console.log('🔔 [conversation.join] Event received:', rawData);

      const data = rawData.data as any; // Backend may send incomplete data

      // ✅ Backend อาจส่งมาแค่ conversation_id และ message (ไม่ใช่ ConversationDTO เต็ม)
      const conversationId = data?.id || data?.conversation_id;

      if (!conversationId) {
        console.error('❌ [conversation.join] Invalid data - no conversation ID:', data);
        return;
      }

      console.log('🔔 [conversation.join] Subscribing to conversation:', conversationId);
      WebSocketManager.subscribeToConversation(conversationId);

      // ✅ ถ้ามี message จาก backend (เช่น "คุณถูกเพิ่มในบทสนทนา") ให้ refetch
      if (data.message) {
        console.log('🔔 [conversation.join] Refreshing conversations...');
        fetchConversations();
      }

      // อาจมีการเปลี่ยนไปยังการสนทนาใหม่โดยอัตโนมัติ หากต้องการ
      // navigateToConversation(conversationId);
    });

    // รับการอัปเดตข้อมูลกลุ่ม (ชื่อกลุ่ม, ไอคอน) และข้อมูล mention (Phase 2)
    const unsubConversationUpdate = addEventListener('message:conversation.update', (rawData) => {
      console.log('📝 [useConversation] conversation.update event:', rawData);

      const data = rawData.data;

      if (!data || !data.conversation_id) {
        console.error('[useConversation] Invalid conversation.update data:', data);
        return;
      }

      // อัปเดตข้อมูลในสโตร์
      const updates: Partial<ConversationDTO> = {};

      // Group info updates
      if (data.title !== undefined) updates.title = data.title;
      if (data.icon_url !== undefined) updates.icon_url = data.icon_url;

      // ✅ Phase 2: Message updates (including mention data)
      if (data.last_message_text !== undefined) updates.last_message_text = data.last_message_text;
      if (data.last_message_at !== undefined) updates.last_message_at = data.last_message_at;

      // ✅ Phase 2: Mention notification fields
      if (data.has_unread_mention !== undefined) updates.has_unread_mention = data.has_unread_mention;
      if (data.unread_mention_count !== undefined) updates.unread_mention_count = data.unread_mention_count;
      if (data.last_message_has_mention !== undefined) updates.last_message_has_mention = data.last_message_has_mention;

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

      console.log('🔔 [user_added] Event received:', {
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        current_user_id: currentUserId,
        is_me: data.user_id === currentUserId
      });

      // ✅ ถ้าคนที่ถูกเชิญคือเรา → refetch เพื่อเห็นกลุ่มใหม่
      if (data.user_id === currentUserId) {
        console.log('🔔 [user_added] I was added to a group! Refreshing conversations...');
        fetchConversations();
        toast.success('คุณถูกเชิญเข้ากลุ่ม', 'คุณถูกเพิ่มเข้ากลุ่มใหม่');
      }
      // ✅ ถ้าเป็น conversation ที่กำลังเปิดอยู่ → refetch เพื่ออัปเดตรายชื่อสมาชิก
      else if (data.conversation_id === activeConversationId) {
        console.log('🔔 [user_added] Member added to active conversation. Refreshing...');
        fetchConversations();
        const memberName = data.user?.display_name || 'สมาชิกใหม่';
        toast.info('สมาชิกใหม่เข้าร่วม', `${memberName} เข้าร่วมการสนทนา`);
      }
      // ✅ ถ้าไม่ใช่ทั้ง 2 กรณี → แสดง toast อย่างเดียว
      else {
        const memberName = data.user?.display_name || 'สมาชิกใหม่';
        toast.info('สมาชิกใหม่', `${memberName} เข้าร่วมกลุ่ม`);
      }
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

    // ✅ รับการเปลี่ยนแปลงสิทธิ์สมาชิก (Group Management)
    const unsubMemberRoleChanged = WebSocketManager.onDynamic('message:conversation.member_role_changed', (rawData: any) => {
      console.log('📊 [useConversation] member_role_changed event:', rawData);
      const data = rawData.data;

      if (data?.conversation_id) {
        // Invalidate group members query to refetch updated roles
        queryClient.invalidateQueries({ queryKey: ['groupMembers', data.conversation_id] });

        // Show notification
        const roleText = data.new_role === 'admin' ? 'ผู้ดูแล' : 'สมาชิก';
        toast.info('เปลี่ยนสิทธิ์สมาชิก', `${data.target?.display_name} ถูกเปลี่ยนเป็น ${roleText}`);
      }
    });

    // ✅ รับการโอนความเป็นเจ้าของ (Group Management)
    const unsubOwnershipTransferred = WebSocketManager.onDynamic('message:conversation.ownership_transferred', (rawData: any) => {
      console.log('👑 [useConversation] ownership_transferred event:', rawData);
      const data = rawData.data;

      if (data?.conversation_id) {
        // Invalidate group members query to refetch updated roles
        queryClient.invalidateQueries({ queryKey: ['groupMembers', data.conversation_id] });

        // Update conversation data to reflect new owner
        if (data.new_owner_id) {
          updateConversationData(data.conversation_id, {
            creator_id: data.new_owner_id
          } as any);
        }

        // Show notification
        toast.success('โอนความเป็นเจ้าของสำเร็จ', `${data.new_owner?.display_name} เป็นเจ้าของกลุ่มคนใหม่`);
      }
    });

    // ✅ รับกิจกรรมใหม่ (Group Management - Activity Log)
    const unsubActivityNew = WebSocketManager.onDynamic('message:conversation.activity.new', (rawData: any) => {
      console.log('📝 [useConversation] activity.new event:', rawData);
      // Activity log component will handle this event directly via useActivityLog hook
      // No need to do anything here, just log for debugging
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
      unsubMemberRoleChanged(); // ✅ Group Management: เปลี่ยนสิทธิ์
      unsubOwnershipTransferred(); // ✅ Group Management: โอนความเป็นเจ้าของ
      unsubActivityNew(); // ✅ Group Management: กิจกรรมใหม่
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
   * มาร์คข้อความทั้งหมดในการสนทนาว่าอ่านแล้ว
   */
  const markAllMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);

      // เรียกใช้ messageService สำหรับการมาร์คข้อความทั้งหมดเป็นอ่านแล้ว
      const result = await messageService.markAllMessagesAsRead(conversationId);

      // อัปเดต UI หรือ state อื่นๆ ที่เกี่ยวข้อง
      if (result.success) {
        // อัพเดทสถานะการอ่านข้อความทั้งหมดในการสนทนา
        // ตั้งค่า unread_count เป็น 0 และ clear mention badges
        updateConversationData(conversationId, {
          unread_count: 0,
          has_unread_mention: false,      // ✅ Clear mention badge
          unread_mention_count: 0         // ✅ Clear mention count
        });
      }

      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการมาร์คข้อความว่าอ่านแล้ว';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateConversationData]);

  /**
   * เลือกการสนทนา
   */
  const selectConversation = useCallback(async (conversationId: string | null) => {
    setActiveConversation(conversationId);

    // ✅ Auto mark all messages as read เมื่อเปิด conversation
    if (conversationId && !document.hidden) {
      console.log('[DEBUG] selectConversation: Auto mark all as read for:', conversationId);

      try {
        await markAllMessagesAsRead(conversationId);
        console.log('[DEBUG] ✅ Mark all as read success for conversation:', conversationId);
      } catch (err) {
        console.error('[DEBUG] ❌ Failed to mark all as read:', err);
      }
    }
  }, [setActiveConversation, markAllMessagesAsRead]);

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