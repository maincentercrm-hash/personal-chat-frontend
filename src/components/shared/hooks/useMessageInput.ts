// src/components/shared/hooks/useMessageInput.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDraftStore } from '@/stores/draftStore';
import { useClipboardPaste } from '@/hooks/useClipboardPaste';
import { toast } from '@/utils/toast';

interface UseMessageInputProps {
  conversationId?: string; // เพิ่ม conversationId สำหรับ draft
  onSendMessage: (message: string) => void;
  onSendSticker?: (stickerId: string, stickerUrl: string, stickerSetId: string) => void;
  isLoading?: boolean;
  onUploadImage?: (file: File) => void;
  onUploadFile?: (file: File) => void;
  onFilesSelected?: (files: File[], currentMessage?: string) => void; // ✅ เพิ่ม currentMessage parameter
  editingMessage?: { id: string; content: string } | null; // ✅ เพิ่ม
  onConfirmEdit?: (content: string) => void; // ✅ เพิ่ม - รับ content ที่แก้ไข!
  onCancelEdit?: () => void; // ✅ เพิ่ม
}

/**
 * Custom hook สำหรับจัดการ logic ของ MessageInput
 */
export function useMessageInput({
  conversationId,
  onSendMessage,
  onSendSticker,
  isLoading = false,
  onUploadImage,
  onUploadFile,
  onFilesSelected, // ✅ เพิ่ม
  editingMessage, // ✅ เพิ่ม
  onConfirmEdit, // ✅ เพิ่ม
  onCancelEdit // ✅ เพิ่ม
}: UseMessageInputProps) {
  // Draft store
  const { getDraft, setDraft, clearDraft } = useDraftStore();

  // State - initialize with draft if available
  const [message, setMessage] = useState(() => {
    return conversationId ? getDraft(conversationId) : '';
  });
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"sticker" | "emoji">("sticker");

  // Refs - กำหนด type ที่ชัดเจนไม่มี null
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const smileButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocusRef = useRef(false); // ✅ Track ว่าควร restore focus หรือไม่

  // Load draft เมื่อ conversationId เปลี่ยน
  useEffect(() => {
    if (conversationId) {
      const draft = getDraft(conversationId);
      setMessage(draft);
    } else {
      setMessage('');
    }
  }, [conversationId, getDraft]);

  // ✅ Pre-fill message เมื่อเข้า editing mode
  useEffect(() => {
    console.log('[useMessageInput] 📥 editingMessage changed:', editingMessage);

    if (editingMessage) {
      console.log('[useMessageInput] ✏️ Pre-filling message:', editingMessage.content);
      setMessage(editingMessage.content);

      // Focus และ select all - ใช้ interval เพื่อ re-select ต่อเนื่องจนกว่าจะแน่ใจว่า selection ค้างไว้
      let attemptCount = 0;
      const maxAttempts = 10; // พยายาม 10 ครั้ง

      const selectText = () => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
          messageInputRef.current.select();
          attemptCount++;
          console.log(`[useMessageInput] 🎯 Attempt ${attemptCount}: Focused and selected text`);
        }
      };

      // เรียกทันที
      selectText();

      // ตั้ง interval ทำซ้ำทุก 50ms เป็นเวลา 500ms (10 ครั้ง)
      const intervalId = setInterval(() => {
        if (attemptCount < maxAttempts) {
          selectText();
        } else {
          clearInterval(intervalId);
          console.log('[useMessageInput] ✅ Selection stabilized');
        }
      }, 50);

      // Cleanup interval เมื่อ component unmount หรือ editingMessage เปลี่ยน
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [editingMessage]);

  // ✅ Restore focus หลัง re-render ถ้ามี flag ตั้งไว้
  useEffect(() => {
    if (shouldRestoreFocusRef.current) {
      messageInputRef.current?.focus();
      shouldRestoreFocusRef.current = false;
    }
  });

  // Save draft ทุกครั้งที่ message เปลี่ยน
  useEffect(() => {
    if (conversationId) {
      setDraft(conversationId, message);
    }
  }, [message, conversationId, setDraft]);

  // Auto-grow textarea ตามเนื้อหา
  useEffect(() => {
    const textarea = messageInputRef.current;
    if (textarea) {
      // Reset height เพื่อคำนวณใหม่
      textarea.style.height = 'auto';
      // ตั้งค่า height ตามเนื้อหา (ไม่เกิน max-height ที่กำหนดใน CSS)
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Event listener เพื่อปิด panel เมื่อคลิกนอกพื้นที่
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

  // ✅ NEW: Clipboard paste handler for images/screenshots
  const { handlePaste: handleClipboardPaste } = useClipboardPaste({
    onFilesDetected: (files) => {
      console.log('[useMessageInput] Clipboard files detected:', files.length);

      // ✅ ใช้ callback เดียวกับ drag & drop
      if (onFilesSelected) {
        onFilesSelected(files);
      } else {
        console.warn('[useMessageInput] onFilesSelected not provided, cannot handle pasted files');
      }
    },
    onError: (error) => {
      console.error('[useMessageInput] Clipboard paste error:', error.message);
      // ✅ แสดง toast notification แทน alert
      toast.error('ไม่สามารถวางรูปภาพได้', error.message);
    }
  });

  // ✅ Attach paste listener when component mounts
  useEffect(() => {
    // เพิ่ม listener ที่ window level
    const pasteHandler = (e: ClipboardEvent) => {
      // ✅ เช็คว่า focus อยู่ที่ textarea หรือไม่
      // เพื่อป้องกันจับ paste ในที่อื่น
      if (document.activeElement === messageInputRef.current) {
        handleClipboardPaste(e);
      }
    };

    window.addEventListener('paste', pasteHandler);

    return () => {
      window.removeEventListener('paste', pasteHandler);
    };
  }, [handleClipboardPaste]);

  // Handlers
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && !isLoading) {
      // ✅ ตั้ง flag ก่อนส่ง - เพื่อ restore focus หลัง re-render
      shouldRestoreFocusRef.current = true;

      // ✅ ถ้าอยู่ใน editing mode ให้เรียก onConfirmEdit พร้อมส่ง content ที่แก้ไข
      if (editingMessage && onConfirmEdit) {
        console.log('[useMessageInput] 💾 บันทึกการแก้ไข:', message.trim());
        onConfirmEdit(message.trim()); // ✅ ส่ง content ที่แก้ไขไปด้วย!
        setMessage('');
      } else {
        onSendMessage(message.trim());
        setMessage('');

        // Clear draft หลังส่งข้อความ
        if (conversationId) {
          clearDraft(conversationId);
        }
      }
    }
  }, [message, isLoading, onSendMessage, conversationId, clearDraft, editingMessage, onConfirmEdit]);

  const togglePanel = useCallback(() => {
    setShowPanel(!showPanel);
  }, [showPanel]);
  
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    // ไม่ปิด panel เพื่อให้เลือก emoji หลายตัวได้
    messageInputRef.current?.focus();
  }, []);
  
  const handleStickerSelect = useCallback((stickerId: string, stickerUrl: string, stickerSetId: string) => {
    if (onSendSticker) {
      onSendSticker(stickerId, stickerUrl, stickerSetId);
      setShowPanel(false);
    }
  }, [onSendSticker]);
  
  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const handleImageButtonClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  // ✅ Validate file size (100MB limit)
  const validateFileSize = useCallback((file: File): boolean => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      toast.error(`ไฟล์ ${file.name} มีขนาด ${sizeMB}MB (สูงสุด 100MB)`);
      return false;
    }
    return true;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // ✅ Validate file size
      if (!validateFileSize(files[0])) {
        e.target.value = '';
        return;
      }

      // ✅ 📎 Paperclip button = Document files = Single file upload (creates message_type: "file")
      // Always use onUploadFile for document files, NOT onFilesSelected
      if (onUploadFile) {
        onUploadFile(files[0]);
      }

      // ล้างค่า input หลังจากอัปโหลด
      e.target.value = '';
      // focus กลับไปที่ input ข้อความ
      messageInputRef.current?.focus();
    }
  }, [onUploadFile, validateFileSize]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // ✅ ถ้ามี onFilesSelected (รองรับหลายไฟล์) → ใช้แทน
      if (onFilesSelected) {
        const fileArray = Array.from(files);

        // ✅ Validate all files
        const invalidFiles = fileArray.filter(file => !validateFileSize(file));
        if (invalidFiles.length > 0) {
          e.target.value = '';
          return;
        }

        // 🆕 ส่ง message text ไปด้วย เพื่อ auto-fill caption
        const currentMessage = message.trim();
        onFilesSelected(fileArray, currentMessage);

        // 🆕 ล้าง message input หลังจากโอนข้อความไปเป็น caption แล้ว
        if (currentMessage) {
          setMessage('');
          // Clear draft ด้วย
          if (conversationId) {
            clearDraft(conversationId);
          }
        }
      }
      // ✅ ไม่มี onFilesSelected → ใช้ onUploadImage แบบเดิม (ไฟล์เดียว)
      else if (onUploadImage) {
        // ✅ Validate single file
        if (!validateFileSize(files[0])) {
          e.target.value = '';
          return;
        }
        onUploadImage(files[0]);
      }

      // ล้างค่า input หลังจากอัปโหลด
      e.target.value = '';
      // focus กลับไปที่ input ข้อความ
      messageInputRef.current?.focus();
    }
  }, [onUploadImage, onFilesSelected, message, conversationId, clearDraft, validateFileSize]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  // Handle Enter key: Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ✅ Escape = ยกเลิกการแก้ไข
    if (e.key === 'Escape' && editingMessage && onCancelEdit) {
      e.preventDefault();
      onCancelEdit();
      setMessage('');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (message.trim() && !isLoading) {
        // ✅ ตั้ง flag ก่อนส่ง - เพื่อ restore focus หลัง re-render
        shouldRestoreFocusRef.current = true;

        // ✅ ถ้าอยู่ใน editing mode ให้เรียก onConfirmEdit พร้อมส่ง content ที่แก้ไข
        if (editingMessage && onConfirmEdit) {
          console.log('[useMessageInput] ⌨️ กด Enter - บันทึกการแก้ไข:', message.trim());
          onConfirmEdit(message.trim()); // ✅ ส่ง content ที่แก้ไขไปด้วย!
          setMessage('');
        } else {
          onSendMessage(message.trim());
          setMessage('');

          // Clear draft หลังส่งข้อความ
          if (conversationId) {
            clearDraft(conversationId);
          }
        }
      }
    }
  }, [message, isLoading, onSendMessage, conversationId, clearDraft, editingMessage, onConfirmEdit, onCancelEdit]);

  return {
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
    handleSubmit,
    togglePanel,
    handleEmojiSelect,
    handleStickerSelect,
    handleFileButtonClick,
    handleImageButtonClick,
    handleFileChange,
    handleImageChange,
    handleMessageChange,
    handleKeyDown,
    setActiveTab,
    setMessage
  };
}