// src/components/standard/conversation/VideoGallery.tsx
import { Video as VideoIcon, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaContextMenu } from '@/components/shared/MediaContextMenu';
import { useMediaByType } from '@/hooks/useMediaQueries';

interface VideoGalleryProps {
  conversationId: string;
  onItemClick?: (messageId: string) => void;
}

// Helper function to group videos by date
function groupVideosByDate(videos: any[]) {
  const groups: Record<string, any[]> = {};

  videos.forEach((video) => {
    const date = new Date(video.created_at);
    // Use local date instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(video);
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

export function VideoGallery({ conversationId, onItemClick }: VideoGalleryProps) {
  // ✅ Use React Query hook
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMediaByType(conversationId, 'video', 20);

  const videos = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  // Group videos by date
  const videoGroups = groupVideosByDate(videos);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <VideoIcon size={48} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">ไม่มีวิดีโอ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground px-1">
        วิดีโอทั้งหมด {total} คลิป
      </div>

      {/* Video Grid - Grouped by Date */}
      <div className="flex flex-col gap-6">
        {videoGroups.map(([dateKey, groupVideos]) => {
          const groupStartIndex = videos.findIndex(v => v.message_id === groupVideos[0].message_id);

          return (
            <div key={dateKey} className="flex flex-col gap-3">
              {/* Date Header */}
              <div className="text-sm font-medium text-foreground px-1 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                {formatDateHeader(dateKey)}
              </div>

              {/* Videos Grid for this date */}
              <div className="grid grid-cols-3 gap-2">
                {groupVideos.map((video, indexInGroup) => {
                  const overallIndex = groupStartIndex + indexInGroup;

                  return (
                    <MediaContextMenu
                      key={`${video.message_id}-${video.media_url}`}
                      onJumpToMessage={() => onItemClick?.(video.message_id)}
                    >
                      <button
                        onClick={() => onItemClick?.(video.message_id)}
                        className="relative aspect-square rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                      >
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading={overallIndex < 9 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <VideoIcon size={32} className="text-muted-foreground" />
                          </div>
                        )}
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play size={20} className="text-black ml-1" fill="currentColor" />
                          </div>
                        </div>
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
            `โหลดเพิ่มเติม (เหลืออีก ${total - videos.length} คลิป)`
          )}
        </Button>
      )}
    </div>
  );
}
