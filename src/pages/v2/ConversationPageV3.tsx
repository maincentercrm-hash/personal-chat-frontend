/**
 * ConversationPageV3 - Full-featured chat page with clean architecture
 *
 * ใช้โครงสร้างใหม่:
 * - uiStore: global UI state (editing, replying, sending)
 * - conversationStore: messages data
 * - useChatV2Features: advanced features (jump, upload, drag-drop)
 * - useFriendship: block status
 *
 * Features:
 * - Message list with virtualized scrolling (chat-v2)
 * - Send text/sticker/image/file
 * - Reply/Edit/Delete messages
 * - Drag & Drop multi-file upload
 * - Jump to message (with API context fetch)
 * - Block status check
 * - Image lightbox
 * - Resend failed messages
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useOutletContext } from 'react-router-dom';

// Type for outlet context from ChatLayout
interface OutletContextType {
  conversationId?: string;
}
import useConversationStore from '@/stores/conversationStore';
import useUIStore from '@/stores/uiStore';
import { useMessage } from '@/hooks/useMessage';
import { useConversation } from '@/hooks/useConversation';
import { useChatV2Features } from '@/hooks/useChatV2Features';
import { useFriendship } from '@/hooks/useFriendship';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import useAuth from '@/hooks/useAuth';
import { useMessageJump } from '@/contexts/MessageJumpContext';
import type { ConversationMemberWithRole } from '@/types/group.types';
import type { MentionMetadata } from '@/types/mention.types';

// Components
import { MessageAreaV2 } from '@/components/chat-v2/MessageAreaV2';
import type { MessageAreaV2Ref } from '@/components/chat-v2/MessageAreaV2';
import MessageInputArea from '@/components/shared/MessageInputArea';
import { MultiFilePreview } from '@/components/shared/MultiFilePreview';
import EmptyConversationView from '@/components/standard/conversation/EmptyConversationView';
import { MobileConversationList } from '@/components/chat/MobileConversationList';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Upload } from 'lucide-react';

export default function ConversationPageV3() {
  // ✅ Get conversationId - useParams is primary, outlet context is fallback
  const params = useParams<{ conversationId: string }>();
  const outletContext = useOutletContext<OutletContextType | null>();
  // Prefer params.conversationId, then outlet context (for compatibility)
  const conversationId = params.conversationId || outletContext?.conversationId;

  // Check if mobile
  const isMobile = useIsMobile();

  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // Get target message ID from URL query param (for jump to message from search)
  const targetMessageId = searchParams.get('target');

  // ============================================================================
  // Conversation Store
  // ============================================================================
  const conversations = useConversationStore(state => state.conversations);
  const conversationMessages = useConversationStore(state => state.conversationMessages);
  const hasMoreMessages = useConversationStore(state => state.hasMoreMessages);
  // activeConversationId is set by this component, not read from store
  const fetchConversationMessages = useConversationStore(state => state.fetchConversationMessages);
  const fetchMoreMessages = useConversationStore(state => state.fetchMoreMessages);
  const setActiveConversation = useConversationStore(state => state.setActiveConversation);

  // ============================================================================
  // UI Store
  // ============================================================================
  const replyingTo = useUIStore(state => state.replyingTo);
  const editingMessage = useUIStore(state => state.editingMessage);
  const setReplyingTo = useUIStore(state => state.setReplyingTo);
  const setEditingMessage = useUIStore(state => state.setEditingMessage);
  const isSending = useUIStore(state => state.isSending);
  const setIsSending = useUIStore(state => state.setIsSending);
  const clearUIState = useUIStore(state => state.clearUIState);

  // ============================================================================
  // Hooks
  // ============================================================================

  // Subscribe to WebSocket events + markAllMessagesAsRead
  const { markAllMessagesAsRead } = useConversation();

  // MessageJump context - for ChatLayout to call jumpToMessage
  const { setJumpToMessage } = useMessageJump();

  // Message operations
  const {
    sendTextMessage,
    replyToMessage,
    editMessage,
    deleteMessage,
  } = useMessage();

  // Block status
  const { isBlocked, isBlockedByUser } = useFriendship();

  // ============================================================================
  // Refs & Local State
  // ============================================================================
  const messageAreaRef = useRef<MessageAreaV2Ref>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentMessageText, setCurrentMessageText] = useState(''); // ✅ Track message input text

  // ============================================================================
  // Derived Data
  // ============================================================================
  const messages = conversationId ? conversationMessages[conversationId] || [] : [];
  const hasMore = conversationId ? hasMoreMessages[conversationId] ?? true : false;


  // Active conversation data
  const activeChat = useMemo(() => {
    return conversations.find(c => c.id === conversationId);
  }, [conversations, conversationId]);

  // Chat partner ID (for direct chats)
  const chatPartnerId = useMemo(() => {
    if (activeChat?.type === 'direct' && activeChat.contact_info?.user_id) {
      return activeChat.contact_info.user_id;
    }
    return null;
  }, [activeChat]);

  // Block status
  const isPartnerBlocked = chatPartnerId ? isBlocked(chatPartnerId) : false;
  const isBlockedByPartner = chatPartnerId ? isBlockedByUser(chatPartnerId) : false;

  // Group chat check
  const isGroupChat = activeChat?.type === 'group';

  // ✅ Load group members for mentions (only for group chats)
  const { data: membersData } = useGroupMembers(conversationId || '', {
    enabled: isGroupChat && !!conversationId,
    limit: 100,
  });

  // ✅ Convert to ConversationMemberWithRole format and filter out current user
  const members: ConversationMemberWithRole[] = useMemo(() => {
    if (!membersData?.members) return [];

    return membersData.members
      .filter(member => member.user_id !== currentUserId) // ✅ ไม่แสดงตัวเอง
      .map(member => ({
        id: member.id,
        conversation_id: conversationId || '',
        user_id: member.user_id,
        role: member.user_id === activeChat?.creator_id ? 'owner' : member.role as 'admin' | 'member',
        joined_at: member.joined_at,
        user: {
          id: member.user_id,
          username: member.username,
          display_name: member.display_name,
          profile_image_url: member.profile_picture || undefined,
        }
      }));
  }, [membersData, conversationId, currentUserId, activeChat?.creator_id]);

  // ============================================================================
  // Chat V2 Features Hook
  // ============================================================================
  const features = useChatV2Features({
    conversationId,
    messages,
    messageListRef: messageAreaRef as React.RefObject<{ scrollToMessage: (id: string) => void; scrollToBottom: (smooth?: boolean) => void }>,
    currentMessageText // ✅ ส่ง message text ไปให้ drag & drop ใช้เป็น caption
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setIsReady(false);
      setActiveConversation(null);
      return;
    }

    setActiveConversation(conversationId);

    const loadMessages = async () => {
      setIsLoading(true);
      setIsReady(false);

      try {
        await fetchConversationMessages(conversationId, { limit: 50 });

        // ✅ Mark all messages as read after loading (including mention badges)
        try {
          await markAllMessagesAsRead(conversationId);
        } catch (readError) {
          console.error('[ConversationPageV3] Failed to mark as read:', readError);
        }
      } catch (error) {
        console.error('[ConversationPageV3] Failed to load messages:', error);
      } finally {
        setIsLoading(false);
        setIsReady(true);
      }
    };

    loadMessages();

    return () => {
      setActiveConversation(null);
      clearUIState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // ✅ Only re-run when conversationId changes

  // Register jumpToMessage function to MessageJump context
  // This allows ChatLayout's ConversationDetailsSheet to call jumpToMessage
  // Use ref to avoid dependency changes triggering re-renders
  const handleJumpToMessageRef = useRef(features.handleJumpToMessage);
  handleJumpToMessageRef.current = features.handleJumpToMessage;

  useEffect(() => {
    // Create stable wrapper function that uses ref
    const stableJumpToMessage = (messageId: string) => {
      handleJumpToMessageRef.current?.(messageId);
    };
    setJumpToMessage(stableJumpToMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setJumpToMessage]); // Only run once when context is available

  // Jump to target message from URL query param (from search results)
  useEffect(() => {
    if (targetMessageId && isReady && features.handleJumpToMessage) {
      console.log('[ConversationPageV3] Jumping to target message:', targetMessageId);
      // Small delay to ensure messages are rendered
      setTimeout(() => {
        features.handleJumpToMessage(targetMessageId);
        // Clear target from URL after jump
        setSearchParams({}, { replace: true });
      }, 300);
    }
  }, [targetMessageId, isReady, features.handleJumpToMessage, setSearchParams]);

  // ============================================================================
  // Handlers
  // ============================================================================

  // Load more messages
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
      console.error('[ConversationPageV3] Failed to load more:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, isLoading, fetchMoreMessages]);

  // Send message
  const handleSendMessage = useCallback(async (message: string, mentions?: MentionMetadata[]) => {
    if (!conversationId || !message.trim() || isSending) return;

    setIsSending(true);
    try {
      // ✅ สร้าง metadata สำหรับ mentions (ถ้ามี)
      const metadata = mentions && mentions.length > 0 ? { mentions } : undefined;

      if (replyingTo) {
        // ✅ replyToMessage signature: (messageId, messageType, content?, mediaUrl?, mediaThumbnailUrl?, metadata?)
        await replyToMessage(replyingTo.id, 'text', message.trim(), undefined, undefined, metadata);
      } else {
        await sendTextMessage(conversationId, message.trim(), metadata);
      }
      setTimeout(() => {
        messageAreaRef.current?.scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('[ConversationPageV3] Failed to send:', error);
    } finally {
      setIsSending(false);
      setReplyingTo(null);
    }
  }, [conversationId, isSending, sendTextMessage, replyToMessage, replyingTo, setIsSending, setReplyingTo]);

  // Sticker
  const handleSendSticker = useCallback((stickerId: string, stickerUrl: string, stickerSetId: string) => {
    features.handleSendSticker(stickerId, stickerUrl, stickerSetId);
  }, [features]);

  // Upload
  const handleUploadImage = useCallback((file: File) => {
    features.handleUploadImage(file);
  }, [features]);

  const handleUploadFile = useCallback((file: File) => {
    features.handleUploadFile(file);
  }, [features]);

  // Reply
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

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, [setReplyingTo]);

  // Edit
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

  const handleConfirmEdit = useCallback(async (content: string, mentions?: MentionMetadata[]) => {
    if (!editingMessage) return;

    try {
      // ✅ สร้าง metadata สำหรับ mentions (ถ้ามี)
      const metadata = mentions && mentions.length > 0 ? { mentions } : undefined;
      await editMessage(editingMessage.id, content, metadata);
    } catch (error) {
      console.error('[ConversationPageV3] Failed to edit:', error);
    } finally {
      setEditingMessage(null);
    }
  }, [editingMessage, editMessage, setEditingMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, [setEditingMessage]);

  // Delete
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('[ConversationPageV3] Failed to delete:', error);
    }
  }, [deleteMessage]);

  // Resend - resend failed message by re-sending its content
  const handleResend = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    const message = messages.find(m => m.id === messageId);
    if (message?.content) {
      try {
        await sendTextMessage(conversationId, message.content);
      } catch (error) {
        console.error('[ConversationPageV3] Failed to resend:', error);
      }
    }
  }, [conversationId, messages, sendTextMessage]);

  // Files selected
  const handleFilesSelected = useCallback((files: File[], currentMessage?: string) => {
    features.handleFilesSelected(files, currentMessage);
  }, [features]);

  // ============================================================================
  // Render
  // ============================================================================

  // No conversation selected
  if (!conversationId) {
    // Mobile: Show conversation list
    // Desktop: Show empty state (sidebar already shows list)
    if (isMobile) {
      return <MobileConversationList />;
    }
    return <EmptyConversationView />;
  }

  // Note: We don't check activeChat here because:
  // 1. ChatLayout's header already handles showing conversation info
  // 2. Messages can be loaded independently from conversations list
  // 3. This prevents blocking render while conversations list loads

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Message Area with Drag & Drop */}
      <div
              className="flex-1 flex flex-col min-h-0 relative"
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

              {/* Loading state */}
              {!isReady ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>กำลังโหลดข้อความ...</span>
                  </div>
                </div>
              ) : (
                <MessageAreaV2
                  ref={messageAreaRef}
                  messages={messages}
                  currentUserId={currentUserId}
                  conversationId={conversationId}
                  onLoadMore={handleLoadMore}
                  onLoadMoreBottom={features.handleLoadMoreAtBottom}
                  isLoadingHistory={isLoading}
                  hasMoreTop={hasMore}
                  hasMoreBottom={features.hasMoreBottom}
                  onJumpToMessage={features.handleJumpToMessage}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onResend={handleResend}
                  isGroupChat={isGroupChat}
                />
              )}
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
                  onSchedule={(caption, scheduledAt) => {
                    features.handleScheduleFiles(caption, scheduledAt);
                  }}
                  onCancel={features.handleCancelFilePreview}
                  uploading={features.isUploading}
                  initialCaption={features.pendingCaption}
                />
              </div>
            )}

      {/* Message Input */}
      {!features.showFilePreview && (
        <MessageInputArea
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onSendSticker={handleSendSticker}
          onUploadImage={handleUploadImage}
          onUploadFile={handleUploadFile}
          onFilesSelected={handleFilesSelected}
          onMessageChange={setCurrentMessageText}
          isLoading={isSending}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          editingMessage={editingMessage}
          onConfirmEdit={handleConfirmEdit}
          onCancelEdit={handleCancelEdit}
          isBlocked={isPartnerBlocked}
          blockedUserName={activeChat?.contact_info?.display_name}
          isBlockedBy={isBlockedByPartner}
          members={members}
        />
      )}

    </div>
  );
}
