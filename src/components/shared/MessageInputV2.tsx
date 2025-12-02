// src/components/shared/MessageInputV2.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smile, Paperclip, Mic, Camera, Send } from 'lucide-react';
import { useActiveConversation } from '@/contexts/ActiveConversationContext';
import { useDraftStore } from '@/stores/draftStore';
import ReplyingToIndicator from './message/ReplyingToIndicator';
import EmojiStickerPanel from './message/EmojiStickerPanel';

/**
 * MessageInputV2 - Refactored version using ActiveConversationContext
 *
 * ✅ ไม่มี props drilling
 * ✅ ใช้ context เพื่อ access conversation state
 * ✅ conversationId จาก context (stable, single source of truth)
 * ✅ Focus lock mechanism built-in
 * ✅ Draft system integrated
 */
const MessageInputV2: React.FC = () => {
  console.log('[MessageInputV2] Component rendered');

  // ✅ ใช้ context แทน props
  const {
    conversationId,
    sendMessage,
    sendSticker,
    uploadImage,
    uploadFile,
    isSending,
    replyingTo,
    setReplyingTo,
  } = useActiveConversation();

  // ✅ Draft system
  const { getDraft, setDraft, clearDraft } = useDraftStore();

  // Local state
  const [message, setMessage] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'sticker' | 'emoji'>('sticker');
  const [focusLocked, setFocusLocked] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const smileButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevConversationIdRef = useRef<string | null>(null);

  // ✅ Load draft เมื่อ conversationId เปลี่ยน (เท่านั้น!)
  useEffect(() => {
    // ✅ ป้องกัน infinite loop: เช็คว่า conversationId เปลี่ยนจริงๆ
    if (prevConversationIdRef.current === conversationId) {
      return;
    }

    console.log('[MessageInputV2] Loading draft for conversation:', conversationId);
    prevConversationIdRef.current = conversationId;

    if (conversationId) {
      const draft = getDraft(conversationId);
      setMessage(draft);
    } else {
      setMessage('');
    }
  }, [conversationId, getDraft]);

  // ✅ Save draft ทุกครั้งที่ message เปลี่ยน (debounced)
  useEffect(() => {
    if (!conversationId) return;

    // Debounce draft saving
    const timeoutId = setTimeout(() => {
      if (message) {
        setDraft(conversationId, message);
      }
    }, 300); // Save after 300ms of no typing

    return () => clearTimeout(timeoutId);
  }, [conversationId, message]); // ← ลบ setDraft ออก (stable function from zustand)

  // ✅ Focus lock: รักษา focus ไว้ขณะส่งข้อความ
  useEffect(() => {
    if (focusLocked && document.activeElement !== messageInputRef.current) {
      console.log('[MessageInputV2] Focus locked - restoring focus');
      messageInputRef.current?.focus();
    }
  }, [focusLocked]);

  // Auto-grow textarea
  useEffect(() => {
    const textarea = messageInputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPanel &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        smileButtonRef.current &&
        !smileButtonRef.current.contains(event.target as Node)
      ) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  // ✅ Handle send - ใช้ sendMessage จาก context (stable!)
  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;

    console.log('[MessageInputV2] Sending message to conversation:', conversationId);

    // ✅ Lock focus ก่อนส่ง
    setFocusLocked(true);

    const messageToSend = message.trim();
    setMessage('');

    try {
      // ✅ sendMessage จาก context - always ส่งไปยัง conversation ที่ถูกต้อง!
      await sendMessage(messageToSend);

      // Clear draft หลังส่งสำเร็จ
      if (conversationId) {
        clearDraft(conversationId);
      }
    } catch (error) {
      console.error('[MessageInputV2] Error sending message:', error);
      // Restore message if failed
      setMessage(messageToSend);
    } finally {
      // ✅ Unlock focus หลัง 500ms
      setTimeout(() => {
        setFocusLocked(false);
        messageInputRef.current?.focus();
        console.log('[MessageInputV2] Focus lock released');
      }, 500);
    }
  }, [message, isSending, conversationId, sendMessage, clearDraft]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend]
  );

  // Handle keydown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ✅ Handle blur - prevent blur when focus is locked
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (focusLocked) {
        e.preventDefault();
        console.log('[MessageInputV2] Blur prevented - focus is locked');
        messageInputRef.current?.focus();
      }
    },
    [focusLocked]
  );

  // Handle emoji select
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage((prev) => prev + emoji);
    messageInputRef.current?.focus();
  }, []);

  // Handle sticker select
  const handleStickerSelect = useCallback(
    (stickerId: string, stickerUrl: string, stickerSetId: string) => {
      console.log('[MessageInputV2] Sending sticker to conversation:', conversationId);
      sendSticker(stickerId, stickerUrl, stickerSetId);
      setShowPanel(false);
    },
    [conversationId, sendSticker]
  );

  // Handle file upload
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        console.log('[MessageInputV2] Uploading file to conversation:', conversationId);
        uploadFile(files[0]);
        e.target.value = '';
        messageInputRef.current?.focus();
      }
    },
    [conversationId, uploadFile]
  );

  // Handle image upload
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        console.log('[MessageInputV2] Uploading image to conversation:', conversationId);
        uploadImage(files[0]);
        e.target.value = '';
        messageInputRef.current?.focus();
      }
    },
    [conversationId, uploadImage]
  );

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, [setReplyingTo]);

  return (
    <div className="p-3 bg-card border-t border-border">
      {/* Replying To Indicator */}
      {replyingTo && (
        <ReplyingToIndicator
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* File Upload Button */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="เพิ่มไฟล์"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <Paperclip size={20} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z" // ✅ เฉพาะไฟล์เอกสาร (ไม่รวมรูป/วิดีโอ)
          className="hidden"
          onChange={handleFileChange}
          disabled={isSending}
        />

        <div className="relative flex-1">
          {/* Message Textarea */}
          <textarea
            data-testid="message-input"
            ref={messageInputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="พิมพ์ข้อความ... (Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
            className="w-full border border-input rounded-2xl pl-4 pr-10 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[40px] max-h-[120px]"
            disabled={isSending}
            rows={1}
            style={{
              height: 'auto',
              overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden',
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
            onClick={() => setShowPanel(!showPanel)}
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
              panelRef={panelRef as React.RefObject<HTMLDivElement>}
            />
          )}
        </div>

        {/* Voice Record Button */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="บันทึกเสียง"
          disabled={isSending}
        >
          <Mic size={20} />
        </button>

        {/* Image Upload Button */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="ส่งรูปภาพ"
          onClick={() => imageInputRef.current?.click()}
          disabled={isSending}
        >
          <Camera size={20} />
        </button>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
          disabled={isSending}
        />

        {/* Send Button */}
        <button
          data-testid="send-button"
          type="submit"
          disabled={!message.trim() || isSending}
          className={`p-2 rounded-full transition-colors ${
            message.trim() && !isSending
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          title="ส่งข้อความ"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

// ✅ React.memo - ป้องกัน re-render ที่ไม่จำเป็น
export default React.memo(MessageInputV2);
