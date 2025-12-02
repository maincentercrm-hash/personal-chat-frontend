// src/components/standard/conversation/EditGroupDialog.tsx
import { useState, useRef, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/utils/toast';
import apiService from '@/services/apiService';
import { FILE_API } from '@/constants/api/standardApiConstants';
import type { ConversationDTO } from '@/types/conversation.types';
import type { UploadImageResponse } from '@/types/upload.types';

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDTO;
  onUpdate: (updates: { title?: string; icon_url?: string }) => Promise<boolean>;
}

export function EditGroupDialog({
  open,
  onOpenChange,
  conversation,
  onUpdate,
}: EditGroupDialogProps) {
  const [editTitle, setEditTitle] = useState(conversation.title || '');
  const [editIconUrl, setEditIconUrl] = useState(conversation.icon_url || '');
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditTitle(conversation.title || '');
      setEditIconUrl(conversation.icon_url || '');
    }
    onOpenChange(open);
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
            'Content-Type': 'multipart/form-data',
          },
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
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Handle save
  const handleSave = async () => {
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
        onOpenChange(false);
        return;
      }

      const success = await onUpdate(updates);

      if (success) {
        toast.success('อัปเดตข้อมูลกลุ่มสำเร็จ', 'ข้อมูลกลุ่มได้รับการอัปเดตแล้ว');
        onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลกลุ่ม</DialogTitle>
          <DialogDescription>อัปเดตชื่อกลุ่มและไอคอนกลุ่ม</DialogDescription>
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
            onClick={() => onOpenChange(false)}
            disabled={updating || uploading}
          >
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={updating || uploading}>
            {updating ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
