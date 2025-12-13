// src/components/shared/MessageContextMenu.tsx
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { Copy, Reply, Pencil, RotateCw, Trash2, Pin, PinOff, Forward, Globe, User } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';
import type { PinType } from '@/types/pinned-message.types';

interface MessageContextMenuProps {
  message: MessageDTO;
  children: React.ReactNode;
  currentUserId: string;
  onReply: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onCopy: (content: string) => void;
  onResend?: (messageId: string) => void; // Optional - for failed messages
  onDelete?: (messageId: string) => void; // Optional - delete message
  onPin?: (messageId: string, pinType: PinType) => void; // Optional - pin message with type
  onUnpin?: (messageId: string, pinType?: PinType) => void; // Optional - unpin message
  onForward?: (messageId: string) => void; // Optional - enter selection mode for forwarding
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  children,
  currentUserId,
  onReply,
  onEdit,
  onCopy,
  onResend,
  onDelete,
  onPin,
  onUnpin,
  onForward,
}) => {
  // เช็คว่าเป็นข้อความของเราหรือไม่
  const isOwnMessage = message.sender_id === currentUserId;
  
  // เช็คว่าเป็นข้อความที่สามารถแก้ไขได้หรือไม่ (เฉพาะข้อความประเภทข้อความเท่านั้น)
  const canEdit = isOwnMessage && message.message_type === 'text' && !message.is_deleted;
  
  // เช็คว่าเป็นข้อความที่สามารถลบได้หรือไม่
  const canDelete = isOwnMessage && !message.is_deleted;
  
  // เช็คว่าเป็นข้อความที่ล้มเหลวในการส่งหรือไม่
  const isFailed = message.status === 'failed';
  
  // เช็คว่าข้อความมีเนื้อหาที่สามารถคัดลอกได้หรือไม่
  const hasCopyableContent = message.content && message.content.trim().length > 0;
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="border border-border rounded-md shadow-md z-50 bg-popover text-popover-foreground">
        {/* ตอบกลับข้อความ - ทุกคนสามารถทำได้ */}
        <ContextMenuItem 
          onClick={() => onReply(message.id)}
          className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
          disabled={message.is_deleted}
        >
          <Reply size={16} />
          <span>ตอบกลับ</span>
        </ContextMenuItem>
        
        {/* แก้ไขข้อความ - เฉพาะข้อความของตัวเอง */}
        {canEdit && (
          <ContextMenuItem 
            onClick={() => onEdit(message.id)}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil size={16} />
            <span>แก้ไข</span>
          </ContextMenuItem>
        )}
        
        {/* ส่งข้อความใหม่ - เฉพาะข้อความที่ล้มเหลว */}
        {isFailed && onResend && (
          <ContextMenuItem 
            onClick={() => onResend(message.id)}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
          >
            <RotateCw size={16} />
            <span>ส่งใหม่</span>
          </ContextMenuItem>
        )}
        
        {(canEdit || canDelete || (isFailed && onResend)) && hasCopyableContent && (
          <ContextMenuSeparator />
        )}
        
        {/* คัดลอกข้อความ */}
        {hasCopyableContent && (
          <ContextMenuItem
            onClick={() => onCopy(message.content)}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
          >
            <Copy size={16} />
            <span>คัดลอก</span>
          </ContextMenuItem>
        )}

        {/* ส่งต่อข้อความ - enter selection mode */}
        {onForward && !message.is_deleted && (
          <ContextMenuItem
            onClick={() => onForward(message.id)}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
          >
            <Forward size={16} />
            <span>ส่งต่อ</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Pin / Unpin Message */}
        {!message.is_deleted && message.id && (message.is_pinned ? (
          onUnpin && (
            <ContextMenuItem
              onClick={() => onUnpin(message.id)}
              className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <PinOff size={16} />
              <span>เลิกปักหมุด</span>
            </ContextMenuItem>
          )
        ) : (
          onPin && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                <Pin size={16} />
                <span>ปักหมุด</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem
                  onClick={() => onPin(message.id, 'personal')}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <User size={16} />
                  <span>เห็นเฉพาะฉัน</span>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onPin(message.id, 'public')}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <Globe size={16} />
                  <span>ทุกคนเห็น</span>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          )
        ))}

        {/* Delete Message */}
        {canDelete && onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onDelete(message.id)}
              className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-destructive focus:text-destructive"
            >
              <Trash2 size={16} />
              <span>ลบข้อความ</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default MessageContextMenu;