import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
}

interface MentionDropdownProps {
  suggestions: MentionSuggestion[];
  onSelect: (suggestion: MentionSuggestion) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

export function MentionDropdown({
  suggestions,
  onSelect,
  selectedIndex,
  onSelectedIndexChange,
}: MentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll to selected item
  useEffect(() => {
    if (dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.user_id}
          type="button"
          className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors ${
            index === selectedIndex ? 'bg-accent' : ''
          }`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onSelectedIndexChange(index)}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={suggestion.profile_image_url || undefined} />
            <AvatarFallback>
              {suggestion.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {suggestion.display_name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              @{suggestion.username}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
