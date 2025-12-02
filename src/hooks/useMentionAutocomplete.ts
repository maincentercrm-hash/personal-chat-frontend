import { useState, useEffect, useMemo } from 'react';
import type { ConversationMemberWithRole } from '@/types/group.types';

interface MentionSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  profile_image_url?: string | null;
}

export function useMentionAutocomplete(
  members: ConversationMemberWithRole[],
  inputValue: string,
  cursorPosition: number
) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionQuery, setMentionQuery] = useState('');

  // Detect @ mention
  useEffect(() => {
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);
      setMentionStart(textBeforeCursor.length - match[0].length);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  }, [inputValue, cursorPosition]);

  // Filter suggestions
  const suggestions: MentionSuggestion[] = useMemo(() => {
    if (!showSuggestions) return [];

    return members
      .filter(
        (member) =>
          member.user.display_name.toLowerCase().includes(mentionQuery) ||
          member.user.username.toLowerCase().includes(mentionQuery)
      )
      .map((member) => ({
        user_id: member.user_id,
        username: member.user.username,
        display_name: member.user.display_name,
        profile_image_url: member.user.profile_image_url,
      }))
      .slice(0, 5); // Limit to 5 suggestions
  }, [members, mentionQuery, showSuggestions]);

  const insertMention = (suggestion: MentionSuggestion) => {
    const mentionText = `@${suggestion.username}`;
    const newValue =
      inputValue.substring(0, mentionStart) +
      mentionText +
      ' ' +
      inputValue.substring(cursorPosition);

    // ✅ ส่งเฉพาะ fields ที่ backend ต้องการ (user_id, start_index, length)
    const mention = {
      user_id: suggestion.user_id,
      start_index: mentionStart,
      length: mentionText.length,
    };

    const newCursorPosition = mentionStart + mentionText.length + 1;

    return {
      newValue,
      mention,
      newCursorPosition,
    };
  };

  return {
    showSuggestions: showSuggestions && suggestions.length > 0,
    suggestions,
    insertMention,
    closeSuggestions: () => setShowSuggestions(false),
  };
}
