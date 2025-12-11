// NoteEditor component - full-featured note editor

import React, { useEffect, useRef } from 'react';
import { Save, X, Loader2, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TagInput } from './TagInput';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import { NOTE_PLACEHOLDERS, NOTE_LIMITS } from '@/constants/noteConstants';

interface NoteEditorProps {
  onClose?: () => void;
  onSave?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ onClose, onSave }) => {
  const {
    isEditing,
    isSaving,
    hasUnsavedChanges,
    draftTitle,
    draftContent,
    draftTags,
    draftVisibility,
    draftConversationId,
    updateTitle,
    updateContent,
    updateTags,
    updateVisibility,
    save,
    cancel,
  } = useNoteEditor();

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus title input when editor opens
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const success = await save();
    if (success) {
      onSave?.();
    }
  };

  const handleCancel = () => {
    cancel();
    onClose?.();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, handleCancel]);

  if (!isEditing) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with actions */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {draftTitle ? 'Edit Note' : 'New Note'}
          </h2>
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">
              {isSaving ? 'Saving...' : 'Unsaved changes'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !draftTitle.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Title input */}
        <div>
          <Input
            ref={titleInputRef}
            type="text"
            placeholder={NOTE_PLACEHOLDERS.TITLE}
            value={draftTitle}
            onChange={(e) => updateTitle(e.target.value)}
            maxLength={NOTE_LIMITS.TITLE_MAX_LENGTH}
            className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
            disabled={isSaving}
          />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {draftTitle.length} / {NOTE_LIMITS.TITLE_MAX_LENGTH}
          </div>
        </div>

        {/* Tags input */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tags</label>
          <TagInput
            tags={draftTags}
            onChange={updateTags}
            maxTags={NOTE_LIMITS.TAGS_MAX_COUNT}
            disabled={isSaving}
          />
        </div>

        {/* Visibility toggle - แสดงเฉพาะ conversation notes */}
        {draftConversationId && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {draftVisibility === 'shared' ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="visibility-toggle" className="text-sm font-medium">
                  {draftVisibility === 'shared' ? 'แชร์กับสมาชิกในกลุ่ม' : 'เห็นเฉพาะฉัน'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {draftVisibility === 'shared'
                    ? 'ทุกคนในการสนทนานี้สามารถเห็นโน้ตนี้ได้'
                    : 'เฉพาะคุณเท่านั้นที่สามารถเห็นโน้ตนี้'}
                </p>
              </div>
            </div>
            <Switch
              id="visibility-toggle"
              checked={draftVisibility === 'shared'}
              onCheckedChange={(checked) => updateVisibility(checked ? 'shared' : 'private')}
              disabled={isSaving}
            />
          </div>
        )}

        {/* Content textarea */}
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Content</label>
          <Textarea
            placeholder={NOTE_PLACEHOLDERS.CONTENT}
            value={draftContent}
            onChange={(e) => updateContent(e.target.value)}
            maxLength={NOTE_LIMITS.CONTENT_MAX_LENGTH}
            className="min-h-[400px] resize-none font-mono text-sm"
            disabled={isSaving}
          />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {draftContent.length} / {NOTE_LIMITS.CONTENT_MAX_LENGTH}
          </div>
        </div>
      </div>

      {/* Footer with shortcuts hint */}
      <div className="p-4 border-t bg-muted/30">
        <div className="text-xs text-muted-foreground text-center">
          <kbd className="px-2 py-1 bg-background rounded border">Ctrl+S</kbd> to
          save •{' '}
          <kbd className="px-2 py-1 bg-background rounded border">Esc</kbd> to
          cancel
        </div>
      </div>
    </div>
  );
};
