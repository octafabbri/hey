import React from 'react';

interface ProviderSettingsProps {
  isDark: boolean;
  onSwitchRole: () => void;
}

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({ isDark, onSwitchRole }) => {
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
      <div style={{ padding: '0 24px', marginBottom: '32px' }}>
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
          Settings
        </h1>
        <p style={{ fontSize: '17px', color: 'var(--label-secondary)', margin: 0 }}>
          Service provider preferences
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
        {/* Account Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ padding: '0 8px', marginBottom: '8px' }}>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '-0.01em',
                color: 'var(--label-secondary)',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Account
            </h2>
          </div>

          <button
            onClick={onSwitchRole}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '17px',
              color: '#FF3B30',
              background: isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '12px',
              border: `0.5px solid ${isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'}`,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.1s ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Switch Role
          </button>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--label-tertiary)',
              margin: '8px 8px 0 8px',
              lineHeight: 1.4,
            }}
          >
            Return to the role selection screen
          </p>
        </div>
      </div>
    </div>
  );
};
