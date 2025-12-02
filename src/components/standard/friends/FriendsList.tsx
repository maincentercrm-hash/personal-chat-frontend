// src/components/standard/friends/FriendsList.tsx
import React from 'react';
import type { FriendCategory } from '@/pages/standard/friend/FriendsPage';
import FriendItem from './FriendItem';
import GroupItem from './GroupItem'; // เพิ่ม import
import PendingRequestItem from './PendingRequestItem';
import BlockedUserItem from './BlockedUserItem';
import EmptyState from './EmptyState';
import type {
  FriendItem as FriendItemType,
  PendingRequestItem as PendingRequestItemType,
  BlockedUserItem as BlockedUserItemType
} from '@/types/user-friendship.types';
import type { ConversationDTO } from '@/types/conversation.types'; // เพิ่ม import

interface FriendsListProps {
  category: FriendCategory;
  loading: boolean;

  // แยกข้อมูลตาม category
  friends?: FriendItemType[];
  groups?: ConversationDTO[];
  pendingRequests?: PendingRequestItemType[];
  sentRequests?: PendingRequestItemType[]; // ✅ เพิ่มคำขอที่ส่งไป
  blockedUsers?: BlockedUserItemType[];

  onAcceptRequest: (id: string) => Promise<boolean>;
  onRejectRequest: (id: string) => Promise<boolean>;
  onCancelRequest: (id: string) => Promise<boolean>; // ✅ เพิ่ม onCancelRequest
  onUnblockUser: (id: string) => Promise<boolean>;
  onRemoveFriend?: (id: string) => Promise<boolean>;
  onBlockUser?: (id: string) => Promise<boolean>;
  onStartConversation?: (id: string) => Promise<string>;
  onLeaveGroup?: (id: string) => Promise<boolean>;
}

const FriendsList: React.FC<FriendsListProps> = ({
  category,
  loading,
  friends = [],
  groups = [],
  pendingRequests = [],
  sentRequests = [], // ✅ เพิ่ม
  blockedUsers = [],
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest, // ✅ เพิ่ม
  onRemoveFriend,
  onBlockUser,
  onUnblockUser,
  onStartConversation,
  onLeaveGroup,
}) => {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // แสดงข้อมูลตาม category ที่เลือก
  const renderContent = () => {
    switch (category) {
      case 'all':
        return (
          <>
            {friends.length > 0 ? (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-medium text-card-foreground">รายชื่อเพื่อน ({friends.length})</h2>
                </div>
                {friends.map(friend => (
                  <FriendItem 
                    key={friend.id} 
                    friend={friend}
                    onRemoveFriend={onRemoveFriend}
                    onBlockUser={onBlockUser}
                    onStartConversation={onStartConversation}
                  />
                ))}
              </>
            ) : (
              <EmptyState category="all" />
            )}
          </>
        );
        
      case 'groups':
        return (
          <>
            {groups.length > 0 ? (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-medium text-card-foreground">กลุ่มสนทนา ({groups.length})</h2>
                </div>
                {groups.map(group => (
                  <GroupItem 
                    key={group.id} 
                    group={group}
                    onLeaveGroup={onLeaveGroup}
                  />
                ))}
              </>
            ) : (
              <EmptyState category="groups" />
            )}
          </>
        );

      case 'pending':
        return (
          <>
            {/* ส่วนแสดงคำขอที่ได้รับ */}
            {pendingRequests.length > 0 && (
              <>
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h2 className="text-sm font-medium text-card-foreground">
                    📬 ได้รับคำขอ ({pendingRequests.length})
                  </h2>
                </div>
                {pendingRequests.map(request => (
                  <PendingRequestItem
                    key={request.request_id}
                    request={request}
                    type="received"
                    onAccept={onAcceptRequest}
                    onReject={onRejectRequest}
                  />
                ))}
              </>
            )}

            {/* ส่วนแสดงคำขอที่ส่งไป */}
            {sentRequests.length > 0 && (
              <>
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h2 className="text-sm font-medium text-card-foreground">
                    📤 คำขอที่ส่งไป ({sentRequests.length})
                  </h2>
                </div>
                {sentRequests.map(request => (
                  <PendingRequestItem
                    key={request.request_id}
                    request={request}
                    type="sent"
                    onCancel={onCancelRequest}
                  />
                ))}
              </>
            )}

            {/* แสดง Empty State เมื่อไม่มีคำขอทั้งสองประเภท */}
            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <EmptyState category="pending" />
            )}
          </>
        );
        
      case 'blocked':
        return (
          <>
            {blockedUsers.length > 0 ? (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-medium text-card-foreground">ผู้ใช้ที่ถูกบล็อก ({blockedUsers.length})</h2>
                </div>
                {blockedUsers.map(user => (
                  <BlockedUserItem 
                    key={user.id} 
                    user={user} 
                    onUnblock={onUnblockUser}
                  />
                ))}
              </>
            ) : (
              <EmptyState category="blocked" />
            )}
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      <div className="bg-card rounded-xl shadow-sm">
        {renderContent()}
      </div>
    </div>
  );
};

export default FriendsList;