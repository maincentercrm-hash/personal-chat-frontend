// NoteCard component - displays note preview in list

import React from 'react';
import { Pin, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Note } from '@/types/note.types';

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  onSelect?: (note: Note) => void;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const truncateContent = (content: string, maxLength: number = 100): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Today - show time
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
      });
    }
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-primary bg-accent/50' : ''
      }`}
      onClick={() => onSelect?.(note)}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left side - content */}
        <div className="flex-1 min-w-0">
          {/* Title and Pin */}
          <div className="flex items-center gap-2 mb-2">
            {note.is_pinned && (
              <Pin className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <h3 className="font-semibold text-base truncate">
              {note.title || 'Untitled Note'}
            </h3>
          </div>

          {/* Content preview */}
          {note.content && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {truncateContent(note.content)}
            </p>
          )}

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Date */}
          <div className="text-xs text-muted-foreground">
            {formatDate(note.updated_at)}
          </div>
        </div>

        {/* Right side - actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(note);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.(note.id);
              }}
            >
              <Pin className="mr-2 h-4 w-4" />
              {note.is_pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this note?')) {
                  onDelete?.(note.id);
                }
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};
