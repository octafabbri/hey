import React, { useState, useEffect } from 'react';
import { ServiceRequest, CounterProposal } from '../../types';
import { ArrowLeft, Calendar, Clock, MessageSquare } from 'lucide-react';
import {
  isSupabaseConfigured,
  getCounterProposals,
  approveCounterProposal,
  rejectCounterProposal,
} from '../../services/supabaseService';

interface CounterProposalReviewProps {
  request: ServiceRequest;
  isDark: boolean;
  onBack: () => void;
  onResolved: () => void;
}

export const CounterProposalReview: React.FC<CounterProposalReviewProps> = ({
  request,
  isDark,
  onBack,
  onResolved,
}) => {
  const [proposals, setProposals] = useState<CounterProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getCounterProposals(request.id);
        setProposals(data.filter((p) => p.status === 'pending'));
      } catch (err) {
        console.error('Failed to fetch counter-proposals:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [request.id]);

  const handleApprove = async (proposal: CounterProposal) => {
    try {
      await approveCounterProposal(proposal.id, request.id);
      onResolved();
    } catch (err) {
      console.error('Failed to approve counter-proposal:', err);
    }
  };

  const handleReject = async (proposal: CounterProposal) => {
    try {
      await rejectCounterProposal(proposal.id, request.id);
      // Remove from local list
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      if (proposals.length <= 1) {
        onResolved();
      }
    } catch (err) {
      console.error('Failed to reject counter-proposal:', err);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: `0.5px solid ${isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'}`,
    padding: '16px',
    marginBottom: '16px',
  };

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
      {/* Back button */}
      <div style={{ padding: '0 24px', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '17px',
            color: 'var(--accent-blue)',
            padding: 0,
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      {/* Header */}
      <div style={{ padding: '0 24px', marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: isDark ? 'var(--label-primary)' : '#000000',
            margin: 0,
            marginBottom: '8px',
          }}
        >
          Counter-Proposals
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--label-secondary)', margin: 0 }}>
          {request.service_type === 'TIRE' ? 'Tire Service' : 'Mechanical Service'} — {request.fleet_name}
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
        {/* Original Schedule */}
        {request.scheduled_appointment && (
          <div style={{ ...cardStyle, background: isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)' }}>
            <div style={{ fontSize: '13px', color: 'var(--label-tertiary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Your Requested Schedule
            </div>
            <div style={{ fontSize: '17px', color: isDark ? 'var(--label-primary)' : '#000000', fontWeight: '500' }}>
              {request.scheduled_appointment.scheduled_date} at {request.scheduled_appointment.scheduled_time}
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--label-tertiary)', fontSize: '15px' }}>
            Loading proposals...
          </div>
        ) : proposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--label-tertiary)', fontSize: '15px' }}>
            No pending counter-proposals.
          </div>
        ) : (
          proposals.map((proposal) => (
            <div key={proposal.id} style={cardStyle}>
              {/* Provider info */}
              <div style={{ fontSize: '15px', fontWeight: '600', color: isDark ? 'var(--label-primary)' : '#000000', marginBottom: '12px' }}>
                From: {proposal.provider_name}
              </div>

              {/* Proposed schedule */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: '#FF9500' }} />
                  <span style={{ fontSize: '15px', color: isDark ? 'var(--label-primary)' : '#000000' }}>
                    {proposal.proposed_date}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: '#FF9500' }} />
                  <span style={{ fontSize: '15px', color: isDark ? 'var(--label-primary)' : '#000000' }}>
                    {proposal.proposed_time}
                  </span>
                </div>
              </div>

              {/* Message */}
              {proposal.message && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '16px' }}>
                  <MessageSquare size={14} style={{ color: 'var(--label-tertiary)', marginTop: '2px' }} />
                  <span style={{ fontSize: '14px', color: 'var(--label-secondary)', lineHeight: 1.4 }}>
                    {proposal.message}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleReject(proposal)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#FF3B30',
                    background: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(proposal)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    background: '#34C759',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                    boxShadow: '0 2px 8px rgba(52, 199, 89, 0.3)',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
