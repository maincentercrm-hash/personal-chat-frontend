// src/components/shared/MessageInput.tsx
import React, { type RefObject, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Smile, Paperclip, Camera, Send, Check, Clock } from 'lucide-react';

// นำเข้า custom hooks
import { useMessageInput } from './hooks/useMessageInput';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';
import { useTypingIndicator } from '@/hooks/useTypingIndicator'; // 🆕 เพิ่ม typing indicator
import useUserStore from '@/stores/userStore'; // 🆕 เพิ่มเพื่อดึง currentUserId

// นำเข้าคอมโพเนนต์ย่อย
import ReplyingToIndicator from './message/ReplyingToIndicator';
import EditingMessageIndicator from './message/EditingMessageIndicator'; // ✅ เพิ่ม
import EmojiStickerPanel from './message/EmojiStickerPanel';
import { MentionDropdown } from './mention/MentionDropdown';
import { ScheduleMessageDialog } from './ScheduleMessageDialog'; // 🆕 Schedule message dialog

// Types
import type { ConversationMemberWithRole } from '@/types/group.types';
import type { MentionMetadata } from '@/types/mention.types';

interface MessageInputProps {
  conversationId?: string; // เพิ่ม conversationId สำหรับ draft system
  onSendMessage: (message: string, mentions?: MentionMetadata[]) => void; // ✅ เพิ่ม mentions
  onSendSticker?: (stickerId: string, stickerUrl: string, stickerSetId: string) => void;
  isLoading?: boolean;
  onUploadImage?: (file: File) => void;
  onUploadFile?: (file: File) => void;
  onFilesSelected?: (files: File[], currentMessage?: string) => void; // ✅ เพิ่ม currentMessage - auto-fill caption
  onMessageChange?: (message: string) => void; // 🆕 Callback เมื่อ message text เปลี่ยน (สำหรับ drag & drop)
  replyingTo?: { id: string; text: string; sender: string } | null;
  onCancelReply?: () => void;
  editingMessage?: { id: string; content: string } | null; // ✅ เพิ่ม
  onConfirmEdit?: (content: string, mentions?: MentionMetadata[]) => void; // ✅ เพิ่ม - รับ content และ mentions ที่แก้ไข!
  onCancelEdit?: () => void; // ✅ เพิ่ม
  members?: ConversationMemberWithRole[]; // ✅ เพิ่ม - สำหรับ mention autocomplete
}

/**
 * คอมโพเนนต์สำหรับป้อนและส่งข้อความ
 * ปรับปรุงโดยแยก logic ไปยัง custom hook และแยกส่วนการแสดงผลออกเป็นคอมโพเนนต์ย่อย
 * ✅ ใช้ React.memo เพื่อลด re-render ที่ไม่จำเป็น
 */
const MessageInput: React.FC<MessageInputProps> = React.memo(({
  conversationId,
  onSendMessage,
  onSendSticker,
  isLoading = false,
  onUploadImage,
  onUploadFile,
  onFilesSelected, // ✅ เพิ่ม
  onMessageChange, // 🆕 เพิ่ม
  replyingTo,
  onCancelReply,
  editingMessage, // ✅ เพิ่ม
  onConfirmEdit, // ✅ เพิ่ม
  onCancelEdit, // ✅ เพิ่ม
  members = [] // ✅ เพิ่ม
}) => {
  console.log('[MessageInput] 🔄 Render with props:', {
    editingMessage,
    hasOnConfirmEdit: !!onConfirmEdit,
    hasOnCancelEdit: !!onCancelEdit,
    hasOnFilesSelected: !!onFilesSelected,
    membersCount: members.length,
    members: members // ✅ เพิ่ม log members เพื่อดูข้อมูล
  });

  // 🆕 ดึง currentUserId จาก userStore
  const { currentUser } = useUserStore();
  const currentUserId = currentUser?.id;

  // ✅ State สำหรับ mention autocomplete
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // 🆕 State สำหรับ schedule message dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // ✅ ใช้ useRef แทน useState เพื่อหลีกเลี่ยง closure issue
  const mentionsRef = useRef<MentionMetadata[]>([]);

  // 🆕 Typing indicator hook
  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId: conversationId || '',
    currentUserId: currentUserId || undefined
  });

  // 🆕 Auto-stop typing timer
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Memoize onSendMessage callback เพื่อหลีกเลี่ยง closure issue
  const handleSendWithMentions = useCallback((msg: string) => {
    console.log('[MessageInput] 🚀 BEFORE Send - mentions:', mentionsRef.current);
    onSendMessage(msg, mentionsRef.current);
    console.log('[MessageInput] 🧹 AFTER Send - Clearing mentions');
    mentionsRef.current = []; // ✅ Clear mentions after send
    console.log('[MessageInput] ✅ CLEARED - mentions now:', mentionsRef.current);
  }, [onSendMessage]);

  // ✅ Memoize onConfirmEdit callback เพื่อส่ง mentions ไปด้วย
  const handleConfirmEditWithMentions = useCallback((content: string) => {
    console.log('[MessageInput] ✏️ BEFORE Edit confirm - mentions:', mentionsRef.current);
    onConfirmEdit?.(content, mentionsRef.current);
    console.log('[MessageInput] 🧹 AFTER Edit - Clearing mentions');
    mentionsRef.current = []; // ✅ Clear mentions after edit
  }, [onConfirmEdit]);

  // ใช้ custom hook เพื่อจัดการ logic
  const {
    // State
    message,
    showPanel,
    activeTab,

    // Refs
    fileInputRef,
    imageInputRef,
    messageInputRef,
    smileButtonRef,
    panelRef,

    // Handlers
    handleSubmit: originalHandleSubmit,
    togglePanel,
    handleEmojiSelect,
    handleStickerSelect,
    handleFileButtonClick,
    handleImageButtonClick,
    handleFileChange,
    handleImageChange,
    handleMessageChange: originalHandleMessageChange,
    handleKeyDown: originalHandleKeyDown,
    setActiveTab
  } = useMessageInput({
    conversationId,
    onSendMessage: handleSendWithMentions, // ✅ ใช้ memoized callback
    onSendSticker,
    isLoading,
    onUploadImage,
    onUploadFile,
    onFilesSelected, // ✅ เพิ่ม
    editingMessage, // ✅ ส่งต่อ
    onConfirmEdit: handleConfirmEditWithMentions, // ✅ ใช้ wrapper ที่ส่ง mentions ไปด้วย
    onCancelEdit // ✅ ส่งต่อ
  });

  // 🆕 Notify parent when message changes (for drag & drop caption auto-fill)
  useEffect(() => {
    onMessageChange?.(message);
  }, [message, onMessageChange]);

  // 🆕 ตรวจจับ mobile device สำหรับ placeholder
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (window.innerWidth <= 768);
  }, []);

  const placeholder = isMobile
    ? "พิมพ์ข้อความ..."
    : "พิมพ์ข้อความ... (Shift+Enter เพื่อขึ้นบรรทัดใหม่)";

  // ✅ Mention autocomplete hook
  const {
    showSuggestions,
    suggestions,
    insertMention,
    closeSuggestions,
  } = useMentionAutocomplete(members, message, cursorPosition);

  // ✅ Debug mention autocomplete
  console.log('[MessageInput] 🔍 Mention Autocomplete State:', {
    membersCount: members.length,
    message,
    cursorPosition,
    showSuggestions,
    suggestionsCount: suggestions.length,
    suggestions
  });

  // ✅ Handle mention selection
  const handleMentionSelect = useCallback((suggestion: any) => {
    console.log('[MessageInput] 📌 Mention selected:', suggestion);
    const result = insertMention(suggestion);
    console.log('[MessageInput] 📌 Insert result:', result);

    // Update message with mention
    originalHandleMessageChange({
      target: { value: result.newValue }
    } as any);

    // Add mention metadata
    mentionsRef.current = [...mentionsRef.current, result.mention];
    console.log('[MessageInput] 📌 Updated mentions:', mentionsRef.current);

    // Update cursor position
    setCursorPosition(result.newCursorPosition);

    // Focus back to textarea
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        messageInputRef.current.setSelectionRange(
          result.newCursorPosition,
          result.newCursorPosition
        );
      }
    }, 0);
  }, [insertMention, originalHandleMessageChange, messageInputRef]);

  // ✅ Override handleMessageChange to track cursor
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    originalHandleMessageChange(e);
    setCursorPosition(e.target.selectionStart);

    // Clear mentions when message is cleared
    if (e.target.value === '') {
      mentionsRef.current = [];
    }

    // 🆕 Typing indicator logic
    if (conversationId) {
      if (e.target.value.trim() !== '') {
        // User is typing - start typing indicator
        startTyping();

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Auto-stop typing after 3 seconds of no activity
        typingTimeoutRef.current = setTimeout(() => {
          stopTyping();
        }, 3000);
      } else {
        // Message is empty - stop typing
        stopTyping();
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    }
  }, [originalHandleMessageChange, conversationId, startTyping, stopTyping]);

  // ✅ Override handleKeyDown for mention navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention dropdown is open, handle navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMentionSelect(suggestions[selectedMentionIndex]);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSuggestions();
        return;
      }
    }

    // Otherwise use original handler
    originalHandleKeyDown(e);
  }, [showSuggestions, suggestions, selectedMentionIndex, handleMentionSelect, closeSuggestions, originalHandleKeyDown]);

  // ✅ Override handleSubmit to clear mentions after send
  const handleSubmit = useCallback((e: React.FormEvent) => {
    console.log('[MessageInput] 📤 BEFORE Submit - mentions:', mentionsRef.current);
    originalHandleSubmit(e);
    console.log('[MessageInput] 🧹 AFTER Submit - Clearing mentions');
    mentionsRef.current = []; // ✅ Clear mentions after send
    console.log('[MessageInput] ✅ CLEARED - mentions now:', mentionsRef.current);

    // 🆕 Stop typing indicator when message is sent
    stopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [originalHandleSubmit, stopTyping]);

  // 🆕 Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return (
    <div className="p-3 bg-card border-t border-border">
      {/* ✅ แสดง Editing Indicator เมื่อกำลังแก้ไขข้อความ */}
      {editingMessage && (
        <EditingMessageIndicator
          editingMessage={editingMessage}
          onCancelEdit={onCancelEdit}
        />
      )}

      {/* แสดงข้อความที่กำลังตอบกลับ (แสดงเฉพาะตอนไม่ได้ editing) */}
      {replyingTo && !editingMessage && (
        <ReplyingToIndicator
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
        />
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* ปุ่มเพิ่มไฟล์ */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="เพิ่มไฟล์"
          onClick={handleFileButtonClick}
          disabled={isLoading}
        >
          <Paperclip size={20} />
        </button>
        
        {/* Input สำหรับอัปโหลดไฟล์เอกสาร (ซ่อนไว้) - ไม่รวมรูป/วิดีโอ */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z" // ✅ เฉพาะไฟล์เอกสาร
          multiple // ✅ เลือกได้หลายไฟล์
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading || (!onUploadFile && !onFilesSelected)}
        />

        <div className="relative flex-1">
          {/* ✅ Mention Autocomplete Dropdown */}
          {showSuggestions && (
            <MentionDropdown
              suggestions={suggestions}
              onSelect={handleMentionSelect}
              selectedIndex={selectedMentionIndex}
              onSelectedIndexChange={setSelectedMentionIndex}
            />
          )}

          {/* Textarea ข้อความ - รองรับหลายบรรทัด */}
          <textarea
            data-testid="message-input"
            ref={messageInputRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
            placeholder={placeholder}
            className="w-full border border-input rounded-2xl pl-4 pr-10 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[40px] max-h-[120px]"
            rows={1}
            style={{
              height: 'auto',
              overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden'
            }}
          />

          {/* Emoji & Sticker Button */}
          <button
            ref={smileButtonRef}
            type="button"
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${
              showPanel ? 'text-foreground' : ''
            }`}
            title="อีโมจิ"
            onClick={togglePanel}
          >
            <Smile size={20} />
          </button>
          
          {/* Emoji/Sticker Panel */}
          {showPanel && (
            <EmojiStickerPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onEmojiSelect={handleEmojiSelect}
              onStickerSelect={handleStickerSelect}
              panelRef={panelRef as RefObject<HTMLDivElement>} // แก้ไขตรงนี้
            />
          )}
        </div>

        {/* 🆕 ปุ่มตั้งเวลาส่งข้อความ */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="ตั้งเวลาส่งข้อความ"
          onClick={() => setShowScheduleDialog(true)}
          disabled={isLoading || !message.trim() || !conversationId}
        >
          <Clock size={20} />
        </button>

        {/* ปุ่มส่งรูปภาพ/วิดีโอ */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="ส่งรูปภาพ/วิดีโอ"
          onClick={handleImageButtonClick}
          disabled={isLoading || (!onUploadImage && !onFilesSelected)}
        >
          <Camera size={20} />
        </button>
        
        {/* Input สำหรับอัปโหลดรูปภาพ/วิดีโอ (ซ่อนไว้) */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*" // ✅ รองรับรูปภาพและวิดีโอ
          multiple // ✅ เลือกได้หลายไฟล์
          className="hidden"
          onChange={handleImageChange}
          disabled={isLoading || (!onUploadImage && !onFilesSelected)}
        />

        {/* ✅ ปุ่มส่งข้อความ / บันทึกการแก้ไข */}
        <button
          data-testid="send-button"
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`p-2 rounded-full transition-colors ${
            message.trim() && !isLoading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          title={editingMessage ? 'บันทึกการแก้ไข' : 'ส่งข้อความ'}
        >
          {editingMessage ? <Check size={18} /> : <Send size={18} />}
        </button>
      </form>

      {/* 🆕 Schedule Message Dialog */}
      {conversationId && (
        <ScheduleMessageDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          conversationId={conversationId}
          message={message}
          onScheduled={() => {
            // Clear message after scheduling
            originalHandleMessageChange({ target: { value: '' } } as any);
          }}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison: re-render เฉพาะเมื่อ props สำคัญเปลี่ยน
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.replyingTo?.id === nextProps.replyingTo?.id &&
    prevProps.editingMessage?.id === nextProps.editingMessage?.id &&
    prevProps.editingMessage?.content === nextProps.editingMessage?.content &&
    prevProps.members?.length === nextProps.members?.length &&
    // ✅ เช็ค callback functions เมื่อ replyingTo/editingMessage เปลี่ยน
    prevProps.onSendMessage === nextProps.onSendMessage &&
    prevProps.onConfirmEdit === nextProps.onConfirmEdit
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;