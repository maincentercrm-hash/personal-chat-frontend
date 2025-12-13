// src/components/friends/PendingRequestItem.tsx
import React, { useState } from 'react';
import { User, UserCheck, UserX, X, MessageCircle } from 'lucide-react';
import type { PendingRequestItem as PendingRequestItemType } from '@/types/user-friendship.types';

interface PendingRequestItemProps {
  request: PendingRequestItemType;
  type?: 'received' | 'sent'; // ✅ เพิ่ม type prop
  onAccept?: (id: string) => Promise<boolean>;
  onReject?: (id: string) => Promise<boolean>;
  onCancel?: (id: string) => Promise<boolean>; // ✅ เพิ่ม onCancel สำหรับคำขอที่ส่งไป
  onStartConversation?: (userId: string) => Promise<string>; // ✅ เพิ่มสำหรับเริ่มการสนทนา
}

const PendingRequestItem: React.FC<PendingRequestItemProps> = ({
  request,
  type = 'received', // ค่าเริ่มต้นเป็น 'received'
  onAccept,
  onReject,
  onCancel,
  onStartConversation
}) => {
  const [isStartingChat, setIsStartingChat] = useState(false);
  
  const formatRequestDate = () => {
    const date = new Date(request.requested_at);
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const handleAccept = async () => {
    if (onAccept) {
      await onAccept(request.request_id);
    }
  };

  const handleReject = async () => {
    if (onReject) {
      await onReject(request.request_id);
    }
  };

  const handleCancel = async () => {
    if (onCancel) {
      await onCancel(request.request_id);
    }
  };

  const handleStartConversation = async () => {
    if (onStartConversation && request.user_id) {
      try {
        setIsStartingChat(true);
        await onStartConversation(request.user_id);
      } catch (err) {
        console.error('Error starting conversation:', err);
      } finally {
        setIsStartingChat(false);
      }
    }
  };

  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          {request.profile_image_url ? (
            <img
              src={request.profile_image_url}
              alt={request.display_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <User size={20} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-card-foreground">{request.display_name}</h3>
          <p className="text-xs text-muted-foreground">{request.username}</p>
          <p className="text-xs text-muted-foreground/70">
            {type === 'received' ? 'ส่งคำขอเมื่อ' : 'ส่งคำขอไปเมื่อ'} {formatRequestDate()}
          </p>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {type === 'received' ? (
          // แสดงปุ่ม Accept/Reject สำหรับคำขอที่ได้รับ
          <>
            <button
              onClick={handleAccept}
              className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="ยอมรับคำขอเป็นเพื่อน"
            >
              <UserCheck size={18} />
            </button>
            <button
              onClick={handleReject}
              className="p-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              title="ปฏิเสธคำขอเป็นเพื่อน"
            >
              <UserX size={18} />
            </button>
          </>
        ) : (
          // แสดงสถานะและปุ่ม Cancel สำหรับคำขอที่ส่งไป
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground px-3 py-1 bg-muted rounded-full">
              ⏳ รออนุมัติ
            </span>
            {/* ✅ ปุ่มเริ่มแชท - Message Request feature */}
            {onStartConversation && (
              <button
                onClick={handleStartConversation}
                disabled={isStartingChat}
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                title="เริ่มการสนทนา"
              >
                {isStartingChat ? (
                  <div className="w-[18px] h-[18px] border-2 border-t-transparent border-primary rounded-full animate-spin"></div>
                ) : (
                  <MessageCircle size={18} />
                )}
              </button>
            )}
            <button
              onClick={handleCancel}
              className="p-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              title="ยกเลิกคำขอเป็นเพื่อน"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingRequestItem;