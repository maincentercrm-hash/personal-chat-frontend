// NotesPage - Main page for Notes/Memo feature

import React, { useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NoteList } from '@/components/notes/NoteList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useNotes } from '@/hooks/useNotes';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import { NOTE_PLACEHOLDERS } from '@/constants/noteConstants';

/**
 * NotesPage Component
 *
 * Main page for the Notes/Memo feature with:
 * - Sidebar with note list
 * - Search and filter functionality
 * - Full-screen editor
 * - Auto-save functionality
 */
export const NotesPage: React.FC = () => {
  const { notes, selectedNote, selectNote, isLoading, fetchNotes } = useNotes();
  const { startEditing, isEditing } = useNoteEditor();
  const {
    searchQuery,
    searchResults,
    isActiveSearch,
    setSearchQuery,
  } = useNoteSearch();

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Determine which notes to display
  const displayNotes = isActiveSearch ? searchResults : notes;

  // Handle create new note
  const handleCreateNew = () => {
    startEditing(); // Start with empty note
  };

  // Handle note selection
  const handleNoteSelect = (note: any) => {
    selectNote(note);
    startEditing(note);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Note List */}
      <div className="w-80 border-r flex flex-col">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={NOTE_PLACEHOLDERS.SEARCH}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Note List */}
        <NoteList
          notes={displayNotes}
          isLoading={isLoading}
          selectedNoteId={selectedNote?.id}
          onNoteSelect={handleNoteSelect}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Right Content - Editor or Empty State */}
      <div className="flex-1 flex flex-col">
        {isEditing ? (
          <NoteEditor
            onClose={() => {
              startEditing(undefined);
              selectNote(null);
            }}
            onSave={() => {
              // Refresh notes list after save
              fetchNotes();
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold mb-2">Select a note</h2>
              <p className="text-muted-foreground mb-6">
                Choose a note from the list or create a new one
              </p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Create New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;
