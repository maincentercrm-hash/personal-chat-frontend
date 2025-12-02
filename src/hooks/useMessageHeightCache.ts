// src/hooks/useMessageHeightCache.ts
import { useRef, useCallback } from 'react';
import type { MessageDTO } from '@/types/message.types';

export const useMessageHeightCache = () => {
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

  // ✅ PHASE 1: Improved Album height estimation
  const estimateAlbumHeight = useCallback((message: MessageDTO, _fileCount: number): number => {
    // Separate media files (image/video) and document files
    const albumFiles = message.album_files || [];
    const mediaFiles = albumFiles.filter(f => f.file_type === 'image' || f.file_type === 'video');
    const documentFiles = albumFiles.filter(f => f.file_type === 'file');

    let totalHeight = 0;

    // 1. Media Grid Height (if any media files)
    if (mediaFiles.length > 0) {
      const mediaCount = mediaFiles.length;
      let gridHeight = 0;

      // ✅ UPDATED: Based on actual measurements (2025-12-01)
      // 1-2 images: 228px total - 24px metadata = 204px grid
      // 3-4 images: 428px total - 24px metadata = 404px grid
      if (mediaCount === 1) {
        gridHeight = 204; // Measured: 228px total - 24px metadata
      } else if (mediaCount === 2) {
        gridHeight = 204; // Measured: 228px total - 24px metadata
      } else if (mediaCount === 3) {
        gridHeight = 404; // Measured: 428px total - 24px metadata
      } else if (mediaCount === 4) {
        gridHeight = 404; // Measured: 428px total - 24px metadata
      } else if (mediaCount <= 6) {
        gridHeight = 404; // Estimate (need measurement)
      } else {
        gridHeight = 404; // Estimate (need measurement)
      }

      totalHeight += gridHeight;
    }

    // 2. Document List Height (if any document files)
    if (documentFiles.length > 0) {
      const docItemHeight = 62; // ✅ UPDATED: Measured 2025-12-01 (was 72px)
      const docGap = 8; // Gap between items
      const documentListHeight = (docItemHeight * documentFiles.length) + (docGap * (documentFiles.length - 1));

      totalHeight += documentListHeight;

      // Add spacing between media and documents if both exist
      if (mediaFiles.length > 0) {
        totalHeight += 8; // mt-2 spacing
      }
    }

    // 3. Caption Height (if exists) ✅ NEW!
    const caption = message.content || '';
    if (caption) {
      // ✅ UPDATED: Caption adds consistently 46px (measured)
      // Estimated based on short caption adding 46px
      const avgCharsPerLine = 45;
      const captionLines = Math.max(1, Math.ceil(caption.length / avgCharsPerLine));
      const captionHeight = 46 + ((captionLines - 1) * 20); // Base 46px + 20px per extra line

      totalHeight += captionHeight;
    }

    // 4. Base metadata height (sender name, time, status)
    const metadataHeight = 24;
    totalHeight += metadataHeight;

    console.log(`[HeightCache] Album estimation: ${mediaFiles.length} media, ${documentFiles.length} docs, caption: ${caption.length} chars → ${totalHeight}px`);

    return totalHeight;
  }, []);

  // Estimate message height based on ACTUAL measurements from browser
  // Measured values: text=74px, reply=130px, sticker=156px, image=216px, file=106px
  // Album heights: 1=400px, 2=198px, 3=268px, 4=400px (provided by user)
  const estimateMessageHeight = useCallback((message: MessageDTO): number => {
    // ✅ NEW FORMAT: Album with album_files array
    if (message.message_type === 'album' && message.album_files && message.album_files.length > 0) {
      const fileCount = message.album_files.length;
      const estimatedHeight = estimateAlbumHeight(message, fileCount);
      console.log(`[HeightCache] Album NEW ${message.id?.slice(0, 8)}: ${fileCount} files → estimated ${estimatedHeight}px`);
      return estimatedHeight;
    }

    // ⚠️ OLD FORMAT: Album with metadata (will be deprecated)
    const albumId = message.metadata?.album_id;
    const albumPosition = message.metadata?.album_position;

    if (albumId !== undefined && albumPosition !== undefined) {
      // Only position 0 renders the album, others return 0
      if (albumPosition === 0) {
        // For old format, create a temporary message object for estimation
        const albumTotal = message.metadata?.album_total || 1;
        // Old format doesn't have album_files, so estimate basic height only
        const baseHeight = 100;
        let gridHeight = 0;
        if (albumTotal === 1) gridHeight = 300;
        else if (albumTotal === 2) gridHeight = 98;
        else if (albumTotal === 3) gridHeight = 168;
        else if (albumTotal === 4) gridHeight = 300;
        else if (albumTotal <= 6) gridHeight = 250;
        else gridHeight = 300;

        const estimatedHeight = baseHeight + gridHeight;
        console.log(`[HeightCache] Album OLD ${albumId.slice(0, 8)}: ${albumTotal} photos → estimated ${estimatedHeight}px`);
        return estimatedHeight;
      } else {
        // Other positions don't render, so return minimal height
        return 0;
      }
    }

    // ✅ PHASE 1: Reply message height estimation
    if (message.reply_to_id || message.reply_to_message) {
      // ✅ UPDATED 2025-12-01: Reply content is truncated, so height is constant
      // Reply = Preview (quoted) + Content (1 line, truncated) + Metadata
      return 122; // Measured: always 122px regardless of content length
    }

    switch (message.message_type) {
      case 'text': {
        // ✅ PHASE 1: Improved text height estimation
        const content = message.content || '';

        // 1. Count manual line breaks (\n)
        const manualLineBreaks = (content.match(/\n/g) || []).length;
        const manualLines = manualLineBreaks + 1;

        // 2. Estimate wrapped lines (more conservative: 45 chars/line instead of 50)
        const avgCharsPerLine = 45;
        const contentLength = content.length;

        // 3. Emoji detection (rough heuristic)
        // Matches emoji range U+1F600-U+1F64F (emoticons) and more
        const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
        const emojiPenalty = emojiCount * 0.5; // Each emoji ≈ 0.5 extra lines

        const wrappedLines = Math.ceil(contentLength / avgCharsPerLine) + emojiPenalty;

        // 4. Use larger of manual lines or wrapped lines
        const estimatedLines = Math.max(manualLines, wrappedLines);

        // ✅ UPDATED: Base 66px (measured) + 20px per additional line
        const estimatedHeight = 66 + ((estimatedLines - 1) * 20);

        console.log(`[HeightCache] Text estimation: ${content.length} chars, ${manualLineBreaks} breaks, ${emojiCount} emoji → ${estimatedLines} lines → ${estimatedHeight}px`);

        return estimatedHeight;
      }

      case 'image':
        return 228; // ✅ UPDATED: Measured 2025-12-01

      case 'sticker':
        return 148; // ✅ UPDATED: Measured 2025-12-01

      case 'file':
        return 90; // ✅ UPDATED: Measured 2025-12-01

      default:
        return 66; // Default to text height (updated)
    }
  }, [estimateAlbumHeight]);

  // Get cached height or estimate
  const getMessageHeight = useCallback((message: MessageDTO): number => {
    if (USE_HEIGHT_CACHE.current && message.id) {
      const cachedHeight = heightCache.current.get(message.id);
      if (cachedHeight) {
        cacheHits.current++;
        return cachedHeight;
      }
      cacheMisses.current++;
    }

    return estimateMessageHeight(message);
  }, [estimateMessageHeight]);

  return {
    heightCache,
    USE_HEIGHT_CACHE,
    USE_RESIZE_OBSERVER,
    cacheHits,
    cacheMisses,
    updateHeightCache,
    estimateMessageHeight,
    getMessageHeight
  };
};
