// src/hooks/useFriendship.ts
import { useCallback, useEffect, useState } from 'react';
import useFriendshipStore from '@/stores/friendshipStore';
import useUserStore from '@/stores/userStore';
import type {  FriendAcceptNotification, FriendRequestNotification, FriendshipStatus, WebSocketEnvelope } from '@/types/user-friendship.types';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { toast } from '@/utils/toast';


/**
 * Hook สำหรับจัดการความสัมพันธ์ระหว่างผู้ใช้ (เพื่อน, คำขอเป็นเพื่อน, การบล็อก)
 */
export const useFriendship = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // เข้าถึง WebSocket context
  const { addEventListener, isConnected } = useWebSocketContext();

  // เข้าถึง friendship store
  const {
    friends,
    pendingRequests,
    blockedUsers,
    blockedByUsers,
    searchResults,
    friendshipStatusMap,
    fetchFriends,
    fetchPendingRequests,
    fetchBlockedUsers,
    fetchBlockedByUsers,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    getFriendshipStatus,
    setError: setStoreError,
    isBlockedByUser,

    // เพิ่ม function สำหรับการอัพเดทข้อมูลจาก WebSocket
    addNewFriendRequest,
    updateFriendStatus,
    removeFromPendingRequests,
    removeFromSentRequests, // ✅ เพิ่มเพื่อลบออกจากคำขอที่ส่งไป
    addToFriends,
    removeFromFriends,

  } = useFriendshipStore();

  // เข้าถึง user store เพื่อดึงสถานะผู้ใช้
  const fetchUserStatuses = useUserStore(state => state.fetchUserStatuses);

  // ล้างข้อความผิดพลาดใน store เมื่อ component unmount
  useEffect(() => {
    return () => {
      setStoreError(null);
    };
  }, [setStoreError]);


// ลงทะเบียนรับเหตุการณ์ WebSocket เมื่อ hook ถูกเรียกใช้
useEffect(() => {
  if (!isConnected) return;
  
  //console.log('Registering WebSocket event listeners for friendship events');
  
   // รับคำขอเป็นเพื่อนใหม่
   // ✅ Updated: friend.request → friend_request.received
   const unsubFriendRequest = addEventListener('message:friend_request.received', (rawData: WebSocketEnvelope<FriendRequestNotification>) => {
    console.log('🟢 [useFriendship] Friend request received via WebSocket:', rawData);

    const data = rawData.data;

    // ✅ Updated: map from backend format (from, created_at) to store format
    const newRequest = {
            display_name: data.from.display_name,        // ✅ from → sender
            profile_image_url: data.from.profile_image_url,
            request_id: data.request_id,
            requested_at: data.created_at,               // ✅ created_at → requested_at
            user_id: data.from.id,                       // ✅ from.id → user_id
            username: data.from.username
    };

    console.log('🟢 [useFriendship] Adding new request to store:', newRequest);
    addNewFriendRequest(newRequest);
    console.log('🟢 [useFriendship] Request added successfully');
  });
  
  // รับการตอบรับคำขอเป็นเพื่อน
  // ✅ Updated: friend.accept → friend_request.accepted
  const unsubFriendAccept = addEventListener('message:friend_request.accepted', (rawData: WebSocketEnvelope<FriendAcceptNotification>) => {
    console.log('✅ [useFriendship] Friend request accepted via WebSocket:', rawData);

    const data = rawData.data;

    // ✅ Updated: map from backend format (by, request_id) to store format
    // 2. เพิ่มผู้ใช้เข้าไปในรายชื่อเพื่อน
    const newFriend = {
      id: data.by?.id || "",                              // ✅ by → acceptor
      username: data.by?.username || "",
      display_name: data.by?.display_name || "",
      profile_image_url: data.by?.profile_image_url || null,
      friendship_id: data.request_id,                     // ✅ request_id → friendship_id
      friendship_status: 'accepted' as FriendshipStatus,
      last_active_at: data.by?.last_active_at || null,
      status: 'active', // Default value
    };

    console.log('✅ [useFriendship] Adding new friend to store:', newFriend);
    addToFriends(newFriend);
    console.log('✅ [useFriendship] Friend added successfully');

    // ✅ ลบออกจากคำขอที่ส่งไป (เพราะได้รับการตอบรับแล้ว)
    console.log('✅ [useFriendship] Removing from sent requests, request_id:', data.request_id);
    removeFromSentRequests(data.request_id);
  });
  
  // รับการลบเพื่อน
  // ✅ Updated: friend.remove → friend.removed
  const unsubFriendRemove = addEventListener('message:friend.removed', (rawData: any) => {
    console.log('❌ [useFriendship] Friend removed via WebSocket - RAW DATA:', rawData);

    // Backend might send different payload structure, extract the actual data
    const data = rawData.data || rawData;
    console.log('❌ [useFriendship] Extracted data:', data);
    console.log('❌ [useFriendship] Removing friend with user_id:', data.user_id);

    // อัพเดท store - ลบออกจากรายชื่อเพื่อน
    removeFromFriends(data.user_id);

    console.log('❌ [useFriendship] removeFromFriends called successfully');

    // แสดง toast notification
    toast.error('เพื่อนถูกลบ', `${data.display_name || 'ผู้ใช้'} ได้ถูกลบออกจากรายชื่อเพื่อน`);
  });

  // รับการปฏิเสธคำขอเป็นเพื่อน
  // ✅ Updated: friend.reject → friend_request.rejected
  const unsubFriendReject = addEventListener('message:friend_request.rejected', (rawData: any) => {
    console.log('⛔ [useFriendship] Friend request rejected via WebSocket:', rawData);

    // ✅ Extract data from WebSocket envelope
    const data = rawData.data;
    console.log('⛔ [useFriendship] Extracted data:', data);

    // อัพเดท store - ลบออกจาก pending requests (กรณีเราได้รับคำขอและปฏิเสธ)
    if (data.request_id) {
      removeFromPendingRequests(data.request_id);

      // ✅ ลบออกจากคำขอที่ส่งไป (กรณีเราส่งคำขอไปและถูกปฏิเสธ)
      console.log('⛔ [useFriendship] Removing from sent requests, request_id:', data.request_id);
      removeFromSentRequests(data.request_id);
    }

    // แสดง toast notification
    toast.info('คำขอถูกปฏิเสธ', `${data.display_name || 'ผู้ใช้'} ได้ปฏิเสธคำขอเป็นเพื่อน`);
  });

  // รับการบล็อกผู้ใช้
  const unsubUserBlocked = addEventListener('message:user.blocked', async (rawData) => {
    console.log('User blocked via WebSocket:', rawData);

    // ✅ Refetch blocked users เพื่อ update UI
    await fetchBlockedUsers();

    // แสดง toast notification
    toast.warning('บล็อกผู้ใช้สำเร็จ', 'คุณได้บล็อกผู้ใช้นี้แล้ว');
  });

  // รับการปลดบล็อกผู้ใช้
  const unsubUserUnblocked = addEventListener('message:user.unblocked', async (rawData) => {
    console.log('✅ [useFriendship] User unblocked via WebSocket:', rawData);

    // ✅ Refetch blocked users เพื่อ update UI
    await fetchBlockedUsers();

    // แสดง toast notification
    toast.success('ปลดบล็อกสำเร็จ', 'คุณสามารถติดต่อกับผู้ใช้นี้ได้แล้ว');
  });

  // ✅ รับการถูกบล็อกโดยผู้ใช้อื่น (Blocked User Side)
  const unsubUserBlockedBy = addEventListener('message:user.blocked_by', async (rawData) => {
    console.log('[useFriendship] 🔴 Blocked by user via WebSocket:', rawData);

    const data = rawData.data || rawData;
    const blockerUserId = data.blocker_id;

    console.log('[useFriendship] 📥 Before fetchBlockedByUsers, current blockedByUsers:', blockedByUsers);

    // ✅ Refetch blocked-by users เพื่อ update UI
    const updatedList = await fetchBlockedByUsers();

    console.log('[useFriendship] 📥 After fetchBlockedByUsers, updated list:', updatedList);
    console.log('[useFriendship] You were blocked by user:', blockerUserId);

    // แสดง toast notification
    toast.warning('คุณถูกบล็อก', 'คุณถูกผู้ใช้คนหนึ่งบล็อก ไม่สามารถส่งข้อความได้');
  });

  // ✅ รับการถูกปลดบล็อกโดยผู้ใช้อื่น
  const unsubUserUnblockedBy = addEventListener('message:user.unblocked_by', async (rawData) => {
    console.log('🟢 [useFriendship] Unblocked by user via WebSocket:', rawData);

    const data = rawData.data || rawData;
    const unblockerUserId = data.unblocker_id;

    console.log('🟢 [useFriendship] 📥 Before fetchBlockedByUsers, current blockedByUsers:', blockedByUsers);

    // ✅ Refetch blocked-by users เพื่อ update UI
    const updatedList = await fetchBlockedByUsers();

    console.log('🟢 [useFriendship] 📥 After fetchBlockedByUsers, updated list:', updatedList);
    console.log('🟢 [useFriendship] You were unblocked by user:', unblockerUserId);

    // แสดง toast notification
    toast.info('ถูกปลดบล็อก', 'คุณสามารถติดต่อกับผู้ใช้นี้ได้แล้ว');
  });

  // คืนค่า function สำหรับยกเลิกการลงทะเบียน event listeners เมื่อ component unmount
  return () => {
    unsubFriendRequest();
    unsubFriendAccept();
    unsubFriendRemove();
    unsubFriendReject();
    unsubUserBlocked();
    unsubUserUnblocked();
    unsubUserBlockedBy();
    unsubUserUnblockedBy();
  };
}, [
  isConnected,
  addEventListener,
  addNewFriendRequest,
  updateFriendStatus,
  removeFromPendingRequests,
  addToFriends,
  removeFromFriends,
  fetchFriends,
  fetchUserStatuses,
  fetchBlockedUsers,
  fetchBlockedByUsers
]);


  /**
   * ดึงรายชื่อเพื่อนทั้งหมด และอัปเดตสถานะผู้ใช้
   */
  const getFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const friendsList = await fetchFriends();

      // ดึงสถานะผู้ใช้
      if (friendsList.length > 0) {
        const userIds = friendsList.map(friend => friend.id);
        await fetchUserStatuses(userIds);
      }

      return friendsList;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงรายชื่อเพื่อน';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchFriends, fetchUserStatuses]);

  /**
   * ดึงคำขอเป็นเพื่อนที่รอการตอบรับ
   */
  const getPendingRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const requests = await fetchPendingRequests();

      // ดึงสถานะผู้ใช้
      if (requests.length > 0) {
        const userIds = requests.map(request => request.user_id);
        await fetchUserStatuses(userIds);
      }

      return requests;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงคำขอเป็นเพื่อน';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchPendingRequests, fetchUserStatuses]);

  /**
   * ดึงรายชื่อผู้ใช้ที่ถูกบล็อก
   */
  const getBlockedUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const blocked = await fetchBlockedUsers();
      return blocked;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้ที่ถูกบล็อก';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchBlockedUsers]);

  /**
   * ดึงรายชื่อผู้ใช้ที่บล็อกเรา
   */
  const getBlockedByUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const blockedBy = await fetchBlockedByUsers();
      return blockedBy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้ที่บล็อกเรา';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchBlockedByUsers]);

  /**
   * ค้นหาผู้ใช้สำหรับเพิ่มเป็นเพื่อน
   * @param query คำค้นหา
   * @param limit จำนวนผลลัพธ์สูงสุด
   * @param offset ตำแหน่งเริ่มต้นของผลลัพธ์
   * @param exactMatch ถ้าเป็น true จะค้นหาให้ตรงกับทั้งคำเท่านั้น
   */
  const search = useCallback(async (query: string, limit?: number, offset?: number, exactMatch?: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const results = await searchUsers(query, limit, offset, exactMatch);

      // ดึงสถานะผู้ใช้
      if (results.length > 0) {
        const userIds = results.map(user => user.id);
        await fetchUserStatuses(userIds);
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการค้นหาผู้ใช้';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [searchUsers, fetchUserStatuses]);

  /**
   * ส่งคำขอเป็นเพื่อน
   * @param friendId ID ของผู้ใช้ที่ต้องการส่งคำขอเป็นเพื่อน
   */
  const sendRequest = useCallback(async (friendId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await sendFriendRequest(friendId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งคำขอเป็นเพื่อน';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [sendFriendRequest]);

  /**
   * ยอมรับคำขอเป็นเพื่อน
   * @param requestId ID ของคำขอเป็นเพื่อน
   */
  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await acceptFriendRequest(requestId);

      // รีเฟรชรายชื่อเพื่อนหลังจากยอมรับคำขอ
      if (success) {
        await fetchFriends();
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการยอมรับคำขอเป็นเพื่อน';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [acceptFriendRequest, fetchFriends]);

  /**
   * ปฏิเสธคำขอเป็นเพื่อน
   * @param requestId ID ของคำขอเป็นเพื่อน
   */
  const rejectRequest = useCallback(async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await rejectFriendRequest(requestId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการปฏิเสธคำขอเป็นเพื่อน';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [rejectFriendRequest]);

  /**
   * ลบเพื่อน
   * @param friendId ID ของเพื่อนที่ต้องการลบ
   */
  const deleteFriend = useCallback(async (friendId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await removeFriend(friendId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบเพื่อน';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [removeFriend]);

  /**
   * บล็อกผู้ใช้
   * @param userId ID ของผู้ใช้ที่ต้องการบล็อก
   */
  const block = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await blockUser(userId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบล็อกผู้ใช้';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [blockUser]);

  /**
   * เลิกบล็อกผู้ใช้
   * @param userId ID ของผู้ใช้ที่ต้องการเลิกบล็อก
   */
  const unblock = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await unblockUser(userId);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเลิกบล็อกผู้ใช้';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [unblockUser]);

  /**
   * ดึงสถานะความสัมพันธ์กับผู้ใช้
   * @param userId ID ของผู้ใช้
   */
  const getFriendshipStatusWithUser = useCallback((userId: string): FriendshipStatus | null => {
    return getFriendshipStatus(userId);
  }, [getFriendshipStatus]);

  /**
   * ตรวจสอบว่าผู้ใช้เป็นเพื่อนกับผู้ใช้ปัจจุบันหรือไม่
   * @param userId ID ของผู้ใช้
   */
  const isFriend = useCallback((userId: string): boolean => {
    return getFriendshipStatus(userId) === 'accepted';
  }, [getFriendshipStatus]);

  /**
   * ตรวจสอบว่ามีคำขอเป็นเพื่อนที่รอการตอบรับหรือไม่
   * @param userId ID ของผู้ใช้
   */
  const hasPendingRequest = useCallback((userId: string): boolean => {
    return getFriendshipStatus(userId) === 'pending';
  }, [getFriendshipStatus]);

  /**
   * ตรวจสอบว่าผู้ใช้ถูกบล็อกหรือไม่
   * @param userId ID ของผู้ใช้
   */
  const isBlocked = useCallback((userId: string): boolean => {
    return getFriendshipStatus(userId) === 'blocked';
  }, [getFriendshipStatus]);

  /**
   * ดึงรายชื่อเพื่อน, คำขอเป็นเพื่อน, ผู้ใช้ที่ถูกบล็อก และผู้ใช้ที่บล็อกเราทั้งหมดพร้อมกัน
   */
  const loadAllFriendshipData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [friendsList, pendingReqs, blockedList, blockedByList] = await Promise.all([
        fetchFriends(),
        fetchPendingRequests(),
        fetchBlockedUsers(),
        fetchBlockedByUsers()
      ]);

      // ดึงสถานะผู้ใช้
      const allUserIds = [
        ...friendsList.map(friend => friend.id),
        ...pendingReqs.map(request => request.user_id)
      ];

      if (allUserIds.length > 0) {
        await fetchUserStatuses(allUserIds);
      }

      return {
        friends: friendsList,
        pendingRequests: pendingReqs,
        blockedUsers: blockedList,
        blockedByUsers: blockedByList
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลความสัมพันธ์';
      setError(errorMessage);
      return {
        friends: [],
        pendingRequests: [],
        blockedUsers: [],
        blockedByUsers: []
      };
    } finally {
      setLoading(false);
    }
  }, [fetchFriends, fetchPendingRequests, fetchBlockedUsers, fetchBlockedByUsers, fetchUserStatuses]);

  return {
    friends,
    pendingRequests,
    blockedUsers,
    blockedByUsers,
    searchResults,
    friendshipStatusMap,
    loading,
    error,
    getFriends,
    getPendingRequests,
    getBlockedUsers,
    getBlockedByUsers,
    search,
    sendRequest,
    acceptRequest,
    rejectRequest,
    deleteFriend,
    block,
    unblock,
    getFriendshipStatusWithUser,
    isFriend,
    hasPendingRequest,
    isBlocked,
    isBlockedByUser,
    loadAllFriendshipData,
    setError,

    // เพิ่ม property เพื่อให้รู้ว่า WebSocket เชื่อมต่ออยู่หรือไม่
    isWebSocketConnected: isConnected,
  };
};

export default useFriendship;