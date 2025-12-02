// src/components/standard/conversation/MessageInputArea.tsx
import React from 'react';
import MessageInput from '@/components/shared/MessageInput';
import type { ConversationMemberWithRole } from '@/types/group.types';
import type { MentionMetadata } from '@/types/mention.types';

interface MessageInputAreaProps {
  conversationId?: string; // เพิ่ม conversationId สำหรับ draft system
  onSendMessage: (message: string, mentions?: MentionMetadata[]) => void; // ✅ เพิ่ม mentions
  onSendSticker: (stickerId: string, stickerUrl: string, stickerSetId: string) => void;
  onUploadImage: (file: File) => void;
  onUploadFile: (file: File) => void;
  onFilesSelected?: (files: File[], currentMessage?: string) => void; // ✅ เพิ่ม currentMessage
  onMessageChange?: (message: string) => void; // 🆕 เพิ่ม - callback เมื่อ message เปลี่ยน
  isLoading: boolean;
  replyingTo: { id: string; text: string; sender: string } | null;
  onCancelReply: () => void;
  editingMessage?: { id: string; content: string } | null; // ✅ เพิ่ม editingMessage
  onConfirmEdit?: (content: string) => void; // ✅ เพิ่ม onConfirmEdit - รับ content ที่แก้ไข!
  onCancelEdit?: () => void; // ✅ เพิ่ม onCancelEdit
  isBlocked?: boolean; // ✅ เพิ่ม isBlocked - ถ้า true แสดงว่าเราบล็อกผู้ใช้นี้
  blockedUserName?: string; // ✅ เพิ่มชื่อผู้ใช้ที่เราบล็อก (สำหรับแสดงข้อความ)
  isBlockedBy?: boolean; // ✅ เพิ่ม isBlockedBy - ถ้า true แสดงว่าเราถูกผู้ใช้นี้บล็อก
  members?: ConversationMemberWithRole[]; // ✅ เพิ่ม - สำหรับ mention autocomplete
}

/**
 * คอมโพเนนต์สำหรับส่วนป้อนข้อความ
 * แยกออกมาจาก ConversationPage เพื่อลดความซับซ้อนของ parent component
 * ✅ ใช้ React.memo เพื่อลด re-render ที่ไม่จำเป็น
 */
const MessageInputArea: React.FC<MessageInputAreaProps> = React.memo(({
  conversationId,
  onSendMessage,
  onSendSticker,
  onUploadImage,
  onUploadFile,
  onFilesSelected, // ✅ เพิ่ม
  onMessageChange, // 🆕 เพิ่ม
  isLoading,
  replyingTo,
  onCancelReply,
  editingMessage, // ✅ เพิ่ม
  onConfirmEdit, // ✅ เพิ่ม
  onCancelEdit, // ✅ เพิ่ม
  isBlocked, // ✅ เพิ่ม
  blockedUserName, // ✅ เพิ่ม
  isBlockedBy, // ✅ เพิ่ม
  members = [] // ✅ เพิ่ม - สำหรับ mention autocomplete
}) => {
  console.log('[MessageInputArea] 📦 Received props:', {
    editingMessage,
    hasOnConfirmEdit: !!onConfirmEdit,
    hasOnCancelEdit: !!onCancelEdit,
    isBlocked,
    blockedUserName,
    isBlockedBy,
    membersCount: members.length
  });

  // ✅ ถ้าเราถูก block → แสดงข้อความแจ้งเตือน
  if (isBlockedBy) {
    return (
      <div className="border-t p-4 bg-muted/30">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-sm">
            คุณถูกผู้ใช้นี้บล็อก ไม่สามารถส่งข้อความได้
          </span>
        </div>
      </div>
    );
  }

  // ✅ ถ้าเราบล็อกผู้ใช้ → แสดงข้อความแจ้งเตือน
  if (isBlocked) {
    return (
      <div className="border-t p-4 bg-muted/30">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-sm">
            {blockedUserName
              ? `คุณได้บล็อก ${blockedUserName} แล้ว ไม่สามารถส่งข้อความได้`
              : 'ไม่สามารถส่งข้อความได้ เนื่องจากคุณได้บล็อกผู้ใช้นี้แล้ว'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <MessageInput
      conversationId={conversationId}
      onSendMessage={onSendMessage}
      onSendSticker={onSendSticker}
      onUploadImage={onUploadImage}
      onUploadFile={onUploadFile}
      onFilesSelected={onFilesSelected} // ✅ ส่งต่อ
      onMessageChange={onMessageChange} // 🆕 ส่งต่อ
      isLoading={isLoading}
      replyingTo={replyingTo}
      onCancelReply={onCancelReply}
      editingMessage={editingMessage} // ✅ ส่งต่อ
      onConfirmEdit={onConfirmEdit} // ✅ ส่งต่อ
      onCancelEdit={onCancelEdit} // ✅ ส่งต่อ
      members={members} // ✅ ส่งต่อ - สำหรับ mention autocomplete
    />
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison: re-render เฉพาะเมื่อ props เหล่านี้เปลี่ยน
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.replyingTo?.id === nextProps.replyingTo?.id &&
    prevProps.editingMessage?.id === nextProps.editingMessage?.id && // ✅ เพิ่มเช็ค editingMessage
    prevProps.isBlocked === nextProps.isBlocked && // ✅ เพิ่มเช็ค isBlocked
    prevProps.isBlockedBy === nextProps.isBlockedBy && // ✅ เพิ่มเช็ค isBlockedBy
    prevProps.members?.length === nextProps.members?.length // ✅ เพิ่มเช็ค members
    // Note: ไม่เช็ค callback functions เพราะเป็น stable references จาก useCallback
  );
});

MessageInputArea.displayName = 'MessageInputArea';

export default MessageInputArea;