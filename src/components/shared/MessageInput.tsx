// src/components/shared/MessageInput.tsx
import React, { type RefObject } from 'react'; // เพิ่มการนำเข้า RefObject
import { Smile, Paperclip, Mic, Camera, Send } from 'lucide-react';

// นำเข้า custom hooks
import { useMessageInput } from './hooks/useMessageInput';

// นำเข้าคอมโพเนนต์ย่อย
import ReplyingToIndicator from './message/ReplyingToIndicator';
import EmojiStickerPanel from './message/EmojiStickerPanel';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onSendSticker?: (stickerId: string, stickerUrl: string, stickerSetId: string) => void;
  isLoading?: boolean;
  onUploadImage?: (file: File) => void;
  onUploadFile?: (file: File) => void;
  replyingTo?: { id: string; text: string; sender: string } | null;
  onCancelReply?: () => void;
}

/**
 * คอมโพเนนต์สำหรับป้อนและส่งข้อความ
 * ปรับปรุงโดยแยก logic ไปยัง custom hook และแยกส่วนการแสดงผลออกเป็นคอมโพเนนต์ย่อย
 */
const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  onSendSticker,
  isLoading = false,
  onUploadImage,
  onUploadFile,
  replyingTo,
  onCancelReply
}) => {
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
    handleSubmit,
    togglePanel,
    handleEmojiSelect,
    handleStickerSelect,
    handleFileButtonClick,
    handleImageButtonClick,
    handleFileChange,
    handleImageChange,
    handleMessageChange,
    setActiveTab
  } = useMessageInput({
    onSendMessage,
    onSendSticker,
    isLoading,
    onUploadImage,
    onUploadFile
  });

  return (
    <div className="p-3 bg-card border-t border-border">
      {/* แสดงข้อความที่กำลังตอบกลับ */}
      {replyingTo && (
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
        
        {/* Input สำหรับอัปโหลดไฟล์ (ซ่อนไว้) */}
        <input 
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading || !onUploadFile}
        />

        <div className="relative flex-1">
          {/* Input ข้อความ */}
          <input
            ref={messageInputRef}
            type="text"
            value={message}
            onChange={handleMessageChange}
            placeholder="พิมพ์ข้อความ..."
            className="w-full border border-input rounded-full pl-4 pr-10 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
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

        {/* ปุ่มบันทึกเสียง */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="บันทึกเสียง"
          disabled={isLoading}
        >
          <Mic size={20} />
        </button>

        {/* ปุ่มส่งรูปภาพ */}
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="ส่งรูปภาพ"
          onClick={handleImageButtonClick}
          disabled={isLoading || !onUploadImage}
        >
          <Camera size={20} />
        </button>
        
        {/* Input สำหรับอัปโหลดรูปภาพ (ซ่อนไว้) */}
        <input 
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
          disabled={isLoading || !onUploadImage}
        />

        {/* ปุ่มส่งข้อความ */}
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`p-2 rounded-full transition-colors ${
            message.trim() && !isLoading
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

export default MessageInput;