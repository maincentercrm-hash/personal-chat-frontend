// src/services/websocket/WebSocketManager.ts
import { WebSocketConnection } from '@/services/websocket/WebSocketConnection';
import eventEmitter from '@/services/websocket/WebSocketEventEmitter';
import { logger } from '@/services/websocket/utils/logger';
import type { WebSocketEventMap } from '@/types/websocket.types';

class WebSocketManager {
  private connection: WebSocketConnection | null = null;
  private isInitialized = false;
  private businessId: string | null = null;
  private refreshDetected = false;
  private connectionRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null; // เก็บ token ปัจจุบัน

  // เก็บรายการ userIds ที่ subscribe แล้ว
  private userStatusSubscriptions: Set<string> = new Set();

  constructor() {
    // ตรวจสอบว่าเป็นการ refresh หรือไม่
    this.setupPageRefreshHandler();
  }
  
  /**
   * ตรวจจับ Page Refresh
   */
  private setupPageRefreshHandler(): void {
    if (typeof window !== 'undefined') {
      try {
        // บันทึกเวลาโหลดหน้า
        const pageLoadTime = Date.now();
        const lastRefreshTime = parseInt(localStorage.getItem('ws_last_refresh_time') || '0');
        
        // ถ้าหน้าถูกโหลดภายใน 2 วินาทีหลังจากบันทึกเวลา refresh ล่าสุด ถือว่าเป็นการ refresh
        if (lastRefreshTime > 0 && pageLoadTime - lastRefreshTime < 2000) {
          //console.log('[WebSocketManager] Page was refreshed, will add delay before reconnect');
          this.refreshDetected = true;
        }
        
        // บันทึก event ก่อนออกจากหน้า
        window.addEventListener('beforeunload', () => {
          localStorage.setItem('ws_last_refresh_time', Date.now().toString());
        });
      } catch (e) {
        console.warn('[WebSocketManager] Could not access localStorage', e);
      }
    }
  }

  /**
   * เริ่มต้นการใช้งาน WebSocket
   */
  public initialize(token: string, businessId?: string): void {
    //console.log(`[WebSocketManager] Initializing with token and businessId:`, businessId || 'none');

    // ตรวจสอบ token validity
    if (!token || token === '{{accessToken}}' || token.includes('{{')) {
      console.error('[WebSocketManager] Invalid token format:', token.substring(0, 5) + '...');
      return;
    }

    // ถ้า initialized แล้วและ parameters เหมือนเดิม ไม่ต้องทำอะไร
    if (this.isInitialized && this.connection) {
      // ตรวจสอบว่า token และ businessId เหมือนเดิมหรือไม่
      const sameToken = this.currentToken === token;
      const sameBusinessId = this.businessId === businessId;

      if (sameToken && sameBusinessId) {
        //console.log('[WebSocketManager] Already initialized with same parameters, skipping');

        // ถ้าเชื่อมต่ออยู่แล้ว ไม่ต้องทำอะไร
        if (this.connection.isConnected()) {
          return;
        }

        // ถ้ายังไม่เชื่อมต่อ ให้เชื่อมต่อใหม่
        //console.log('[WebSocketManager] Connection not active, reconnecting');
        this.connect();
        return;
      }

      // ถ้า parameters เปลี่ยน ให้ disconnect และสร้างใหม่
      //console.log('[WebSocketManager] Parameters changed, recreating connection');
      this.disconnect();
      this.isInitialized = false;
    }

    // บันทึก token และ businessId ปัจจุบัน
    this.currentToken = token;
    this.businessId = businessId || null;

    this.connection = new WebSocketConnection(token, businessId);
    this.isInitialized = true;
    //console.log('[WebSocketManager] Initialized successfully');
    
    // ถ้าตรวจพบว่ามีการ refresh หน้า รอสักครู่ก่อนเชื่อมต่อ
    if (this.refreshDetected) {
      //console.log('[WebSocketManager] Delaying connection due to page refresh');
      this.connectionRetryTimer = setTimeout(() => {
        //console.log('[WebSocketManager] Connecting after refresh delay');
        this.connect();
        this.refreshDetected = false;
      }, 1000); // รอ 1 วินาทีหลังจาก refresh
    } else {
      // เชื่อมต่อทันที
      this.connect();
    }
    
    // จัดการ beforeunload event
    this.setupBeforeUnloadHandler();
  }
  
  /**
   * จัดการ beforeunload event
   */
  private setupBeforeUnloadHandler(): void {
    // ลบตัวจัดการเดิมก่อน (ถ้ามี)
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // เพิ่มตัวจัดการใหม่
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * ฟังก์ชัน handler สำหรับ beforeunload event
   */
  private handleBeforeUnload = (): void => {
    // Unsubscribe ทั้งหมดก่อนปิดหน้า
    this.unsubscribeAllUserStatuses();
    
    // ปิดการเชื่อมต่อ WebSocket อย่างสมบูรณ์
    if (this.connection?.isConnected()) {
      try {
        // ส่ง close frame แบบปกติ
        this.connection.disconnect();
      } catch (error) {
        logger.error('[WebSocketManager] Error during cleanup on page unload', error);
      }
    }
  };
  
  /**
   * Subscribe ทั้งหมดใหม่หลังจากสร้าง connection ใหม่
   */
  public resubscribeAll(): void {
    //console.log('[WebSocketManager] Attempting to resubscribe all statuses');
    
    // ถ้ายังไม่ได้เชื่อมต่อ รอให้เชื่อมต่อก่อน
    if (!this.isConnected()) {
      //console.log('[WebSocketManager] Not connected, will subscribe when connected');
      const unsubscribe = this.on('ws:open', () => {
        //console.log('[WebSocketManager] Connected, now resubscribing all statuses');
        // เมื่อเชื่อมต่อแล้ว ทำการ subscribe ทั้งหมดใหม่
        this.userStatusSubscriptions.forEach(userId => {
          this.subscribeToUserStatus(userId);
        });
        unsubscribe();
      });
      return;
    }
    
    // ถ้าเชื่อมต่อแล้ว ทำการ subscribe ทั้งหมดใหม่ทันที
    //console.log('[WebSocketManager] Already connected, resubscribing immediately');
    this.userStatusSubscriptions.forEach(userId => {
      this.subscribeToUserStatus(userId);
    });
  }

  /**
   * เชื่อมต่อ WebSocket
   */
  public connect(): void {
    //console.log('[WebSocketManager] Connect called');
    
    if (!this.isInitialized) {
      console.error('[WebSocketManager] Not initialized yet');
      throw new Error('WebSocket manager is not initialized');
    }

    this.connection?.connect();
  }

  /**
   * ยกเลิกการเชื่อมต่อ WebSocket
   */
  public disconnect(): void {
    //console.log('[WebSocketManager] Disconnect called');
    
    // ยกเลิก timer
    if (this.connectionRetryTimer) {
      clearTimeout(this.connectionRetryTimer);
      this.connectionRetryTimer = null;
    }
    
    // Unsubscribe ทั้งหมดก่อนปิดการเชื่อมต่อ
    this.unsubscribeAllUserStatuses();
    
    this.connection?.disconnect();
  }

  /**
   * ส่งข้อความผ่าน WebSocket
   */
  public send<T>(type: string, data: T): boolean {
    if (!this.connection?.isConnected()) {
      // ไม่ log error เพราะอาจเกิดขึ้นได้ตามปกติตอนโหลดหน้าใหม่
      // console.debug('[WebSocketManager] Cannot send message: WebSocket is not connected');
      return false;
    }

    return this.connection.send(type, data);
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อ
   */
  public isConnected(): boolean {
    return !!this.connection?.isConnected();
  }

  /**
   * ลงทะเบียนการฟังเหตุการณ์ แบบมี type safety
   */
  public on<K extends keyof WebSocketEventMap>(
    event: K, 
    callback: (data: WebSocketEventMap[K]) => void
  ): () => void {
    // ต้องใช้ type assertion เนื่องจาก eventEmitter ยังคงรับ callback เป็น (data: unknown) => void
    return eventEmitter.on(event, callback as (data: unknown) => void);
  }

  /**
   * ลงทะเบียนการฟังเหตุการณ์สำหรับ dynamic events
   */
  public onDynamic(
    event: string,
    callback: (data: unknown) => void
  ): () => void {
    return eventEmitter.onDynamic(event, callback);
  }

  /**
   * ยกเลิกการลงทะเบียนการฟังเหตุการณ์ แบบมี type safety
   */
  public off<K extends keyof WebSocketEventMap>(
    event: K, 
    callback: (data: WebSocketEventMap[K]) => void
  ): void {
    eventEmitter.off(event, callback as (data: unknown) => void);
  }

  /**
   * ยกเลิกการลงทะเบียนการฟังเหตุการณ์สำหรับ dynamic events
   */
  public offDynamic(
    event: string,
    callback: (data: unknown) => void
  ): void {
    eventEmitter.offDynamic(event, callback);
  }

  /**
   * ลงทะเบียนใน conversation room
   */
  public subscribeToConversation(conversationId: string): boolean {
    return this.send('conversation.join', { conversation_id: conversationId });
  }

  /**
   * ยกเลิกการลงทะเบียนใน conversation room
   */
  public unsubscribeFromConversation(conversationId: string): boolean {
    return this.send('conversation.leave', { conversation_id: conversationId });
  }
  
  /**
   * ลงทะเบียนติดตามสถานะผู้ใช้
   */
  public subscribeToUserStatus(userId: string): boolean {
    // ตรวจสอบว่ามีการ subscribe ไปแล้วหรือไม่
    if (this.userStatusSubscriptions.has(userId)) {
      //console.log(`[WebSocketManager] Already subscribed to ${userId}, skipping duplicate request`);
      return true; // ไม่ส่งคำขอซ้ำ
    }
    
    // บันทึกเข้า set ก่อนเพื่อป้องกันการเรียกซ้ำในช่วงเวลาสั้นๆ
    this.userStatusSubscriptions.add(userId);
    
    //console.log(`[WebSocketManager] Subscribing to user status: ${userId}, total subscriptions: ${this.userStatusSubscriptions.size}`);
    
    // ถ้ายังไม่ได้เชื่อมต่อ ไม่ต้องส่งข้อความ แต่เก็บไว้ใน queue
    if (!this.connection?.isConnected()) {
      //console.log(`[WebSocketManager] WebSocket not connected, will subscribe to ${userId} when connected`);
      return true;
    }
    
    // ส่งคำขอ subscribe
    const success = this.connection.send('user.status.subscribe', { 
      user_id: userId,
      client_id: this.getClientId()
    });
    
    // ถ้าส่งไม่สำเร็จ ลบออกจาก set
    if (!success) {
      this.userStatusSubscriptions.delete(userId);
    }
    
    return success;
  }
  
  /**
   * ดึง client ID ปัจจุบัน
   */
  public getClientId(): string | null {
    return this.connection?.getClientId() || null;
  }
  
  /**
   * ยกเลิกการลงทะเบียนติดตามสถานะผู้ใช้
   */
  public unsubscribeFromUserStatus(userId: string): boolean {
    //console.log(`[WebSocketManager] Attempting to unsubscribe from user status for: ${userId}`);
    
    // เช็คว่าได้ subscribe ไปแล้วหรือไม่
    if (!this.userStatusSubscriptions.has(userId)) {
      return true; // ไม่มีการ subscribe อยู่แล้ว
    }
    
    // ทำการ unsubscribe พร้อมส่ง client ID ปัจจุบัน
    const success = this.send('user.status.unsubscribe', { 
      user_id: userId,
      client_id: this.getClientId() // ส่ง client ID ไปด้วย
    });
    
    // ถ้าสำเร็จ ลบออกจากบันทึก
    if (success) {
      this.userStatusSubscriptions.delete(userId);
      //console.log(`[WebSocketManager] Unsubscribed from user status: ${userId}`);
    }
    
    return success;
  }
  
  /**
   * ยกเลิกการลงทะเบียนติดตามสถานะผู้ใช้ทั้งหมด
   */
  public unsubscribeAllUserStatuses(): void {
    if (!this.isConnected()) {
      // ล้างรายการทิ้งแม้ไม่ได้เชื่อมต่อ
      this.userStatusSubscriptions.clear();
      return;
    }
    
    // Unsubscribe ทีละ userId
    this.userStatusSubscriptions.forEach(userId => {
      this.send('user.status.unsubscribe', { user_id: userId });
    });
    
    // ล้างรายการทั้งหมด
    this.userStatusSubscriptions.clear();
    //console.log('[WebSocketManager] Unsubscribed from all user statuses');
  }
  
  /**
   * ดึงรายการ userId ที่ subscribe อยู่
   */
  public getSubscribedUserStatuses(): string[] {
    return Array.from(this.userStatusSubscriptions);
  }

  /**
   * รีเซ็ตการเชื่อมต่อทั้งหมด (force reconnect)
   */
  public resetConnection(): void {
    //console.log('[WebSocketManager] Resetting connection');
    
    // ยกเลิก timer ที่อาจกำลังทำงานอยู่
    if (this.connectionRetryTimer) {
      clearTimeout(this.connectionRetryTimer);
      this.connectionRetryTimer = null;
    }
    
    // ยกเลิกการเชื่อมต่อปัจจุบัน
    if (this.connection) {
      // ปิดการเชื่อมต่อ
      this.disconnect();
      
      // สร้างการเชื่อมต่อใหม่
      const isProduction = !window.location.hostname.includes('localhost');
      const reconnectDelay = isProduction ? 1000 : 500; // รอนานกว่าใน production
      
      //console.log(`[WebSocketManager] Will reconnect in ${reconnectDelay}ms`);
      this.connectionRetryTimer = setTimeout(() => {
        //console.log('[WebSocketManager] Reconnecting after reset');
        this.connect();
        
        // หลังจากเชื่อมต่อใหม่ ลองลงทะเบียน subscriptions อีกครั้ง
        setTimeout(() => {
          //console.log('[WebSocketManager] Resubscribing after reconnect');
          this.resubscribeAll();
        }, isProduction ? 2000 : 1000); // รอนานกว่าใน production
      }, reconnectDelay);
    } else {
      // ถ้าไม่มีการเชื่อมต่อ ให้เชื่อมต่อใหม่
      this.connect();
    }
  }
  
  /**
   * ตรวจสอบสถานะการเชื่อมต่อและบังคับให้เป็น connected ถ้าจำเป็น
   */
  public checkAndUpdateConnectionStatus(): boolean {
    const isCurrentlyConnected = this.isConnected();
    
    if (isCurrentlyConnected) {
      //console.log('[WebSocketManager] Connection is active, ensuring ws:open event is sent');
      eventEmitter.emit('ws:open', new Event('open'));
    }
    
    return isCurrentlyConnected;
  }
}

export default new WebSocketManager();