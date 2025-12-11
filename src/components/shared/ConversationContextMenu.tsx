// src/components/standard/chat/ConversationContextMenu.tsx
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Pin, PinOff, BellOff, Bell, Trash2 } from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';

interface ConversationContextMenuProps {
  conversation: ConversationDTO;
  children: React.ReactNode;
  onTogglePin: (isPinned: boolean) => void;
  onToggleMute: (isMuted: boolean) => void;
  onDelete?: () => void;
}

const ConversationContextMenu: React.FC<ConversationContextMenuProps> = ({
  conversation,
  children,
  onTogglePin,
  onToggleMute,
  onDelete,
}) => {
  // ตรวจสอบสถานะปัจจุบัน
  const isPinned = conversation.is_pinned || false;
  const isMuted = conversation.is_muted || false;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="border border-border rounded-md bg-popover text-popover-foreground">
        <ContextMenuItem
          onClick={() => onTogglePin(!isPinned)}
          className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          {isPinned ? (
            <>
              <PinOff size={16} />
              <span>เลิกปักหมุด</span>
            </>
          ) : (
            <>
              <Pin size={16} />
              <span>ปักหมุด</span>
            </>
          )}
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => onToggleMute(!isMuted)}
          className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          {isMuted ? (
            <>
              <Bell size={16} />
              <span>เปิดเสียงการแจ้งเตือน</span>
            </>
          ) : (
            <>
              <BellOff size={16} />
              <span>ปิดเสียงการแจ้งเตือน</span>
            </>
          )}
        </ContextMenuItem>

        {/* Delete */}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-destructive focus:text-destructive"
            >
              <Trash2 size={16} />
              <span>ลบการสนทนา</span>
            </ContextMenuItem>
          </>
        )}

      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ConversationContextMenu;
