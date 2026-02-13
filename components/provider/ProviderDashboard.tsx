import React, { useState, useEffect, useCallback } from 'react';
import { ServiceRequest, ServiceUrgency } from '../../types';
import { WorkOrderCard } from './WorkOrderCard';
import {
  isSupabaseConfigured,
  getServiceRequests,
  subscribeToServiceRequests,
} from '../../services/supabaseService';

interface ProviderDashboardProps {
  isDark: boolean;
  onSelectRequest: (request: ServiceRequest) => void;
}

type UrgencyFilter = 'ALL' | ServiceUrgency;

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ isDark, onSelectRequest }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<UrgencyFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getServiceRequests({ status: 'submitted' });
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch service requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();

    if (!isSupabaseConfigured()) return;

    // Real-time subscription for new/updated requests
    const channel = subscribeToServiceRequests((payload) => {
      console.log('Real-time update:', payload);
      // Re-fetch to get fresh data
      fetchRequests();
    });

    return () => {
      channel?.unsubscribe();
    };
  }, [fetchRequests]);

  const filteredRequests = filter === 'ALL'
    ? requests
    : requests.filter((r) => r.urgency === filter);

  const filters: { id: UrgencyFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'ERS', label: 'ERS' },
    { id: 'DELAYED', label: 'Delayed' },
    { id: 'SCHEDULED', label: 'Scheduled' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isDark
          ? 'linear-gradient(180deg, #000000 0%, #1C1C1E 100%)'
          : 'linear-gradient(180deg, #F2F2F7 0%, #FFFFFF 100%)',
        paddingTop: '60px',
        paddingBottom: '100px',
      }}
    >
      {/* Header */}
      <div style={{ padding: '0 24px', marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '34px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: isDark ? 'var(--label-primary)' : '#000000',
            margin: 0,
            marginBottom: '8px',
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: '17px',
            color: 'var(--label-secondary)',
            margin: 0,
          }}
        >
          {requests.length} incoming work order{requests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Urgency Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 24px',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {filters.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: isActive
                  ? 'var(--accent-blue)'
                  : isDark
                    ? 'rgba(28, 28, 30, 0.7)'
                    : 'rgba(255, 255, 255, 0.9)',
                color: isActive
                  ? '#FFFFFF'
                  : 'var(--label-secondary)',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Request List */}
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {isLoading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--label-tertiary)',
              fontSize: '15px',
            }}
          >
            Loading work orders...
          </div>
        ) : !isSupabaseConfigured() ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--label-tertiary)',
              fontSize: '15px',
            }}
          >
            Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.
          </div>
        ) : filteredRequests.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--label-tertiary)',
              fontSize: '15px',
            }}
          >
            {filter === 'ALL'
              ? 'No incoming work orders right now.'
              : `No ${filter} work orders right now.`}
          </div>
        ) : (
          filteredRequests.map((request) => (
            <WorkOrderCard
              key={request.id}
              request={request}
              isDark={isDark}
              onSelect={onSelectRequest}
            />
          ))
        )}
      </div>
    </div>
  );
};
