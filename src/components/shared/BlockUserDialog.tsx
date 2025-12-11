// src/components/shared/BlockUserDialog.tsx
import { useState } from 'react';
import { Ban, ShieldOff, AlertTriangle } from 'lucide-react';
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
import { toast } from 'sonner';
import friendshipService from '@/services/friendshipService';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  isBlocked: boolean;
  onSuccess?: (isBlocked: boolean) => void;
}

export function BlockUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  isBlocked,
  onSuccess,
}: BlockUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (isBlocked) {
        // Unblock
        await friendshipService.unblockUser(userId);
        toast.success('ยกเลิกการบล็อกสำเร็จ', {
          description: `คุณสามารถรับข้อความจาก ${userName} ได้อีกครั้ง`,
        });
        onSuccess?.(false);
      } else {
        // Block
        await friendshipService.blockUser(userId);
        toast.success('บล็อกผู้ใช้สำเร็จ', {
          description: `${userName} จะไม่สามารถส่งข้อความหาคุณได้`,
        });
        onSuccess?.(true);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error('[BlockUserDialog] Error:', err);
      const errorMessage = err.response?.data?.message || 'เกิดข้อผิดพลาด';
      toast.error('เกิดข้อผิดพลาด', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isBlocked ? (
              <>
                <ShieldOff className="h-5 w-5 text-primary" />
                ยกเลิกการบล็อก {userName}?
              </>
            ) : (
              <>
                <Ban className="h-5 w-5 text-destructive" />
                บล็อก {userName}?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <span>
                หลังจากยกเลิกการบล็อก คุณจะสามารถรับข้อความจาก <strong>{userName}</strong> ได้อีกครั้ง
              </span>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    หลังจากบล็อก <strong>{userName}</strong> จะไม่สามารถ:
                  </span>
                </div>
                <ul className="ml-6 list-disc space-y-1 text-sm">
                  <li>ส่งข้อความหาคุณได้</li>
                  <li>เห็นสถานะออนไลน์ของคุณ</li>
                  <li>เพิ่มคุณเป็นเพื่อนได้</li>
                </ul>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={isBlocked ? '' : 'bg-destructive hover:bg-destructive/90'}
          >
            {isLoading ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : isBlocked ? (
              <ShieldOff className="h-4 w-4 mr-2" />
            ) : (
              <Ban className="h-4 w-4 mr-2" />
            )}
            {isBlocked ? 'ยกเลิกการบล็อก' : 'บล็อก'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default BlockUserDialog;
