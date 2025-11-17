// ปัญหาที่พบคือ:
// 1. `useNavigate` ไม่ได้ถูกใช้งานใน useFriendsPageLogic (เนื่องจากถูก comment ไว้)
// 2. การส่งค่า conversationId จาก handleCreateBusinessConversation กลับไปยัง component แต่ไม่มีการนำทางไปยังหน้าแชท
// 3. ทำให้เมื่อกดปุ่มแชทใน AddFriendModal แล้ว สามารถสร้าง conversation ได้แต่ไม่มีการนำทางไปยังหน้าแชท

// แก้ไขที่ 1: useFriendsPageLogic.ts
// ต้องเพิ่ม useNavigate และนำทางไปยังหน้าแชทใน handleCreateBusinessConversation

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // ไม่ comment บรรทัดนี้
import useFriendship from '@/hooks/useFriendship';
import useConversation from '@/hooks/useConversation';
import type { FriendCategory } from '@/pages/standard/friend/FriendsPage';
import type { ConversationDTO } from '@/types/conversation.types';

/**
 * Custom hook สำหรับจัดการ logic ของหน้าเพื่อน
 * แยก business logic ออกจาก UI component ตามหลัก Clean Architecture
 */
export const useFriendsPageLogic = () => {
  // State สำหรับการค้นหาและการแสดงผล
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FriendCategory>('all');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupList, setGroupList] = useState<ConversationDTO[]>([]);
  
  const navigate = useNavigate(); // เพิ่มตัวแปรนี้

  // เรียกใช้ hooks ที่เกี่ยวข้อง
  const { 
    friends, 
    pendingRequests, 
    blockedUsers, 
    loading: friendLoading,
    acceptRequest,
    rejectRequest,
    deleteFriend,
    block,
    unblock,
    sendRequest,
    getFriends,
    getPendingRequests,
    getBlockedUsers,
    isWebSocketConnected
  } = useFriendship();
  
  const {
    conversations,
    createDirect,
    createGroup,
    getConversations,
    loading: conversationLoading
  } = useConversation();

  // รวมสถานะ loading
  const loading = friendLoading || conversationLoading;

  // ดึงข้อมูลเมื่อโหลดหน้า
  useEffect(() => {
    getFriends();
    getPendingRequests();
    getBlockedUsers();
    getConversations();
  }, [getFriends, getPendingRequests, getBlockedUsers, getConversations]);
  
  // Filter group conversations
  useEffect(() => {
    if (conversations) {
      const groups = conversations.filter(conv => conv.type === 'group');
      setGroupList(groups);
    }
  }, [conversations]);
  
  // เปิด modal เพิ่มเพื่อน
  const handleOpenAddFriendModal = useCallback(() => {
    setShowAddFriendModal(true);
  }, []);
  
  // ปิด modal เพิ่มเพื่อน
  const handleCloseAddFriendModal = useCallback(() => {
    setShowAddFriendModal(false);
  }, []);
  
  // เปิด modal สร้างกลุ่ม
  const handleOpenCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(true);
  }, []);
  
  // ปิด modal สร้างกลุ่ม
  const handleCloseCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(false);
  }, []);
  
  // เปลี่ยนแท็บ
  const handleCategoryChange = useCallback((category: FriendCategory) => {
    setActiveCategory(category);
  }, []);
  
  // เพิ่มเพื่อนใหม่
  const handleAddFriend = useCallback(async (friendId: string) => {
    try {
      const success = await sendRequest(friendId);
      return success;
    } catch (error) {
      console.error('Failed to send friend request:', error);
      return false;
    }
  }, [sendRequest]);

  // เริ่มการสนทนากับเพื่อน
  const handleStartConversation = useCallback(async (friendId: string) => {
    try {
      console.log('[handleStartConversation] Starting conversation with friend:', friendId);

      // ตรวจสอบว่าเพื่อนมี conversation_id อยู่แล้วหรือไม่
      const friend = friends?.find(f => f.id === friendId);
      console.log('[handleStartConversation] Friend found:', friend);

      if (friend?.conversation_id) {
        // นำทางไปยังการสนทนาที่มีอยู่แล้ว
        console.log('[handleStartConversation] Existing conversation found, navigating to:', `/chat/${friend.conversation_id}`);

        // ใช้ navigate แบบปกติ (soft navigation)
        navigate(`/chat/${friend.conversation_id}`);
        return friend.conversation_id;
      }

      // ถ้าไม่มี ให้สร้างการสนทนาใหม่
      console.log('[handleStartConversation] Creating new conversation...');
      const conversation = await createDirect(friendId);
      console.log('[handleStartConversation] Conversation created:', conversation);

      if (conversation && conversation.id) {
        // นำทางไปยังการสนทนาที่สร้างใหม่
        console.log('[handleStartConversation] Navigating to new conversation:', `/chat/${conversation.id}`);

        // ใช้ navigate แบบปกติ (soft navigation)
        navigate(`/chat/${conversation.id}`);
        return conversation.id;
      }

      console.error('[handleStartConversation] Failed to create conversation - no ID returned');
      throw new Error('Failed to create conversation');
    } catch (error) {
      console.error('[handleStartConversation] Error:', error);
      throw error;
    }
  }, [friends, createDirect, navigate]);
  
  // สร้างกลุ่มสนทนา
  const handleCreateGroup = useCallback(async (title: string, memberIds: string[], iconUrl?: string) => {
    try {
      const conversation = await createGroup(title, memberIds, iconUrl);
      
      if (conversation && conversation.id) {
        setShowCreateGroupModal(false);
        // นำทางไปยังการสนทนากลุ่มที่สร้างใหม่
        navigate(`/chat/${conversation.id}`);
        return conversation.id;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create group:', error);
      return null;
    }
  }, [createGroup, navigate]);
  
  // ออกจากกลุ่ม
  const handleLeaveGroup = useCallback(async (groupId: string) => {
    // TODO: เพิ่มฟังก์ชันนี้ใน useConversation
    console.log('Leave group:', groupId);
    return true;
  }, []);

  // กรองรายการตามการค้นหา
  const getFilteredFriends = useCallback(() => {
    return friends?.filter(item => 
      (item.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    ) || [];
  }, [friends, searchQuery]);

  const getFilteredGroups = useCallback(() => {
    return groupList.filter(item => 
      (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [groupList, searchQuery]);

  const getFilteredPendingRequests = useCallback(() => {
    return pendingRequests?.filter(item => 
      (item.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    ) || [];
  }, [pendingRequests, searchQuery]);

  const getFilteredBlockedUsers = useCallback(() => {
    return blockedUsers?.filter(item => 
      (item.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    ) || [];
  }, [blockedUsers, searchQuery]);

  // คืนค่าสิ่งที่ component ต้องการใช้
  return {
    // State
    searchQuery,
    setSearchQuery,
    activeCategory,
    showAddFriendModal,
    showCreateGroupModal,
    loading,
    isWebSocketConnected,
    
    // ข้อมูลที่กรองแล้ว
    filteredFriends: getFilteredFriends(),
    filteredGroups: getFilteredGroups(),
    filteredPendingRequests: getFilteredPendingRequests(),
    filteredBlockedUsers: getFilteredBlockedUsers(),
    pendingRequestCount: pendingRequests?.length || 0,

    // Handlers
    handleCategoryChange,
    handleOpenAddFriendModal,
    handleCloseAddFriendModal,
    handleOpenCreateGroupModal,
    handleCloseCreateGroupModal,
    handleAddFriend,
    handleStartConversation,
    handleCreateGroup,
    handleLeaveGroup,
    
    // ส่งต่อ handlers จาก hooks ที่เกี่ยวข้อง
    acceptRequest,
    rejectRequest,
    deleteFriend,
    block,
    unblock
  };
};

export default useFriendsPageLogic;