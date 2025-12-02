// TagInput component - input for adding/removing tags with autocomplete

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNoteTags } from '@/hooks/useNoteTags';
import { NOTE_PLACEHOLDERS, NOTE_LIMITS } from '@/constants/noteConstants';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  maxTags = NOTE_LIMITS.TAGS_MAX_COUNT,
  disabled = false,
  placeholder = NOTE_PLACEHOLDERS.TAG_INPUT,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { getSuggestedTags, validateTag } = useNoteTags();

  // Get suggestions based on input
  const suggestions = getSuggestedTags(inputValue, tags, 5);

  // Add tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();

    // Validate
    const validation = validateTag(trimmedTag);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Check if already exists
    if (tags.includes(trimmedTag)) {
      return;
    }

    // Check max tags limit
    if (tags.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`);
      return;
    }

    // Add tag
    onChange([...tags, trimmedTag]);
    setInputValue('');
    setShowSuggestions(false);
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace on empty input
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      {/* Display current tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-2 pr-1 py-1 flex items-center gap-1"
            >
              <span>{tag}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => removeTag(tag)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input for adding new tags */}
      {tags.length < maxTags && (
        <div className="relative">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(inputValue.length > 0)}
              disabled={disabled}
              maxLength={NOTE_LIMITS.TAG_MAX_LENGTH}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => addTag(inputValue)}
              disabled={disabled || !inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
                  onClick={() => handleSuggestionClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info text */}
      <div className="text-xs text-muted-foreground">
        {tags.length} / {maxTags} tags • Press Enter to add
      </div>
    </div>
  );
};
