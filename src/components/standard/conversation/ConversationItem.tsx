// src/components/standard/chat/ConversationItem.tsx
import { memo, useCallback, useMemo } from 'react';
import { User, Pin, VolumeX } from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import { formatTimestamp } from '@/utils/dateUtils';
import { parseMessageType } from '@/utils/messageFormatter';
import ConversationContextMenu from '@/components/shared/ConversationContextMenu';

interface ConversationItemProps {
  conversation: ConversationDTO;
  isActive: boolean;
  onSelect: () => void;
  onTogglePin?: (conversationId: string, isPinned: boolean) => Promise<boolean>;
  onToggleMute?: (conversationId: string, isMuted: boolean) => Promise<boolean>;
  isUserOnline?: (userId: string) => boolean; // รับ function นี้จาก parent
  onDelete?: (conversationId: string) => void; // เหลือแค่ลบ
}

const ConversationItem = memo(({
  conversation,
  isActive,
  onSelect,
  onTogglePin,
  onToggleMute,
  isUserOnline = () => false, // กำหนดค่าเริ่มต้นเป็น function ที่คืนค่า false
  onDelete,
}: ConversationItemProps) => {
  // ดึง userId ของคู่สนทนา (ใช้สำหรับการแชทแบบ 1:1 เท่านั้น)
  const contactUserId = useMemo(() => {
    // ตรวจสอบว่าเป็นการสนทนาแบบ 1:1 หรือไม่
    if (conversation.type === 'direct' && conversation.contact_info?.user_id) {
      return conversation.contact_info.user_id;
    }
    return undefined;
  }, [conversation]);

  // ป้องกันการส่งกระจายไปยัง parent element
  const handleTogglePin = useCallback((isPinned: boolean) => {
    // ป้องกันการ propagate ไปยัง onClick ของ parent div
    event?.stopPropagation();
    onTogglePin?.(conversation.id, isPinned);
  }, [conversation.id, onTogglePin]);

  const handleToggleMute = useCallback((isMuted: boolean) => {
    event?.stopPropagation();
    onToggleMute?.(conversation.id, isMuted);
  }, [conversation.id, onToggleMute]);

  const handleDelete = useCallback(() => {
    onDelete?.(conversation.id);
  }, [conversation.id, onDelete]);

  // ตัวเนื้อหาหลักของ ConversationItem
  const conversationContent = (
    <div
      className={`px-3 py-2 border-b border-border flex items-center gap-2 cursor-pointer transition-all duration-150 hover:bg-accent ${
        isActive ? 'bg-accent' : ''
      }`}
      onClick={onSelect}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {conversation.icon_url ? (
            <img
              src={conversation.icon_url}
              alt={conversation.title || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={18} className="text-muted-foreground" />
          )}
        </div>

        {/* แสดงสถานะออนไลน์เฉพาะในกรณีการสนทนาแบบ 1:1 และมี userId ของคู่สนทนา */}
        {conversation.type === 'direct' && contactUserId && (
          isUserOnline(contactUserId) ? (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-card"></div>
          ) : (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-muted rounded-full border-2 border-card"></div>
          )
        )}

        {/* ไอคอนปักหมุด (แสดงที่มุมขวาบนของรูปโปรไฟล์) */}
        {conversation.is_pinned && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-muted-foreground rounded-full flex items-center justify-center">
            <Pin size={8} className="rotate-1 text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1 mb-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <h3 className="text-sm font-medium truncate text-card-foreground">
              {conversation.title}
            </h3>
            {conversation.is_muted && <VolumeX size={12} className='text-muted-foreground flex-shrink-0'/>}
          </div>
          {conversation.last_message_at && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTimestamp(conversation.last_message_at)}
            </span>
          )}
        </div>
        <div className="flex justify-between items-start gap-1">
          <p className={`text-xs line-clamp-2 flex-1 overflow-hidden break-all ${
            conversation.unread_count > 0
              ? 'font-medium text-card-foreground'
              : 'text-muted-foreground'
          }`}>
            {parseMessageType(
              conversation.last_message_text,
              conversation.last_message_has_mention  // ✅ Phase 2: ส่ง mention flag
            )}
          </p>

          {/* Badges Container */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {/* ✅ Phase 2: Mention Badge - สีน้ำเงิน */}
            {conversation.has_unread_mention && conversation.unread_mention_count! > 0 && (
              <span className="flex items-center justify-center bg-blue-500 text-white text-xs font-medium rounded-full min-w-[18px] h-[18px] px-1.5">
                @{conversation.unread_mention_count! > 99 ? '99+' : conversation.unread_mention_count}
              </span>
            )}

            {/* Unread Count Badge - สีแดง */}
            {conversation.unread_count > 0 && (
              <span className="flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium rounded-full min-w-[16px] h-[16px] px-1">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap ด้วย ContextMenu
  return (
    <ConversationContextMenu
      conversation={conversation}
      onTogglePin={handleTogglePin}
      onToggleMute={handleToggleMute}
      onDelete={onDelete ? handleDelete : undefined}
    >
      {conversationContent}
    </ConversationContextMenu>
  );
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;