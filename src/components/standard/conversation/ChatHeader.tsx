// src/components/standard/conversation/ChatHeader.tsx - Enhanced with online status
import React, { useState } from 'react';
import { User, MoreVertical } from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import { ConversationDetailsSheet } from './ConversationDetailsSheet';
import { OnlineStatusBadge } from '@/components/shared/OnlineStatusBadge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatLastSeen } from '@/utils/time/formatLastSeen';

interface ChatHeaderProps {
  activeChat?: ConversationDTO;
  otherUserId?: string;
  currentUserId: string;
  isUserOnline?: (userId: string) => boolean; // รับ function นี้จาก parent
  onToggleMute?: () => Promise<boolean>;
  onTogglePin?: () => Promise<boolean>;
  onRemoveMember?: (memberId: string) => Promise<boolean>;
  onLeaveGroup?: () => Promise<boolean>;
  onJumpToMessage?: (messageId: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeChat,
  otherUserId,
  currentUserId,
  isUserOnline: isUserOnlineProp = () => false, // Keep for backward compatibility
  onToggleMute,
  onTogglePin,
  onRemoveMember,
  onLeaveGroup,
  onJumpToMessage
}) => {
  const [showConversationDetails, setShowConversationDetails] = useState(false);

  // 🆕 Use online status hook for real-time updates
  const {
    isUserOnline,
    getLastActiveTime,
    isLoading
  } = useOnlineStatus(otherUserId ? [otherUserId] : []);

  // Check online status (prefer hook, fallback to prop)
  const isOnline = otherUserId ? (isUserOnline(otherUserId) || isUserOnlineProp(otherUserId)) : false;

  // Get last active time for offline users
  const lastActiveTime = otherUserId ? getLastActiveTime(otherUserId) : null;

  // 🆕 Get status display with last seen
  const getStatusDisplay = () => {
    if (!otherUserId) {
      if (activeChat?.type === 'group') {
        return { text: `${activeChat.member_count || 0} สมาชิก`, color: 'text-muted-foreground' };
      }
      if (activeChat?.type === 'business') {
        return { text: 'ธุรกิจ', color: 'text-muted-foreground' };
      }
      return { text: '', color: 'text-muted-foreground' };
    }

    // Loading state
    if (isLoading) {
      return { text: 'กำลังโหลด...', color: 'text-muted-foreground' };
    }

    // Online
    if (isOnline) {
      return { text: 'ออนไลน์', color: 'text-emerald-600 dark:text-emerald-400' };
    }

    // Offline with last seen
    const lastSeenText = formatLastSeen(lastActiveTime);
    return { text: lastSeenText, color: 'text-muted-foreground' };
  };

  const statusDisplay = getStatusDisplay();

  if (!activeChat) return null;

  return (
    <>
    <div className="h-16 w-full bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center relative">
          {activeChat.icon_url ? (
            <img
              src={activeChat.icon_url}
              alt={activeChat.title || ''}
              className="w-full h-full object-cover rounded-full overflow-hidden"
            />
          ) : (
            <User size={18} className="text-muted-foreground" />
          )}

          {/* แสดงสถานะออนไลน์ด้วย OnlineStatusBadge component */}
          {otherUserId && (
            <div className="absolute bottom-0 right-0">
              <OnlineStatusBadge
                isOnline={isOnline}
                size="md"
                showOffline={true}
                withPulse={true}
              />
            </div>
          )}
        </div>
        <div>
          <h2 className="text-sm font-medium text-card-foreground">{activeChat.title}</h2>
          <p className={` ${statusDisplay.color}`}>
            {statusDisplay.text}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* MoreVertical button - เปิด ConversationDetailsSheet */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
          onClick={() => setShowConversationDetails(true)}
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>

    {/* Conversation Details Sheet */}
    <ConversationDetailsSheet
      open={showConversationDetails}
      onOpenChange={setShowConversationDetails}
      conversation={activeChat}
      currentUserId={currentUserId}
      isUserOnline={isUserOnline}
      onRemoveMember={onRemoveMember}
      onLeaveGroup={onLeaveGroup}
      onToggleMute={onToggleMute}
      onTogglePin={onTogglePin}
      onJumpToMessage={onJumpToMessage}
    />
    </>
  );
};

export default React.memo(ChatHeader);