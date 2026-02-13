import React, { useState } from 'react';
import { ServiceRequest } from '../../types';
import { ArrowLeft, Calendar, Clock, MessageSquare } from 'lucide-react';

interface CounterProposalFormProps {
  request: ServiceRequest;
  isDark: boolean;
  onBack: () => void;
  onSubmit: (data: { proposed_date: string; proposed_time: string; message: string }) => void;
}

export const CounterProposalForm: React.FC<CounterProposalFormProps> = ({
  request,
  isDark,
  onBack,
  onSubmit,
}) => {
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = proposedDate.trim() !== '' && proposedTime.trim() !== '';

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      proposed_date: proposedDate,
      proposed_time: proposedTime,
      message: message.trim(),
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '17px',
    color: isDark ? 'var(--label-primary)' : '#000000',
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    border: `0.5px solid ${isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'}`,
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
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
        paddingBottom: '140px',
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
          Counter-Propose
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--label-secondary)', margin: 0 }}>
          Suggest a different schedule for this work order
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
        {/* Original Schedule */}
        {request.scheduled_appointment && (
          <div style={{ ...cardStyle, background: isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)' }}>
            <div style={{ fontSize: '13px', color: 'var(--label-tertiary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Requested Schedule
            </div>
            <div style={{ fontSize: '17px', color: isDark ? 'var(--label-primary)' : '#000000', fontWeight: '500' }}>
              {request.scheduled_appointment.scheduled_date} at {request.scheduled_appointment.scheduled_time}
            </div>
          </div>
        )}

        {/* Proposed Date */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', marginBottom: '8px' }}>
            <Calendar size={14} style={{ color: 'var(--label-secondary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--label-secondary)', textTransform: 'uppercase' }}>
              Proposed Date
            </span>
          </div>
          <input
            type="date"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Proposed Time */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', marginBottom: '8px' }}>
            <Clock size={14} style={{ color: 'var(--label-secondary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--label-secondary)', textTransform: 'uppercase' }}>
              Proposed Time
            </span>
          </div>
          <input
            type="time"
            value={proposedTime}
            onChange={(e) => setProposedTime(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Message */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', marginBottom: '8px' }}>
            <MessageSquare size={14} style={{ color: 'var(--label-secondary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--label-secondary)', textTransform: 'uppercase' }}>
              Message (Optional)
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explain why you're suggesting a different time..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Submit Button — fixed at bottom */}
      <div
        style={{
          position: 'fixed',
          bottom: '84px',
          left: 0,
          right: 0,
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            display: 'flex',
            gap: '12px',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={onBack}
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '17px',
              fontWeight: '600',
              color: isDark ? 'var(--label-primary)' : '#000000',
              background: isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `0.5px solid ${isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.1s ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '17px',
              fontWeight: '600',
              color: '#FFFFFF',
              background: canSubmit ? '#FF9500' : isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.5)',
              border: 'none',
              borderRadius: '12px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'transform 0.1s ease, background 0.2s ease',
              boxShadow: canSubmit ? '0 4px 12px rgba(255, 149, 0, 0.3)' : 'none',
            }}
            onMouseDown={(e) => { if (canSubmit) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Send Proposal
          </button>
        </div>
      </div>
    </div>
  );
};
