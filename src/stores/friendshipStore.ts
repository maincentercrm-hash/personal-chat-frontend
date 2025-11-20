// src/stores/friendshipStore.ts
import { create } from 'zustand';
import friendshipService from '@/services/friendshipService';
import type {
  FriendItem,
  FriendSearchResultItem,
  PendingRequestItem,
  BlockedUserItem,
  FriendshipStatus
} from '@/types/user-friendship.types';

interface FriendshipState {
  friends: FriendItem[];
  pendingRequests: PendingRequestItem[];
  blockedUsers: BlockedUserItem[];
  searchResults: FriendSearchResultItem[];
  friendshipStatusMap: Record<string, { status: FriendshipStatus; friendshipId?: string }>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFriends: () => Promise<FriendItem[]>;
  fetchPendingRequests: () => Promise<PendingRequestItem[]>;
  fetchBlockedUsers: () => Promise<BlockedUserItem[]>;
  searchUsers: (query: string, limit?: number, offset?: number, exactMatch?: boolean) => Promise<FriendSearchResultItem[]>;
  sendFriendRequest: (friendId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => Promise<boolean>;
  rejectFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  
  // Helper methods
  getFriendshipStatus: (userId: string) => FriendshipStatus | null;
  updateFriendshipStatus: (userId: string, status: FriendshipStatus, friendshipId?: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearFriendshipStore: () => void;
  removePendingRequest: (requestId: string) => void;

  // WebSocket
  addNewFriendRequest: (request: PendingRequestItem) => void;
  updateFriendStatus: (userId: string, status: FriendshipStatus, friendshipId?: string) => void;
  removeFromPendingRequests: (requestId: string) => void;
  addToFriends: (friend: FriendItem) => void;
  removeFromFriends: (friendId: string) => void;
}

export const useFriendshipStore = create<FriendshipState>()((set, get) => ({
  friends: [],
  pendingRequests: [],
  blockedUsers: [],
  searchResults: [],
  friendshipStatusMap: {},
  isLoading: false,
  error: null,

  /**
   * ดึงรายชื่อเพื่อนทั้งหมด
   */
  fetchFriends: async () => {
    try {
      set({ isLoading: true, error: null });
      const friends = await friendshipService.getFriends();
      
      // อัปเดต friendshipStatusMap
      const statusMap: Record<string, { status: FriendshipStatus; friendshipId?: string }> = { ...get().friendshipStatusMap };
      friends.forEach(friend => {
        statusMap[friend.id] = {
          status: friend.friendship_status,
          friendshipId: friend.friendship_id
        };
      });
      
      set({ friends, friendshipStatusMap: statusMap, isLoading: false });
      return friends;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงรายชื่อเพื่อน';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ดึงคำขอเป็นเพื่อนที่รอการตอบรับ
   */
  fetchPendingRequests: async () => {
    try {
      set({ isLoading: true, error: null });
      const pendingRequests = await friendshipService.getPendingRequests();
      set({ pendingRequests, isLoading: false });
      return pendingRequests;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงคำขอเป็นเพื่อน';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ดึงรายชื่อผู้ใช้ที่ถูกบล็อก
   */
  fetchBlockedUsers: async () => {
    try {
      set({ isLoading: true, error: null });
      const blockedUsers = await friendshipService.getBlockedUsers();
      
      // อัปเดต friendshipStatusMap
      const statusMap: Record<string, { status: FriendshipStatus; friendshipId?: string }> = { ...get().friendshipStatusMap };
      blockedUsers.forEach(user => {
        statusMap[user.id] = { status: 'blocked' };
      });
      
      set({ blockedUsers, friendshipStatusMap: statusMap, isLoading: false });
      return blockedUsers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้ที่ถูกบล็อก';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ค้นหาผู้ใช้สำหรับเพิ่มเป็นเพื่อน
   * @param query คำค้นหา
   * @param limit จำนวนผลลัพธ์สูงสุด
   * @param offset ตำแหน่งเริ่มต้นของผลลัพธ์
   * @param exactMatch ถ้าเป็น true จะค้นหาให้ตรงกับทั้งคำเท่านั้น
   */
  searchUsers: async (query: string, limit?: number, offset?: number, exactMatch?: boolean) => {
    try {
      set({ isLoading: true, error: null });
      const results = await friendshipService.searchUsers(query, limit, offset, exactMatch);
      
      // อัปเดต friendshipStatusMap
      const statusMap: Record<string, { status: FriendshipStatus; friendshipId?: string }> = { ...get().friendshipStatusMap };
      results.forEach(user => {
        statusMap[user.id] = {
          status: user.friendship_status,
          friendshipId: user.friendship_id || undefined
        };
      });
      
      set({ searchResults: results, friendshipStatusMap: statusMap, isLoading: false });
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการค้นหาผู้ใช้';
      set({ error: errorMessage, isLoading: false });
      return [];
    }
  },

  /**
   * ส่งคำขอเป็นเพื่อน
   * @param friendId ID ของผู้ใช้ที่ต้องการส่งคำขอเป็นเพื่อน
   */
  sendFriendRequest: async (friendId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await friendshipService.sendFriendRequest(friendId);
      
      if (response.success) {
        // อัปเดต friendshipStatusMap
        get().updateFriendshipStatus(
          friendId,
          'pending',
          response.data?.id
        );
        
        set({ isLoading: false });
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งคำขอเป็นเพื่อน';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * ยอมรับคำขอเป็นเพื่อน
   * @param requestId ID ของคำขอเป็นเพื่อน
   */
  acceptFriendRequest: async (requestId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await friendshipService.acceptFriendRequest(requestId);
      
      if (response.success) {
        // หาคำขอเป็นเพื่อนจากรายการที่รอการตอบรับ
        const request = get().pendingRequests.find(req => req.request_id === requestId);
        
        if (request) {
          // อัปเดต friendshipStatusMap
          get().updateFriendshipStatus(
            request.user_id,
            'accepted',
            response.data?.id
          );
          
          // ลบคำขอออกจากรายการที่รอการตอบรับ
          get().removePendingRequest(requestId);
          
          // เพิ่มเข้าไปในรายการเพื่อน
          set((state) => ({
            friends: [
              ...state.friends,
              {
                id: request.user_id,
                username: request.username,
                display_name: request.display_name,
                profile_image_url: request.profile_image_url,
                friendship_id: response.data?.id || '',
                friendship_status: 'accepted',
                status: 'online', // Default value, should be updated from user status
              },
            ],
            isLoading: false,
          }));
        } else {
          set({ isLoading: false });
        }
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการยอมรับคำขอเป็นเพื่อน';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * ปฏิเสธคำขอเป็นเพื่อน
   * @param requestId ID ของคำขอเป็นเพื่อน
   */
  rejectFriendRequest: async (requestId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await friendshipService.rejectFriendRequest(requestId);
      
      if (response.success) {
        // หาคำขอเป็นเพื่อนจากรายการที่รอการตอบรับ
        const request = get().pendingRequests.find(req => req.request_id === requestId);
        
        if (request) {
          // อัปเดต friendshipStatusMap
          get().updateFriendshipStatus(
            request.user_id,
            'rejected',
            response.data?.id
          );
          
          // ลบคำขอออกจากรายการที่รอการตอบรับ
          get().removePendingRequest(requestId);
        }
        
        set({ isLoading: false });
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการปฏิเสธคำขอเป็นเพื่อน';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * ลบเพื่อน
   * @param friendId ID ของเพื่อนที่ต้องการลบ
   */
  removeFriend: async (friendId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await friendshipService.removeFriend(friendId);
      
      if (response.success) {
        // อัปเดต friendshipStatusMap
        get().updateFriendshipStatus(friendId, 'none');
        
        // ลบออกจากรายการเพื่อน
        set((state) => ({
          friends: state.friends.filter(friend => friend.id !== friendId),
          isLoading: false,
        }));
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบเพื่อน';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * บล็อกผู้ใช้
   * @param userId ID ของผู้ใช้ที่ต้องการบล็อก
   */
  blockUser: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await friendshipService.blockUser(userId);
      
      if (response.success) {
        // อัปเดต friendshipStatusMap
        get().updateFriendshipStatus(userId, 'blocked');
        
        // ลบออกจากรายการเพื่อน (ถ้ามี)
        set((state) => ({
          friends: state.friends.filter(friend => friend.id !== userId),
          isLoading: false,
        }));
        
        // ดึงข้อมูลผู้ใช้จากผลการค้นหาหรือเพื่อน
        const user = get().searchResults.find(u => u.id === userId) || 
                     get().friends.find(f => f.id === userId);
        
        if (user) {
          // เพิ่มเข้าไปในรายการผู้ใช้ที่ถูกบล็อก
          set((state) => ({
            blockedUsers: [
              ...state.blockedUsers,
              {
                id: userId,
                username: user.username,
                display_name: user.display_name,
                profile_image_url: user.profile_image_url,
              },
            ],
          }));
        }
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบล็อกผู้ใช้';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * เลิกบล็อกผู้ใช้
   * @param userId ID ของผู้ใช้ที่ต้องการเลิกบล็อก
   */
  unblockUser: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await friendshipService.unblockUser(userId);
      
      if (response.success) {
        // อัปเดต friendshipStatusMap
        get().updateFriendshipStatus(userId, 'none');
        
        // ลบออกจากรายการผู้ใช้ที่ถูกบล็อก
        set((state) => ({
          blockedUsers: state.blockedUsers.filter(user => user.id !== userId),
          isLoading: false,
        }));
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเลิกบล็อกผู้ใช้';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  /**
   * ดึงสถานะความสัมพันธ์กับผู้ใช้
   * @param userId ID ของผู้ใช้
   */
  getFriendshipStatus: (userId: string) => {
    const statusInfo = get().friendshipStatusMap[userId];
    return statusInfo ? statusInfo.status : null;
  },

  /**
   * อัปเดตสถานะความสัมพันธ์กับผู้ใช้
   * @param userId ID ของผู้ใช้
   * @param status สถานะความสัมพันธ์
   * @param friendshipId ID ของความสัมพันธ์ (ถ้ามี)
   */
  updateFriendshipStatus: (userId: string, status: FriendshipStatus, friendshipId?: string) => {
    set((state) => ({
      friendshipStatusMap: {
        ...state.friendshipStatusMap,
        [userId]: { status, friendshipId },
      },
    }));
  },

  /**
   * ลบคำขอเป็นเพื่อนออกจากรายการที่รอการตอบรับ
   * @param requestId ID ของคำขอเป็นเพื่อน
   */
  removePendingRequest: (requestId: string) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(req => req.request_id !== requestId),
    }));
  },

  /**
   * ตั้งค่าสถานะการโหลด
   * @param isLoading สถานะการโหลด
   */
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  /**
   * ตั้งค่าข้อความผิดพลาด
   * @param error ข้อความผิดพลาด
   */
  setError: (error: string | null) => {
    set({ error });
  },



  // เพิ่มคำขอเป็นเพื่อนใหม่
  addNewFriendRequest: (request: PendingRequestItem) => {
    set((state) => {
      // ✅ ตรวจสอบว่ามี request นี้อยู่แล้วหรือไม่ (ตาม request_id หรือ user_id)
      const isDuplicate = state.pendingRequests.some(
        req => req.request_id === request.request_id || req.user_id === request.user_id
      );

      if (isDuplicate) {
        console.log('[addNewFriendRequest] Duplicate request detected, skipping:', request);
        return state; // ไม่เปลี่ยนแปลง state
      }

      return {
        pendingRequests: [request, ...(state.pendingRequests || [])]
      };
    });
  },

// อัพเดทสถานะความสัมพันธ์
updateFriendStatus: (userId: string, status: FriendshipStatus, friendshipId?: string) => {
  set((state) => ({
    friendshipStatusMap: {
      ...state.friendshipStatusMap,
      [userId]: { status, friendshipId }
    }
  }));
},

// ลบออกจากรายการคำขอเป็นเพื่อน
removeFromPendingRequests: (requestId: string) => {
  set((state) => ({
    pendingRequests: state.pendingRequests.filter(req => req.request_id !== requestId)
  }));
},

// เพิ่มเข้าไปในรายชื่อเพื่อน
addToFriends: (friend: FriendItem) => {
  set((state) => {
    // ตรวจสอบว่ามีเพื่อนในรายการอยู่แล้วหรือไม่
    const exists = state.friends.some(f => f.id === friend.id);
    if (exists) {
      return state; // ไม่เปลี่ยนแปลงถ้ามีอยู่แล้ว
    }
    return {
      friends: [friend, ...state.friends]
    };
  });
},

// ลบออกจากรายชื่อเพื่อน
removeFromFriends: (friendId: string) => {
  set((state) => ({
    friends: state.friends.filter(friend => friend.id !== friendId)
  }));
},

  /**
   * ล้างข้อมูลทั้งหมดใน store
   */
  clearFriendshipStore: () => {
    set({
      friends: [],
      pendingRequests: [],
      blockedUsers: [],
      searchResults: [],
      friendshipStatusMap: {},
      isLoading: false,
      error: null,
    });
  },
}));

export default useFriendshipStore;