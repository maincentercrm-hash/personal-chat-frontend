// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import WebSocketManager from '@/services/websocket/WebSocketManager';
import type { WebSocketEventMap, ReconnectingData } from '@/types/websocket.types';
import { toast } from '@/utils/toast';
import { wsLogger } from '@/utils/logger';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  businessId?: string;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, businessId } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  // ดึง token จาก auth store
  const { accessToken } = useAuthStore();
  
  // เพิ่ม refs เพื่อจัดการกับ race conditions และ stale closures
  const hasRegisteredListeners = useRef(false);
  const isConnectedRef = useRef(isConnected);
  const isConnectingRef = useRef(isConnecting);
  
  // อัพเดท refs เมื่อ state เปลี่ยน
  useEffect(() => {
    isConnectedRef.current = isConnected;
    isConnectingRef.current = isConnecting;
  }, [isConnected, isConnecting]);

  // แยกการลงทะเบียน event listeners ออกมาเป็นฟังก์ชันแยก
  const registerEventListeners = useCallback(() => {
    if (hasRegisteredListeners.current) {
      //console.log('[useWebSocket] Event listeners already registered');
      return () => {};
    }
    
    //console.log('[useWebSocket] Registering event listeners');
    
    const handleOpen = () => {
      wsLogger.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      setReconnectAttempt(0);

      // อัพเดท refs ทันที
      isConnectedRef.current = true;
      isConnectingRef.current = false;

      // แสดง toast เมื่อเชื่อมต่อสำเร็จ (หลังจาก disconnect)
      if (reconnectAttempt > 0) {
        toast.success('เชื่อมต่อสำเร็จ');
      }
    };

    const handleClose = (event: CloseEvent) => {
      console.log('🔴 [useWebSocket] WebSocket disconnected:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      wsLogger.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      setIsConnected(false);

      // อัพเดท ref ทันที
      isConnectedRef.current = false;

      // แสดง toast เฉพาะเมื่อเป็นการขาดการเชื่อมต่อที่ไม่คาดหวัง
      // Code 1000 = Normal closure (ปิดปกติ เช่น page navigation)
      // Code 1001 = Going away (กำลังออกจากหน้า)
      // ไม่แสดง toast สำหรับการปิดปกติเหล่านี้
      const isNormalClosure = event.code === 1000 || event.code === 1001;

      console.log('🔴 [useWebSocket] isNormalClosure:', isNormalClosure);

      if (!isNormalClosure) {
        console.log('🔴 [useWebSocket] Showing disconnect toast');
        toast.warning('การเชื่อมต่อขาดหาย', 'กำลังพยายามเชื่อมต่อใหม่...');
      } else {
        console.log('✅ [useWebSocket] Normal closure - NOT showing toast');
      }
    };

    const handleReconnecting = (data: ReconnectingData) => {
      wsLogger.log('Reconnecting...', data);
      setIsConnecting(true);
      setReconnectAttempt(data.attempt);

      // อัพเดท ref ทันที
      isConnectingRef.current = true;
    };

    const handleReconnectFailed = () => {
      wsLogger.error('Reconnect failed');
      setIsConnecting(false);

      // อัพเดท ref ทันที
      isConnectingRef.current = false;

      // แสดง toast เมื่อ reconnect ล้มเหลว
      toast.error('ไม่สามารถเชื่อมต่อได้', 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    };

    // Register event listeners
    const unsubscribeOpen = WebSocketManager.on('ws:open', handleOpen);
    const unsubscribeClose = WebSocketManager.on('ws:close', handleClose);
    const unsubscribeReconnecting = WebSocketManager.on('ws:reconnecting', handleReconnecting);
    const unsubscribeReconnectFailed = WebSocketManager.on('ws:reconnect_failed', handleReconnectFailed);
    
    hasRegisteredListeners.current = true;
    //console.log('[useWebSocket] Event listeners registered successfully');
    
    // Cleanup function
    return () => {
      //console.log('[useWebSocket] Cleaning up event listeners');
      unsubscribeOpen();
      unsubscribeClose();
      unsubscribeReconnecting();
      unsubscribeReconnectFailed();
      hasRegisteredListeners.current = false;
    };
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('🔵 [useWebSocket] useEffect for initialization called');

    // ตรวจสอบว่ามี token หรือไม่
    if (!accessToken) {
      console.error('[useWebSocket] Cannot initialize: No authentication token available');
      return () => {};
    }

    // ✅ ป้องกันการ initialize ซ้ำ ถ้า WebSocket เชื่อมต่ออยู่แล้ว
    const alreadyConnected = WebSocketManager.isConnected();
    console.log('🔵 [useWebSocket] Checking if already connected:', alreadyConnected);

    if (alreadyConnected) {
      console.log('✅ [useWebSocket] Already connected - skipping initialization');
      // แค่อัพเดท state ให้ตรงกับ WebSocketManager
      setIsConnected(true);
      setIsConnecting(false);
      isConnectedRef.current = true;
      isConnectingRef.current = false;

      // ลงทะเบียน listeners ถ้ายังไม่ได้ลงทะเบียน
      const unregisterListeners = registerEventListeners();
      return () => {
        console.log('🔵 [useWebSocket] Cleanup called (was already connected)');
        unregisterListeners();
      };
    }

    console.log('🔵 [useWebSocket] Initializing with token and businessId:', businessId || 'none');

    try {
      // Initialize WebSocketManager
      WebSocketManager.initialize(accessToken, businessId);

      // ลงทะเบียน event listeners
      const unregisterListeners = registerEventListeners();

      // ตรวจสอบสถานะการเชื่อมต่อปัจจุบัน
      const currentlyConnected = WebSocketManager.isConnected();
      console.log('🔵 [useWebSocket] Current connection status after init:', currentlyConnected);

      if (currentlyConnected) {
        console.log('✅ [useWebSocket] WebSocket connected after init, updating state');
        setIsConnected(true);
        setIsConnecting(false);
        isConnectedRef.current = true;
        isConnectingRef.current = false;
      } else if (autoConnect) {
        console.log('🔵 [useWebSocket] Auto-connecting WebSocket...');
        setIsConnecting(true);
        isConnectingRef.current = true;
        WebSocketManager.connect();
      }

      // Cleanup function
      return () => {
        console.log('🔵 [useWebSocket] Cleanup called');
        unregisterListeners();
      };
    } catch (error) {
      console.error('[useWebSocket] Failed to initialize:', error);
      return () => {};
    }
  }, [accessToken, businessId, autoConnect]); // ✅ เอา registerEventListeners ออกจาก deps

  // Connect manually
  const connect = useCallback(() => {
    console.log('[useWebSocket] Manual connect called, current states:', { 
      isConnected: isConnectedRef.current, 
      isConnecting: isConnectingRef.current 
    });
    
    if (!isConnectedRef.current && !isConnectingRef.current) {
      setIsConnecting(true);
      isConnectingRef.current = true;
      WebSocketManager.connect();
    }
  }, []);

  // Disconnect manually
  const disconnect = useCallback(() => {
    //console.log('[useWebSocket] Manual disconnect called, current isConnected:', isConnectedRef.current);
    
    if (isConnectedRef.current) {
      WebSocketManager.disconnect();
    }
  }, []);

  // Add event listener
  const addEventListener = useCallback(<K extends keyof WebSocketEventMap>(
    event: K, 
    callback: (data: WebSocketEventMap[K]) => void
  ) => {
    return WebSocketManager.on(event, callback as (data: unknown) => void);
  }, []);

  // Send message
  const send = useCallback(<T>(type: string, data: T) => {
    return WebSocketManager.send(type, data);
  }, []);

  // เพิ่ม effect เพื่อ log สถานะเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    //console.log('[useWebSocket] State updated:', { isConnected, isConnecting, reconnectAttempt });
    
    // ตรวจสอบสถานะ WebSocket โดยตรงเพื่อเปรียบเทียบ
    const managerConnected = WebSocketManager.isConnected();
    if (managerConnected !== isConnected) {
      console.warn('[useWebSocket] State mismatch! WebSocketManager.isConnected():', managerConnected, 'vs state.isConnected:', isConnected);
      
      // อัพเดทสถานะให้ตรงกัน
      if (managerConnected) {
        //console.log('[useWebSocket] Correcting state to connected');
        setIsConnected(true);
        isConnectedRef.current = true;
      }
    }
  }, [isConnected, isConnecting, reconnectAttempt]);
  
  return {
    isConnected,
    isConnecting,
    reconnectAttempt,
    connect,
    disconnect,
    addEventListener,
    send
  };
};

export default useWebSocket;