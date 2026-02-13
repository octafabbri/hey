import React from 'react';
import { ServiceRequest } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { ArrowLeft, MapPin, Phone, Truck, Clock, Wrench } from 'lucide-react';

interface WorkOrderDetailProps {
  request: ServiceRequest;
  isDark: boolean;
  onBack: () => void;
  onAccept: (request: ServiceRequest) => void;
  onReject: (request: ServiceRequest) => void;
  onCounterPropose: (request: ServiceRequest) => void;
}

export const WorkOrderDetail: React.FC<WorkOrderDetailProps> = ({
  request,
  isDark,
  onBack,
  onAccept,
  onReject,
  onCounterPropose,
}) => {
  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: `0.5px solid ${isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'}`,
    padding: '16px',
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--label-tertiary)',
    marginBottom: '4px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '17px',
    color: isDark ? 'var(--label-primary)' : '#000000',
    fontWeight: '500',
  };

  const isScheduled = request.urgency === 'SCHEDULED';
  const canAct = request.status === 'submitted';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              color: isDark ? 'var(--label-primary)' : '#000000',
              margin: 0,
            }}
          >
            Work Order
          </h1>
          <StatusBadge status={request.status} />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--label-tertiary)', margin: 0 }}>
          ID: {request.id.slice(0, 8)}
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
        {/* Contact Info */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Phone size={16} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '15px', fontWeight: '600', color: isDark ? 'var(--label-primary)' : '#000000' }}>
              Contact
            </span>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <div style={labelStyle}>Driver</div>
              <div style={valueStyle}>{request.driver_name}</div>
            </div>
            <div>
              <div style={labelStyle}>Phone</div>
              <div style={valueStyle}>{request.contact_phone}</div>
            </div>
            <div>
              <div style={labelStyle}>Fleet</div>
              <div style={valueStyle}>{request.fleet_name}</div>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Wrench size={16} style={{ color: '#FF9500' }} />
            <span style={{ fontSize: '15px', fontWeight: '600', color: isDark ? 'var(--label-primary)' : '#000000' }}>
              Service Details
            </span>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <div style={labelStyle}>Service Type</div>
              <div style={valueStyle}>{request.service_type}</div>
            </div>
            <div>
              <div style={labelStyle}>Urgency</div>
              <div style={valueStyle}>{request.urgency}</div>
            </div>

            {request.service_type === 'TIRE' && request.tire_info && (
              <>
                <div>
                  <div style={labelStyle}>Service</div>
                  <div style={valueStyle}>{request.tire_info.requested_service}</div>
                </div>
                <div>
                  <div style={labelStyle}>Tire</div>
                  <div style={valueStyle}>{request.tire_info.requested_tire}</div>
                </div>
                <div>
                  <div style={labelStyle}>Quantity</div>
                  <div style={valueStyle}>{request.tire_info.number_of_tires}</div>
                </div>
                <div>
                  <div style={labelStyle}>Position</div>
                  <div style={valueStyle}>{request.tire_info.tire_position}</div>
                </div>
              </>
            )}

            {request.service_type === 'MECHANICAL' && request.mechanical_info && (
              <>
                <div>
                  <div style={labelStyle}>Service</div>
                  <div style={valueStyle}>{request.mechanical_info.requested_service}</div>
                </div>
                <div>
                  <div style={labelStyle}>Description</div>
                  <div style={valueStyle}>{request.mechanical_info.description}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location & Vehicle */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <MapPin size={16} style={{ color: '#34C759' }} />
            <span style={{ fontSize: '15px', fontWeight: '600', color: isDark ? 'var(--label-primary)' : '#000000' }}>
              Location & Vehicle
            </span>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <div style={labelStyle}>Location</div>
              <div style={valueStyle}>{request.location?.current_location || 'Not provided'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Truck size={14} style={{ color: 'var(--label-tertiary)' }} />
              <span style={{ ...valueStyle, fontSize: '15px' }}>
                {request.vehicle?.vehicle_type || 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule (for SCHEDULED requests) */}
        {isScheduled && request.scheduled_appointment && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={16} style={{ color: '#007AFF' }} />
              <span style={{ fontSize: '15px', fontWeight: '600', color: isDark ? 'var(--label-primary)' : '#000000' }}>
                Schedule
              </span>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={labelStyle}>Date</div>
                <div style={valueStyle}>{request.scheduled_appointment.scheduled_date}</div>
              </div>
              <div>
                <div style={labelStyle}>Time</div>
                <div style={valueStyle}>{request.scheduled_appointment.scheduled_time}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons — fixed at bottom */}
      {canAct && (
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
              gap: '10px',
              pointerEvents: 'auto',
            }}
          >
            {/* Reject */}
            <button
              onClick={() => onReject(request)}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '17px',
                fontWeight: '600',
                color: '#FF3B30',
                background: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Reject
            </button>

            {/* Counter-Propose (SCHEDULED only) */}
            {isScheduled && (
              <button
                onClick={() => onCounterPropose(request)}
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#FF9500',
                  background: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                Counter
              </button>
            )}

            {/* Accept */}
            <button
              onClick={() => onAccept(request)}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '17px',
                fontWeight: '600',
                color: '#FFFFFF',
                background: '#34C759',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
                boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
