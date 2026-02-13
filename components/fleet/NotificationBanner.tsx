import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBannerProps {
  count: number;
  isDark: boolean;
  onTap: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ count, isDark, onTap }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      style={{
        position: 'fixed',
        top: '48px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '999px',
        background: isDark ? 'rgba(255, 149, 0, 0.9)' : 'rgba(255, 149, 0, 0.95)',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: '600',
        border: 'none',
        cursor: 'pointer',
        zIndex: 90,
        boxShadow: '0 4px 16px rgba(255, 149, 0, 0.3)',
        transition: 'transform 0.15s ease',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)'; }}
    >
      <Bell size={16} />
      {count} counter-proposal{count !== 1 ? 's' : ''} pending
    </button>
  );
};
