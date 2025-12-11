// src/components/standard/conversation/ChatHeader.tsx - Enhanced with online status
import React, { useState } from 'react';
import { User, MoreVertical, Ban, ShieldOff } from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import { ConversationDetailsSheet } from './ConversationDetailsSheet';
import { OnlineStatusBadge } from '@/components/shared/OnlineStatusBadge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatLastSeen } from '@/utils/time/formatLastSeen';
import { BlockUserDialog } from '@/components/shared/BlockUserDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  activeChat?: ConversationDTO;
  otherUserId?: string;
  otherUserName?: string; // 🆕 ชื่อผู้ใช้อีกฝ่าย
  currentUserId: string;
  isUserOnline?: (userId: string) => boolean; // รับ function นี้จาก parent
  isBlocked?: boolean; // 🆕 สถานะการถูกบล็อก
  isBlockedBy?: boolean; // 🆕 สถานะว่าถูกบล็อกโดยอีกฝ่าย
  onToggleMute?: () => Promise<boolean>;
  onTogglePin?: () => Promise<boolean>;
  onRemoveMember?: (memberId: string) => Promise<boolean>;
  onLeaveGroup?: () => Promise<boolean>;
  onJumpToMessage?: (messageId: string) => void;
  onBlockStatusChange?: (isBlocked: boolean) => void; // 🆕 Callback เมื่อสถานะ block เปลี่ยน
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeChat,
  otherUserId,
  otherUserName,
  currentUserId,
  isUserOnline: isUserOnlineProp = () => false, // Keep for backward compatibility
  isBlocked = false,
  isBlockedBy = false,
  onToggleMute,
  onTogglePin,
  onRemoveMember,
  onLeaveGroup,
  onJumpToMessage,
  onBlockStatusChange,
}) => {
  const [showConversationDetails, setShowConversationDetails] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false); // 🆕 State สำหรับ block dialog

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
        {/* 🆕 Dropdown Menu with Block option */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
            >
              <MoreVertical size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowConversationDetails(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>ข้อมูลการสนทนา</span>
            </DropdownMenuItem>

            {/* 🆕 Block/Unblock option - only for private chats */}
            {activeChat?.type === 'private' && otherUserId && !isBlockedBy && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowBlockDialog(true)}
                  className={isBlocked ? '' : 'text-destructive focus:text-destructive'}
                >
                  {isBlocked ? (
                    <>
                      <ShieldOff className="mr-2 h-4 w-4" />
                      <span>ยกเลิกการบล็อก</span>
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      <span>บล็อกผู้ใช้</span>
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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

    {/* 🆕 Block User Dialog */}
    {otherUserId && (
      <BlockUserDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        userId={otherUserId}
        userName={otherUserName || activeChat?.title || 'ผู้ใช้'}
        isBlocked={isBlocked}
        onSuccess={onBlockStatusChange}
      />
    )}
    </>
  );
};

export default React.memo(ChatHeader);