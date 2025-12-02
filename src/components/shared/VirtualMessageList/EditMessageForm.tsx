// src/components/shared/VirtualMessageList/EditMessageForm.tsx
import { memo, useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface EditMessageFormProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export const EditMessageForm = memo<EditMessageFormProps>(({
  initialContent,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ✅ ตั้งค่า cursor ให้อยู่ท้ายข้อความเมื่อ mount
  useEffect(() => {
    if (textareaRef.current) {
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="max-w-[70%] w-full">
      <div className="bg-card border border-border rounded-2xl p-3">
        <div className="text-xs text-muted-foreground mb-2">แก้ไขข้อความ</div>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] mb-2 resize-none"
          placeholder="พิมพ์ข้อความ..."
          onKeyDown={(e) => {
            // Ctrl+Enter หรือ Cmd+Enter เพื่อบันทึก
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              onSave(content);
            }
            // Escape เพื่อยกเลิก
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
          >
            <X size={16} className="mr-1" />
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(content)}
            disabled={!content.trim()}
          >
            <Check size={16} className="mr-1" />
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
});

EditMessageForm.displayName = 'EditMessageForm';
