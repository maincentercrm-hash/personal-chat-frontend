// src/components/shared/ScheduleMessageDialog.tsx
import React, { useState, useCallback } from 'react';
import { format, isBefore, addMinutes } from 'date-fns';
import { th } from 'date-fns/locale';
import { Clock, Send, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateTimePickerInline } from '@/components/ui/date-time-picker';
import { scheduleMessage, toRFC3339 } from '@/services/scheduledMessageService';
import { toast } from 'sonner';

interface ScheduleMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  message: string;
  onScheduled?: () => void;
}

export function ScheduleMessageDialog({
  open,
  onOpenChange,
  conversationId,
  message,
  onScheduled,
}: ScheduleMessageDialogProps) {
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minimum date is 1 minute from now
  const minDate = addMinutes(new Date(), 1);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setScheduledDate(undefined);
      setError(null);
    }
  }, [open]);

  const handleSchedule = useCallback(async () => {
    if (!scheduledDate) {
      setError('กรุณาเลือกวันและเวลา');
      return;
    }

    if (isBefore(scheduledDate, new Date())) {
      setError('เวลาที่เลือกต้องอยู่ในอนาคต');
      return;
    }

    if (!message.trim()) {
      setError('กรุณาพิมพ์ข้อความก่อน');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await scheduleMessage(conversationId, {
        message_type: 'text',
        content: message.trim(),
        scheduled_at: toRFC3339(scheduledDate),
      });

      toast.success('ตั้งเวลาส่งข้อความสำเร็จ', {
        description: `จะส่งเมื่อ ${format(scheduledDate, 'd MMM yyyy, HH:mm น.', { locale: th })}`,
      });

      onOpenChange(false);
      onScheduled?.();
    } catch (err: any) {
      console.error('[ScheduleMessageDialog] Error:', err);
      const errorMessage = err.response?.data?.message || 'ไม่สามารถตั้งเวลาส่งข้อความได้';
      setError(errorMessage);
      toast.error('เกิดข้อผิดพลาด', { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [scheduledDate, message, conversationId, onOpenChange, onScheduled]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            ตั้งเวลาส่งข้อความ
          </DialogTitle>
          <DialogDescription>
            เลือกวันและเวลาที่ต้องการให้ส่งข้อความอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Preview message */}
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">ข้อความที่จะส่ง:</div>
            <div className="text-sm line-clamp-3">{message || '(ไม่มีข้อความ)'}</div>
          </div>

          {/* Date Time Picker */}
          <div className="border rounded-lg p-4">
            <DateTimePickerInline
              date={scheduledDate}
              setDate={setScheduledDate}
              minDate={minDate}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting || !scheduledDate || !message.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                กำลังตั้งเวลา...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                ตั้งเวลาส่ง
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleMessageDialog;
