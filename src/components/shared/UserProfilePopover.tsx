/**
 * UserProfilePopover - Clickable user name/avatar with profile popup
 *
 * Features:
 * - Show user info in popover
 * - Add friend / Block / View profile actions
 */

import { memo, useState } from 'react';
import { User, UserPlus, UserCheck, Ban, ShieldOff, MessageCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFriendshipStore } from '@/stores/friendshipStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';

interface UserProfilePopoverProps {
  /** User ID */
  userId: string;

  /** Display name */
  displayName: string;

  /** Profile image URL */
  profileImageUrl?: string;

  /** Username */
  username?: string;

  /** Is current user (don't show actions) */
  isCurrentUser?: boolean;

  /** Custom trigger element */
  children: React.ReactNode;

  /** Additional class for trigger */
  className?: string;
}

export const UserProfilePopover = memo(function UserProfilePopover({
  userId,
  displayName,
  profileImageUrl,
  username,
  isCurrentUser = false,
  children,
  className,
}: UserProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { sendFriendRequest, getFriendshipStatus, blockUser, unblockUser } = useFriendshipStore();
  const { createDirectConversation } = useConversationStore();

  const friendshipStatus = getFriendshipStatus(userId);
  const isFriend = friendshipStatus === 'accepted';
  const isPending = friendshipStatus === 'pending';
  const isBlocked = friendshipStatus === 'blocked';

  // Handle send message
  const handleSendMessage = async () => {
    setIsLoading(true);
    try {
      const conversation = await createDirectConversation([userId]);
      if (conversation) {
        setOpen(false);
        navigate(`/chat/${conversation.id}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add friend
  const handleAddFriend = async () => {
    setIsLoading(true);
    try {
      await sendFriendRequest(userId);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle block
  const handleBlock = async () => {
    setIsLoading(true);
    try {
      await blockUser(userId);
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unblock
  const handleUnblock = async () => {
    setIsLoading(true);
    try {
      await unblockUser(userId);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show popover for current user
  if (isCurrentUser) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={cn(
            'cursor-pointer hover:underline',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Profile Header */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            {/* ✅ ลดขนาดรูปให้เท่า chat area (h-8 w-8) */}
            <Avatar className="h-8 w-8">
              <AvatarImage src={profileImageUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {displayName?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              {username && (
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2 space-y-1">
          {/* Send Message */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleSendMessage}
            disabled={isLoading || isBlocked}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            ส่งข้อความ
          </Button>

          {/* ✅ Friend status indicator */}
          {isFriend && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-green-600 hover:text-green-600 hover:bg-green-50"
              disabled
            >
              <UserCheck className="mr-2 h-4 w-4" />
              เป็นเพื่อนแล้ว
            </Button>
          )}

          {/* Add Friend (if not friend and not blocked and not pending) */}
          {!isFriend && !isBlocked && !isPending && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleAddFriend}
              disabled={isLoading}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              เพิ่มเพื่อน
            </Button>
          )}

          {/* Pending status */}
          {isPending && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              disabled
            >
              <UserPlus className="mr-2 h-4 w-4" />
              รอการตอบรับ
            </Button>
          )}

          {/* Block (if not already blocked) */}
          {!isBlocked && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleBlock}
              disabled={isLoading}
            >
              <Ban className="mr-2 h-4 w-4" />
              บล็อก
            </Button>
          )}

          {/* ✅ Unblock (if blocked) */}
          {isBlocked && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-blue-600 hover:text-blue-600 hover:bg-blue-50"
              onClick={handleUnblock}
              disabled={isLoading}
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              ปลดบล็อก
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

export default UserProfilePopover;
