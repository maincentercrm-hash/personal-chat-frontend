/**
 * ChatV2TestPage - Full-featured chat page using chat-v2 components
 *
 * Features:
 * 1. Message list with virtualized scrolling
 * 2. Send text messages with reply
 * 3. Edit/Delete messages
 * 4. Upload images/files
 * 5. Send stickers
 * 6. Drag & Drop multi-file upload
 * 7. Jump to message (with API context fetch)
 *
 * Uses:
 * - uiStore: for UI state (editing, replying, sending)
 * - conversationStore: for messages data
 * - useChatV2Features: for advanced features (jump, upload, drag-drop)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import useConversationStore from '@/stores/conversationStore';
import useUIStore from '@/stores/uiStore';
import { useMessage } from '@/hooks/useMessage';
import { useConversation } from '@/hooks/useConversation';
import { useChatV2Features } from '@/hooks/useChatV2Features';
import useAuth from '@/hooks/useAuth';
import { MessageList } from '@/components/chat-v2/MessageList';
import type { MessageListRef } from '@/components/chat-v2/MessageList';
import MessageInputArea from '@/components/shared/MessageInputArea';
import { MultiFilePreview } from '@/components/shared/MultiFilePreview';
import { Upload } from 'lucide-react';

export default function ChatV2TestPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // ✅ IMPORTANT: useConversation hook subscribes to WebSocket events
  // This enables real-time message updates from other users
  useConversation();

  // Store selectors
  const conversationMessages = useConversationStore(state => state.conversationMessages);
  const hasMoreMessages = useConversationStore(state => state.hasMoreMessages);
  const fetchConversationMessages = useConversationStore(state => state.fetchConversationMessages);
  const fetchMoreMessages = useConversationStore(state => state.fetchMoreMessages);
  const setActiveConversation = useConversationStore(state => state.setActiveConversation);

  // UI state from uiStore
  const replyingTo = useUIStore(state => state.replyingTo);
  const editingMessage = useUIStore(state => state.editingMessage);
  const setReplyingTo = useUIStore(state => state.setReplyingTo);
  const setEditingMessage = useUIStore(state => state.setEditingMessage);
  const isSending = useUIStore(state => state.isSending);
  const setIsSending = useUIStore(state => state.setIsSending);
  const clearUIState = useUIStore(state => state.clearUIState);

  // Message hook
  const { sendTextMessage, replyToMessage, editMessage, deleteMessage } = useMessage();

  // Refs
  const messageListRef = useRef<MessageListRef>(null);

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Get messages for current conversation
  const messages = conversationId ? conversationMessages[conversationId] || [] : [];
  const hasMore = conversationId ? hasMoreMessages[conversationId] ?? true : false;

  // Chat V2 Features hook (jump, upload, drag-drop)
  const features = useChatV2Features({
    conversationId,
    messages,
    messageListRef
  });

  // Load initial messages and set active conversation
  useEffect(() => {
    if (!conversationId) {
      setIsReady(false);
      setActiveConversation(null);
      return;
    }

    // Set active conversation in store
    setActiveConversation(conversationId);

    const loadMessages = async () => {
      setIsLoading(true);
      setIsReady(false);

      try {
        await fetchConversationMessages(conversationId, { limit: 50 });
      } catch (error) {
        console.error('[ChatV2Test] Failed to load messages:', error);
      } finally {
        setIsLoading(false);
        setIsReady(true);
      }
    };

    loadMessages();

    // Cleanup
    return () => {
      setActiveConversation(null);
      clearUIState();
    };
  }, [conversationId, fetchConversationMessages, setActiveConversation, clearUIState]);

  // Load more handler (top)
  const handleLoadMore = useCallback(async () => {
    if (!conversationId || isLoading) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setIsLoading(true);
    try {
      await fetchMoreMessages(conversationId, {
        before: oldestMessage.id,
        limit: 50,
      });
    } catch (error) {
      console.error('[ChatV2Test] Failed to load more:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, isLoading, fetchMoreMessages]);

  // Send message handler
  const handleSendMessage = useCallback(async (message: string) => {
    if (!conversationId || !message.trim() || isSending) return;

    setIsSending(true);
    try {
      if (replyingTo) {
        console.log('[ChatV2Test] Replying to message:', replyingTo.id);
        await replyToMessage(replyingTo.id, 'text', message.trim());
      } else {
        await sendTextMessage(conversationId, message.trim());
      }
      // Scroll to bottom after sending
      setTimeout(() => {
        messageListRef.current?.scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('[ChatV2Test] Failed to send message:', error);
    } finally {
      setIsSending(false);
      setReplyingTo(null);
    }
  }, [conversationId, isSending, sendTextMessage, replyToMessage, replyingTo, setIsSending, setReplyingTo]);

  // Sticker handler
  const handleSendSticker = useCallback((stickerId: string, stickerUrl: string, stickerSetId: string) => {
    features.handleSendSticker(stickerId, stickerUrl, stickerSetId);
  }, [features]);

  // Upload handlers
  const handleUploadImage = useCallback((file: File) => {
    features.handleUploadImage(file);
  }, [features]);

  const handleUploadFile = useCallback((file: File) => {
    features.handleUploadFile(file);
  }, [features]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, [setReplyingTo]);

  // Reply handler
  const handleReply = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyingTo({
        id: message.id,
        text: message.content || '[Media]',
        sender: message.sender_name || 'Unknown',
      });
    }
  }, [messages, setReplyingTo]);

  // Edit handler
  const handleEdit = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.content) {
      setEditingMessage({
        id: message.id,
        content: message.content,
        conversationId,
      });
    }
  }, [messages, setEditingMessage, conversationId]);

  // Confirm edit handler
  const handleConfirmEdit = useCallback(async (content: string) => {
    if (!editingMessage) return;

    try {
      await editMessage(editingMessage.id, content);
    } catch (error) {
      console.error('[ChatV2Test] Failed to edit message:', error);
    } finally {
      setEditingMessage(null);
    }
  }, [editingMessage, editMessage, setEditingMessage]);

  // Cancel edit handler
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, [setEditingMessage]);

  // Delete handler
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('[ChatV2Test] Failed to delete message:', error);
    }
  }, [deleteMessage]);

  // Copy handler
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // Files selected from input
  const handleFilesSelected = useCallback((files: File[], currentMessage?: string) => {
    features.handleFilesSelected(files, currentMessage);
  }, [features]);

  // No conversation selected
  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <h2 className="text-xl mb-2">Chat V2 Test</h2>
          <p>เลือก conversation จาก sidebar</p>
        </div>
      </div>
    );
  }

  // Loading initial messages
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>กำลังโหลดข้อความ...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full relative"
      {...features.dragHandlers}
    >
      {/* Drag overlay */}
      {features.isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-2 text-primary" />
            <p className="text-lg font-medium text-primary">วางไฟล์ที่นี่</p>
            <p className="text-sm text-muted-foreground">รองรับไฟล์สูงสุด 10 ไฟล์</p>
          </div>
        </div>
      )}

      {/* Simple header */}
      <div className="px-4 py-3 border-b bg-background">
        <div className="text-sm text-muted-foreground">
          {messages.length} messages | {isLoading ? 'Loading...' : features.isJumping ? 'Jumping...' : 'Ready'}
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 min-h-0">
        <MessageList
          ref={messageListRef}
          messages={messages}
          currentUserId={currentUserId}
          conversationId={conversationId}
          onLoadMore={handleLoadMore}
          isLoadingTop={isLoading}
          hasMoreTop={hasMore}
          onJumpToMessage={features.handleJumpToMessage}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
        />
      </div>

      {/* Multi-file preview */}
      {features.showFilePreview && features.selectedFiles.length > 0 && (
        <div className="border-t p-4 bg-background">
          <MultiFilePreview
            files={features.selectedFiles}
            onRemove={(index) => {
              const newFiles = [...features.selectedFiles];
              newFiles.splice(index, 1);
              features.setSelectedFiles(newFiles);
              if (newFiles.length === 0) {
                features.setShowFilePreview(false);
              }
            }}
            onCaptionChange={() => {}}
            onSend={(caption) => {
              features.handleSendFiles(caption);
            }}
            onCancel={features.handleCancelFilePreview}
            uploading={features.isUploading}
          />
        </div>
      )}

      {/* Message input */}
      {!features.showFilePreview && (
        <MessageInputArea
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onSendSticker={handleSendSticker}
          onUploadImage={handleUploadImage}
          onUploadFile={handleUploadFile}
          onFilesSelected={handleFilesSelected}
          isLoading={isSending}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          editingMessage={editingMessage}
          onConfirmEdit={handleConfirmEdit}
          onCancelEdit={handleCancelEdit}
        />
      )}
    </div>
  );
}
