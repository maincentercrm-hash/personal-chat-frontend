// src/components/standard/conversation/LeaveGroupDialog.tsx
import { useState } from 'react';
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
import { AlertCircle } from 'lucide-react';
import { toast } from '@/utils/toast';
import type { ConversationDTO } from '@/types/conversation.types';

interface LeaveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDTO;
  isCreator: boolean;
  onLeave: () => Promise<boolean>;
}

export function LeaveGroupDialog({
  open,
  onOpenChange,
  conversation,
  isCreator,
  onLeave,
}: LeaveGroupDialogProps) {
  const [loading, setLoading] = useState(false);

  // Handle leave group
  const handleLeaveGroup = async () => {
    setLoading(true);
    try {
      const success = await onLeave();

      if (success) {
        toast.success('ออกจากกลุ่มสำเร็จ', 'คุณได้ออกจากกลุ่มแล้ว');
        onOpenChange(false);
      } else {
        toast.error('ไม่สามารถออกจากกลุ่มได้', 'โปรดลองอีกครั้ง');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถออกจากกลุ่มได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="text-destructive" size={20} />
            ออกจากกลุ่ม
          </AlertDialogTitle>
          <AlertDialogDescription>
            คุณแน่ใจหรือไม่ว่าต้องการออกจากกลุ่ม{' '}
            <span className="font-semibold">{conversation.title}</span>?
            {isCreator && (
              <span className="block mt-2 text-destructive font-medium">
                เนื่องจากคุณเป็นผู้สร้างกลุ่ม การออกจากกลุ่มอาจส่งผลต่อการจัดการกลุ่ม
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeaveGroup}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'กำลังดำเนินการ...' : 'ออกจากกลุ่ม'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
