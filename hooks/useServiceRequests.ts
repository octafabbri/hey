import { useState, useEffect, useCallback } from 'react';
import { ServiceRequest } from '../types';
import {
  isSupabaseConfigured,
  getServiceRequests,
  getSessionUserId,
  subscribeToMyRequests,
} from '../services/supabaseService';

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyRequests = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const userId = await getSessionUserId();
      if (!userId) {
        setIsLoading(false);
        return;
      }
      const data = await getServiceRequests({ createdBy: userId });
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch service requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();

    if (!isSupabaseConfigured()) return;

    let channel: ReturnType<typeof subscribeToMyRequests> | null = null;

    (async () => {
      const userId = await getSessionUserId();
      if (!userId) return;

      channel = subscribeToMyRequests(userId, () => {
        fetchMyRequests();
      });
    })();

    return () => {
      channel?.unsubscribe();
    };
  }, [fetchMyRequests]);

  return { requests, isLoading, refresh: fetchMyRequests };
}
