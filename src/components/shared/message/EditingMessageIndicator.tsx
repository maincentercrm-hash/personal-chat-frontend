// src/components/shared/message/EditingMessageIndicator.tsx
import React from 'react';
import { X, Edit } from 'lucide-react';

interface EditingMessageIndicatorProps {
  editingMessage: { id: string; content: string };
  onCancelEdit?: () => void;
}

/**
 * คอมโพเนนต์แสดง Indicator เมื่อกำลังแก้ไขข้อความ
 * ออกแบบคล้ายกับ ReplyingToIndicator
 */
const EditingMessageIndicator: React.FC<EditingMessageIndicatorProps> = ({
  editingMessage,
  onCancelEdit
}) => {
  return (
    <div className="mb-2 px-3 py-2 bg-muted/50 border-l-2 border-primary rounded flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Edit size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary font-medium">กำลังแก้ไขข้อความ</p>
          <p className="text-sm text-muted-foreground truncate">
            {editingMessage.content}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Enter = บันทึก • Shift+Enter = บรรทัดใหม่ • Esc = ยกเลิก
          </p>
        </div>
      </div>
      {onCancelEdit && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title="ยกเลิกการแก้ไข"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default EditingMessageIndicator;
