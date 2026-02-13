import { useState, useEffect, useCallback } from 'react';
import { ServiceRequest } from '../types';
import {
  isSupabaseConfigured,
  getServiceRequests,
  getSessionUserId,
  subscribeToMyRequests,
} from '../services/supabaseService';

export interface Notification {
  id: string;
  type: 'counter_proposed' | 'accepted' | 'rejected';
  request: ServiceRequest;
  timestamp: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const userId = await getSessionUserId();
      if (!userId) return;

      // Get requests with actionable statuses
      const counterProposed = await getServiceRequests({ status: 'counter_proposed', createdBy: userId });
      const accepted = await getServiceRequests({ status: 'accepted', createdBy: userId });
      const rejected = await getServiceRequests({ status: 'rejected', createdBy: userId });

      const notifs: Notification[] = [
        ...counterProposed.map((r) => ({
          id: `cp-${r.id}`,
          type: 'counter_proposed' as const,
          request: r,
          timestamp: r.submitted_at || new Date().toISOString(),
        })),
        ...accepted.map((r) => ({
          id: `ac-${r.id}`,
          type: 'accepted' as const,
          request: r,
          timestamp: r.accepted_at || new Date().toISOString(),
        })),
        ...rejected.map((r) => ({
          id: `rj-${r.id}`,
          type: 'rejected' as const,
          request: r,
          timestamp: r.submitted_at || new Date().toISOString(),
        })),
      ];

      // Sort newest first
      notifs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setNotifications(notifs);
      setUnreadCount(counterProposed.length); // Counter-proposals need action
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    if (!isSupabaseConfigured()) return;

    let channel: ReturnType<typeof subscribeToMyRequests> | null = null;

    (async () => {
      const userId = await getSessionUserId();
      if (!userId) return;

      channel = subscribeToMyRequests(userId, () => {
        fetchNotifications();
      });
    })();

    return () => {
      channel?.unsubscribe();
    };
  }, [fetchNotifications]);

  return { notifications, unreadCount, refresh: fetchNotifications };
}
