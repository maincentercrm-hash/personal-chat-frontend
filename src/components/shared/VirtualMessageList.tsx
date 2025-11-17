// src/components/shared/VirtualMessageList.tsx
import { memo, forwardRef, useImperativeHandle, useCallback, useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { MessageDTO } from '@/types/message.types';
import { Check, X } from 'lucide-react';

// นำเข้าคอมโพเนนต์ข้อความ
import MessageContextMenu from '@/components/shared/MessageContextMenu';
import TextMessage from '@/components/shared/message/TextMessage';
import StickerMessage from '@/components/shared/message/StickerMessage';
import ImageMessage from '@/components/shared/message/ImageMessage';
import FileMessage from '@/components/shared/message/FileMessage';
import ReplyMessage from '@/components/shared/message/ReplyMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface VirtualMessageListProps {
  messages: MessageDTO[];
  currentUserId: string;
  activeConversationId: string;

  // Callbacks
  onLoadMore?: () => void; // ⬆️ Load more at top (older messages)
  onLoadMoreAtBottom?: () => void; // ⬇️ Load more at bottom (newer messages) - for Jump context
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  onImageClick?: (imageUrl: string) => void;
  scrollToMessage?: (messageId: string) => void; // Direct scroll (no API call)
  onJumpToMessage?: (messageId: string) => void; // Jump with memory check + API

  // Display options
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  isAdmin?: boolean;
  formatTime: (timestamp: string) => string;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;
  isOwnMessage: (message: MessageDTO) => boolean;
  handleCopyMessage: (content: string) => void;

  // Edit state
  editingMessageId?: string | null;
  editingContent?: string;
  onEditingContentChange?: (content: string) => void;
  onConfirmEdit?: (content?: string) => void;
  onCancelEdit?: () => void;
}

export interface VirtualMessageListRef {
  scrollToMessage: (messageId: string) => void;
  scrollToBottom: (smooth?: boolean) => void;
}

/**
 * Virtual Message List Component (using React Virtuoso)
 * ใช้ Virtuoso พร้อม Buffer Pattern เพื่อแก้ปัญหา DOM overlapping
 * Pre-load images ก่อน commit เข้า virtual list
 * followOutput สำหรับ smooth auto-scroll
 */
const VirtualMessageList = forwardRef<VirtualMessageListRef, VirtualMessageListProps>(({
  messages,
  currentUserId,
  activeConversationId: _activeConversationId,
  onLoadMore,
  onLoadMoreAtBottom,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onResendMessage,
  onImageClick,
  scrollToMessage: scrollToMessageProp,
  onJumpToMessage,
  isBusinessView = false,
  isGroupChat = false,
  formatTime,
  getMessageStatus,
  renderMessageStatus,
  getFormattedSender,
  isOwnMessage,
  handleCopyMessage,
  editingMessageId,
  editingContent,
  onConfirmEdit,
  onCancelEdit,
}, ref) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isJumpingRef = useRef(false);
  const initialScrollDoneRef = useRef<string | null>(null);
  const lastScrollDirectionRef = useRef<'up' | 'down' | null>(null); // Track scroll direction
  const isLoadingBottomRef = useRef(false); // Prevent duplicate triggers
  const isMountedRef = useRef(false); // ✅ Track if component mounted (prevent initial auto-load)

  // ✅ PHASE 1: Height Cache System (Telegram-style optimization)
  const heightCache = useRef<Map<string, number>>(new Map());
  const USE_HEIGHT_CACHE = useRef(true); // Feature flag - can disable if issues occur
  const USE_RESIZE_OBSERVER = useRef(false); // ✅ DISABLE to test if it causes scroll jump

  // Performance metrics
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);

  // Callback to update height cache
  const updateHeightCache = useCallback((messageId: string, height: number) => {
    if (!USE_HEIGHT_CACHE.current) return;

    const cachedHeight = heightCache.current.get(messageId);

    // ✅ Increased threshold to 10px to prevent bouncing (64↔72, 148↔156, 208↔216)
    // Only update if significantly different (prevent infinite loops)
    if (!cachedHeight || Math.abs(cachedHeight - height) > 10) {
      heightCache.current.set(messageId, height);
      console.log(`[HeightCache] Updated ${messageId.slice(0, 8)}: ${cachedHeight || 'new'} -> ${height}px`);
    }
  }, []);

  // ✅ State management
  const [, setAtBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // ← For scroll up (load older)
  const [isLoadingMoreBottom, setIsLoadingMoreBottom] = useState(false); // ← For scroll down (load newer)

  // ✅ Virtuoso pattern: firstItemIndex for prepending
  const INITIAL_INDEX = 100000;
  const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_INDEX);
  const prevMessageCountRef = useRef(0);
  const prevFirstMessageIdRef = useRef<string | null>(null);

  // ✅ Optimized deduplication - faster than Map for most cases
  const deduplicatedMessages = useMemo(() => {
    if (messages.length === 0) return [];

    // Fast path: if messages are already unique, skip deduplication
    if (messages.length < 2) return messages;

    const seen = new Set<string>();
    const result: MessageDTO[] = [];

    // Single pass with Set (faster than Map)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // ✅ Safety check: skip undefined/null messages
      if (!msg) {
        console.warn('[VirtualMessageList] Skipping undefined message at index:', i);
        continue;
      }

      const key = msg.temp_id || msg.id;

      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(msg);
      }
    }

    return result;
  }, [messages]);

  // ✅ Initialize on conversation change
  useEffect(() => {
    if (initialScrollDoneRef.current !== _activeConversationId) {
      console.log('[debug_scroll] 🔄 Conversation changed, reinitializing...');
      initialScrollDoneRef.current = _activeConversationId;
      setFirstItemIndex(INITIAL_INDEX);
      setAtBottom(true);
      prevMessageCountRef.current = 0;
      prevFirstMessageIdRef.current = null;
      isJumpingRef.current = false;
      isMountedRef.current = false; // ✅ Reset mounted flag

      // Clear cache for new conversation
      heightCache.current.clear();
      cacheHits.current = 0;
      cacheMisses.current = 0;
    }
  }, [_activeConversationId]);

  // ✅ Set mounted flag after initial render (prevent auto-load on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      isMountedRef.current = true;
      console.log('[debug_scroll] ✅ Component fully mounted, auto-load prevention disabled');
    }, 500); // Wait 500ms after mount to allow initial scroll position

    return () => clearTimeout(timer);
  }, [_activeConversationId]);

  // ✅ Real-time cache metrics (log every 50 queries)
  useEffect(() => {
    const total = cacheHits.current + cacheMisses.current;
    if (total > 0 && total % 50 === 0) {
      const hitRate = ((cacheHits.current / total) * 100).toFixed(1);
      console.log(`[HeightCache] 📊 Real-time: ${cacheHits.current}/${total} hits (${hitRate}% hit rate) | Cache: ${heightCache.current.size} msgs`);
    }
  }, [deduplicatedMessages.length]); // Log when messages change

  // Log cache performance on unmount
  useEffect(() => {
    console.log(`[HeightCache] 🧪 EXPERIMENT: ResizeObserver is ${USE_RESIZE_OBSERVER.current ? 'ENABLED' : 'DISABLED'}`);

    return () => {
      const total = cacheHits.current + cacheMisses.current;
      if (total > 0) {
        const hitRate = ((cacheHits.current / total) * 100).toFixed(1);
        console.log(`[HeightCache] 🏁 Final: ${cacheHits.current}/${total} hits (${hitRate}% hit rate)`);
        console.log(`[HeightCache] Cache size: ${heightCache.current.size} messages`);
      }
    };
  }, []);

  // ✅ Estimate message height based on ACTUAL measurements from browser
  // Measured values: text=74px, reply=130px, sticker=156px, image=216px, file=106px
  // MOVED HERE: Must be defined before useLayoutEffect that uses it
  const estimateMessageHeight = useCallback((message: MessageDTO): number => {
    // ✅ Check if this is a reply message first (has higher priority)
    if (message.reply_to_id || message.reply_to_message) {
      return 130; // ✅ Reply messages are taller (includes reply preview)
    }

    switch (message.message_type) {
      case 'text':
        // Base: 74px (single line, measured from browser)
        // For multi-line: add ~20px per additional line
        const textLength = message.content?.length || 0;
        if (textLength <= 50) {
          return 74; // Single line (accurate!)
        }
        const lines = Math.ceil(textLength / 50);
        return 74 + ((lines - 1) * 20); // 74 + extra lines

      case 'image':
        return 216; // ✅ Exact measurement from browser

      case 'sticker':
        return 156; // ✅ Exact measurement from browser

      case 'file':
        return 106; // ✅ Exact measurement from browser

      default:
        return 74; // Default to text height
    }
  }, []);

  // ✅ SIMPLIFIED: Match POC pattern - length-based detection
  // Use useLayoutEffect to sync with DOM before paint (reduce flash)
  useLayoutEffect(() => {
    const currentCount = deduplicatedMessages.length;
    const prevCount = prevMessageCountRef.current;
    const firstMessageId = deduplicatedMessages[0]?.id;
    const prevFirstId = prevFirstMessageIdRef.current;

    // Simple prepending detection like POC
    if (currentCount > prevCount && prevCount > 0) {
      const diff = currentCount - prevCount;
      console.log(`[debug_scroll] 📥 Messages changed: ${prevCount} -> ${currentCount} (diff: ${diff})`);

      if (prevFirstId && firstMessageId !== prevFirstId) {
        // Prepending at top - only update once
        console.log(`[debug_scroll]    📥 Prepending ${diff} messages at top`);

        // 🔍 DIAGNOSTIC: Analyze new messages
        console.group('[DIAGNOSTIC] Prepended Messages Analysis');
        const newMessages = deduplicatedMessages.slice(0, diff);
        let totalEstimated = 0;
        let totalCached = 0;
        let cacheHitCount = 0;
        let cacheMissCount = 0;
        const typeCount: Record<string, number> = {};

        newMessages.forEach((msg, idx) => {
          const cached = heightCache.current.get(msg.id!);
          const estimated = estimateMessageHeight(msg);
          const isReply = !!(msg.reply_to_id || msg.reply_to_message);
          const displayType = isReply ? 'reply' : msg.message_type;

          typeCount[displayType] = (typeCount[displayType] || 0) + 1;

          if (cached) {
            cacheHitCount++;
            totalCached += cached;
            console.log(`  [${idx}] ${msg.id?.slice(0, 8)} (${displayType}): CACHED ${cached}px`);
          } else {
            cacheMissCount++;
            totalEstimated += estimated;
            console.log(`  [${idx}] ${msg.id?.slice(0, 8)} (${displayType}): ESTIMATED ${estimated}px ⚠️`);
          }
        });

        const hitRate = ((cacheHitCount / diff) * 100).toFixed(1);
        const totalHeight = totalCached + totalEstimated;
        console.log(`📊 Cache Stats: ${cacheHitCount}/${diff} hits (${hitRate}%)`);
        console.log(`📏 Total Heights: ${totalCached}px (cached) + ${totalEstimated}px (estimated) = ${totalHeight}px`);
        console.log(`📋 Message Types:`, typeCount);
        console.groupEnd();

        setFirstItemIndex(prev => {
          const newIndex = prev - diff;
          console.log(`[debug_scroll]    ✅ firstItemIndex: ${prev} -> ${newIndex}`);
          return newIndex;
        });
      } else {
        // Appending at bottom
        console.log(`[debug_scroll]    📤 Appending ${diff} messages at bottom`);
      }
    }

    prevMessageCountRef.current = currentCount;
    prevFirstMessageIdRef.current = firstMessageId || null;
  }, [deduplicatedMessages.length, estimateMessageHeight]); // ← Added estimateMessageHeight to deps

  // ฟังก์ชันช่วยสำหรับจัดการค่า messageStatus ให้เป็น string | undefined เท่านั้น
  const formatMessageStatus = useCallback((status: string | null): string | undefined => {
    return status === null ? undefined : status;
  }, []);

  // Smart jump: optimized for images/stickers and far positions
  const jumpToMessage = useCallback((messageId: string) => {
    const targetIndex = deduplicatedMessages.findIndex(msg => msg.id === messageId);

    if (targetIndex === -1 || !virtuosoRef.current) {
      console.log('[Jump] Message not found in list');
      return;
    }

    const totalMessages = deduplicatedMessages.length;
    const percentPosition = (targetIndex / totalMessages) * 100;

    console.log(`[Jump] Scrolling to index ${targetIndex}/${totalMessages} (${percentPosition.toFixed(1)}%)`);

    // Mark as jumping to prevent auto scroll
    isJumpingRef.current = true;
    setAtBottom(false);

    // Strategy: Use 'start' only for very top items (< 10%), otherwise 'center'
    const align = percentPosition < 10 ? 'start' : 'center';

    // First scroll: instant (auto) to pre-render items
    virtuosoRef.current.scrollToIndex({
      index: targetIndex,
      align: align,
      behavior: 'auto' // Instant scroll to render items
    });

    // Wait for images to load and retry with smooth scroll
    setTimeout(() => {
      if (!virtuosoRef.current) return;

      console.log('[Jump] Retry scroll after images loaded');

      // Second scroll: smooth to correct position after images loaded
      virtuosoRef.current.scrollToIndex({
        index: targetIndex,
        align: align,
        behavior: 'smooth'
      });

      // Highlight after final scroll
      setTimeout(() => {
        const element = document.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
          element.classList.add('ring-4', 'ring-yellow-400', 'transition-all', 'duration-300');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-yellow-400');
            isJumpingRef.current = false;
          }, 2000);
        } else {
          console.log('[Jump] Element not found after scroll');
          isJumpingRef.current = false;
        }
      }, 500);
    }, 400); // Wait for images to load
  }, [deduplicatedMessages]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!virtuosoRef.current || deduplicatedMessages.length === 0) return;

    setAtBottom(true);

    virtuosoRef.current.scrollToIndex({
      index: deduplicatedMessages.length - 1,
      align: 'end',
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [deduplicatedMessages.length]);

  // ✅ MATCH POC: Separate handleLoadMore function
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || isLoadingMore) {
      return;
    }

    console.log('[debug_scroll] ⬆️ Load more at TOP triggered (scrolling UP)');
    setIsLoadingMore(true);

    try {
      await Promise.resolve(onLoadMore());
      console.log('[debug_scroll] ✅ Load more at TOP completed');
    } catch (error) {
      console.error('[debug_scroll] ❌ Load more at TOP failed:', error);
    } finally {
      // Reset immediately in finally like POC
      setIsLoadingMore(false);
    }
  }, [onLoadMore, isLoadingMore]); // ← Include isLoadingMore in deps like POC!

  // ✅ NEW: Handle load more at bottom (scroll down after jump)
  const handleLoadMoreAtBottom = useCallback(async () => {
    if (!onLoadMoreAtBottom || isLoadingMoreBottom || isLoadingBottomRef.current) {
      console.log('[debug_scroll] ⏸️ Skip load more at BOTTOM (already loading)');
      return;
    }

    console.log('[debug_scroll] ⬇️ Load more at BOTTOM triggered (scrolling DOWN)');
    setIsLoadingMoreBottom(true);
    isLoadingBottomRef.current = true; // Set ref immediately

    try {
      await Promise.resolve(onLoadMoreAtBottom());
      console.log('[debug_scroll] ✅ Load more at BOTTOM completed');
    } catch (error) {
      console.error('[debug_scroll] ❌ Load more at BOTTOM failed:', error);
    } finally {
      // Wait a bit before allowing next load to prevent rapid triggers
      setTimeout(() => {
        setIsLoadingMoreBottom(false);
        isLoadingBottomRef.current = false;
      }, 300); // 300ms cooldown
    }
  }, [onLoadMoreAtBottom, isLoadingMoreBottom]);

  // Expose API via ref
  useImperativeHandle(ref, () => ({
    scrollToMessage: jumpToMessage,
    scrollToBottom
  }), [jumpToMessage, scrollToBottom]);

  // ✅ Edit Message Component - Separate to avoid cursor jump
  const EditMessageForm = memo(({
    initialContent,
    onSave,
    onCancel
  }: {
    initialContent: string;
    onSave: (content: string) => void;
    onCancel: () => void;
  }) => {
    const [content, setContent] = useState(initialContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ✅ ตั้งค่า cursor ให้อยู่ท้ายข้อความเมื่อ mount
    useEffect(() => {
      if (textareaRef.current) {
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
        textareaRef.current.focus();
      }
    }, []);

    return (
      <div className="max-w-[70%] w-full">
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-xs text-muted-foreground mb-2">แก้ไขข้อความ</div>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] mb-2 resize-none"
            placeholder="พิมพ์ข้อความ..."
            onKeyDown={(e) => {
              // Ctrl+Enter หรือ Cmd+Enter เพื่อบันทึก
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                onSave(content);
              }
              // Escape เพื่อยกเลิก
              if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              <X size={16} className="mr-1" />
              ยกเลิก
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(content)}
              disabled={!content.trim()}
            >
              <Check size={16} className="mr-1" />
              บันทึก
            </Button>
          </div>
        </div>
      </div>
    );
  });

  EditMessageForm.displayName = 'EditMessageForm';

  // ✅ Message Item Component - Optimized with useMemo and custom comparison
  // ✅ PHASE 2: Added ResizeObserver for accurate height measurement
  const MessageItem = memo(({ message }: { message: MessageDTO }) => {
    // ✅ Safety check: should not happen, but prevent crashes
    if (!message) {
      console.error('[MessageItem] Received undefined message');
      return null;
    }

    const isUser = isOwnMessage(message);
    const messageStatus = getMessageStatus(message, isUser);
    const status = renderMessageStatus(messageStatus || null);
    const formattedStatus = formatMessageStatus(status);
    const formattedSender = getFormattedSender(message, message.sender_name);

    // ✅ PHASE 2: Ref for measuring actual height
    const messageRef = useRef<HTMLDivElement>(null);

    // ✅ PHASE 2: ResizeObserver to measure and cache actual height
    useLayoutEffect(() => {
      const element = messageRef.current;
      if (!element || !message.id || !USE_HEIGHT_CACHE.current || !USE_RESIZE_OBSERVER.current) return;

      let debounceTimer: NodeJS.Timeout | null = null;
      let stabilityTimer: NodeJS.Timeout | null = null;
      const hasMedia = message.message_type === 'image' || message.message_type === 'sticker';

      // Measure immediately on mount
      const measureHeight = () => {
        const rect = element.getBoundingClientRect();
        if (rect.height > 0) {
          updateHeightCache(message.id!, rect.height);
          return rect.height;
        }
        return 0;
      };

      // Initial measurement
      const initialHeight = measureHeight();
      const estimated = estimateMessageHeight(message);

      // ✅ Log immediately to see initial state
      if (initialHeight > 0) {
        const initialDiff = Math.abs(initialHeight - estimated);
        console.log(`[HeightCache] ${message.id?.slice(0, 8)} (${message.message_type}): INITIAL estimated=${estimated}px → actual=${initialHeight}px (diff: ${initialDiff}px)`);
      }

      // ✅ For text messages: measure once more after 300ms then stop
      // For images/stickers: keep observing for load events
      if (!hasMedia) {
        stabilityTimer = setTimeout(() => {
          const finalHeight = measureHeight();
          const diff = Math.abs(finalHeight - estimated);
          const diffPercent = ((diff / estimated) * 100).toFixed(1);

          console.log(`[HeightCache] ${message.id?.slice(0, 8)} (${message.message_type}): FINAL estimated=${estimated}px → actual=${finalHeight}px (diff: ${diff}px / ${diffPercent}%)`);

          // ⚠️ Warn if difference is significant
          if (diff > 5) {
            console.warn(`[HeightCache] ⚠️ Large height difference for ${message.id?.slice(0, 8)}! Content length: ${message.content?.length || 0}`);
          }
          // No observer needed for text - height is now stable
        }, 300);

        return () => {
          if (stabilityTimer) clearTimeout(stabilityTimer);
        };
      }

      // For media messages, observe size changes with debounce
      const observer = new ResizeObserver((entries) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          for (const entry of entries) {
            const height = entry.contentRect.height;
            if (height > 0) {
              updateHeightCache(message.id!, height);
            }
          }
        }, 150);
      });

      observer.observe(element);

      // Cleanup
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (stabilityTimer) clearTimeout(stabilityTimer);
        observer.disconnect();
      };
    }, [message.id, message.message_type]); // Re-run if message type changes

    // ✅ Memoize message content to avoid re-creating on every render
    const messageContent = useMemo(() => {
      console.log('[MessageItem] Rendering:', message.message_type, message.id?.slice(0, 8));

      if (message.message_type === 'text') {
        return message.reply_to_message || message.reply_to_id ? (
          <ReplyMessage
            message={message}
            isUser={isUser}
            formatTime={formatTime}
            messageStatus={formattedStatus}
            isBusinessView={isBusinessView}
            isGroupChat={isGroupChat}
            senderName={formattedSender}
            onJumpToMessage={onJumpToMessage}
          />
        ) : (
          <TextMessage
            message={message}
            isUser={isUser}
            formatTime={formatTime}
            messageStatus={formattedStatus}
            isBusinessView={isBusinessView}
            isGroupChat={isGroupChat}
            senderName={formattedSender}
          />
        );
      }

      if (message.message_type === 'sticker') {
        return (
          <StickerMessage
            message={message}
            isUser={isUser}
            formatTime={formatTime}
            messageStatus={formattedStatus}
            isBusinessView={isBusinessView}
            isGroupChat={isGroupChat}
            senderName={formattedSender}
          />
        );
      }

      if (message.message_type === 'image') {
        return (
          <ImageMessage
            message={message}
            isUser={isUser}
            formatTime={formatTime}
            messageStatus={formattedStatus}
            onImageClick={onImageClick || (() => {})}
            isBusinessView={isBusinessView}
            isGroupChat={isGroupChat}
            senderName={formattedSender}
          />
        );
      }

      if (message.message_type === 'file') {
        return (
          <FileMessage
            message={message}
            isUser={isUser}
            formatTime={formatTime}
            messageStatus={formattedStatus}
            isBusinessView={isBusinessView}
            isGroupChat={isGroupChat}
            senderName={formattedSender}
          />
        );
      }

      console.log('[MessageItem] Unknown type:', message.message_type);
      return null;
    }, [message, isUser, formattedStatus, formattedSender, onImageClick, scrollToMessageProp]);

    // ตรวจสอบว่ากำลังแก้ไขข้อความนี้อยู่หรือไม่
    const isEditing = editingMessageId === message.id;

    return (
      <div
        ref={messageRef}
        data-message-id={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}
      >
        {isEditing && message.message_type === 'text' ? (
          // แสดง UI การแก้ไขข้อความ
          <EditMessageForm
            initialContent={editingContent || message.content}
            onSave={(content) => {
              // ส่ง content โดยตรงไปยัง onConfirmEdit
              if (onConfirmEdit) {
                (onConfirmEdit as (content?: string) => void)(content);
              }
            }}
            onCancel={() => onCancelEdit?.()}
          />
        ) : (
          // แสดงข้อความปกติ
          <>
            {(onReplyMessage || onEditMessage || onDeleteMessage || onResendMessage) ? (
              <MessageContextMenu
                message={message}
                currentUserId={currentUserId}
                onReply={(messageId) => onReplyMessage?.(messageId)}
                onEdit={(messageId) => onEditMessage?.(messageId)}
                onCopy={handleCopyMessage}
                onResend={onResendMessage}
              >
                <div className="max-w-[70%]">
                  {messageContent}
                </div>
              </MessageContextMenu>
            ) : (
              <div className="max-w-[70%]">
                {messageContent}
              </div>
            )}
          </>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // ✅ Custom comparison to prevent unnecessary re-renders
    const prev = prevProps.message;
    const next = nextProps.message;

    return (
      prev.id === next.id &&
      prev.content === next.content &&
      prev.media_url === next.media_url &&
      prev.status === next.status &&
      prev.message_type === next.message_type &&
      prev.updated_at === next.updated_at
    );
  });

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">ยังไม่มีข้อความ</p>
          <p className="text-sm text-muted-foreground">ส่งข้อความแรกเพื่อเริ่มการสนทนา</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background min-h-0">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={deduplicatedMessages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={firstItemIndex + deduplicatedMessages.length - 1}
        // ✅ PHASE 4: Tell Virtuoso the initial item count for better estimation
        initialItemCount={deduplicatedMessages.length}
        // ✅ NEW: Default item height to reduce layout shift
        defaultItemHeight={100}
        // ✅ PHASE 3: Use cached height if available, otherwise estimate
        itemSize={(el) => {
          const index = typeof el === 'number' ? el : parseInt(el.getAttribute('data-index') || '0', 10);
          const message = deduplicatedMessages[index];
          if (!message) return 100;

          // Try to get cached height first (accurate)
          if (USE_HEIGHT_CACHE.current && message.id) {
            const cachedHeight = heightCache.current.get(message.id);
            if (cachedHeight) {
              cacheHits.current++;
              return cachedHeight;
            }
            cacheMisses.current++;
          }

          // Fallback to estimation (initial render)
          return estimateMessageHeight(message);
        }}
        // ✅ Auto-scroll to bottom when new messages arrive
        followOutput={(isAtBottom) => {
          console.log('📜 [VirtualMessageList] followOutput called:', { isAtBottom });
          setAtBottom(isAtBottom);

          // ✅ เสมอ auto-scroll เมื่อมีข้อความใหม่ (ไม่ว่าจะอยู่ที่ไหน)
          // 'smooth' = scroll ลงล่างแบบนุ่มนวล
          return 'smooth';
        }}
        // ✅ MATCH POC: Simple inline atTopStateChange calling handleLoadMore
        atTopStateChange={(atTop) => {
          if (atTop) {
            lastScrollDirectionRef.current = 'up';
            console.log(`[debug_scroll] 🔝 atTopStateChange: ${atTop} | DIRECTION: ⬆️ UP | canLoadMore: ${!!onLoadMore}, isLoading: ${isLoadingMore}, isMounted: ${isMountedRef.current}`);
          } else {
            console.log(`[debug_scroll] 🔝 atTopStateChange: ${atTop} | Left top area`);
          }

          // ✅ FIX: Skip auto-load on initial mount (prevent double API call)
          if (atTop && !isLoadingMore && isMountedRef.current) {
            handleLoadMore(); // ← Call only after component is fully mounted
          } else if (atTop && !isMountedRef.current) {
            console.log(`[debug_scroll] ⏸️ Skipping auto-load on initial mount`);
          }
        }}
        atTopThreshold={400}
        // ✅ NEW: atBottomStateChange for scroll down after jump
        atBottomStateChange={(atBottom) => {
          if (atBottom) {
            lastScrollDirectionRef.current = 'down';
            console.log(`[debug_scroll] 🔽 atBottomStateChange: ${atBottom} | DIRECTION: ⬇️ DOWN | canLoadMore: ${!!onLoadMoreAtBottom}, isLoading: ${isLoadingMoreBottom}, refLoading: ${isLoadingBottomRef.current}`);
          } else {
            console.log(`[debug_scroll] 🔽 atBottomStateChange: ${atBottom} | Left bottom area | isLoading: ${isLoadingMoreBottom}`);
          }

          // Only trigger when scrolling TO bottom (true), not when leaving (false)
          // Also check ref to prevent rapid triggers
          if (atBottom && !isLoadingMoreBottom && !isLoadingBottomRef.current && onLoadMoreAtBottom) {
            handleLoadMoreAtBottom();
          }
        }}
        atBottomThreshold={100}
        // ✅ PHASE 5: Increase viewport buffer for better preloading (Telegram-style)
        // Preload ~10-15 messages ahead instead of 4-6
        increaseViewportBy={{ top: 1000, bottom: 1000 }}
        // ✅ Remove computeItemKey to match POC (use default index-based)
        itemContent={(_index, message) => {
          // ✅ Safety check: skip if message is undefined
          if (!message) {
            console.warn('[VirtualMessageList] Skipping undefined message at index:', _index);
            return <div style={{ height: 100 }} />; // Render empty placeholder
          }
          return <MessageItem message={message} />;
        }}
      />
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';

export default memo(VirtualMessageList);
