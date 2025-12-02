// src/components/standard/conversation/ConversationInfoTab.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Pin, Save, X } from 'lucide-react';
import type { ConversationDTO } from '@/types/conversation.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotes } from '@/hooks/useNotes';
import type { Note } from '@/types/note.types';

interface ConversationInfoTabProps {
  conversation: ConversationDTO;
  isGroup: boolean;
}

export function ConversationInfoTab({
  conversation,
  isGroup,
}: ConversationInfoTabProps) {
  const { notes, createNote, updateNote, deleteNote, togglePin, isLoading, fetchNotes } = useNotes();

  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  // ✅ Use title for conversation name
  const conversationName = conversation.title || (isGroup ? 'Group Chat' : 'Friend');

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
    setDraftTitle('');
    setDraftContent('');
  };

  // Start editing existing note
  const handleEdit = (note: Note) => {
    setIsEditing(true);
    setEditingNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditingNoteId(null);
    setDraftTitle('');
    setDraftContent('');
  };

  // Save note
  const handleSave = async () => {
    if (!draftTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    if (editingNoteId) {
      // Update existing note
      await updateNote(editingNoteId, {
        title: draftTitle,
        content: draftContent,
      });
    } else {
      // 🆕 Create new note with conversation_id
      await createNote({
        title: draftTitle,
        content: draftContent,
        conversation_id: conversation.id, // Link to conversation
      });
    }

    handleCancel();
  };

  // Delete note
  const handleDelete = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
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
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
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
            {editingNoteId ? 'Edit Note' : 'New Note'}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              type="text"
              placeholder="Note title..."
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Content</label>
            <Textarea
              placeholder="Write your note..."
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              maxLength={50000}
              className="min-h-[200px] resize-none"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            This note will be tagged with: <Badge variant="secondary">{conversationName}</Badge>
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
          <h3 className="font-semibold">Notes</h3>
          <p className="text-xs text-muted-foreground">
            Notes about {conversationName}
          </p>
        </div>
        <Button size="sm" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading notes...
            </div>
          )}

          {!isLoading && conversationNotes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No notes yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Create notes to remember important information about {conversationName}
              </p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Create First Note
              </Button>
            </div>
          )}

          {conversationNotes.map((note) => (
            <Card key={note.id} className="p-3">
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
              </div>

              {/* Content preview */}
              {note.content && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                  {note.content}
                </p>
              )}

              {/* Date */}
              <div className="text-xs text-muted-foreground">
                {formatDate(note.updated_at)}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      {conversationNotes.length > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground text-center">
            {conversationNotes.length} {conversationNotes.length === 1 ? 'note' : 'notes'}
          </div>
        </div>
      )}
    </div>
  );
}
