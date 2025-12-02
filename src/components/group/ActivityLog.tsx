// src/components/group/ActivityLog.tsx
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Loader2, History } from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { formatActivityMessage } from '@/services/groupService';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityLogProps {
  conversationId: string;
}

export function ActivityLog({ conversationId }: ActivityLogProps) {
  const { activities, loading, hasMore, loadMore } =
    useActivityLog(conversationId);

  if (loading && activities.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <History className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 text-xs text-muted-foreground pt-0.5">
                {format(new Date(activity.created_at), 'HH:mm', { locale: th })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{formatActivityMessage(activity)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(activity.created_at), 'dd MMM yyyy', {
                    locale: th,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {hasMore && (
        <div className="p-4 border-t">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              'แสดงเพิ่มเติม'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
