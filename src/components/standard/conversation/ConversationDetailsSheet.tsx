// src/components/standard/conversation/ConversationDetailsSheet.tsx
import { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, LogOut, User, Pencil, Ban, Clock,
  Image as ImageIcon, Video, FileText, Link as LinkIcon,
  History, UserCog
} from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import type { ConversationMemberWithRole } from '@/types/group.types';
import { useMediaSummary } from '@/hooks/useMediaQueries';
import { useConversation } from '@/hooks/useConversation';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { PhotoGallery } from './PhotoGallery';
import { VideoGallery } from './VideoGallery';
import { FileList } from './FileList';
import { LinkList } from './LinkList';
import { MemberList, ActivityLog } from '@/components/group';
import { EditGroupDialog } from './EditGroupDialog';
import { LeaveGroupDialog } from './LeaveGroupDialog';
import { ConversationInfoTab } from './ConversationInfoTab';
import { toast } from 'sonner';
import { ScheduledMessagesList } from '@/components/shared/ScheduledMessagesList';
import useFriendshipStore from '@/stores/friendshipStore';

interface ConversationDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDTO | null;
  currentUserId: string;
  isUserOnline: (userId: string) => boolean;
  onRemoveMember?: (memberId: string) => Promise<boolean>;
  onLeaveGroup?: () => Promise<boolean>;
  onToggleMute?: () => Promise<boolean>;
  onTogglePin?: () => Promise<boolean>;
  onJumpToMessage?: (messageId: string) => void;
}

export function ConversationDetailsSheet({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  onLeaveGroup,
  onJumpToMessage
}: ConversationDetailsSheetProps) {
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false); // 🆕 Block loading state
  const [scheduledMessagesOpen, setScheduledMessagesOpen] = useState(false); // 🆕 Scheduled messages

  // ✅ Use React Query hook - auto caching and refetching
  const { data: mediaSummary } = useMediaSummary(
    open && conversation ? conversation.id : ''
  );

  // ✅ Use conversation hook for update functionality
  const { updateConversation } = useConversation();

  // Determine if this is a group conversation (needed for hooks below)
  const isGroup = conversation?.type === 'group';

  // 🆕 Direct chat info for block feature
  const isDirectChat = conversation?.type === 'direct' && conversation.contact_info;
  const otherUserId = conversation?.contact_info?.user_id;
  const otherUserName = conversation?.contact_info?.display_name || conversation?.contact_info?.username || 'ผู้ใช้';

  // 🆕 ดึงสถานะ block และ actions จาก store
  const blockedUsers = useFriendshipStore(state => state.blockedUsers);
  const blockUser = useFriendshipStore(state => state.blockUser);
  const unblockUser = useFriendshipStore(state => state.unblockUser);
  const isUserBlocked = otherUserId ? blockedUsers.some(u => u.id === otherUserId) : false;

  // 🆕 Handle block/unblock directly without dialog
  const handleBlockToggle = useCallback(async () => {
    if (!otherUserId) return;

    setIsBlockLoading(true);
    try {
      if (isUserBlocked) {
        // Unblock
        const success = await unblockUser(otherUserId);
        if (success) {
          toast.success('ยกเลิกการบล็อกสำเร็จ', {
            description: `คุณสามารถรับข้อความจาก ${otherUserName} ได้อีกครั้ง`,
          });
        } else {
          toast.error('เกิดข้อผิดพลาด', { description: 'ไม่สามารถยกเลิกการบล็อกได้' });
        }
      } else {
        // Block
        const success = await blockUser(otherUserId);
        if (success) {
          toast.success('บล็อกผู้ใช้สำเร็จ', {
            description: `${otherUserName} จะไม่สามารถส่งข้อความหาคุณได้`,
          });
        } else {
          toast.error('เกิดข้อผิดพลาด', { description: 'ไม่สามารถบล็อกผู้ใช้ได้' });
        }
      }
    } catch (err) {
      console.error('[ConversationDetailsSheet] Block error:', err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsBlockLoading(false);
    }
  }, [otherUserId, otherUserName, isUserBlocked, blockUser, unblockUser]);

  // ✅ Group members for role management (only for groups)
  const { data: membersData } = useGroupMembers(conversation?.id || '', {
    enabled: open && isGroup,
    limit: 100,
  });

  // ✅ Group management hook
  const {
    promoteToAdmin,
    demoteToMember,
    transferOwnershipTo,
    removeMember,
    confirmDialog,
    closeConfirmDialog,
    confirmAction,
    loading: managementLoading,
  } = useGroupManagement(conversation?.id || '');

  // Handle jump to message
  const handleJumpToMessage = (messageId: string) => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId);
      onOpenChange(false); // Close the sheet after jumping
    }
  };

  if (!conversation) {
    return null;
  }

  const isCreator = conversation.creator_id === currentUserId;

  // Handle leave group - wrapper to also close the sheet on success
  const handleLeaveGroup = async (): Promise<boolean> => {
    if (!onLeaveGroup) return false;
    const success = await onLeaveGroup();
    if (success) {
      onOpenChange(false); // Close the sheet
    }
    return success;
  };

  // Update conversation wrapper for edit dialog
  const handleUpdateConversation = async (
    updates: { title?: string; icon_url?: string }
  ): Promise<boolean> => {
    return await updateConversation(conversation.id, updates);
  };

  // ✅ Map old member format to new ConversationMemberWithRole format with owner role
  const membersWithRoles: ConversationMemberWithRole[] = (membersData?.members || []).map(member => ({
    id: member.id,
    conversation_id: conversation?.id || '',
    user_id: member.user_id,
    role: member.user_id === conversation?.creator_id ? 'owner' : member.role as 'admin' | 'member',
    joined_at: member.joined_at,
    user: {
      id: member.user_id,
      username: member.username,
      display_name: member.display_name,
      profile_image_url: member.profile_picture || undefined,
    }
  }));

  // ✅ Get current user's role
  const currentUserMember = membersWithRoles.find(m => m.user_id === currentUserId);
  const currentUserRole = currentUserMember?.role || 'member';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[80%] p-6 sm:max-w-md border-l-0 flex flex-col overflow-y-auto">
          <SheetHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={conversation.icon_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {isGroup ? <Users size={32} /> : <User size={32} />}
                </AvatarFallback>
              </Avatar>
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-2">
                  <SheetTitle className="text-xl">{conversation.title}</SheetTitle>
                  {isGroup && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditDialogOpen(true)}
                      title="แก้ไขข้อมูลกลุ่ม"
                    >
                      <Pencil size={16} />
                    </Button>
                  )}
                </div>
                <SheetDescription className="flex items-center justify-center gap-1">
                  {isGroup ? (
                    <>
                      <Users size={14} />
                      {conversation.member_count || 0} สมาชิก
                    </>
                  ) : (
                    'แชทส่วนตัว'
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          

          {/* Quick Actions */}
          

          <Separator />

          {/* Tabs: Info, Photos, Videos, Files, Links, Manage, History */}
          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <TabsList className={`grid w-full ${isGroup ? 'grid-cols-7' : 'grid-cols-5'} text-xs`}>
              <TabsTrigger value="info" className="text-xs px-2">ข้อมูล</TabsTrigger>
              <TabsTrigger value="photos" className="text-xs px-1">
                <ImageIcon size={14} />
                {mediaSummary && mediaSummary.image_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.image_count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="videos" className="text-xs px-1">
                <Video size={14} />
                {mediaSummary && mediaSummary.video_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.video_count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs px-1">
                <FileText size={14} />
                {mediaSummary && mediaSummary.file_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.file_count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="links" className="text-xs px-1">
                <LinkIcon size={14} />
                {mediaSummary && mediaSummary.link_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.link_count}</span>
                )}
              </TabsTrigger>
              {isGroup && (
                <>
                  <TabsTrigger value="manage" className="text-xs px-1">
                    <UserCog size={14} />
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs px-1">
                    <History size={14} />
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="flex-1 overflow-y-auto">
              <ConversationInfoTab conversation={conversation} isGroup={isGroup} />
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <PhotoGallery
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <VideoGallery
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <FileList
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <LinkList
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Manage Tab - Role Management */}
            {isGroup && (
              <TabsContent value="manage" className="flex-1 overflow-y-auto">
                <div className="py-4">
                  <MemberList
                    conversationId={conversation.id}
                    members={membersWithRoles}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onPromote={promoteToAdmin}
                    onDemote={demoteToMember}
                    onTransferOwnership={transferOwnershipTo}
                    onRemove={removeMember}
                  />
                </div>
              </TabsContent>
            )}

            {/* History Tab - Activity Log */}
            {isGroup && (
              <TabsContent value="history" className="flex-1 overflow-y-auto">
                <ActivityLog conversationId={conversation.id} />
              </TabsContent>
            )}
          </Tabs>

          <Separator />

          {/* 🆕 Scheduled Messages Button */}
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScheduledMessagesOpen(true)}
            >
              <Clock className="mr-2 h-4 w-4" />
              ข้อความตั้งเวลา
            </Button>
          </div>

          {/* Leave Group Button */}
          {isGroup && onLeaveGroup && (
            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setLeaveDialogOpen(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                ออกจากกลุ่ม
              </Button>
            </div>
          )}

          {/* 🆕 Block/Unblock User Button - สำหรับ direct chat (ไม่มี dialog) */}
          {isDirectChat && otherUserId && (
            <div className="pt-2">
              <Button
                variant={isUserBlocked ? "outline" : "destructive"}
                className="w-full"
                onClick={handleBlockToggle}
                disabled={isBlockLoading}
              >
                {isBlockLoading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Ban className="mr-2 h-4 w-4" />
                )}
                {isUserBlocked ? 'ยกเลิกการบล็อก' : 'บล็อกผู้ใช้'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Leave Group Dialog */}
      {isGroup && onLeaveGroup && (
        <LeaveGroupDialog
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          conversation={conversation}
          isCreator={isCreator}
          onLeave={handleLeaveGroup}
        />
      )}

      {/* Edit Group Dialog */}
      {isGroup && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          conversation={conversation}
          onUpdate={handleUpdateConversation}
        />
      )}

      {/* 🆕 Scheduled Messages List */}
      {conversation && (
        <ScheduledMessagesList
          open={scheduledMessagesOpen}
          onOpenChange={setScheduledMessagesOpen}
          conversationId={conversation.id}
        />
      )}

      {/* Confirm Remove/Transfer Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={closeConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'remove' ? 'ลบสมาชิก' : 'โอนความเป็นเจ้าของ'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'remove'
                ? 'คุณแน่ใจหรือไม่ที่จะลบสมาชิกคนนี้ออกจากกลุ่ม?'
                : 'คุณแน่ใจหรือไม่ที่จะโอนความเป็นเจ้าของกลุ่ม? คุณจะกลายเป็นผู้ดูแลแทน และไม่สามารถยกเลิกได้'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeConfirmDialog}
              disabled={managementLoading}
            >
              ยกเลิก
            </Button>
            <Button
              variant={confirmDialog.type === 'remove' ? 'destructive' : 'default'}
              onClick={confirmAction}
              disabled={managementLoading}
            >
              {managementLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
