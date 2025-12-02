# Frontend Implementation Plan - Phase 1

**Date:** 2025-01-29 (Updated)
**Status:** ✅ Backend Phase 1 Complete - Ready to Implement
**Backend Documentation:** `PHASE_1_CHANGES_FOR_FRONTEND.md` v2.0

---

## 📢 Backend Phase 1 Status: COMPLETE ✅

Backend has finished implementing:
1. ✅ **Search Messages** - Converted to cursor-based pagination
2. ✅ **Mentions Feature** - Complete with database + API

**All APIs are deployed and ready to use!**

---

## 🎯 Frontend Implementation Plan

### Total Estimated Time: **10-14 hours**

| Task | Priority | Time | Status |
|------|----------|------|--------|
| **1. TypeScript Types** | 🔴 High | 30 min | ⏸️ Todo |
| **2. Service Layer** | 🔴 High | 1 hour | ⏸️ Todo |
| **3. Search Messages UI** | 🔴 High | 4-5 hours | ⏸️ Todo |
| **4. Mentions System** | 🔴 High | 4-5 hours | ⏸️ Todo |
| **5. Integration & Testing** | 🟡 Medium | 1-2 hours | ⏸️ Todo |

---

## 📦 Task 1: Create TypeScript Types

**Time:** 30 minutes
**Priority:** 🔴 Critical (Required for everything else)

### Files to Create:

#### 1.1 `src/types/search.types.ts`

```typescript
// Search Messages Types
export interface SearchMessagesParams {
  q: string;                          // Required
  conversation_id?: string;           // UUID
  limit?: number;                     // Default: 20, Max: 100
  cursor?: string;                    // Message UUID
  direction?: 'before' | 'after';     // Default: 'before'
}

export interface SearchMessagesResponse {
  success: true;
  data: {
    messages: Message[];
    query: string;
    cursor: string | null;
    has_more: boolean;
  };
}

export interface SearchErrorResponse {
  success: false;
  message: string;
}
```

#### 1.2 `src/types/mention.types.ts`

```typescript
import type { Message, User, Conversation } from './message.types';

// Get Mentions Types
export interface GetMentionsParams {
  limit?: number;                     // Default: 20, Max: 100
  cursor?: string;                    // Mention UUID
  direction?: 'before' | 'after';     // Default: 'before'
}

export interface GetMentionsResponse {
  success: true;
  data: {
    mentions: Mention[];
    cursor: string | null;
    has_more: boolean;
  };
}

// Mention Object
export interface Mention {
  id: string;                         // UUID
  message_id: string;                 // UUID
  mentioned_user_id: string;          // UUID
  start_index: number | null;
  length: number | null;
  created_at: string;                 // ISO 8601
  message: MentionMessage;
  mentioned_user: User;
}

// Message in Mention (simplified)
export interface MentionMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  sender: User | null;
  conversation: Conversation;
}

// Mention Metadata (in message.metadata)
export interface MentionMetadata {
  user_id: string;                    // UUID
  username: string;
  start_index: number;
  length: number;
}
```

#### 1.3 Update `src/types/message.types.ts`

```typescript
// Add/Update these types
export interface Message {
  // Core fields (always present)
  id: string;                                    // UUID
  conversation_id: string;                       // UUID
  sender_id: string | null;                      // UUID (null for system messages)
  sender_type: string;                           // "user" | "system"
  message_type: string;                          // "text" | "image" | "file" | "sticker" | "album"
  content: string;                               // Message text

  // Media fields (optional)
  media_url?: string;                            // For image/file/sticker
  media_thumbnail_url?: string;                  // Thumbnail for images
  album_files?: AlbumFile[];                     // For album messages

  // Metadata
  metadata: Record<string, any>;                 // JSONB - flexible data

  // Status tracking
  status: 'sent' | 'delivered' | 'read';
  delivered_at?: string | null;                  // ISO 8601
  read_at?: string | null;                       // ISO 8601

  // Timestamps
  created_at: string;                            // ISO 8601
  updated_at: string;                            // ISO 8601

  // Flags
  is_deleted: boolean;
  is_edited: boolean;
  edit_count: number;
  is_pinned: boolean;
  is_forwarded: boolean;

  // Optional fields
  reply_to_id?: string | null;                   // UUID
  pinned_by?: string | null;                     // UUID
  pinned_at?: string | null;                     // ISO 8601
  forwarded_from?: ForwardedInfo;                // JSONB

  // Preloaded relations (if included in query)
  sender?: User | null;
  conversation?: Conversation;
  reply_to?: Message | null;
  reads?: MessageRead[];
  pinner?: User | null;
}

export interface AlbumFile {
  id: string;
  file_type: 'image' | 'video';
  media_url: string;
  media_thumbnail_url?: string;
  position: number;
}

export interface ForwardedInfo {
  message_id: string;
  sender_id: string;
  conversation_id: string;
  original_timestamp: string;
}

export interface User {
  id: string;                                    // UUID
  username: string;
  display_name: string;
  profile_image_url?: string | null;
  bio?: string | null;
  status?: string;                               // "online" | "offline" | "away"
  last_active_at?: string;                       // ISO 8601
}

export interface Conversation {
  id: string;                                    // UUID
  type: 'private' | 'group';
  title: string;
  icon_url?: string | null;
  created_at: string;
  updated_at: string;
  last_message_text?: string | null;
  last_message_at?: string | null;
  creator_id?: string | null;
  is_active: boolean;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  user?: User;
}
```

---

## 🔧 Task 2: Create Service Layer

**Time:** 1 hour
**Priority:** 🔴 Critical

### Files to Create:

#### 2.1 `src/services/searchService.ts`

```typescript
import apiService from './apiService';
import type {
  SearchMessagesParams,
  SearchMessagesResponse,
  SearchErrorResponse,
} from '@/types/search.types';

/**
 * Search messages across conversations
 */
export async function searchMessages(
  params: SearchMessagesParams
): Promise<SearchMessagesResponse> {
  const queryParams = new URLSearchParams({
    q: params.q,
    limit: (params.limit || 20).toString(),
  });

  if (params.conversation_id) {
    queryParams.append('conversation_id', params.conversation_id);
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
    queryParams.append('direction', params.direction || 'before');
  }

  const response = await apiService.get<SearchMessagesResponse>(
    `/messages/search?${queryParams.toString()}`
  );

  return response;
}

/**
 * Highlight search query in text
 */
export function highlightSearchQuery(text: string, query: string): string {
  if (!query || !text) return text;

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  // Replace matches with <mark> tag
  return text.replace(regex, '<mark>$1</mark>');
}

export const searchService = {
  searchMessages,
  highlightSearchQuery,
};

export default searchService;
```

#### 2.2 `src/services/mentionService.ts`

```typescript
import apiService from './apiService';
import type {
  GetMentionsParams,
  GetMentionsResponse,
  MentionMetadata,
} from '@/types/mention.types';
import type { Message } from '@/types/message.types';

/**
 * Get mentions for current user
 */
export async function getMyMentions(
  params?: GetMentionsParams
): Promise<GetMentionsResponse> {
  const queryParams = new URLSearchParams({
    limit: (params?.limit || 20).toString(),
  });

  if (params?.cursor) {
    queryParams.append('cursor', params.cursor);
    queryParams.append('direction', params.direction || 'before');
  }

  const response = await apiService.get<GetMentionsResponse>(
    `/mentions?${queryParams.toString()}`
  );

  return response;
}

/**
 * Send message with mentions
 */
export interface SendMessageWithMentionsParams {
  conversationId: string;
  content: string;
  mentions?: MentionMetadata[];
  tempId?: string;
}

export async function sendMessageWithMentions(
  params: SendMessageWithMentionsParams
): Promise<{ success: boolean; data?: Message; message?: string }> {
  const response = await apiService.post(
    `/conversations/${params.conversationId}/messages/text`,
    {
      content: params.content,
      temp_id: params.tempId,
      mentions: params.mentions || [],
    }
  );

  return response;
}

/**
 * Check if current user was mentioned in a message
 */
export function wasUserMentioned(
  message: Message,
  userId: string
): boolean {
  const mentions = (message.metadata?.mentions || []) as MentionMetadata[];
  return mentions.some((m) => m.user_id === userId);
}

/**
 * Extract mentions from message metadata
 */
export function getMentionsFromMessage(message: Message): MentionMetadata[] {
  return (message.metadata?.mentions || []) as MentionMetadata[];
}

export const mentionService = {
  getMyMentions,
  sendMessageWithMentions,
  wasUserMentioned,
  getMentionsFromMessage,
};

export default mentionService;
```

---

## 🎨 Task 3: Search Messages UI

**Time:** 4-5 hours
**Priority:** 🔴 Critical

### Components to Create:

#### 3.1 `src/hooks/useMessageSearch.ts`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchMessages } from '@/services/searchService';
import type { SearchMessagesParams } from '@/types/search.types';
import type { Message } from '@/types/message.types';

export function useMessageSearch(query: string, conversationId?: string) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['messageSearch', query, conversationId],
    queryFn: async ({ pageParam }) => {
      const params: SearchMessagesParams = {
        q: query,
        conversation_id: conversationId,
        limit: 20,
        cursor: pageParam as string | undefined,
        direction: 'before',
      };

      const response = await searchMessages(params);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.cursor : undefined;
    },
    enabled: query.length >= 2, // Only search if query >= 2 chars
    staleTime: 30000, // 30 seconds
  });

  const results: Message[] = data?.pages.flatMap((page) => page.messages) ?? [];

  return {
    results,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  };
}
```

#### 3.2 `src/components/search/SearchBar.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { SearchResults } from './SearchResults';

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Search Button */}
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search messages...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Search Results */}
          <SearchResults query={query} onSelectMessage={handleClose} />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### 3.3 `src/components/search/SearchResults.tsx`

```typescript
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { SearchResultItem } from './SearchResultItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  onSelectMessage: () => void;
}

export function SearchResults({ query, onSelectMessage }: SearchResultsProps) {
  const navigate = useNavigate();
  const {
    results,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useMessageSearch(query);

  const handleSelectMessage = (messageId: string, conversationId: string) => {
    // Navigate to conversation and jump to message
    navigate(`/chat/${conversationId}?target=${messageId}`);
    onSelectMessage();
  };

  if (!query || query.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search
        </p>
      </div>
    );
  }

  if (isFetching && !isFetchingNextPage) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3">Searching...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No messages found for "{query}"
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] px-4">
      <div className="space-y-2 pb-4">
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            message={result}
            query={query}
            onClick={() =>
              handleSelectMessage(result.id, result.conversation_id)
            }
          />
        ))}

        {/* Load More */}
        {hasNextPage && (
          <div className="pt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
```

#### 3.4 `src/components/search/SearchResultItem.tsx`

```typescript
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { Message } from '@/types/message.types';
import { highlightSearchQuery } from '@/services/searchService';

interface SearchResultItemProps {
  message: Message;
  query: string;
  onClick: () => void;
}

export function SearchResultItem({
  message,
  query,
  onClick,
}: SearchResultItemProps) {
  const highlighted = highlightSearchQuery(message.content, query);

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Sender Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={message.sender?.profile_image_url || undefined} />
        <AvatarFallback>
          {message.sender?.display_name?.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm">
            {message.sender?.display_name || 'Unknown'}
          </span>
          {message.conversation && (
            <Badge variant="outline" className="text-xs">
              {message.conversation.title}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Message Content with Highlight */}
        <div
          className="text-sm text-muted-foreground line-clamp-2 search-highlight"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
```

#### 3.5 Update `src/index.css`

```css
/* Add at the end of the file */

/* Search highlighting */
.search-highlight mark {
  background-color: #fef08a;
  color: #000;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
}

.dark .search-highlight mark {
  background-color: #facc15;
  color: #000;
}
```

---

## 💬 Task 4: Mentions System

**Time:** 4-5 hours
**Priority:** 🔴 Critical

### Components to Create:

#### 4.1 `src/hooks/useMentions.ts`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { getMyMentions } from '@/services/mentionService';
import type { GetMentionsParams } from '@/types/mention.types';
import type { Mention } from '@/types/mention.types';

export function useMentions() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['mentions'],
    queryFn: async ({ pageParam }) => {
      const params: GetMentionsParams = {
        limit: 20,
        cursor: pageParam as string | undefined,
        direction: 'before',
      };

      const response = await getMyMentions(params);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.cursor : undefined;
    },
    staleTime: 30000, // 30 seconds
  });

  const mentions: Mention[] = data?.pages.flatMap((page) => page.mentions) ?? [];

  return {
    mentions,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  };
}
```

#### 4.2 `src/hooks/useMentionAutocomplete.ts`

```typescript
import { useState, useEffect, useMemo } from 'react';
import type { ConversationMemberWithRole } from '@/types/group.types';

interface MentionSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  profile_image_url?: string;
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

    const mention = {
      user_id: suggestion.user_id,
      username: suggestion.username,
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
```

#### 4.3 `src/pages/standard/mentions/MentionsPage.tsx`

```typescript
import { useMentions } from '@/hooks/useMentions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { Mention } from '@/types/mention.types';

export function MentionsPage() {
  const navigate = useNavigate();
  const {
    mentions,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useMentions();

  const handleClickMention = (mention: Mention) => {
    navigate(
      `/chat/${mention.message.conversation_id}?target=${mention.message_id}`
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AtSign className="h-6 w-6" />
          Mentions
        </h1>
        <p className="text-sm text-muted-foreground">
          Messages where you were mentioned
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isFetching && mentions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : mentions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AtSign className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No mentions yet</p>
            <p className="text-sm text-muted-foreground">
              When someone mentions you, it will appear here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {mentions.map((mention) => (
              <div
                key={mention.id}
                className="flex gap-3 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleClickMention(mention)}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage
                    src={mention.message.sender?.profile_image_url || undefined}
                  />
                  <AvatarFallback>
                    {mention.message.sender?.display_name
                      ?.charAt(0)
                      .toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">
                      {mention.message.sender?.display_name || 'Unknown'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {mention.message.conversation.title}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {formatDistanceToNow(new Date(mention.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {mention.message.content}
                  </p>
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="pt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

#### 4.4 Update `src/components/shared/message/TextMessage.tsx`

Add mention highlighting:

```typescript
import { useMemo } from 'react';
import type { Message } from '@/types/message.types';
import type { MentionMetadata } from '@/types/mention.types';

function renderContentWithMentions(content: string, metadata?: any): string {
  if (!metadata?.mentions || !Array.isArray(metadata.mentions)) {
    return content;
  }

  const mentions = metadata.mentions as MentionMetadata[];

  // Sort by start_index descending to process from end to start
  const sortedMentions = [...mentions]
    .filter((m) => m.start_index !== undefined && m.length !== undefined)
    .sort((a, b) => b.start_index - a.start_index);

  let result = content;

  sortedMentions.forEach((mention) => {
    const start = mention.start_index;
    const end = start + mention.length;
    const mentionText = content.substring(start, end);

    result =
      result.substring(0, start) +
      `<span class="mention" data-user-id="${mention.user_id}">` +
      mentionText +
      `</span>` +
      result.substring(end);
  });

  return result;
}

export function TextMessage({ message }: { message: Message }) {
  const renderedContent = useMemo(
    () => renderContentWithMentions(message.content, message.metadata),
    [message.content, message.metadata]
  );

  return (
    <div
      dangerouslySetInnerHTML={{ __html: renderedContent }}
      className="mention-container"
    />
  );
}
```

#### 4.5 Update `src/index.css`

```css
/* Add mention highlighting */
.mention {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.mention:hover {
  background-color: #bfdbfe;
}

.dark .mention {
  background-color: #1e3a8a;
  color: #93c5fd;
}

.dark .mention:hover {
  background-color: #1e40af;
}
```

---

## 🔗 Task 5: Integration

**Time:** 1-2 hours
**Priority:** 🟡 Medium

### Files to Update:

#### 5.1 Update `src/components/app-sidebar.tsx`

Add Search Bar and Mentions link:

```typescript
import { SearchBar } from '@/components/search/SearchBar';
import { AtSign } from 'lucide-react';

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        {/* Add Search Bar */}
        <div className="px-2 py-2">
          <SearchBar />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* ... existing sidebar items ... */}

        {/* Add Mentions Link */}
        <SidebarGroup>
          <SidebarGroupLabel>Messages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/mentions">
                    <AtSign className="h-4 w-4" />
                    <span>Mentions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

#### 5.2 Update `src/routes/index.tsx`

Add Mentions route:

```typescript
import { MentionsPage } from '@/pages/standard/mentions/MentionsPage';

// Add to routes
{
  path: 'mentions',
  element: <MentionsPage />,
}
```

#### 5.3 Update `src/components/shared/MessageInput.tsx` (or MessageInputArea.tsx)

Add mention autocomplete support (integrate `useMentionAutocomplete` hook)

---

## ✅ Testing Checklist

### Search Messages
- [ ] Search bar opens with Cmd/Ctrl + K
- [ ] Search works with 2+ characters
- [ ] Results display with highlighted query
- [ ] Clicking result navigates to message
- [ ] Load More button works
- [ ] Infinite scroll works
- [ ] No duplicate results
- [ ] Error handling works

### Mentions
- [ ] Mentions page displays correctly
- [ ] Clicking mention navigates to message
- [ ] Infinite scroll works
- [ ] Mentions highlighted in messages
- [ ] Sending message with mentions works
- [ ] @autocomplete works in input
- [ ] Real-time updates work

---

## 📚 Resources

- **Backend API Docs:** `PHASE_1_CHANGES_FOR_FRONTEND.md`
- **TypeScript Types:** Copy from backend docs
- **API Endpoints:**
  - `GET /api/v1/messages/search`
  - `GET /api/v1/mentions`
  - `POST /api/v1/conversations/:id/messages/text`

---

## 🎯 Next Steps

1. ✅ Create TypeScript types
2. ✅ Create service layer
3. ✅ Build Search UI
4. ✅ Build Mentions UI
5. ✅ Integration & testing
6. ⏸️ Wait for Backend Phase 2 (Scheduled Messages + Notes)

---

**Created:** 2025-01-29
**Updated:** 2025-01-29 (After Backend Phase 1 complete)
**Status:** Ready to implement
**Total Time:** 10-14 hours
