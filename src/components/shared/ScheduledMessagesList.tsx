// src/components/shared/ScheduledMessagesList.tsx
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Clock, Trash2, Edit2, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getConversationScheduledMessages,
  cancelScheduledMessage,
  updateScheduledTime,
  type ScheduledMessage,
} from '@/services/scheduledMessageService';
import { DateTimePickerInline } from '@/components/ui/date-time-picker';
import { addMinutes } from 'date-fns';

interface ScheduledMessagesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function ScheduledMessagesList({
  open,
  onOpenChange,
  conversationId,
}: ScheduledMessagesListProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ScheduledMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit time state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<ScheduledMessage | null>(null);
  const [newScheduledDate, setNewScheduledDate] = useState<Date | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch scheduled messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getConversationScheduledMessages(conversationId);
      // Filter only pending messages
      const pendingMessages = response.data.scheduled_messages.filter(
        (msg) => msg.status === 'pending'
      );
      setMessages(pendingMessages);
    } catch (err: any) {
      console.error('[ScheduledMessagesList] Error fetching:', err);
      setError('ไม่สามารถโหลดรายการข้อความตั้งเวลาได้');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Fetch on open
  useEffect(() => {
    if (open && conversationId) {
      fetchMessages();
    }
  }, [open, conversationId, fetchMessages]);

  // Handle delete
  const handleDeleteClick = (message: ScheduledMessage) => {
    setMessageToDelete(message);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;

    setIsDeleting(true);
    try {
      await cancelScheduledMessage(messageToDelete.id);
      toast.success('ยกเลิกข้อความตั้งเวลาสำเร็จ');
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    } catch (err: any) {
      console.error('[ScheduledMessagesList] Error deleting:', err);
      toast.error('ไม่สามารถยกเลิกข้อความได้');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit time
  const handleEditClick = (message: ScheduledMessage) => {
    setMessageToEdit(message);
    setNewScheduledDate(new Date(message.scheduled_at));
    setEditDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!messageToEdit || !newScheduledDate) return;

    setIsUpdating(true);
    try {
      await updateScheduledTime(messageToEdit.id, {
        scheduled_at: newScheduledDate.toISOString(),
      });
      toast.success('แก้ไขเวลาสำเร็จ', {
        description: `เปลี่ยนเป็น ${format(newScheduledDate, 'd MMM yyyy, HH:mm น.', { locale: th })}`,
      });
      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageToEdit.id
            ? { ...m, scheduled_at: newScheduledDate.toISOString() }
            : m
        )
      );
      setEditDialogOpen(false);
      setMessageToEdit(null);
    } catch (err: any) {
      console.error('[ScheduledMessagesList] Error updating:', err);
      toast.error('ไม่สามารถแก้ไขเวลาได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: ScheduledMessage['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">รอส่ง</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">ส่งแล้ว</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">ยกเลิก</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">ล้มเหลว</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6">
          <SheetHeader className='p-0'>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              ข้อความตั้งเวลา
            </SheetTitle>
            <SheetDescription>
              รายการข้อความที่ตั้งเวลาไว้สำหรับการสนทนานี้
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            {/* Refresh button */}
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMessages}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ไม่มีข้อความตั้งเวลา</p>
                <p className="text-sm mt-1">
                  ใช้ปุ่มนาฬิกาในช่องพิมพ์ข้อความเพื่อตั้งเวลาส่ง
                </p>
              </div>
            )}

            {/* Messages list */}
            {!isLoading && messages.length > 0 && (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-muted/50 rounded-lg p-3 border"
                    >
                      {/* Status and time */}
                      <div className="flex items-center justify-between mb-2">
                        {getStatusBadge(msg.status)}
                        <span className="text-xs text-muted-foreground">
                          สร้างเมื่อ {format(new Date(msg.created_at), 'd MMM yyyy', { locale: th })}
                        </span>
                      </div>

                      {/* Scheduled time */}
                      <div className="flex items-center gap-2 text-sm mb-2 bg-accent/50 rounded p-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>
                          ส่งเมื่อ{' '}
                          <strong>
                            {format(new Date(msg.scheduled_at), "d MMM yyyy 'เวลา' HH:mm น.", { locale: th })}
                          </strong>
                        </span>
                      </div>

                      {/* Message content */}
                      <div className="text-sm bg-background rounded p-2 mb-3">
                        <div className="text-xs text-muted-foreground mb-1">ข้อความ:</div>
                        <div className="line-clamp-3">{msg.content}</div>
                      </div>

                      {/* Actions */}
                      {msg.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditClick(msg)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            แก้ไขเวลา
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDeleteClick(msg)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            ยกเลิก
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกข้อความตั้งเวลา?</AlertDialogTitle>
            <AlertDialogDescription>
              ข้อความนี้จะถูกยกเลิกและจะไม่ถูกส่งตามเวลาที่กำหนด
              การดำเนินการนี้ไม่สามารถเรียกคืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ไม่ใช่</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'กำลังยกเลิก...' : 'ยกเลิกข้อความ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit time dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              แก้ไขเวลาส่ง
            </AlertDialogTitle>
            <AlertDialogDescription>
              เลือกวันและเวลาใหม่สำหรับส่งข้อความ
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="border rounded-lg p-4">
              <DateTimePickerInline
                date={newScheduledDate}
                setDate={setNewScheduledDate}
                minDate={addMinutes(new Date(), 1)}
              />
            </div>

            {newScheduledDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 rounded-lg p-3 mt-3">
                <Calendar className="h-4 w-4" />
                <span>
                  จะส่งเมื่อ{' '}
                  <strong className="text-foreground">
                    {format(newScheduledDate, "EEEE d MMMM yyyy 'เวลา' HH:mm น.", { locale: th })}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEdit}
              disabled={isUpdating || !newScheduledDate}
            >
              {isUpdating ? 'กำลังบันทึก...' : 'บันทึก'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ScheduledMessagesList;
