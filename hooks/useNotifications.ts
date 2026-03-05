import { useState, useEffect, useCallback, useRef } from 'react';
import { ServiceRequest } from '../types';
import {
  isSupabaseConfigured,
  getServiceRequests,
  subscribeToMyRequests,
  subscribeToNotifications,
  getNotifications as getServerNotifications,
  markAllNotificationsRead,
} from '../services/supabaseService';

export interface Notification {
  id: string;
  type: 'counter_proposed' | 'accepted' | 'rejected';
  request: ServiceRequest;
  timestamp: string;
  serverNotificationId?: string;
}

export interface ToastAlert {
  id: string;
  eventType: string;
  requestId: string;
  message: string;
  timestamp: string;
}

const TOAST_DURATION_MS = 5000;

export function useNotifications(userId?: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<ToastAlert | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback((toast: ToastAlert) => {
    // Clear any existing timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setActiveToast(toast);
    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) return;

    try {
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

      // Unread count: counter-proposals always need action + unread server notifications
      let serverUnread = 0;
      try {
        const serverNotifs = await getServerNotifications(true);
        serverUnread = serverNotifs.length;
      } catch {
        // Fall back to counter-proposals only if server notifications unavailable
      }
      setUnreadCount(Math.max(counterProposed.length, serverUnread));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [userId]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    if (!isSupabaseConfigured() || !userId) return;

    // Subscribe to request status changes
    const requestChannel = subscribeToMyRequests(userId, () => {
      fetchNotifications();
    });

    // Subscribe to server-side notifications (real-time inserts)
    // Capture the payload to show a toast alert
    const notifChannel = subscribeToNotifications(userId, (payload: unknown) => {
      fetchNotifications();

      // Extract notification row from realtime payload
      const record = (payload as { new?: Record<string, unknown> })?.new;
      if (record && typeof record === 'object') {
        const eventType = record.event_type as string;
        const requestId = record.request_id as string;
        const message = record.message as string;
        const id = record.id as string;

        showToast({
          id: id || Date.now().toString(),
          eventType,
          requestId,
          message: message || formatEventType(eventType),
          timestamp: new Date().toISOString(),
        });
      }
    });

    return () => {
      requestChannel?.unsubscribe();
      notifChannel?.unsubscribe();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [fetchNotifications, showToast, userId]);

  return {
    notifications,
    unreadCount,
    refresh: fetchNotifications,
    markAllRead,
    activeToast,
    dismissToast,
  };
}

function formatEventType(eventType: string): string {
  switch (eventType) {
    case 'request_accepted': return 'Your request has been accepted';
    case 'request_declined': return 'Your request was declined';
    case 'counter_proposed': return 'A new time has been proposed';
    case 'counter_approved': return 'Your counter-proposal was approved';
    case 'counter_rejected': return 'Your counter-proposal was rejected';
    case 'request_completed': return 'A request has been completed';
    case 'request_cancelled': return 'A request has been cancelled';
    default: return 'You have a new notification';
  }
}
