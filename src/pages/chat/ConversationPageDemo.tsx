// src/pages/chat/ConversationPageDemo.tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversationPageLogic } from '@/pages/standard/converstion/hooks/useConversationPageLogic';
import { useMessageJump } from '@/contexts/MessageJumpContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import useConversationStore from '@/stores/conversationStore';
import MessageArea from '@/components/shared/MessageArea';
import MessageInputArea from '@/components/shared/MessageInputArea';
import ConversationItem from '@/components/standard/conversation/ConversationItem';
import CategoryTab from '@/components/standard/conversation/CategoryTab';
import { SidebarInput } from '@/components/ui/sidebar';
import { User, Users } from 'lucide-react';
import type { ConversationType } from '@/types/conversation.types';

/**
 * ConversationPageDemo - Message list with MessageArea (Virtua + Full rendering)
 * ใช้ MessageArea component ที่มี sticker, emoji, images rendering
 * Header และ Sheet อยู่ใน ChatLayout แล้ว
 *
 * Mobile: แสดง conversation list เมื่ออยู่ที่ /chat
 * Desktop: แสดง empty state เมื่อไม่มี conversation
 */
export default function ConversationPageDemo() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { setJumpToMessage } = useMessageJump();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ใช้ useConversationPageLogic hook ที่มี logic ครบถ้วน
  const {
    conversationMessages,
    isSending,
    isLoadingMoreMessages,
    replyingTo,
    currentUserId,
    editingMessageId,
    editingContent,
    activeChat,
    isUserOnline,
    handleSendMessage,
    handleSendSticker,
    handleUploadImage,
    handleUploadFile,
    handleLoadMoreMessages,
    handleLoadMoreMessagesAtBottom, // ⬇️ NEW: Load newer messages (for Jump context)
    handleReplyToMessage,
    handleEditMessage,
    handleConfirmEdit,
    handleCancelEdit,
    handleResendMessage,
    handleCancelReply,
    handleJumpToMessage,
    setEditingContent,
    messageAreaRef,
  } = useConversationPageLogic(conversationId);

  // ✅ Register jumpToMessage in MessageJumpContext
  useEffect(() => {
    setJumpToMessage(handleJumpToMessage);
  }, [handleJumpToMessage, setJumpToMessage]);

  // 📱 Mobile conversation list state
  const conversations = useConversationStore(state => state.conversations);
  const togglePinConversation = useConversationStore(state => state.togglePinConversation);
  const toggleMuteConversation = useConversationStore(state => state.toggleMuteConversation);
  const deleteConversation = useConversationStore(state => state.deleteConversation);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ConversationType[]>([]);

  // Filter conversations for mobile
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(conv => {
        const matchesSearch = (conv.title || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedTypes.length === 0 || selectedTypes.includes(conv.type as ConversationType);
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const aTime = new Date(a.last_message_at || '').getTime();
        const bTime = new Date(b.last_message_at || '').getTime();
        return bTime - aTime;
      });
  }, [conversations, searchQuery, selectedTypes]);

  const toggleCategory = (type: ConversationType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const unreadCount = useMemo(() => {
    return conversations.filter(c => c.unread_count > 0).reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [conversations]);

  // Debug logging
  useEffect(() => {
    console.log('[ConversationPageDemo] Debug:', {
      isMobile,
      conversationId,
      shouldShowList: isMobile && !conversationId,
      conversationsCount: conversations.length,
      currentPath: window.location.pathname
    })
  }, [isMobile, conversationId, conversations.length])

  // Debug: Track conversationId changes
  useEffect(() => {
    console.log('[ConversationPageDemo] conversationId from URL:', conversationId)
  }, [conversationId])

  // Debug: Component mount/unmount
  useEffect(() => {
    console.log('[ConversationPageDemo] Component mounted')
    return () => {
      console.log('[ConversationPageDemo] Component unmounted')
    }
  }, [])

  // 📱 Mobile: Show conversation list when no conversationId
  if (isMobile && !conversationId) {
    console.log('[ConversationPageDemo] Rendering mobile conversation list');
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">แชท</h1>
            {unreadCount > 0 && (
              <div className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </div>
            )}
          </div>

          {/* Search */}
          <SidebarInput
            placeholder="ค้นหาการสนทนา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Category Filters */}
          <div className="flex gap-2">
            <CategoryTab
              icon={User}
              label="ส่วนตัว"
              isSelected={selectedTypes.includes('direct')}
              onClick={() => toggleCategory('direct')}
            />
            <CategoryTab
              icon={Users}
              label="กลุ่ม"
              isSelected={selectedTypes.includes('group')}
              onClick={() => toggleCategory('group')}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={false}
                onSelect={() => navigate(`/chat/${conversation.id}`)}
                onTogglePin={togglePinConversation}
                onToggleMute={toggleMuteConversation}
                isUserOnline={isUserOnline}
                onDelete={(id) => deleteConversation(id, currentUserId)}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
              {searchQuery ? 'ไม่พบการสนทนา' : 'ยังไม่มีการสนทนา'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop or Mobile with conversationId: Show chat interface
  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">เลือกการสนทนาเพื่อเริ่มแชท</p>
          <p className="text-sm">หรือเริ่มการสนทนาใหม่จากรายชื่อ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message Area with Virtua - handles sticker, emoji, images */}
      <MessageArea
        ref={messageAreaRef}
        messages={conversationMessages}
        isLoadingHistory={isLoadingMoreMessages}
        isBusinessView={false}
        isGroupChat={activeChat?.type === 'group'}
        onLoadMore={handleLoadMoreMessages}
        onLoadMoreAtBottom={handleLoadMoreMessagesAtBottom}
        currentUserId={currentUserId}
        activeConversationId={conversationId || ''}
        onReplyMessage={handleReplyToMessage}
        onEditMessage={handleEditMessage}
        onResendMessage={handleResendMessage}
        onJumpToMessage={handleJumpToMessage}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onEditingContentChange={setEditingContent}
        onConfirmEdit={handleConfirmEdit}
        onCancelEdit={handleCancelEdit}
      />

      {/* Message Input Area - fixed height */}
      <MessageInputArea
        onSendMessage={handleSendMessage}
        onSendSticker={handleSendSticker}
        onUploadImage={handleUploadImage}
        onUploadFile={handleUploadFile}
        isLoading={isSending}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
}
