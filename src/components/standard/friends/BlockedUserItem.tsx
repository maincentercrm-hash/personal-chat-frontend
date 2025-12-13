// src/components/friends/BlockedUserItem.tsx
import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { BlockedUserItem as BlockedUserItemType } from '@/types/user-friendship.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BlockedUserItemProps {
  user: BlockedUserItemType;
  onUnblock: (id: string) => Promise<boolean>;
}

const BlockedUserItem: React.FC<BlockedUserItemProps> = ({ user, onUnblock }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const handleUnblockClick = () => {
    setShowDialog(true);
  };

  const handleConfirmUnblock = async () => {
    setIsUnblocking(true);
    try {
      await onUnblock(user.id);
      setShowDialog(false);
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setIsUnblocking(false);
    }
  };

  return (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {user.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={user.display_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User size={20} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-card-foreground">{user.display_name}</h3>
            <p className="text-xs text-muted-foreground">{user.username}</p>
          </div>
        </div>

        <div>
          <button
            onClick={handleUnblockClick}
            className="text-sm text-primary hover:underline"
            disabled={isUnblocking}
          >
            {isUnblocking ? 'กำลังยกเลิก...' : 'ยกเลิกการบล็อก'}
          </button>
        </div>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกการบล็อก {user.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณจะสามารถรับข้อความจาก {user.display_name} ได้อีกครั้ง
              <br />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                หมายเหตุ: คุณจะต้องส่งคำขอเป็นเพื่อนใหม่อีกครั้ง
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnblocking}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnblock}
              disabled={isUnblocking}
            >
              {isUnblocking ? 'กำลังดำเนินการ...' : 'ยกเลิกการบล็อก'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlockedUserItem;