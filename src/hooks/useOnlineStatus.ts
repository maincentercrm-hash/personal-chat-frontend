// src/hooks/useOnlineStatus.ts - Enhanced with polling fallback and event compatibility
import { useCallback, useEffect, useRef, useState } from 'react';
import useUserStore from '@/stores/userStore';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import type { UserPresence } from '@/types/presence.types';

export const useOnlineStatus = (userIds: string[], pollInterval: number = 30000) => {
  const [isLoading, setIsLoading] = useState(true);
  const { userStatuses, updateUserStatus, fetchUserStatuses } = useUserStore();
  const {
    isConnected,
    addEventListener,
    subscribeToUserStatus,
    unsubscribeFromUserStatus,
  } = useWebSocketContext();

  // ใช้ useRef เพื่อติดตาม userIds ที่ได้ subscribe ไปแล้ว
  const subscribedUserIdsRef = useRef<Set<string>>(new Set());
  // เพิ่ม ref เพื่อติดตาม userIds ก่อนหน้าเพื่อตรวจจับการเปลี่ยนแปลงจริงๆ
  const previousUserIdsRef = useRef<string[]>([]);
  // เพิ่ม ref เพื่อติดตามว่าได้ตั้งค่า event listeners ไปแล้วหรือยัง
  const listenersSetupRef = useRef(false);
  // เพิ่ม ref เพื่อเก็บ timeout id
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 🆕 Ref for polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // ลงทะเบียนรับข้อมูลสถานะผู้ใช้จาก WebSocket - ทำครั้งเดียวเมื่อ mount
  useEffect(() => {
    // ถ้าตั้งค่า listeners ไปแล้ว ให้ข้ามไป
    if (listenersSetupRef.current) return;
    
    //console.log('ตั้งค่า WebSocket event listeners สำหรับสถานะผู้ใช้');
    listenersSetupRef.current = true;
    
    // รับข้อมูลสถานะออนไลน์
    const unsubscribeOnline = addEventListener('message:user.online', (data) => {
      if (data?.data?.user_id) {
        const userId = data.data.user_id;
        const timestamp = data.data.timestamp || new Date().toISOString();
        //console.log(`ผู้ใช้ ${userId} ออนไลน์`);
        updateUserStatus(userId, true, timestamp);
      }
    });
    
    // รับข้อมูลสถานะออฟไลน์
    const unsubscribeOffline = addEventListener('message:user.offline', (data) => {
      if (data?.data?.user_id) {
        const userId = data.data.user_id;
        const timestamp = data.data.timestamp || new Date().toISOString();
        //console.log(`ผู้ใช้ ${userId} ออฟไลน์`);
        updateUserStatus(userId, false, timestamp);
      }
    });
    
    // รับข้อมูลสถานะทั่วไป (old format)
    const unsubscribeStatus = addEventListener('message:user.status', (data) => {
      if (data?.data?.user_id) {
        const userId = data.data.user_id;
        const isOnline = data.data.online === true;
        const timestamp = data.data.timestamp || new Date().toISOString();
        //console.log(`อัปเดตสถานะผู้ใช้ ${userId}: ${isOnline ? 'ออนไลน์' : 'ออฟไลน์'}`);
        updateUserStatus(userId, isOnline, timestamp);
      }
    });

    // 🆕 รับข้อมูลสถานะแบบใหม่ (user_status event from Backend v2)
    const unsubscribeUserStatus = addEventListener('user_status', (data) => {
      if (data?.data?.user_id) {
        const userId = data.data.user_id;
        const status = data.data.status; // 'online' | 'offline' | 'away' | 'busy'
        const isOnline = status === 'online';
        const timestamp = data.data.last_seen || data.data.timestamp || new Date().toISOString();
        //console.log(`[New] อัปเดตสถานะผู้ใช้ ${userId}: ${status}`);
        updateUserStatus(userId, isOnline, timestamp);
      }
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeStatus();
      unsubscribeUserStatus(); // 🆕 Cleanup new event
      listenersSetupRef.current = false;
    };
  }, [addEventListener, updateUserStatus]);

  // ตรวจสอบการเปลี่ยนแปลงของ userIds และทำการ subscribe/unsubscribe ตามความเหมาะสม
  useEffect(() => {
    // แสดงค่า userIds ใหม่ที่ได้รับ
    //console.log(`useOnlineStatus ได้รับ userIds ใหม่: ${userIds.join(', ')}`);
    
    // ถ้า userIds ว่างเปล่า ไม่ต้องทำอะไร
    if (userIds.length === 0) {
      //console.log('ไม่มี userIds, ไม่จำเป็นต้อง subscribe');
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setIsLoading(false);
      return;
    }

    // เริ่มต้นแสดงสถานะโหลด
    setIsLoading(true);
    
    // ถ้า WebSocket ยังไม่เชื่อมต่อ รอก่อน
    if (!isConnected) {
      //console.log('WebSocket ยังไม่เชื่อมต่อ, รอการเชื่อมต่อก่อน');
      return;
    }
    
    // หาความแตกต่างระหว่าง userIds ใหม่และเก่า
    const existingIds = new Set(previousUserIdsRef.current);
    const newIds = userIds.filter(id => !existingIds.has(id));
    const removedIds = previousUserIdsRef.current.filter(id => !userIds.includes(id));
    
    // อัปเดต ref เพื่อเก็บค่า userIds ปัจจุบัน
    previousUserIdsRef.current = [...userIds];
    
    //console.log(`มี ${newIds.length} IDs ใหม่ และ ${removedIds.length} IDs ที่ต้องลบออก`);
    
    // ถ้ามี IDs ที่ต้องลบออก
    if (removedIds.length > 0) {
      //console.log(`ยกเลิกการ subscribe ผู้ใช้: ${removedIds.join(', ')}`);
      removedIds.forEach(userId => {
        unsubscribeFromUserStatus(userId);
        subscribedUserIdsRef.current.delete(userId);
      });
    }
    
    // ถ้ามี IDs ใหม่ที่ต้อง subscribe
    if (newIds.length > 0) {
      //console.log(`ทำการ subscribe ผู้ใช้ใหม่: ${newIds.join(', ')}`);
      newIds.forEach(userId => {
        if (subscribeToUserStatus(userId)) {
          subscribedUserIdsRef.current.add(userId);
        }
      });
    }
    
    // ตั้งเวลาให้หยุดแสดงสถานะโหลดหลังจากระยะเวลาหนึ่ง
    // ถ้ามี timeout ก่อนหน้า ให้ยกเลิกก่อน
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // ตั้ง timeout ใหม่
    loadingTimeoutRef.current = setTimeout(() => {
      //console.log('หยุดแสดงสถานะโหลด');
      setIsLoading(false);
      loadingTimeoutRef.current = null;
    }, 1000);
    
    return () => {
      // ยกเลิก timeout เมื่อ effect ถูกทำความสะอาด
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [userIds, isConnected, subscribeToUserStatus, unsubscribeFromUserStatus]);
  
  // Cleanup เมื่อ component unmount
  useEffect(() => {
    return () => {
      //console.log('ทำความสะอาดการ subscribe สถานะผู้ใช้ทั้งหมดเมื่อ unmount');
      
      // ยกเลิก timeout ถ้ามี
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Unsubscribe ทั้งหมดเมื่อ component unmount
      Array.from(subscribedUserIdsRef.current).forEach(userId => {
        unsubscribeFromUserStatus(userId);
      });
      
      subscribedUserIdsRef.current.clear();
      previousUserIdsRef.current = [];
    };
  }, [unsubscribeFromUserStatus]);
  
  // 🆕 Polling fallback when WebSocket disconnected
  useEffect(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only poll if WebSocket is NOT connected and we have userIds
    if (!isConnected && userIds.length > 0) {
      //console.log('[Polling] WebSocket disconnected, starting polling fallback');

      // Poll immediately
      fetchUserStatuses(userIds);

      // Set up polling interval
      pollingIntervalRef.current = setInterval(() => {
        //console.log('[Polling] Fetching user statuses...');
        fetchUserStatuses(userIds);
      }, pollInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isConnected, userIds, pollInterval, fetchUserStatuses]);

  // ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้ออนไลน์อยู่หรือไม่
  const isUserOnline = useCallback((userId: string): boolean => {
    if (!userId) return false;
    return userStatuses[userId]?.status === 'online';
  }, [userStatuses]);

  // ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้ออฟไลน์อยู่หรือไม่
  const isUserOffline = useCallback((userId: string): boolean => {
    if (!userId) return true;

    const status = userStatuses[userId]?.status;
    return status === 'offline' || !status;
  }, [userStatuses]);

  // 🆕 Get user status with compatibility (supports both last_seen and last_active_at)
  const getUserStatus = useCallback((userId: string): UserPresence | null => {
    const status = userStatuses[userId];
    if (!status) return null;

    return {
      user_id: userId,
      status: status.status || (status.status === 'online' ? 'online' : 'offline'),
      is_online: status.status === 'online',
      last_seen: status.last_active_at || undefined, // Map last_active_at to last_seen
      last_active_at: status.last_active_at || undefined
    };
  }, [userStatuses]);

  return {
    isLoading,
    userStatuses,
    isUserOnline,
    isUserOffline,
    isUserBusy: useCallback((userId: string): boolean => {
      return userStatuses[userId]?.status === 'busy';
    }, [userStatuses]),
    isUserAway: useCallback((userId: string): boolean => {
      return userStatuses[userId]?.status === 'away';
    }, [userStatuses]),
    getLastActiveTime: useCallback((userId: string): Date | null => {
      const lastActiveAt = userStatuses[userId]?.last_active_at;
      return lastActiveAt ? new Date(lastActiveAt) : null;
    }, [userStatuses]),
    getUserStatus, // 🆕 New method
  };
};

export default useOnlineStatus;