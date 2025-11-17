// src/components/shared/hooks/useMessageInput.ts
import { useState, useRef, useEffect, useCallback } from 'react';

interface UseMessageInputProps {
  onSendMessage: (message: string) => void;
  onSendSticker?: (stickerId: string, stickerUrl: string, stickerSetId: string) => void;
  isLoading?: boolean;
  onUploadImage?: (file: File) => void;
  onUploadFile?: (file: File) => void;
}

/**
 * Custom hook สำหรับจัดการ logic ของ MessageInput
 */
export function useMessageInput({
  onSendMessage,
  onSendSticker,
  isLoading = false,
  onUploadImage,
  onUploadFile
}: UseMessageInputProps) {
  // State
  const [message, setMessage] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"sticker" | "emoji">("sticker");
  
  // Refs - กำหนด type ที่ชัดเจนไม่มี null
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const smileButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null); // ถูกต้อง

  // ❌ ลบ auto-focus ออก - ไม่ต้อง focus อัตโนมัติเมื่อเข้าหน้าใหม่
  // useEffect(() => {
  //   if (!isLoading) {
  //     messageInputRef.current?.focus();
  //   }
  // }, [isLoading]);

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

  // Handlers
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault(); // ป้องกันการ refresh หน้า
    
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      
      // focus กลับไปที่ input ทันที
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
    }
  }, [message, isLoading, onSendMessage]);

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
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadFile) {
      onUploadFile(files[0]);
      // ล้างค่า input หลังจากอัปโหลด
      e.target.value = '';
      // focus กลับไปที่ input ข้อความ
      messageInputRef.current?.focus();
    }
  }, [onUploadFile]);
  
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadImage) {
      onUploadImage(files[0]);
      // ล้างค่า input หลังจากอัปโหลด
      e.target.value = '';
      // focus กลับไปที่ input ข้อความ
      messageInputRef.current?.focus();
    }
  }, [onUploadImage]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

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
    setActiveTab,
    setMessage
  };
}