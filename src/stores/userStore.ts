// src/stores/userStore.ts
import { create } from 'zustand';
import userService from '@/services/userService';
import type { 
  UserData, 
  PublicUserData, 
  UpdateProfileRequest,
  UserStatusItem,
  SearchUserItem
} from '@/types/user.types';

interface UserState {
  currentUser: UserData | null;
  userProfiles: Record<string, PublicUserData>; // Cache of user profiles by ID
  userStatuses: Record<string, UserStatusItem>; // Cache of user statuses by ID
  searchResults: SearchUserItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCurrentUser: () => Promise<UserData | null>;
  fetchUserProfile: (userId: string) => Promise<PublicUserData | null>;
  updateProfile: (userId: string, data: UpdateProfileRequest) => Promise<UserData | null>;
  uploadProfileImage: (userId: string, file: File, onProgress?: (percentage: number) => void) => Promise<string | null>;
  searchUsers: (query: string, limit?: number, offset?: number, exactMatch?: boolean) => Promise<SearchUserItem[]>;
  fetchUserStatuses: (userIds: string[]) => Promise<Record<string, UserStatusItem>>;
  
// เพิ่มฟังก์ชันใหม่เพื่ออัปเดตสถานะโดยตรงจาก WebSocket
updateUserStatus: (userId: string, isOnline: boolean, timestamp?: string) => void;

  // Helper methods
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUser: (user: UserData | null) => void;
  clearUserStore: () => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
  currentUser: null,
  userProfiles: {},
  userStatuses: {},
  searchResults: [],
  isLoading: false,
  error: null,

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน
   */
  fetchCurrentUser: async () => {
    try {
      set({ isLoading: true, error: null });
      const userData = await userService.getCurrentUser();
      set({ currentUser: userData, isLoading: false });
      return userData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  /**
   * ดึงข้อมูลโปรไฟล์ผู้ใช้ตาม ID
   * @param userId ID ของผู้ใช้
   */
  fetchUserProfile: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // ตรวจสอบว่ามีข้อมูลในแคชหรือไม่
      const cachedProfile = get().userProfiles[userId];
      if (cachedProfile) {
        set({ isLoading: false });
        return cachedProfile;
      }
      
      const profile = await userService.getProfile(userId) as PublicUserData;
      
      // อัปเดตแคช
      set((state) => ({
        userProfiles: { ...state.userProfiles, [userId]: profile },
        isLoading: false,
      }));
      
      return profile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  /**
   * อัปเดตข้อมูลโปรไฟล์ผู้ใช้
   * @param userId ID ของผู้ใช้
   * @param data ข้อมูลที่ต้องการอัปเดต
   */
  updateProfile: async (userId: string, data: UpdateProfileRequest) => {
    try {
      set({ isLoading: true, error: null });
      const updatedUser = await userService.updateProfile(userId, data);
      
      // อัปเดตข้อมูลผู้ใช้ปัจจุบันถ้าเป็นการอัปเดตตัวเอง
      if (get().currentUser?.id === userId) {
        set({ currentUser: updatedUser });
      }
      
      // อัปเดตแคช
      set((state) => ({
        userProfiles: { ...state.userProfiles, [userId]: updatedUser },
        isLoading: false,
      }));
      
      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  /**
   * อัปโหลดรูปโปรไฟล์
   * @param userId ID ของผู้ใช้
   * @param file ไฟล์รูปภาพ
   * @param onProgress callback สำหรับติดตามความคืบหน้า
   */
  uploadProfileImage: async (userId: string, file: File, onProgress?: (percentage: number) => void) => {
    try {
      set({ isLoading: true, error: null });
      
      const formData = new FormData();
      formData.append('profile_image', file);
      
      const response = await userService.uploadProfileImage(userId, formData, onProgress);
      
      if (response.success) {
        const imageUrl = response.data.profile_image_url;
        
        // อัปเดตข้อมูลผู้ใช้ปัจจุบันถ้าเป็นการอัปโหลดรูปตัวเอง
        if (get().currentUser?.id === userId) {
          set((state) => ({
            currentUser: state.currentUser ? { ...state.currentUser, profile_image_url: imageUrl } : null,
          }));
        }
        
        // อัปเดตแคช
        set((state) => {
          const profile = state.userProfiles[userId];
          if (profile) {
            return {
              userProfiles: {
                ...state.userProfiles,
                [userId]: { ...profile, profile_image_url: imageUrl },
              },
              isLoading: false,
            };
          }
          return { isLoading: false };
        });
        
        return imageUrl;
      }
      
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์';
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  /**
   * ค้นหาผู้ใช้
   * @param query คำค้นหา
   * @param limit จำนวนผลลัพธ์สูงสุด
   * @param offset ตำแหน่งเริ่มต้นของผลลัพธ์
   * @param exactMatch ถ้าเป็น true จะค้นหาให้ตรงกับทั้งคำเท่านั้น
   */
  searchUsers: async (query: string, limit?: number, offset?: number, exactMatch?: boolean) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await userService.searchUsers(query, limit, offset, exactMatch);
      
      if (response.success) {
        set({ searchResults: response.data.users, isLoading: false });
        return response.data.users;
      }
      
      set({ isLoading: false });
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการค้นหาผู้ใช้';
      set({ error: errorMessage, isLoading: false, searchResults: [] });
      return [];
    }
  },

  /**
   * ดึงสถานะของผู้ใช้หลายคน
   * @param userIds รายการ ID ของผู้ใช้
   */
  fetchUserStatuses: async (userIds: string[]) => {
    try {
      // กรองเฉพาะ ID ที่ยังไม่มีในแคชหรือต้องการรีเฟรช
      const uniqueIds = [...new Set(userIds)];
      
      //console.log(`Fetching user statuses for: ${uniqueIds.join(', ')}`);
      
      if (uniqueIds.length === 0) {
        //console.log('No user IDs to fetch statuses for');
        return get().userStatuses;
      }
      
      const statuses = await userService.getUserStatuses(uniqueIds);
      //console.log('Received user statuses from API:', statuses);

      // ✅ รองรับทั้ง Array และ Object format
      let statusMap: Record<string, UserStatusItem> = {};

      if (Array.isArray(statuses)) {
        // Format: Array of objects
        statuses.forEach(status => {
          statusMap[status.user_id] = status;
        });
      } else if (statuses && typeof statuses === 'object') {
        // Format: Object with user_id as keys
        // แปลงจาก { "userId": {status...} } เป็น Record<string, UserStatusItem>
        statusMap = Object.entries(statuses).reduce((acc, [userId, statusData]) => {
          // Ensure statusData has user_id field
          const statusItem = statusData as any;
          acc[userId] = {
            user_id: userId,
            status: statusItem.status || statusItem.online_status || 'offline',
            last_active_at: statusItem.last_active_at || statusItem.last_seen || new Date().toISOString()
          };
          return acc;
        }, {} as Record<string, UserStatusItem>);
      } else {
        console.error('[userStore] getUserStatuses returned invalid format:', statuses);
        return get().userStatuses;
      }
      
      set((state) => {
        const newState = {
          userStatuses: { ...state.userStatuses, ...statusMap },
        };
        //console.log('Updated user statuses in store:', newState.userStatuses);
        return newState;
      });
      
      return { ...get().userStatuses };
    } catch (error) {
      console.error('Error fetching user statuses:', error);
      return get().userStatuses;
    }
  },


   /**
   * อัปเดตสถานะผู้ใช้โดยตรงจาก WebSocket
   * @param userId ID ของผู้ใช้
   * @param isOnline สถานะออนไลน์
   * @param timestamp เวลาล่าสุด (optional)
   */
  updateUserStatus: (userId: string, isOnline: boolean, timestamp?: string) => {
    set((state) => ({
      userStatuses: {
        ...state.userStatuses,
        [userId]: {
          user_id: userId,
          status: isOnline ? 'online' : 'offline',
          last_active_at: timestamp || new Date().toISOString()
        }
      }
    }));
    //console.log(`Updated user ${userId} status directly: ${isOnline ? 'online' : 'offline'}`);
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

  /**
   * ตั้งค่าข้อมูลผู้ใช้ปัจจุบัน
   * @param user ข้อมูลผู้ใช้
   */
  setCurrentUser: (user: UserData | null) => {
    set({ currentUser: user });
  },

  /**
   * ล้างข้อมูลทั้งหมดใน store
   */
  clearUserStore: () => {
    set({
      currentUser: null,
      userProfiles: {},
      userStatuses: {},
      searchResults: [],
      isLoading: false,
      error: null,
    });
  },
}));

export default useUserStore;