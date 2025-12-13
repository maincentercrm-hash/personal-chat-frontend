// src/components/common/ConnectionStatus.tsx
import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

interface ConnectionStatusProps {
  showText?: boolean;
  showReconnectButton?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showText = false, 
  showReconnectButton = false 
}) => {
  const { isConnected, isConnecting, reconnectAttempt, resetConnection } = useWebSocketContext();
  const [stuckInConnecting, setStuckInConnecting] = useState(false);
  
  //console.log('[ConnectionStatus] Rendered with:', { isConnected, isConnecting, reconnectAttempt, stuckInConnecting });

  // กำหนดสถานะการเชื่อมต่อ
  let statusColor = 'bg-muted-foreground/50'; // สีเทา (ยังไม่มีการเชื่อมต่อ)
  let statusText = 'ไม่ได้เชื่อมต่อ';

  if (isConnected) {
    //console.log('[ConnectionStatus] Using green status - connected');
    statusColor = 'bg-[var(--status-online)]'; // สีเขียว (เชื่อมต่อแล้ว)
    statusText = 'ออนไลน์';
  } else if (isConnecting || stuckInConnecting) {
    //console.log('[ConnectionStatus] Using yellow status - connecting');
    statusColor = 'bg-[var(--status-connecting)]'; // สีเหลือง (กำลังเชื่อมต่อ)
    statusText = `กำลังเชื่อมต่อ ${reconnectAttempt > 0 ? `(พยายามครั้งที่ ${reconnectAttempt})` : ''}`;
  } else {
    //console.log('[ConnectionStatus] Using gray status - not connected');
  }

  // ตรวจสอบสถานะหลังจาก refresh หน้า
  useEffect(() => {
    // ตรวจสอบว่ามีการ refresh หน้าหรือไม่
    const checkPageRefresh = () => {
      try {
        const lastPageLoad = parseInt(localStorage.getItem('ws_page_load_time') || '0');
        const now = Date.now();
        localStorage.setItem('ws_page_load_time', now.toString());
        
        // ถ้าหน้าถูกโหลดเร็วกว่า 3 วินาที ถือว่าเป็นการ refresh
        return lastPageLoad > 0 && now - lastPageLoad < 3000;
      } catch (error) { // เปลี่ยนชื่อตัวแปรเป็น _ เพื่อบอกว่าไม่ได้ใช้งาน
        console.error('[ConnectionStatus] Error checking page refresh:', error);
        return false;
      }
    };
    
    const isRefresh = checkPageRefresh();
    if (isRefresh) {
      //console.log('[ConnectionStatus] Page refresh detected');
      
      // รอสักครู่แล้วตรวจสอบการเชื่อมต่อ
      const checkTimer = setTimeout(() => {
        if (!isConnected) {
          //console.log('[ConnectionStatus] Not connected after refresh, forcing reconnect');
          resetConnection();
        }
      }, 3000); // รอ 3 วินาที
      
      return () => clearTimeout(checkTimer);
    }
  }, []);

  // ตรวจสอบถ้าติดอยู่ในสถานะกำลังเชื่อมต่อนานเกินไป
  useEffect(() => {
    let timer: number | null = null;
    
    if (isConnecting) {
      //console.log('[ConnectionStatus] Detecting stuck in connecting state');
      // ตั้งเวลาตรวจสอบ
      const isProduction = !window.location.hostname.includes('localhost');
      const timeoutDuration = isProduction ? 8000 : 5000; // นานกว่าใน production
      
      timer = window.setTimeout(() => {
        if (isConnecting) {
          //console.log('[ConnectionStatus] Connection stuck in connecting state, forcing reconnect');
          // จดจำว่าติดอยู่ในสถานะกำลังเชื่อมต่อ
          setStuckInConnecting(true);
          // รีเซ็ตการเชื่อมต่อ
          resetConnection();
          
          // รอสักครู่แล้วรีเซ็ตสถานะ stuck
          setTimeout(() => {
            setStuckInConnecting(false);
          }, 5000);
        }
      }, timeoutDuration);
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isConnecting, resetConnection]);

  // ตรวจสอบสถานะ WebSocket โดยตรงเป็นระยะ
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // Import แบบ dynamic เพื่อหลีกเลี่ยง circular dependency
      import('@/services/websocket/WebSocketManager').then(({ default: manager }) => {
        const realStatus = manager.isConnected();
        if (realStatus && !isConnected) {
          //console.log('[ConnectionStatus] Detected connection is active but state shows disconnected, updating state');
          manager.checkAndUpdateConnectionStatus();
        }
      });
    }, 5000); // ตรวจสอบทุก 5 วินาที
    
    return () => clearInterval(checkInterval);
  }, [isConnected]);

  // ฟังก์ชันสำหรับบังคับเชื่อมต่อใหม่
  const handleReconnect = () => {
    //console.log('[ConnectionStatus] Manual reconnect requested');
    resetConnection();
  };

  return (
    <div className="flex items-center ml-2">
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      {showText && <span className="ml-1 ">{statusText}</span>}
      
      {/* ปุ่ม Reconnect */}
      {showReconnectButton && (
        <button
          onClick={handleReconnect}
          className="ml-2 px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
          title="บังคับเชื่อมต่อใหม่"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;