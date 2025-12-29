/**
 * useChatV2Features - Feature hook สำหรับ Chat V2
 *
 * รวม features ทั้งหมดที่จำเป็นสำหรับ chat:
 * - Jump to message (with API fetch)
 * - Drag & Drop upload
 * - Multi-file upload
 * - Single image/file upload
 * - Sticker sending
 */

import { useState, useCallback, useRef } from 'react';
import { useMessage } from '@/hooks/useMessage';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useBulkUpload, type BulkUploadResult } from '@/hooks/useBulkUpload';
import useConversationStore from '@/stores/conversationStore';
import useUIStore from '@/stores/uiStore';
import conversationService from '@/services/conversationService';
import scheduledMessageService from '@/services/scheduledMessageService';
import messageService from '@/services/messageService';
import type { MessageDTO } from '@/types/message.types';
import type { MessageListRef } from '@/components/chat-v2/MessageList';
import type { BulkMessageFileItem } from '@/types/file.types';

export interface UseChatV2FeaturesOptions {
  conversationId: string | undefined;
  messages: MessageDTO[];
  messageListRef: React.RefObject<MessageListRef>;
  currentMessageText?: string; // ✅ Track message input text for drag & drop caption
}

export interface ChatV2Features {
  // Jump to message
  handleJumpToMessage: (messageId: string) => Promise<void>;
  handleJumpToDate: (date: string) => Promise<void>;
  isJumping: boolean;

  // Upload
  handleUploadImage: (file: File) => Promise<void>;
  handleUploadFile: (file: File) => Promise<void>;
  handleSendSticker: (stickerId: string, stickerUrl: string, stickerSetId: string) => Promise<void>;

  // Drag & Drop
  isDragging: boolean;
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };

  // Multi-file upload
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  showFilePreview: boolean;
  setShowFilePreview: (show: boolean) => void;
  handleFilesSelected: (files: File[], currentMessage?: string) => void;
  handleSendFiles: (caption?: string) => Promise<void>;
  handleScheduleFiles: (caption: string, scheduledAt: Date) => Promise<void>; // 🆕 Schedule files
  handleCancelFilePreview: () => void;
  uploadProgress: number;
  isUploading: boolean;
  pendingCaption: string; // ✅ caption จาก input text

  // Load more at bottom (for jump context)
  handleLoadMoreAtBottom: () => Promise<void>;
  hasMoreBottom: boolean;

  // Jump to latest messages (reset to normal state)
  handleJumpToLatest: () => Promise<void>;
}

export const useChatV2Features = (options: UseChatV2FeaturesOptions): ChatV2Features => {
  const { conversationId, messages, messageListRef, currentMessageText = '' } = options;

  // Message hook
  const {
    uploadAndSendImage,
    uploadAndSendFile,
    sendStickerMessage,
  } = useMessage();

  // Store actions
  const replaceMessagesWithContext = useConversationStore(state => state.replaceMessagesWithContext);
  const fetchMoreMessages = useConversationStore(state => state.fetchMoreMessages);
  const fetchConversationMessages = useConversationStore(state => state.fetchConversationMessages);
  const hasAfterMessages = useConversationStore(state => state.hasAfterMessages);
  const setHighlightedMessageId = useUIStore(state => state.setHighlightedMessageId);
  const setIsUploading = useUIStore(state => state.setIsUploading);
  const setUploadProgress = useUIStore(state => state.setUploadProgress);

  // Local state
  const [isJumping, setIsJumping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [pendingCaption, setPendingCaption] = useState<string>(''); // ✅ เก็บ caption จาก input
  const isJumpingRef = useRef(false);

  // Bulk upload hook
  const bulkUpload = useBulkUpload({
    conversationId: conversationId || '',
    onProgress: (progress) => {
      setUploadProgress(progress.overallProgress);
    },
    onSuccess: () => {
      setShowFilePreview(false);
      setSelectedFiles([]);
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error) => {
      console.error('[ChatV2Features] Bulk upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  });

  // ============================================================================
  // Jump to Message
  // ============================================================================

  const handleJumpToMessage = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    // Check if message exists in current messages
    const messageExists = messages.some(m => m.id === messageId);

    if (messageExists) {
      // Message in memory - just scroll with highlight
      console.log('[Jump] Message exists in memory, scrolling directly');
      messageListRef.current?.scrollToMessage(messageId);
      setHighlightedMessageId(messageId);
      return;
    }

    // Message not in memory - fetch context from API
    console.log('[Jump] Fetching message context from API...');
    setIsJumping(true);
    isJumpingRef.current = true;

    try {
      const response = await conversationService.getMessageContext(conversationId, {
        targetId: messageId,
        before: 50,
        after: 50
      });

      if (response.success && response.data) {
        // Response structure from media.types.ts MessageContextResponse:
        // { success, data: MessageDTO[], has_before, has_after }
        const contextMessages = (response.data as MessageDTO[]) || [];
        // Cast to access root-level properties
        const apiResponse = response as unknown as {
          has_before: boolean;
          has_after: boolean;
        };
        const has_before = apiResponse.has_before ?? false;
        const has_after = apiResponse.has_after ?? false;

        console.log('[Jump] Context response:', {
          messagesCount: contextMessages.length,
          has_before,
          has_after
        });

        // Replace messages in store
        replaceMessagesWithContext(
          conversationId,
          contextMessages,
          has_before ?? false,
          has_after ?? false
        );

        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 300));

        // Scroll to target message
        messageListRef.current?.scrollToMessage(messageId);
        setHighlightedMessageId(messageId);
      }
    } catch (error) {
      console.error('[Jump] Failed to fetch context:', error);
    } finally {
      setIsJumping(false);
      isJumpingRef.current = false;
    }
  }, [conversationId, messages, messageListRef, replaceMessagesWithContext, setHighlightedMessageId]);

  // ============================================================================
  // Load More at Bottom (for jump context)
  // ============================================================================

  const handleLoadMoreAtBottom = useCallback(async () => {
    if (!conversationId) return;

    const newestMessage = messages[messages.length - 1];
    if (!newestMessage) return;

    console.log('[LoadMore] Loading more messages at bottom...');
    try {
      await fetchMoreMessages(conversationId, {
        after: newestMessage.id,
        limit: 50
      });
    } catch (error) {
      console.error('[LoadMore] Failed to load more at bottom:', error);
    }
  }, [conversationId, messages, fetchMoreMessages]);

  // ============================================================================
  // Jump to Latest Messages (reset to normal state)
  // ============================================================================

  const handleJumpToLatest = useCallback(async () => {
    if (!conversationId) return;

    console.log('[JumpToLatest] Fetching latest messages...');
    setIsJumping(true);

    try {
      // Re-fetch conversation messages (this resets hasAfterMessages to false)
      await fetchConversationMessages(conversationId, { limit: 50 });

      // Wait for DOM update then scroll to bottom
      await new Promise(resolve => setTimeout(resolve, 100));
      messageListRef.current?.scrollToBottom(false);
    } catch (error) {
      console.error('[JumpToLatest] Failed to fetch latest:', error);
    } finally {
      setIsJumping(false);
    }
  }, [conversationId, fetchConversationMessages, messageListRef]);

  // ============================================================================
  // Jump to Date
  // ============================================================================

  const handleJumpToDate = useCallback(async (date: string) => {
    if (!conversationId) return;

    console.log('[JumpToDate] Fetching messages for date:', date);
    setIsJumping(true);

    try {
      // Fetch messages for the selected date
      const response = await messageService.getMessagesByDate(conversationId, date, 50);

      if (response.success && response.data) {
        // API response structure:
        // { success, data: { messages, date, total, has_more_before, has_more_after } }
        const responseData = response.data as unknown as {
          messages: MessageDTO[];
          date: string;
          total: number;
          has_more_before: boolean;
          has_more_after: boolean;
        };

        const dateMessages = responseData.messages || [];
        const has_before = responseData.has_more_before ?? true;
        const has_after = responseData.has_more_after ?? true;

        console.log('[JumpToDate] Response:', {
          messagesCount: dateMessages.length,
          has_before,
          has_after,
          firstMessage: dateMessages[0]?.created_at
        });

        if (dateMessages.length > 0) {
          // Replace current messages with the date context
          replaceMessagesWithContext(
            conversationId,
            dateMessages,
            has_before,
            has_after
          );

          // Wait for DOM to update
          await new Promise(resolve => setTimeout(resolve, 300));

          // Scroll to first message of that day
          const firstMessage = dateMessages[0];
          if (firstMessage) {
            messageListRef.current?.scrollToMessage(firstMessage.id);
            setHighlightedMessageId(firstMessage.id);
          }
        } else {
          console.log('[JumpToDate] No messages found for date:', date);
        }
      }
    } catch (error) {
      console.error('[JumpToDate] Failed to fetch messages:', error);
    } finally {
      setIsJumping(false);
    }
  }, [conversationId, replaceMessagesWithContext, messageListRef, setHighlightedMessageId]);

  // ============================================================================
  // Single File Upload
  // ============================================================================

  const handleUploadImage = useCallback(async (file: File) => {
    if (!conversationId) return;

    console.log('[Upload] Uploading image:', file.name);
    setIsUploading(true);
    try {
      await uploadAndSendImage(conversationId, file);
    } catch (error) {
      console.error('[Upload] Failed to upload image:', error);
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, uploadAndSendImage, setIsUploading]);

  const handleUploadFile = useCallback(async (file: File) => {
    if (!conversationId) return;

    console.log('[Upload] Uploading file:', file.name);
    setIsUploading(true);
    try {
      await uploadAndSendFile(conversationId, file);
    } catch (error) {
      console.error('[Upload] Failed to upload file:', error);
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, uploadAndSendFile, setIsUploading]);

  // ============================================================================
  // Sticker
  // ============================================================================

  const handleSendSticker = useCallback(async (stickerId: string, stickerUrl: string, stickerSetId: string) => {
    if (!conversationId) return;

    console.log('[Sticker] Sending sticker:', stickerId);
    try {
      await sendStickerMessage(conversationId, stickerId, stickerSetId, stickerUrl);
    } catch (error) {
      console.error('[Sticker] Failed to send sticker:', error);
    }
  }, [conversationId, sendStickerMessage]);

  // ============================================================================
  // Multi-file Upload
  // ============================================================================

  const handleFilesSelected = useCallback((files: File[], currentMessage?: string) => {
    if (files.length === 0) return;

    console.log('[MultiUpload] Files selected:', files.length, 'caption:', currentMessage);
    setSelectedFiles(files);
    setPendingCaption(currentMessage || ''); // ✅ เก็บ caption จาก input
    setShowFilePreview(true);
  }, []);

  const handleSendFiles = useCallback(async (caption?: string): Promise<void> => {
    if (!conversationId || selectedFiles.length === 0) return;

    console.log('[MultiUpload] Sending', selectedFiles.length, 'files');
    setIsUploading(true);

    try {
      const result: BulkUploadResult = await bulkUpload.uploadFiles(selectedFiles, caption);
      console.log('[MultiUpload] Upload complete:', result);

      // Scroll to bottom after upload
      setTimeout(() => {
        messageListRef.current?.scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('[MultiUpload] Failed to send files:', error);
    }
  }, [conversationId, selectedFiles, bulkUpload, messageListRef, setIsUploading]);

  const handleCancelFilePreview = useCallback(() => {
    setShowFilePreview(false);
    setSelectedFiles([]);
    setPendingCaption(''); // ✅ Clear caption
  }, []);

  // 🆕 Schedule files for later sending
  const handleScheduleFiles = useCallback(async (caption: string, scheduledAt: Date): Promise<void> => {
    if (!conversationId || selectedFiles.length === 0) return;

    console.log('[Schedule] Scheduling', selectedFiles.length, 'files for', scheduledAt);
    setIsUploading(true);

    try {
      // Step 1: Upload files first (without creating message)
      const uploadedFiles: BulkMessageFileItem[] = await bulkUpload.uploadFilesOnly(selectedFiles);
      console.log('[Schedule] Files uploaded:', uploadedFiles);

      // Step 2: Determine message type
      // If multiple files → album, single file → its type
      let messageType: 'text' | 'image' | 'file' | 'album' = 'album';
      let mediaUrl: string | undefined;
      let metadata: Record<string, unknown> = {};

      if (uploadedFiles.length === 1) {
        const file = uploadedFiles[0];
        messageType = file.message_type as 'image' | 'file';
        mediaUrl = file.media_url;
        metadata = {
          file_name: file.file_name,
          file_size: file.file_size,
          thumbnail_url: file.media_thumbnail_url,
        };
      } else {
        // Album - store all file info in metadata
        messageType = 'album';
        metadata = {
          album_files: uploadedFiles.map(f => ({
            media_url: f.media_url,
            thumbnail_url: f.media_thumbnail_url,
            file_name: f.file_name,
            file_size: f.file_size,
            message_type: f.message_type,
          })),
        };
      }

      // Step 3: Create scheduled message
      const scheduledData = {
        message_type: messageType,
        content: caption || '',
        media_url: mediaUrl,
        metadata,
        scheduled_at: scheduledMessageService.toRFC3339(scheduledAt),
      };

      const response = await scheduledMessageService.scheduleMessage(conversationId, scheduledData);
      console.log('[Schedule] Scheduled message created:', response);

      // Step 4: Clean up
      setShowFilePreview(false);
      setSelectedFiles([]);
      setPendingCaption('');

    } catch (error) {
      console.error('[Schedule] Failed to schedule files:', error);
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, selectedFiles, bulkUpload, setIsUploading]);

  // ============================================================================
  // Drag & Drop
  // ============================================================================

  const { isDragging, dragHandlers } = useDragAndDrop({
    onDrop: (files) => {
      // ✅ ส่ง currentMessageText ไปเป็น caption
      handleFilesSelected(files, currentMessageText);
    },
    onError: (error) => {
      console.error('[DragDrop] Error:', error);
    },
    maxFiles: 10,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Jump
    handleJumpToMessage,
    handleJumpToDate,
    isJumping,

    // Upload
    handleUploadImage,
    handleUploadFile,
    handleSendSticker,

    // Drag & Drop
    isDragging,
    dragHandlers,

    // Multi-file
    selectedFiles,
    setSelectedFiles,
    showFilePreview,
    setShowFilePreview,
    handleFilesSelected,
    handleSendFiles,
    handleScheduleFiles, // 🆕 Schedule files
    handleCancelFilePreview,
    uploadProgress: bulkUpload.progress?.overallProgress || 0,
    isUploading: bulkUpload.uploading,
    pendingCaption, // ✅ caption จาก input

    // Load more / Jump to latest
    handleLoadMoreAtBottom,
    hasMoreBottom: conversationId ? hasAfterMessages[conversationId] ?? false : false,
    handleJumpToLatest,
  };
};

export default useChatV2Features;
