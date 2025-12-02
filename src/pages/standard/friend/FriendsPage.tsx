// src/pages/standard/friend/FriendsPage.tsx
import React from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import FriendHeader from '@/components/standard/friends/FriendHeader';
import FriendTabs from '@/components/standard/friends/FriendTabs';
import FriendsList from '@/components/standard/friends/FriendsList';
import AddFriendModal from '@/components/standard/friends/AddFriendModal';
import CreateGroupModal from '@/components/standard/friends/CreateGroupModal';
import { useFriendsPageLogic } from './hooks/useFriendPageLogic';

export type FriendCategory = 'all' | 'groups' | 'pending' | 'blocked';

/**
 * หน้าจัดการเพื่อนและกลุ่ม - แสดงรายการเพื่อน, กลุ่ม, บัญชีทางการ, คำขอเป็นเพื่อน, และผู้ใช้ที่ถูกบล็อก
 * ใช้ Clean Architecture โดยแยก business logic ไปไว้ที่ custom hook
 */
const FriendsPage: React.FC = () => {
  const isMobile = useIsMobile();
  
  // ใช้ custom hook เพื่อจัดการ logic ทั้งหมด
  const {
    // State
    searchQuery,
    setSearchQuery,
    activeCategory,
    showAddFriendModal,
    showCreateGroupModal,
    loading,
    isWebSocketConnected,

    // ข้อมูลที่กรองแล้ว
    filteredFriends,
    filteredGroups,
    filteredPendingRequests,
    filteredSentRequests, // ✅ เพิ่ม
    filteredBlockedUsers,
    pendingRequestCount,

    // Handlers
    handleCategoryChange,
    handleOpenAddFriendModal,
    handleCloseAddFriendModal,
    handleOpenCreateGroupModal,
    handleCloseCreateGroupModal,
    handleAddFriend,
    handleStartConversation,
    handleCreateGroup,
    handleLeaveGroup,

    // ส่งต่อ handlers จาก hooks ที่เกี่ยวข้อง
    acceptRequest,
    rejectRequest,
    cancelRequest, // ✅ เพิ่ม
    deleteFriend,
    block,
    unblock
  } = useFriendsPageLogic();

  return (
    <div className="h-full w-full md:w-3/5 mx-auto flex flex-col bg-background">
      {!isWebSocketConnected && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 text-sm">
          กำลังเชื่อมต่อกับเซิร์ฟเวอร์...
        </div>
      )}
      
      <FriendHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddFriend={handleOpenAddFriendModal}
        onCreateGroup={handleOpenCreateGroupModal}
        isMobile={isMobile}
        activeCategory={activeCategory}
      />
      
      <FriendTabs 
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        pendingRequestCount={pendingRequestCount}
      />
      
      <FriendsList
        category={activeCategory}
        loading={loading}
        friends={activeCategory === 'all' ? filteredFriends : []}
        groups={activeCategory === 'groups' ? filteredGroups : []}
        pendingRequests={activeCategory === 'pending' ? filteredPendingRequests : []}
        sentRequests={activeCategory === 'pending' ? filteredSentRequests : []}
        blockedUsers={activeCategory === 'blocked' ? filteredBlockedUsers : []}
        onAcceptRequest={acceptRequest}
        onRejectRequest={rejectRequest}
        onCancelRequest={cancelRequest}
        onRemoveFriend={deleteFriend}
        onBlockUser={block}
        onUnblockUser={unblock}
        onStartConversation={handleStartConversation}
        onLeaveGroup={handleLeaveGroup}
      />
      
      {showAddFriendModal && (
        <AddFriendModal
          onClose={handleCloseAddFriendModal}
          onAddFriend={handleAddFriend}
        />
      )}
      
      {showCreateGroupModal && (
        <CreateGroupModal 
          onClose={handleCloseCreateGroupModal}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </div>
  );
};

export default FriendsPage;