// src/components/standard/conversation/MembersList.tsx
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, User, Loader2, UserX, AlertCircle, UserPlus } from "lucide-react";
import { useGroupMembers, type GroupMember } from "@/hooks/useGroupMembers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import conversationService from "@/services/conversationService";
import { toast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { FRIENDSHIP_API } from "@/constants/api/standardApiConstants";
import apiService from "@/services/apiService";

interface MembersListProps {
  conversationId: string;
  currentUserId: string;
  isCreator: boolean;
}

interface Friend {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
}

export function MembersList({ conversationId, currentUserId, isCreator }: MembersListProps) {
  const queryClient = useQueryClient();
  const [removingMember, setRemovingMember] = useState<GroupMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const { data, isLoading, error } = useGroupMembers(conversationId, {
    limit: 100, // ดึงมาเยอะๆ ไม่ต้อง pagination ใน UI ก่อน
  });

  // Fetch friends list
  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await apiService.get<{ data: Friend[] }>(
        FRIENDSHIP_API.GET_FRIENDS
      );
      console.log('Friends API Response:', response);
      console.log('Friends Data:', response.data);
      return response.data;
    },
    enabled: showInviteDialog,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">กำลังโหลดรายชื่อสมาชิก...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <User size={40} className="text-muted-foreground mb-2" />
        <p className="text-sm text-destructive">ไม่สามารถโหลดรายชื่อสมาชิกได้</p>
        <p className="text-xs text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'โปรดลองอีกครั้ง'}
        </p>
      </div>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <User size={40} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">ไม่พบสมาชิก</p>
      </div>
    );
  }

  // Handle remove member
  const handleRemoveMember = async () => {
    if (!removingMember) return;

    setIsRemoving(true);
    try {
      await conversationService.leaveGroup(conversationId, removingMember.user_id);

      toast.success('ลบสมาชิกสำเร็จ', `ลบ ${removingMember.display_name} ออกจากกลุ่มแล้ว`);

      // Invalidate query to refetch members
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      setRemovingMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบสมาชิกได้');
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle invite members
  const handleInviteMembers = async () => {
    if (selectedFriends.length === 0) return;

    console.log('Selected Friends to invite:', selectedFriends);
    setIsInviting(true);
    try {
      const response = await conversationService.addMember(conversationId, selectedFriends);

      console.log('Invite response:', response);

      // Check if there are any added members
      const addedCount = response.data?.added_members?.length || 0;
      const failedCount = response.data?.failed_members?.length || 0;

      if (addedCount > 0) {
        toast.success('เชิญสมาชิกสำเร็จ', `เชิญ ${addedCount} คนเข้ากลุ่มแล้ว`);
      }

      // Show warning if some members failed
      if (failedCount > 0) {
        const failedReasons = response.data?.failed_members
          ?.map(f => `${f.user_id}: ${f.reason}`)
          .join(', ') || '';
        toast.error('มีบางคนที่เชิญไม่สำเร็จ', `${failedCount} คน - ${failedReasons}`);
      }

      // If no members were added at all
      if (addedCount === 0 && failedCount === 0) {
        toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถเชิญสมาชิกได้');
      }

      // Invalidate query to refetch members
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      // Reset state
      setShowInviteDialog(false);
      setSelectedFriends([]);
      setSearchQuery("");
    } catch (error) {
      console.error('Error inviting members:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถเชิญสมาชิกได้');
    } finally {
      setIsInviting(false);
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (userId: string) => {
    console.log('Toggling friend selection for userId:', userId);
    setSelectedFriends(prev => {
      const newSelection = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      console.log('Updated selectedFriends:', newSelection);
      return newSelection;
    });
  };

  // Filter friends that are not already members
  const availableFriends = (friendsData || []).filter(friend => {
    // Use id if user_id is not available (API might send id instead of user_id)
    const friendUserId = friend.user_id || friend.id;
    const isAlreadyMember = data?.members.some(m => m.user_id === friendUserId);
    const matchesSearch = friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  });

  // แยกสมาชิกตาม role: admin ก่อน แล้วค่อย member
  const admins = data.members.filter(m => m.role === 'admin');
  const members = data.members.filter(m => m.role === 'member');
  const sortedMembers = [...admins, ...members];

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between py-2">
          <h3 className="font-medium">สมาชิก ({data.total})</h3>
          <div className="flex items-center gap-2">
            {isCreator && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => setShowInviteDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  เชิญสมาชิก
                </Button>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                  <Shield size={12} />
                  ผู้สร้าง
                </div>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {sortedMembers.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                isCurrentUser={member.user_id === currentUserId}
                canRemove={isCreator && member.user_id !== currentUserId}
                onRemove={() => setRemovingMember(member)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Invite Members Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เชิญสมาชิกเข้ากลุ่ม</DialogTitle>
            <DialogDescription>
              เลือกเพื่อนที่ต้องการเชิญเข้ากลุ่ม
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <Input
              placeholder="ค้นหาชื่อหรือ username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Friends List */}
            <ScrollArea className="h-[300px]">
              {availableFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User size={40} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'ไม่พบเพื่อนที่ค้นหา' : 'ไม่มีเพื่อนที่สามารถเชิญได้'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableFriends.map((friend) => {
                    const friendUserId = friend.user_id || friend.id;
                    return (
                      <div
                        key={friendUserId}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedFriends.includes(friendUserId)
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => toggleFriendSelection(friendUserId)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.profile_picture || undefined} />
                        <AvatarFallback>
                          {friend.display_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {friend.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        </div>

                        {selectedFriends.includes(friendUserId) && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {selectedFriends.length > 0 && (
              <p className="text-sm text-muted-foreground">
                เลือกแล้ว {selectedFriends.length} คน
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteDialog(false);
                setSelectedFriends([]);
                setSearchQuery("");
              }}
              disabled={isInviting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleInviteMembers}
              disabled={selectedFriends.length === 0 || isInviting}
            >
              {isInviting ? 'กำลังเชิญ...' : `เชิญ ${selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive" size={20} />
              ลบสมาชิกออกจากกลุ่ม
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ{' '}
              <span className="font-semibold">{removingMember?.display_name}</span>{' '}
              ออกจากกลุ่ม?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'กำลังดำเนินการ...' : 'ลบสมาชิก'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface MemberItemProps {
  member: GroupMember;
  isCurrentUser: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
}

function MemberItem({ member, isCurrentUser, canRemove, onRemove }: MemberItemProps) {
  const content = (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.profile_picture || undefined} />
          <AvatarFallback>
            {member.display_name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        {member.is_online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-background"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {member.display_name}
            {isCurrentUser && (
              <span className="text-muted-foreground ml-1">(คุณ)</span>
            )}
          </p>
          {member.role === 'admin' && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">
              <Shield size={10} />
              <span>Admin</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          @{member.username}
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        {member.is_online ? (
          <span className="text-emerald-600 dark:text-emerald-400">ออนไลน์</span>
        ) : (
          <span>ออฟไลน์</span>
        )}
      </div>
    </div>
  );

  // If cannot remove, just return the content without context menu
  if (!canRemove || !onRemove) {
    return content;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={onRemove}
          className="text-destructive focus:text-destructive"
        >
          <UserX className="mr-2 h-4 w-4" />
          เตะออกจากกลุ่ม
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
