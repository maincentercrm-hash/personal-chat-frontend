// src/pages/chat/ConversationPageDemo.tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useConversationPageLogic } from '@/pages/standard/converstion/hooks/useConversationPageLogic';
import { useMessageJump } from '@/contexts/MessageJumpContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import useConversationStore from '@/stores/conversationStore';
import useFriendshipStore from '@/stores/friendshipStore';
import MessageArea from '@/components/shared/MessageArea';
import MessageInputArea from '@/components/shared/MessageInputArea';
import ConversationItem from '@/components/standard/conversation/ConversationItem';
import CategoryTab from '@/components/standard/conversation/CategoryTab';
import { SidebarInput } from '@/components/ui/sidebar';
import { User, Users } from 'lucide-react';
import type { ConversationType } from '@/types/conversation.types';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useBulkUpload } from '@/hooks/useBulkUpload';
import { MultiFilePreview } from '@/components/shared/MultiFilePreview';
import { useGroupMembers } from '@/hooks/useGroupMembers'; // ✅ สำหรับดึง members
import type { ConversationMemberWithRole } from '@/types/group.types'; // ✅ สำหรับ mention autocomplete
import { scheduleMessage, toRFC3339 } from '@/services/scheduledMessageService'; // 🆕 สำหรับ schedule files
import { toast } from 'sonner';

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
  const [searchParams, setSearchParams] = useSearchParams();
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
    editingMessage, // ✅ เพิ่ม editingMessage
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
    messageAreaRef,
  } = useConversationPageLogic(conversationId);

  // ✅ Register jumpToMessage in MessageJumpContext
  useEffect(() => {
    setJumpToMessage(handleJumpToMessage);
  }, [handleJumpToMessage, setJumpToMessage]);

  // ✅ Handle ?target=messageId query param (from Mentions page)
  useEffect(() => {
    const targetMessageId = searchParams.get('target');

    if (targetMessageId && conversationId) {
      console.log('[ConversationPageDemo] 🎯 Jump to message from URL:', targetMessageId);

      // Wait for messages to load before jumping
      setTimeout(() => {
        handleJumpToMessage(targetMessageId);
        // Clear the query param after jumping
        setSearchParams({}, { replace: true });
      }, 500);
    }
  }, [searchParams, conversationId, handleJumpToMessage, setSearchParams]);

  // 📱 Mobile conversation list state
  const conversations = useConversationStore(state => state.conversations);
  const togglePinConversation = useConversationStore(state => state.togglePinConversation);
  const toggleMuteConversation = useConversationStore(state => state.toggleMuteConversation);
  const deleteConversation = useConversationStore(state => state.deleteConversation);
  const addNewMessage = useConversationStore(state => state.addNewMessage); // ✅ Get addNewMessage from store

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ConversationType[]>([]);

  // 📎 Bulk Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [currentMessageText, setCurrentMessageText] = useState(''); // 🆕 เก็บ message text ปัจจุบัน (สำหรับ drag & drop)

  // ✅ Get group members for mention autocomplete
  const { data: groupMembersData } = useGroupMembers(conversationId || '', {
    enabled: !!conversationId && activeChat?.type === 'group'
  });

  // ✅ Prepare members array (for both group and private chat)
  const conversationMembers = useMemo((): ConversationMemberWithRole[] => {
    if (!activeChat) {
      console.log('[ConversationMembers] ❌ No activeChat');
      return [];
    }

    // ถ้าเป็น group chat แปลง GroupMember[] เป็น ConversationMemberWithRole[]
    if (activeChat.type === 'group' && groupMembersData?.members) {
      const members = groupMembersData.members.map(member => ({
        id: member.id,
        conversation_id: conversationId || '',
        user_id: member.user_id,
        role: member.role as 'admin' | 'member', // owner จะเป็น admin ที่ Backend
        joined_at: member.joined_at,
        user: {
          id: member.user_id,
          username: member.username,
          display_name: member.display_name,
          profile_image_url: member.profile_picture || undefined,
        }
      }));
      console.log('[ConversationMembers] ✅ Group chat members:', members.length, members);
      return members;
    }

    // ถ้าเป็น private chat สร้าง member array จาก contact_info
    if (activeChat.type === 'direct' && activeChat.contact_info) {
      const members = [{
        id: activeChat.contact_info.user_id, // ใช้ user_id เป็น id ชั่วคราว
        conversation_id: conversationId || '',
        user_id: activeChat.contact_info.user_id,
        role: 'member' as const,
        joined_at: new Date().toISOString(), // ชั่วคราว
        user: {
          id: activeChat.contact_info.user_id,
          username: activeChat.contact_info.username || 'user',
          display_name: activeChat.contact_info.display_name || 'User',
          profile_image_url: activeChat.contact_info.profile_image_url ?? undefined,
        }
      }];
      console.log('[ConversationMembers] ✅ Direct chat members:', members.length, members);
      return members;
    }

    console.log('[ConversationMembers] ⚠️ Unknown chat type or no contact_info');
    return [];
  }, [activeChat, conversationId, groupMembersData]);

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

  // 📎 Bulk Upload Hook
  const { uploadFiles, uploadFilesOnly, uploading, progress, error: _uploadError } = useBulkUpload({
    conversationId: conversationId || '',
    onSuccess: (result) => {
      console.log('[BulkUpload] Success:', result);
      console.log('[BulkUpload] Album message type:', result.message_type);
      console.log('[BulkUpload] Album files:', result.album_files?.length);

      // ✅ NEW FORMAT: Add single album message to local state (optimistic update)
      if (result) {
        // Add missing properties for MessageDTO
        const messageWithRequiredProps = {
          ...result,
          content: result.content || '',
          status: result.status as "sending" | "sent" | "delivered" | "read" | "failed" | undefined,
          is_read: true,
          read_count: 0
        };
        addNewMessage(messageWithRequiredProps, currentUserId);
        console.log(`[BulkUpload] ✅ Added album message (${result.album_files?.length} files) to local state`);

        // ✅ Scroll to bottom after adding message
        setTimeout(() => {
          messageAreaRef.current?.scrollToBottom(true);
        }, 100);
      }

      // Clear state
      setSelectedFiles([]);
      setShowFilePreview(false);
      setUploadCaption('');
    },
    onError: (error) => {
      console.error('[BulkUpload] Error:', error);
      alert(`Upload failed: ${error.message}`);
    }
  });

  // 📎 Drag & Drop for entire conversation area
  const { isDragging, dragHandlers } = useDragAndDrop({
    onDrop: (files) => {
      console.log('[DragDrop] Files dropped:', files.length);
      console.log('[DragDrop] Current message text:', currentMessageText);

      setSelectedFiles(files);
      setShowFilePreview(true);

      // 🆕 Auto-fill caption from message input (ถ้ามี)
      if (currentMessageText?.trim()) {
        setUploadCaption(currentMessageText);
        console.log('[DragDrop] ✅ Auto-filled caption from message input');
      }
    },
    onError: (error) => {
      console.error('[DragDrop] Error:', error);
      alert(error.message);
    },
    // ✅ รองรับไฟล์ทุกประเภท: รูปภาพ, วิดีโอ, และเอกสาร (PDF, DOC, Excel, etc.)
    accept: [
      'image/*',
      'video/*',
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain', // .txt
      'text/csv', // .csv
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ],
    maxFiles: 10,
    maxSize: 1024 * 1024 * 1024 // 1GB
  });

  // 📎 Handle file selection from MessageInput
  const handleFilesSelected = (files: File[], currentMessage?: string) => {
    console.log('[FilesSelected] Files:', files.length);
    console.log('[FilesSelected] Current message text:', currentMessage);

    setSelectedFiles(files);
    setShowFilePreview(true);

    // 🆕 Auto-fill caption from message input
    if (currentMessage?.trim()) {
      setUploadCaption(currentMessage);
      console.log('[FilesSelected] ✅ Auto-filled caption from message input');
    }
  };

  // 📎 Handle send bulk upload
  const handleSendBulkUpload = async (caption: string) => {
    try {
      console.log('[SendBulkUpload] Uploading', selectedFiles.length, 'files with caption:', caption);
      await uploadFiles(selectedFiles, caption);
    } catch (error) {
      console.error('[SendBulkUpload] Failed:', error);
    }
  };

  // 📎 Handle cancel upload
  const handleCancelUpload = () => {
    setSelectedFiles([]);
    setShowFilePreview(false);
    setUploadCaption('');
  };

  // 🆕 Handle schedule file upload
  const handleScheduleFileUpload = async (caption: string, scheduledAt: Date) => {
    if (!conversationId || selectedFiles.length === 0) return;

    try {
      console.log('[ScheduleFileUpload] Starting upload for scheduling...', {
        filesCount: selectedFiles.length,
        caption,
        scheduledAt: scheduledAt.toISOString()
      });

      // ขั้นที่ 1: อัปโหลดไฟล์ก่อน (ไม่สร้าง message)
      const uploadedFiles = await uploadFilesOnly(selectedFiles);
      console.log('[ScheduleFileUpload] Files uploaded:', uploadedFiles);

      // ขั้นที่ 2: สร้าง scheduled message
      if (uploadedFiles.length === 1) {
        // ไฟล์เดี่ยว - schedule แบบ image/file
        const file = uploadedFiles[0];
        const messageType = file.message_type === 'video' ? 'file' : file.message_type;

        await scheduleMessage(conversationId, {
          message_type: messageType as 'text' | 'image' | 'file',
          content: messageType === 'file' ? (file.file_name || caption) : caption,
          media_url: file.media_url,
          scheduled_at: toRFC3339(scheduledAt),
          metadata: file.file_size ? { file_size: file.file_size } : undefined
        });

        toast.success('ตั้งเวลาส่งไฟล์สำเร็จ', {
          description: `จะส่งเมื่อ ${scheduledAt.toLocaleString('th-TH')}`,
        });
      } else {
        // หลายไฟล์ - schedule แบบ album
        // แปลง uploadedFiles เป็น album_files format
        const albumFiles = uploadedFiles.map((file, index) => ({
          message_type: file.message_type,
          media_url: file.media_url,
          media_thumbnail_url: file.media_thumbnail_url,
          file_name: file.file_name,
          file_size: file.file_size,
          position: index
        }));

        await scheduleMessage(conversationId, {
          message_type: 'album',
          content: caption,
          scheduled_at: toRFC3339(scheduledAt),
          metadata: { album_files: albumFiles }
        });

        toast.success(`ตั้งเวลาส่ง ${uploadedFiles.length} ไฟล์สำเร็จ`, {
          description: `จะส่งเมื่อ ${scheduledAt.toLocaleString('th-TH')}`,
        });
      }

      // Clear state
      handleCancelUpload();
    } catch (error) {
      console.error('[ScheduleFileUpload] Failed:', error);
      toast.error('เกิดข้อผิดพลาดในการตั้งเวลาส่งไฟล์');
    }
  };

  // 📎 Handle remove file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    // If no files left, close preview
    if (selectedFiles.length === 1) {
      handleCancelUpload();
    }
  };

  // ✅ Get blocked users และเช็คว่า conversation ปัจจุบันถูก block หรือไม่
  const blockedUsers = useFriendshipStore(state => state.blockedUsers);
  const blockedByUsers = useFriendshipStore(state => state.blockedByUsers);
  const fetchBlockedUsers = useFriendshipStore(state => state.fetchBlockedUsers);
  const fetchBlockedByUsers = useFriendshipStore(state => state.fetchBlockedByUsers);

  // ✅ Fetch blocked users และ blocked-by users เมื่อ component mount
  useEffect(() => {
    console.log('[ConversationPageDemo] Fetching blocked users and blocked-by users on mount...');
    fetchBlockedUsers();
    fetchBlockedByUsers();
  }, [fetchBlockedUsers, fetchBlockedByUsers]);

  // ✅ Debug: Log เมื่อ blockedUsers หรือ blockedByUsers เปลี่ยน
  useEffect(() => {
    console.log('🔄 [BlockedUsers] State Changed:', {
      blockedUsersCount: blockedUsers?.length || 0,
      blockedByUsersCount: blockedByUsers?.length || 0,
      blockedUsers,
      blockedByUsers
    });
  }, [blockedUsers, blockedByUsers]);

  const blockStatus = useMemo(() => {
    console.log('[BlockStatus] Debug:', {
      activeChat,
      conversationId,
      blockedUsers,
      blockedByUsers,
      currentUserId,
      chatType: activeChat?.type,
      hasContactInfo: !!activeChat?.contact_info,
      contactInfo: activeChat?.contact_info
    });

    if (!activeChat || !conversationId) {
      console.log('[BlockStatus] No activeChat or conversationId');
      return { isBlocked: false, isBlockedBy: false, blockedUserName: null };
    }

    // ✅ Group chat: ไม่ต้องเช็ค block status (อนุญาตให้ส่งได้ปกติ)
    if (activeChat.type === 'group') {
      console.log('[BlockStatus] Group chat - allowing messages');
      return { isBlocked: false, isBlockedBy: false, blockedUserName: null };
    }

    // ✅ Direct chat only - เช็คว่าเราบล็อกผู้ใช้ หรือเราถูกบล็อกโดยผู้ใช้
    if (activeChat.type === 'direct' && activeChat.contact_info) {
      const otherUserId = activeChat.contact_info.user_id;
      const otherUserName = activeChat.contact_info.display_name;

      console.log('[BlockStatus] Direct chat - checking block status for:', {
        userId: otherUserId,
        displayName: otherUserName
      });

      const isBlocked = blockedUsers?.some(bu => bu.id === otherUserId) || false;
      const isBlockedBy = blockedByUsers?.some(bu => bu.id === otherUserId) || false;

      console.log('[BlockStatus] Block status:', {
        otherUserId,
        isBlocked,
        isBlockedBy,
        blockedUserIds: blockedUsers?.map(bu => bu.id) || [],
        blockedByUserIds: blockedByUsers?.map(bu => bu.id) || []
      });

      return {
        isBlocked,
        isBlockedBy,
        blockedUserName: isBlocked ? otherUserName : null
      };
    }

    console.log('[BlockStatus] Returning false (unknown chat type or no contact_info)');
    return { isBlocked: false, isBlockedBy: false, blockedUserName: null };
  }, [activeChat, conversationId, blockedUsers, blockedByUsers, currentUserId]);

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
    <div
      className={`flex flex-col h-full relative ${isDragging ? 'bg-primary/5' : ''}`}
      {...dragHandlers}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-4 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg">
            <p className="text-lg font-semibold text-primary">📎 วางไฟล์ที่นี่</p>
            <p className="text-sm text-muted-foreground mt-1">รองรับรูปภาพและวิดีโอ (สูงสุด 10 ไฟล์)</p>
          </div>
        </div>
      )}

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
      />

      {/* Multi-File Preview (when files are selected) */}
      {showFilePreview && selectedFiles.length > 0 && (
        <div className="border-t p-4 bg-background">
          <MultiFilePreview
            files={selectedFiles}
            onRemove={handleRemoveFile}
            onCaptionChange={setUploadCaption}
            onSend={handleSendBulkUpload}
            onSchedule={handleScheduleFileUpload} // 🆕 Schedule callback
            onCancel={handleCancelUpload}
            uploading={uploading}
            uploadProgress={progress}
            initialCaption={uploadCaption} // 🆕 Pre-fill caption from message input
          />
        </div>
      )}

      {/* Message Input Area - fixed height */}
      {!showFilePreview && (
        <MessageInputArea
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onSendSticker={handleSendSticker}
          onUploadImage={handleUploadImage}
          onUploadFile={handleUploadFile}
          onFilesSelected={handleFilesSelected} // ✅ เพิ่ม - รองรับหลายไฟล์
          onMessageChange={setCurrentMessageText} // 🆕 เพิ่ม - เก็บ message text สำหรับ drag & drop
          isLoading={isSending}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          editingMessage={editingMessage} // ✅ เพิ่ม
          onConfirmEdit={handleConfirmEdit} // ✅ เพิ่ม
          onCancelEdit={handleCancelEdit} // ✅ เพิ่ม
          isBlocked={blockStatus.isBlocked} // ✅ เพิ่ม - เราบล็อกผู้ใช้
          blockedUserName={blockStatus.blockedUserName || undefined} // ✅ เพิ่ม
          isBlockedBy={blockStatus.isBlockedBy} // ✅ เพิ่ม - เราถูกบล็อก
          members={conversationMembers} // ✅ เพิ่ม - สำหรับ mention autocomplete
        />
      )}
    </div>
  );
}
