// src/components/standard/conversation/PhotoGallery.tsx
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaContextMenu } from '@/components/shared/MediaContextMenu';
import { useMediaByType } from '@/hooks/useMediaQueries';
import { getThumbnailUrl } from '@/utils/image/imageTransform';

interface PhotoGalleryProps {
  conversationId: string;
  onItemClick?: (messageId: string) => void;
}

// Helper function to group photos by date
function groupPhotosByDate(photos: any[]) {
  const groups: Record<string, any[]> = {};

  photos.forEach((photo) => {
    const date = new Date(photo.created_at);
    // Use local date instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
  });

  // Sort by date descending (newest first)
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

// Helper function to format date header
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'วันนี้';
  if (isYesterday) return 'เมื่อวาน';

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PhotoGallery({ conversationId, onItemClick }: PhotoGalleryProps) {
  // ✅ Use React Query hook - auto caching, refetching, and state management
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMediaByType(conversationId, 'image', 20);

  // Flatten all pages into single array
  const photos = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  // Group photos by date
  const photoGroups = groupPhotosByDate(photos);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ImageIcon size={48} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">ไม่มีรูปภาพ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground px-1">
        รูปภาพทั้งหมด {total} รูป
      </div>

      {/* Photo Grid - Grouped by Date */}
      <div className="flex flex-col gap-6">
        {photoGroups.map(([dateKey, groupPhotos]) => {
          // Calculate the starting index for this group in the overall photos array
          const groupStartIndex = photos.findIndex(p => p.message_id === groupPhotos[0].message_id);

          return (
            <div key={dateKey} className="flex flex-col gap-3">
              {/* Date Header */}
              <div className="text-sm font-medium text-foreground px-1 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                {formatDateHeader(dateKey)}
              </div>

              {/* Photos Grid for this date */}
              <div className="grid grid-cols-3 gap-2">
                {groupPhotos.map((photo, indexInGroup) => {
                  const overallIndex = groupStartIndex + indexInGroup;
                  // ✅ Use optimized thumbnail (same as message area)
                  const originalUrl = photo.media_url || photo.thumbnail_url || '';
                  const thumbnailUrl = getThumbnailUrl(originalUrl);

                  return (
                    <MediaContextMenu
                      key={`${photo.message_id}-${photo.media_url}`}
                      onJumpToMessage={() => onItemClick?.(photo.message_id)}
                    >
                      <button
                        onClick={() => onItemClick?.(photo.message_id)}
                        className="relative aspect-square rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading={overallIndex < 9 ? "eager" : "lazy"}
                          decoding="async"
                        />
                      </button>
                    </MediaContextMenu>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <Button
          variant="outline"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full"
        >
          {isFetchingNextPage ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังโหลด...
            </>
          ) : (
            `โหลดเพิ่มเติม (เหลืออีก ${total - photos.length} รูป)`
          )}
        </Button>
      )}
    </div>
  );
}
