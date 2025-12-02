// src/components/group/MemberList.tsx
import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConversationMemberWithRole } from '@/types/group.types';
import { MemberItem } from './MemberItem';
import conversationService from '@/services/conversationService';
import apiService from '@/services/apiService';
import { FRIENDSHIP_API } from '@/constants/api/standardApiConstants';
import { toast } from '@/utils/toast';

interface MemberListProps {
  conversationId: string;
  members: ConversationMemberWithRole[];
  currentUserId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
  onRemove: (userId: string) => void;
}

interface Friend {
  id: string;
  user_id?: string; // Optional - some APIs send user_id, some send id
  username: string;
  display_name: string;
  profile_picture?: string | null;
  profile_image_url?: string | null; // API sends profile_image_url instead
  friendship_id?: string;
  conversation_id?: string;
  friendship_status?: string;
  bio?: string;
  status?: string;
  last_active_at?: string;
}

export function MemberList({
  conversationId,
  members,
  currentUserId,
  currentUserRole,
  onPromote,
  onDemote,
  onTransferOwnership,
  onRemove,
}: MemberListProps) {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Sort: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  // Check if current user can invite members (owner or admin)
  const canInviteMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Fetch friends list with search
  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends', 'search', searchQuery],
    queryFn: async () => {
      // Use search API if there's a search query, otherwise get all friends
      const endpoint = searchQuery
        ? FRIENDSHIP_API.SEARCH_USERS
        : FRIENDSHIP_API.GET_FRIENDS;

      const params = searchQuery ? { q: searchQuery } : undefined;

      console.log('🔍 Calling API:', endpoint, 'with params:', params);

      const response = await apiService.get<{ data: Friend[] }>(
        endpoint,
        params
      );
      console.log('🔍 Friends API Response:', response);
      console.log('🔍 Friends Data:', response.data);
      return response.data;
    },
    enabled: showInviteDialog,
  });

  // Handle invite members
  const handleInviteMembers = async () => {
    if (selectedFriends.length === 0) return;

    setIsInviting(true);
    try {
      const response = await conversationService.addMember(conversationId, selectedFriends);

      const addedCount = response.data?.added_members?.length || 0;
      const failedCount = response.data?.failed_members?.length || 0;

      if (addedCount > 0) {
        toast.success('เชิญสมาชิกสำเร็จ', `เชิญ ${addedCount} คนเข้ากลุ่มแล้ว`);
      }

      if (failedCount > 0) {
        const failedReasons = response.data?.failed_members
          ?.map((f: any) => `${f.user_id}: ${f.reason}`)
          .join(', ') || '';
        toast.error('มีบางคนที่เชิญไม่สำเร็จ', `${failedCount} คน - ${failedReasons}`);
      }

      if (addedCount === 0 && failedCount === 0) {
        toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถเชิญสมาชิกได้');
      }

      // Invalidate query to refetch members
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      // Reset state
      setShowInviteDialog(false);
      setSelectedFriends([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error inviting members:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถเชิญสมาชิกได้');
    } finally {
      setIsInviting(false);
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Map friends with their member status (API already filtered by search query)
  const friendsWithStatus = (friendsData || []).map((friend) => {
    const friendUserId = friend.user_id || friend.id;
    const isAlreadyMember = members.some((m) => m.user_id === friendUserId);
    return { ...friend, isAlreadyMember };
  });

  console.log('🔍 Friends with Status:', friendsWithStatus);
  console.log('🔍 Loading Friends:', loadingFriends);

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-sm font-medium text-muted-foreground">
            สมาชิก ({members.length})
          </div>
          {canInviteMembers && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1 h-auto"
              onClick={() => setShowInviteDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              เชิญสมาชิก
            </Button>
          )}
        </div>

        {sortedMembers.map((member) => (
          <MemberItem
            key={member.id}
            member={member}
            isCurrentUser={member.user_id === currentUserId}
            currentUserRole={currentUserRole}
            onPromote={onPromote}
            onDemote={onDemote}
            onTransferOwnership={onTransferOwnership}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Invite Members Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เชิญสมาชิกเข้ากลุ่ม</DialogTitle>
            <DialogDescription>เลือกเพื่อนที่ต้องการเชิญเข้ากลุ่ม</DialogDescription>
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
              {loadingFriends ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                  <p className="text-sm text-muted-foreground">กำลังค้นหา...</p>
                </div>
              ) : friendsWithStatus.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UserPlus className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'ไม่พบเพื่อนที่ค้นหา' : 'ไม่มีเพื่อน'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {friendsWithStatus.map((friend) => {
                    const friendUserId = friend.user_id || friend.id;
                    const isDisabled = friend.isAlreadyMember;
                    const isSelected = selectedFriends.includes(friendUserId);

                    return (
                      <div
                        key={friendUserId}
                        className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed bg-muted/50'
                            : isSelected
                            ? 'bg-primary/10 border border-primary cursor-pointer'
                            : 'hover:bg-accent/50 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && toggleFriendSelection(friendUserId)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.profile_image_url || friend.profile_picture || undefined} />
                          <AvatarFallback>
                            {friend.display_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{friend.display_name}</p>
                            {isDisabled && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border">
                                อยู่ในกลุ่มแล้ว
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        </div>

                        {isSelected && !isDisabled && (
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
                setSearchQuery('');
              }}
              disabled={isInviting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleInviteMembers}
              disabled={selectedFriends.length === 0 || isInviting}
            >
              {isInviting
                ? 'กำลังเชิญ...'
                : `เชิญ ${selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
