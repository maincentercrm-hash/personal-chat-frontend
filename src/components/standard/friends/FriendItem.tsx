// src/components/friends/FriendItem.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { User, MoreVertical, UserMinus, Ban, MessageCircle } from 'lucide-react';
import type { FriendItem as FriendItemType } from '@/types/user-friendship.types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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

interface FriendItemProps {
  friend: FriendItemType;
  onRemoveFriend?: (id: string) => Promise<boolean>;
  onBlockUser?: (id: string) => Promise<boolean>;
  onStartConversation?: (id: string) => Promise<string>;
}

type DialogType = 'remove' | 'block' | null;

const FriendItem: React.FC<FriendItemProps> = React.memo(({
  friend,
  onRemoveFriend,
  onBlockUser,
  onStartConversation
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState<DialogType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Memoize last active text calculation
  const lastActiveText = useMemo(() => {
    if (!friend.last_active_at) return "";

    const lastActive = new Date(friend.last_active_at);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `ใช้งานล่าสุด ${diffMins} นาทีที่แล้ว`;
    } else if (diffHours < 24) {
      return `ใช้งานล่าสุด ${diffHours} ชั่วโมงที่แล้ว`;
    } else {
      return `ใช้งานล่าสุด ${diffDays} วันที่แล้ว`;
    }
  }, [friend.last_active_at]);

  // Memoize handlers with useCallback
  const handleStartConversation = useCallback(async () => {
    if (!onStartConversation) return;

    try {
      setIsLoading(true);
      const conversationId = await onStartConversation(friend.id);
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("ไม่สามารถเริ่มการสนทนาได้", {
        description: "กรุณาลองใหม่อีกครั้ง"
      });
    } finally {
      setIsLoading(false);
    }
  }, [friend.id, onStartConversation, navigate]);

  const handleRemoveFriendClick = useCallback(() => {
    setShowDialog('remove');
    setShowOptions(false);
  }, []);

  const handleBlockUserClick = useCallback(() => {
    setShowDialog('block');
    setShowOptions(false);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!onRemoveFriend) return;

    setIsProcessing(true);
    try {
      const success = await onRemoveFriend(friend.id);
      if (success) {
        toast.success("ลบเพื่อนสำเร็จ");
        setShowDialog(null);
      }
    } catch (error) {
      toast.error("ไม่สามารถลบเพื่อนได้");
    } finally {
      setIsProcessing(false);
    }
  }, [friend.id, onRemoveFriend]);

  const handleConfirmBlock = useCallback(async () => {
    if (!onBlockUser) return;

    setIsProcessing(true);
    try {
      const success = await onBlockUser(friend.id);
      if (success) {
        toast.success("บล็อกผู้ใช้สำเร็จ");
        setShowDialog(null);
      }
    } catch (error) {
      toast.error("ไม่สามารถบล็อกผู้ใช้ได้");
    } finally {
      setIsProcessing(false);
    }
  }, [friend.id, onBlockUser]);

  const toggleOptions = useCallback(() => {
    setShowOptions(prev => !prev);
  }, []);

  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      {/* ทำให้ส่วนของข้อมูลเพื่อนคลิกได้ */}
      <div
        className="flex items-center gap-3 flex-grow cursor-pointer"
        onClick={onStartConversation ? handleStartConversation : undefined}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {friend.profile_image_url ? (
              <img
                src={friend.profile_image_url}
                alt={friend.display_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User size={20} className="text-muted-foreground" />
            )}
          </div>
          {friend.status === 'online' && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--status-online)] rounded-full border-2 border-card"></div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-card-foreground">{friend.display_name}</h3>
          <p className="text-xs text-muted-foreground">{friend.username}</p>
          {friend.status !== 'online' && friend.last_active_at && (
            <p className="text-xs text-muted-foreground/70">{lastActiveText}</p>
          )}
        </div>
      </div>

      <div className="flex items-center">
        {/* เพิ่มปุ่มแชท */}
        {onStartConversation && (
          <button
            onClick={handleStartConversation}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-muted/50 mr-1"
            aria-label="เริ่มการสนทนา"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-primary rounded-full animate-spin"></div>
            ) : (
              <MessageCircle size={18} className="text-primary" />
            )}
          </button>
        )}

        <div className="relative">
          {(onRemoveFriend || onBlockUser) && (
            <button
              onClick={toggleOptions}
              className="p-2 rounded-full hover:bg-muted/50"
              aria-label="ตัวเลือกเพิ่มเติม"
            >
              <MoreVertical size={18} className="text-muted-foreground" />
            </button>
          )}

          {showOptions && (
            <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg z-10 py-1 border border-border">
              {onRemoveFriend && (
                <button
                  onClick={handleRemoveFriendClick}
                  className="w-full text-left px-4 py-2 text-sm text-card-foreground hover:bg-muted/50 flex items-center gap-2"
                >
                  <UserMinus size={16} />
                  <span>ลบออกจากเพื่อน</span>
                </button>
              )}
              {onBlockUser && (
                <button
                  onClick={handleBlockUserClick}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted/50 flex items-center gap-2"
                >
                  <Ban size={16} />
                  <span>บล็อกผู้ใช้นี้</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Remove Friend Dialog */}
      <AlertDialog open={showDialog === 'remove'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ {friend.display_name} ออกจากเพื่อน?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณจะไม่เห็น {friend.display_name} ในรายชื่อเพื่อนอีกต่อไป
              <br />
              คุณสามารถส่งคำขอเป็นเพื่อนใหม่ได้ในภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'กำลังดำเนินการ...' : 'ลบเพื่อน'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <AlertDialog open={showDialog === 'block'} onOpenChange={(open) => !open && setShowDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>บล็อก {friend.display_name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="text-sm text-muted-foreground mb-2">การบล็อกผู้ใช้นี้จะทำให้:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>คุณจะไม่ได้รับข้อความจาก {friend.display_name}</li>
                  <li>{friend.display_name} จะถูกลบออกจากรายชื่อเพื่อน</li>
                  <li>คุณต้องส่งคำขอเป็นเพื่อนใหม่หากยกเลิกการบล็อก</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBlock}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'กำลังดำเนินการ...' : 'บล็อกผู้ใช้'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

FriendItem.displayName = 'FriendItem';

export default FriendItem;