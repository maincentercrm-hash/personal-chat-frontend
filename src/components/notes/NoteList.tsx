// NoteList component - displays list of notes with search and filters

import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NoteCard } from './NoteCard';
import { useNotes } from '@/hooks/useNotes';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import { NOTE_PLACEHOLDERS } from '@/constants/noteConstants';
import type { Note } from '@/types/note.types';

interface NoteListProps {
  notes: Note[];
  isLoading?: boolean;
  selectedNoteId?: string | null;
  onNoteSelect?: (note: Note) => void;
  onCreateNew?: () => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  isLoading = false,
  selectedNoteId,
  onNoteSelect,
  onCreateNew,
}) => {
  const { deleteNote, togglePin } = useNotes();
  const { startEditing } = useNoteEditor();

  const handleEdit = (note: Note) => {
    startEditing(note);
  };

  const handleDelete = async (noteId: string) => {
    await deleteNote(noteId);
  };

  const handleTogglePin = async (noteId: string) => {
    await togglePin(noteId);
  };

  // Separate pinned and unpinned notes
  const pinnedNotes = notes.filter((note) => note.is_pinned);
  const unpinnedNotes = notes.filter((note) => !note.is_pinned);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            New Note
          </Button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && notes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {NOTE_PLACEHOLDERS.EMPTY_STATE}
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-1" />
                Create Note
              </Button>
            </div>
          )}

          {/* Pinned notes section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-2">
                Pinned
              </h3>
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={onNoteSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}

          {/* Unpinned notes section */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-2">
              {pinnedNotes.length > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground px-2">
                  All Notes
                </h3>
              )}
              {unpinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={onNoteSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer info */}
      {notes.length > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground text-center">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            {pinnedNotes.length > 0 &&
              ` • ${pinnedNotes.length} pinned`}
          </div>
        </div>
      )}
    </div>
  );
};
