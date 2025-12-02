// src/hooks/useActivityLog.ts
import { useState, useEffect, useCallback } from 'react';
import { getActivities } from '@/services/groupService';
import type { ActivityDTO } from '@/types/group.types';
import WebSocketManager from '@/services/websocket/WebSocketManager';

export function useActivityLog(conversationId: string) {
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadActivities = useCallback(
    async (offset = 0, type?: string) => {
      try {
        setLoading(true);
        const response = await getActivities(conversationId, {
          limit: 20,
          offset,
          type,
        });

        if (offset === 0) {
          setActivities(response.activities);
        } else {
          setActivities((prev) => [...prev, ...response.activities]);
        }

        setTotal(response.pagination.total);
        setHasMore(offset + response.activities.length < response.pagination.total);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Load initial activities
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // ✅ Listen for new activities from WebSocket
  useEffect(() => {
    const unsubscribe = WebSocketManager.onDynamic('message:conversation.activity.new', (rawData: any) => {
      const data = rawData.data;

      // Only add activity if it belongs to the current conversation
      if (data?.activity && data.activity.conversation_id === conversationId) {
        console.log('📝 [useActivityLog] New activity received:', data.activity);
        addActivity(data.activity);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  // Add new activity (from WebSocket)
  const addActivity = useCallback((activity: ActivityDTO) => {
    setActivities((prev) => [activity, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  return {
    activities,
    loading,
    total,
    hasMore,
    loadMore: () => loadActivities(activities.length),
    reload: () => loadActivities(0),
    addActivity,
  };
}
