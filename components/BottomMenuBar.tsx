import { Home, Users, Settings, ClipboardList, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { UserRole } from '../types';

interface BottomMenuBarProps {
  isDark: boolean;
  role?: UserRole;
  onNavigate?: (tab: string) => void;
}

export function BottomMenuBar({
  isDark,
  role = 'fleet',
  onNavigate
}: BottomMenuBarProps) {
  const [activeTab, setActiveTab] = useState<string>('home');

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const fleetTabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const providerTabs = [
    { id: 'dashboard', icon: ClipboardList, label: 'Dashboard' },
    { id: 'active', icon: Briefcase, label: 'Active' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const tabs = role === 'provider' ? providerTabs : fleetTabs;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 pointer-events-auto"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: isDark
            ? 'rgba(28, 28, 30, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderTop: `0.5px solid ${isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'}`,
          boxShadow: isDark
            ? '0 -2px 16px rgba(0, 0, 0, 0.4)'
            : '0 -2px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          className="flex items-center justify-around"
          style={{
            height: '64px',
            maxWidth: '640px',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab.id)}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  transition: 'transform 0.1s ease',
                  minWidth: '72px',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Icon
                  size={24}
                  strokeWidth={2}
                  style={{
                    color: isActive
                      ? 'var(--accent-blue)'
                      : isDark
                        ? 'rgba(235, 235, 245, 0.6)'
                        : 'rgba(60, 60, 67, 0.6)',
                    transition: 'color 0.2s ease',
                  }}
                />

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                    letterSpacing: '-0.01em',
                    color: isActive
                      ? 'var(--accent-blue)'
                      : isDark
                        ? 'rgba(235, 235, 245, 0.6)'
                        : 'rgba(60, 60, 67, 0.6)',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
