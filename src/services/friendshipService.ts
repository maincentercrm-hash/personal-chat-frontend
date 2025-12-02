// src/services/friendshipService.ts
import apiService from './apiService';
import { FRIENDSHIP_API } from '@/constants/api/standardApiConstants';
import type {
  FriendsListResponse,
  FriendSearchResponse,
  SendFriendRequestResponse,
  PendingRequestsResponse,
  AcceptFriendRequestResponse,
  RejectFriendRequestResponse,
  RemoveFriendResponse,
  BlockUserResponse,
  UnblockUserResponse,
  BlockedUsersResponse,
  FriendItem,
  FriendSearchResultItem,
  PendingRequestItem,
  BlockedUserItem,
  SendFriendRequestParam,
  FriendRequestParam,
  BlockUserParam,
  SearchUsersRequest,
} from '@/types/user-friendship.types';

/**
 * Service สำหรับจัดการความสัมพันธ์ระหว่างผู้ใช้ (เพื่อน, การบล็อก, คำขอเป็นเพื่อน)
 */
const friendshipService = {
  /**
   * ดึงรายชื่อเพื่อนทั้งหมด
   * @returns รายชื่อเพื่อน
   */
  getFriends: async (): Promise<FriendItem[]> => {
    const response = await apiService.get<FriendsListResponse>(FRIENDSHIP_API.GET_FRIENDS);
    return response.data;
  },

  /**
   * ค้นหาผู้ใช้สำหรับเพิ่มเป็นเพื่อน
   * @param query - คำค้นหา
   * @param limit - จำนวนผลลัพธ์สูงสุด
   * @param offset - ตำแหน่งเริ่มต้นของผลลัพธ์
   * @param exactMatch - ถ้าเป็น true จะค้นหาให้ตรงกับทั้งคำเท่านั้น
   * @returns ผลการค้นหาผู้ใช้
   */
  searchUsers: async (query: string, limit?: number, offset?: number, exactMatch?: boolean): Promise<FriendSearchResultItem[]> => {
    const params: SearchUsersRequest = { q: query };
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    if (exactMatch) params.exact_match = exactMatch;
    
    const response = await apiService.get<FriendSearchResponse>(FRIENDSHIP_API.SEARCH_USERS, params);
    return response.data;
  },

  /**
   * ดึงคำขอเป็นเพื่อนที่รอการตอบรับ
   * @returns รายการคำขอเป็นเพื่อนที่รอการตอบรับ
   */
  getPendingRequests: async (): Promise<PendingRequestItem[]> => {
    const response = await apiService.get<PendingRequestsResponse>(FRIENDSHIP_API.GET_PENDING_REQUESTS);
    return response.data;
  },

  /**
   * ดึงรายชื่อผู้ใช้ที่ถูกบล็อก
   * @returns รายชื่อผู้ใช้ที่ถูกบล็อก
   */
  getBlockedUsers: async (): Promise<BlockedUserItem[]> => {
    const response = await apiService.get<BlockedUsersResponse>(FRIENDSHIP_API.GET_BLOCKED_USERS);
    return response.data;
  },

  /**
   * ดึงรายชื่อผู้ใช้ที่บล็อกเรา
   * @returns รายชื่อผู้ใช้ที่บล็อกเรา
   */
  getBlockedByUsers: async (): Promise<BlockedUserItem[]> => {
    console.log('🟡 [friendshipService] getBlockedByUsers: Making API call to:', FRIENDSHIP_API.GET_BLOCKED_BY_USERS);
    const response = await apiService.get<BlockedUsersResponse>(FRIENDSHIP_API.GET_BLOCKED_BY_USERS);
    console.log('🟡 [friendshipService] getBlockedByUsers: API response:', response);
    return response.data;
  },

  /**
   * ดึงรายชื่อคำขอเป็นเพื่อนที่เราส่งไป (Sent Requests)
   * @returns รายชื่อคำขอที่ส่งไป
   */
  getSentRequests: async (): Promise<PendingRequestItem[]> => {
    const response = await apiService.get<PendingRequestsResponse>(FRIENDSHIP_API.GET_SENT_REQUESTS);
    return response.data;
  },

  /**
   * ยกเลิกคำขอเป็นเพื่อนที่ส่งไป
   * @param requestId - ID ของคำขอที่ต้องการยกเลิก
   * @returns ผลลัพธ์การยกเลิก
   */
  cancelFriendRequest: async (requestId: string): Promise<RemoveFriendResponse> => {
    return await apiService.delete<RemoveFriendResponse>(FRIENDSHIP_API.CANCEL_FRIEND_REQUEST(requestId));
  },

  /**
   * ส่งคำขอเป็นเพื่อน
   * @param friendId - ID ของผู้ใช้ที่ต้องการส่งคำขอเป็นเพื่อน
   * @returns ข้อมูลคำขอเป็นเพื่อน
   */
  sendFriendRequest: async (friendId: string): Promise<SendFriendRequestResponse> => {
    const data: SendFriendRequestParam = { friend_id: friendId };
    return await apiService.post<SendFriendRequestResponse>(
      FRIENDSHIP_API.SEND_FRIEND_REQUEST(friendId),
      data
    );
  },

  /**
   * ยอมรับคำขอเป็นเพื่อน
   * @param requestId - ID ของคำขอเป็นเพื่อน
   * @returns ข้อมูลความสัมพันธ์
   */
  acceptFriendRequest: async (requestId: string): Promise<AcceptFriendRequestResponse> => {
    const data: FriendRequestParam = { request_id: requestId };
    return await apiService.put<AcceptFriendRequestResponse>(
      FRIENDSHIP_API.ACCEPT_FRIEND_REQUEST(requestId),
      data
    );
  },

  /**
   * ปฏิเสธคำขอเป็นเพื่อน
   * @param requestId - ID ของคำขอเป็นเพื่อน
   * @returns ข้อมูลความสัมพันธ์
   */
  rejectFriendRequest: async (requestId: string): Promise<RejectFriendRequestResponse> => {
    const data: FriendRequestParam = { request_id: requestId };
    return await apiService.put<RejectFriendRequestResponse>(  // ✅ แก้จาก POST เป็น PUT
      FRIENDSHIP_API.REJECT_FRIEND_REQUEST(requestId),
      data
    );
  },

  /**
   * ลบเพื่อน
   * @param friendId - ID ของเพื่อนที่ต้องการลบ
   * @returns ผลลัพธ์การลบเพื่อน
   */
  removeFriend: async (friendId: string): Promise<RemoveFriendResponse> => {
    return await apiService.delete<RemoveFriendResponse>(FRIENDSHIP_API.REMOVE_FRIEND(friendId));
  },

  /**
   * บล็อกผู้ใช้
   * @param userId - ID ของผู้ใช้ที่ต้องการบล็อก
   * @returns ผลลัพธ์การบล็อกผู้ใช้
   */
  blockUser: async (userId: string): Promise<BlockUserResponse> => {
    const data: BlockUserParam = { user_id: userId };
    return await apiService.post<BlockUserResponse>(FRIENDSHIP_API.BLOCK_USER(userId), data);
  },

  /**
   * เลิกบล็อกผู้ใช้
   * @param userId - ID ของผู้ใช้ที่ต้องการเลิกบล็อก
   * @returns ผลลัพธ์การเลิกบล็อกผู้ใช้
   */
  unblockUser: async (userId: string): Promise<UnblockUserResponse> => {
    return await apiService.delete<UnblockUserResponse>(FRIENDSHIP_API.UNBLOCK_USER(userId));
  },
};

export default friendshipService;