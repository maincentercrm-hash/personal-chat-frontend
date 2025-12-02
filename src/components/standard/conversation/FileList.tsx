// src/components/standard/conversation/FileList.tsx
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaContextMenu } from '@/components/shared/MediaContextMenu';
import { useMediaByType } from '@/hooks/useMediaQueries';

interface FileListProps {
  conversationId: string;
  onItemClick?: (messageId: string) => void;
}

// Helper function to group files by date
function groupFilesByDate(files: any[]) {
  const groups: Record<string, any[]> = {};

  files.forEach((file) => {
    const date = new Date(file.created_at);
    // Use local date instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(file);
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export function FileList({ conversationId, onItemClick }: FileListProps) {
  // ✅ Use React Query hook
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMediaByType(conversationId, 'file', 20);

  const files = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  // Group files by date
  const fileGroups = groupFilesByDate(files);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText size={48} className="text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">ไม่มีไฟล์</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground px-1">
        ไฟล์ทั้งหมด {total} ไฟล์
      </div>

      {/* File List - Grouped by Date */}
      <div className="flex flex-col gap-6">
        {fileGroups.map(([dateKey, groupFiles]) => (
          <div key={dateKey} className="flex flex-col gap-3">
            {/* Date Header */}
            <div className="text-sm font-medium text-foreground px-1 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
              {formatDateHeader(dateKey)}
            </div>

            {/* Files for this date */}
            <div className="space-y-2">
              {groupFiles.map((file) => (
                <MediaContextMenu
                  key={`${file.message_id}-${file.media_url}`}
                  onJumpToMessage={() => onItemClick?.(file.message_id)}
                >
                  <button
                    onClick={() => onItemClick?.(file.message_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name || 'Unknown File'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{file.file_size ? formatFileSize(file.file_size) : '-'}</span>
                        <span>•</span>
                        <span>{formatTime(file.created_at)}</span>
                      </div>
                    </div>
                    <a
                      href={file.media_url}
                      download={file.file_name}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 p-2 rounded hover:bg-accent"
                      title="ดาวน์โหลด"
                    >
                      <Download size={16} className="text-muted-foreground" />
                    </a>
                  </button>
                </MediaContextMenu>
              ))}
            </div>
          </div>
        ))}
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
            `โหลดเพิ่มเติม (เหลืออีก ${total - files.length} ไฟล์)`
          )}
        </Button>
      )}
    </div>
  );
}
