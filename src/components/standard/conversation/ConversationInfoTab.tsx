// src/components/standard/conversation/ConversationInfoTab.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Pin, Save, X, Lock, Users } from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNotes } from '@/hooks/useNotes';
import useUser from '@/hooks/useUser';
import type { Note, NoteVisibility } from '@/types/note.types';

interface ConversationInfoTabProps {
  conversation: ConversationDTO;
  isGroup: boolean;
}

export function ConversationInfoTab({
  conversation,
  isGroup,
}: ConversationInfoTabProps) {
  const { notes, createNote, updateNote, deleteNote, togglePin, isLoading, fetchNotes } = useNotes();
  const { currentUser } = useUser();
  const currentUserId = currentUser?.id;

  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteOwnerId, setEditingNoteOwnerId] = useState<string | null>(null); // เก็บ owner ของ note ที่กำลังแก้ไข
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftVisibility, setDraftVisibility] = useState<NoteVisibility>('private');

  // ✅ Use title for conversation name
  const conversationName = conversation.title || (isGroup ? 'แชทกลุ่ม' : 'เพื่อน');

  // ✅ เช็คว่าเป็นเจ้าของ note ที่กำลังแก้ไขหรือไม่
  const isNoteOwner = !editingNoteId || editingNoteOwnerId === currentUserId;

  // 🆕 Filter notes by conversation_id instead of tags
  const conversationNotes = notes.filter(note =>
    note.conversation_id === conversation.id
  );

  // 🆕 Fetch notes filtered by conversation_id
  useEffect(() => {
    fetchNotes({ conversation_id: conversation.id });
  }, [conversation.id, fetchNotes]);

  // Start creating new note
  const handleCreateNew = () => {
    setIsEditing(true);
    setEditingNoteId(null);
    setEditingNoteOwnerId(null);
    setDraftTitle('');
    setDraftContent('');
    setDraftVisibility('private');
  };

  // Start editing existing note
  const handleEdit = (note: Note) => {
    setIsEditing(true);
    setEditingNoteId(note.id);
    setEditingNoteOwnerId(note.user_id); // เก็บ owner ไว้เช็คสิทธิ์
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftVisibility(note.visibility || 'private');
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditingNoteId(null);
    setEditingNoteOwnerId(null);
    setDraftTitle('');
    setDraftContent('');
    setDraftVisibility('private');
  };

  // Save note
  const handleSave = async () => {
    if (!draftTitle.trim()) {
      alert('กรุณากรอกหัวข้อ');
      return;
    }

    if (editingNoteId) {
      // Update existing note
      await updateNote(editingNoteId, {
        title: draftTitle,
        content: draftContent,
        visibility: draftVisibility,
      });
    } else {
      // 🆕 Create new note with conversation_id and visibility
      await createNote({
        title: draftTitle,
        content: draftContent,
        conversation_id: conversation.id, // Link to conversation
        visibility: draftVisibility,
      });
    }

    handleCancel();
  };

  // Delete note
  const handleDelete = async (noteId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบโน้ตนี้?')) {
      await deleteNote(noteId);
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInDays === 1) {
      return 'เมื่อวาน';
    } else if (diffInDays < 7) {
      return `${diffInDays} วันที่แล้ว`;
    } else {
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  // Editor view
  if (isEditing) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">
            {editingNoteId ? 'แก้ไขโน้ต' : 'โน้ตใหม่'}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              ยกเลิก
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              บันทึก
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">หัวข้อ</label>
            <Input
              type="text"
              placeholder="หัวข้อโน้ต..."
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">เนื้อหา</label>
            <Textarea
              placeholder="เขียนโน้ตของคุณ..."
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              maxLength={50000}
              className="min-h-[200px] resize-none"
            />
          </div>

          {/* Visibility toggle - แสดงเฉพาะเจ้าของ note */}
          {isNoteOwner ? (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {draftVisibility === 'shared' ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="visibility-toggle" className="text-sm font-medium">
                    {draftVisibility === 'shared' ? 'แชร์กับสมาชิก' : 'เห็นเฉพาะฉัน'}
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
                onCheckedChange={(checked) => setDraftVisibility(checked ? 'shared' : 'private')}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              {draftVisibility === 'shared' ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {draftVisibility === 'shared' ? 'โน้ตที่แชร์' : 'โน้ตส่วนตัว'}
                </p>
                <p className="text-xs text-muted-foreground">
                  เฉพาะเจ้าของโน้ตเท่านั้นที่สามารถเปลี่ยนการตั้งค่านี้ได้
                </p>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            โน้ตนี้จะถูกแท็กด้วย: <Badge variant="secondary">{conversationName}</Badge>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">โน้ต</h3>
          <p className="text-xs text-muted-foreground">
            โน้ตเกี่ยวกับ {conversationName}
          </p>
        </div>
        <Button size="sm" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          สร้าง
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลดโน้ต...
            </div>
          )}

          {!isLoading && conversationNotes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                ยังไม่มีโน้ต
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                สร้างโน้ตเพื่อจดจำข้อมูลสำคัญเกี่ยวกับ {conversationName}
              </p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                สร้างโน้ตแรก
              </Button>
            </div>
          )}

          {conversationNotes.map((note) => {
            const isOwner = note.user_id === currentUserId;
            return (
            <Card key={note.id} className="p-3 gap-1">
              {/* Title and actions */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {note.is_pinned && (
                    <Pin className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  <h4 className="font-semibold text-sm truncate">
                    {note.title}
                  </h4>
                </div>

                {/* แสดงปุ่ม action เฉพาะเจ้าของ note */}
                {isOwner && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => togglePin(note.id)}
                    >
                      <Pin className={`h-3.5 w-3.5 ${note.is_pinned ? 'text-primary' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(note)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Content preview */}
              {note.content && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                  {note.content}
                </p>
              )}

              {/* Date and visibility */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(note.updated_at)}</span>
                {note.visibility === 'shared' ? (
                  <span className="flex items-center gap-1 text-primary">
                    <Users className="h-3 w-3" />
                    แชร์
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    ส่วนตัว
                  </span>
                )}
              </div>
            </Card>
          );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      {conversationNotes.length > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground text-center">
            {conversationNotes.length} โน้ต
          </div>
        </div>
      )}
    </div>
  );
}
