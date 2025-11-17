// src/components/standard/conversation/ConversationDetailsSheet.tsx
import { useState, useRef, type ChangeEvent } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Users, LogOut, User, AlertCircle, Pencil,
  Image as ImageIcon, Video, FileText, Link as LinkIcon
} from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import type { UploadImageResponse } from '@/types/upload.types';
import { toast } from '@/utils/toast';
import { useMediaSummary } from '@/hooks/useMediaQueries';
import { useConversation } from '@/hooks/useConversation';
import apiService from '@/services/apiService';
import { FILE_API } from '@/constants/api/standardApiConstants';
import { PhotoGallery } from './PhotoGallery';
import { VideoGallery } from './VideoGallery';
import { FileList } from './FileList';
import { LinkList } from './LinkList';
import { MembersList } from './MembersList';

interface ConversationDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDTO | null;
  currentUserId: string;
  isUserOnline: (userId: string) => boolean;
  onRemoveMember?: (memberId: string) => Promise<boolean>;
  onLeaveGroup?: () => Promise<boolean>;
  onToggleMute?: () => Promise<boolean>;
  onTogglePin?: () => Promise<boolean>;
  onJumpToMessage?: (messageId: string) => void;
}

export function ConversationDetailsSheet({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  onLeaveGroup,
  onJumpToMessage
}: ConversationDetailsSheetProps) {
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit group dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editIconUrl, setEditIconUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Use React Query hook - auto caching and refetching
  const { data: mediaSummary } = useMediaSummary(
    open && conversation ? conversation.id : ''
  );

  // ✅ Use conversation hook for update functionality
  const { updateConversation } = useConversation();

  // Handle jump to message
  const handleJumpToMessage = (messageId: string) => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId);
      onOpenChange(false); // Close the sheet after jumping
    }
  };

  if (!conversation) {
    return null;
  }

  const isGroup = conversation.type === 'group';
  const isCreator = conversation.creator_id === currentUserId;

  // Handle open edit dialog
  const handleOpenEditDialog = () => {
    if (!conversation) return;

    // Pre-fill form with current values
    setEditTitle(conversation.title || '');
    setEditIconUrl(conversation.icon_url || '');
    setEditDialogOpen(true);
  };

  // Handle file input click
  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file upload
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ใหญ่เกินไป', 'ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'group-icons');

      const response = await apiService.post<UploadImageResponse>(
        FILE_API.UPLOAD_IMAGE,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.success && response.data.URL) {
        setEditIconUrl(response.data.URL);
        toast.success('อัปโหลดรูปภาพสำเร็จ', 'คลิก "บันทึก" เพื่อยืนยันการเปลี่ยนแปลง');
      } else {
        toast.error('อัปโหลดล้มเหลว', 'ไม่สามารถอัปโหลดรูปภาพได้');
      }
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploading(false);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Handle save group changes
  const handleSaveGroupChanges = async () => {
    if (!conversation) return;

    // Validation
    if (!editTitle.trim()) {
      toast.error('กรุณากรอกชื่อกลุ่ม', 'ชื่อกลุ่มต้องไม่เป็นค่าว่าง');
      return;
    }

    setUpdating(true);
    try {
      const updates: { title?: string; icon_url?: string } = {};

      // Only include changed fields
      if (editTitle !== conversation.title) {
        updates.title = editTitle;
      }
      if (editIconUrl !== conversation.icon_url) {
        updates.icon_url = editIconUrl;
      }

      // If nothing changed, close dialog
      if (Object.keys(updates).length === 0) {
        toast.info('ไม่มีการเปลี่ยนแปลง');
        setEditDialogOpen(false);
        return;
      }

      const success = await updateConversation(conversation.id, updates);

      if (success) {
        toast.success('อัปเดตข้อมูลกลุ่มสำเร็จ', 'ข้อมูลกลุ่มได้รับการอัปเดตแล้ว');
        setEditDialogOpen(false);
      } else {
        toast.error('ไม่สามารถอัปเดตข้อมูลกลุ่มได้', 'โปรดลองอีกครั้ง');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลกลุ่มได้');
    } finally {
      setUpdating(false);
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!onLeaveGroup) return;

    setLoading(true);
    try {
      const success = await onLeaveGroup();

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
      setLeavingGroup(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[80%] p-6 sm:max-w-md border-l-0 flex flex-col overflow-y-auto">
          <SheetHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={conversation.icon_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {isGroup ? <Users size={32} /> : <User size={32} />}
                </AvatarFallback>
              </Avatar>
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-2">
                  <SheetTitle className="text-xl">{conversation.title}</SheetTitle>
                  {isGroup && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleOpenEditDialog}
                      title="แก้ไขข้อมูลกลุ่ม"
                    >
                      <Pencil size={16} />
                    </Button>
                  )}
                </div>
                <SheetDescription className="flex items-center justify-center gap-1">
                  {isGroup ? (
                    <>
                      <Users size={14} />
                      {conversation.member_count || 0} สมาชิก
                    </>
                  ) : (
                    'แชทส่วนตัว'
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          

          {/* Quick Actions */}
          

          <Separator />

          {/* Tabs: Info, Photos, Videos, Files, Links */}
          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 text-xs">
              <TabsTrigger value="info" className="text-xs px-2">ข้อมูล</TabsTrigger>
              <TabsTrigger value="photos" className="text-xs px-1">
                <ImageIcon size={14} />
                {mediaSummary && mediaSummary.image_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.image_count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="videos" className="text-xs px-1">
                <Video size={14} />
                {mediaSummary && mediaSummary.video_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.video_count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs px-1">
                <FileText size={14} />
                {mediaSummary && mediaSummary.file_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.file_count}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="links" className="text-xs px-1">
                <LinkIcon size={14} />
                {mediaSummary && mediaSummary.link_count > 0 && (
                  <span className="ml-0.5">{mediaSummary.link_count}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="flex-1 overflow-y-auto">
              {isGroup && (
                <MembersList
                  conversationId={conversation.id}
                  currentUserId={currentUserId}
                  isCreator={isCreator}
                />
              )}

              {!isGroup && (
                <div className="py-4">
                  <p className="text-sm text-muted-foreground text-center">
                    ข้อมูลแชทส่วนตัว
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <PhotoGallery
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <VideoGallery
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <FileList
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="flex-1 overflow-y-auto">
              <div className="py-4">
                <LinkList
                  conversationId={conversation.id}
                  onItemClick={handleJumpToMessage}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Leave Group Button */}
          {isGroup && onLeaveGroup && (
            <div className="pt-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setLeavingGroup(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                ออกจากกลุ่ม
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Leave Group Confirmation */}
      {isGroup && (
        <AlertDialog open={leavingGroup} onOpenChange={setLeavingGroup}>
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
      )}

      {/* Edit Group Dialog */}
      {isGroup && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลกลุ่ม</DialogTitle>
              <DialogDescription>
                อัปเดตชื่อกลุ่มและไอคอนกลุ่ม
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Group Icon Upload */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative cursor-pointer group"
                  onClick={handleIconClick}
                  title="คลิกเพื่อเปลี่ยนไอคอนกลุ่ม"
                >
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={editIconUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      <Users size={32} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-foreground/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-background" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-background" />
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading || updating}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {uploading ? 'กำลังอัปโหลด...' : 'คลิกที่รูปเพื่อเปลี่ยนไอคอนกลุ่ม'}
                </p>
              </div>

              {/* Group Title */}
              <div className="grid gap-2">
                <Label htmlFor="group-title">ชื่อกลุ่ม *</Label>
                <Input
                  id="group-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="ชื่อกลุ่ม"
                  disabled={updating || uploading}
                />
              </div>

              {/* Optional: Icon URL (for advanced users) */}
              <div className="grid gap-2">
                <Label htmlFor="group-icon-url" className="text-xs text-muted-foreground">
                  URL ไอคอน (สำหรับผู้ใช้ขั้นสูง)
                </Label>
                <Input
                  id="group-icon-url"
                  value={editIconUrl}
                  onChange={(e) => setEditIconUrl(e.target.value)}
                  placeholder="https://example.com/icon.png"
                  disabled={updating || uploading}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updating || uploading}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveGroupChanges}
                disabled={updating || uploading}
              >
                {updating ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
