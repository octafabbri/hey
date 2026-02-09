import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { OPENAI_VOICES } from '../constants';

interface SettingsPageProps {
  isDark: boolean;
  onSave?: (settings: { voicePersona: string; language: string }) => void;
  onCancel?: () => void;
}

export function SettingsPage({ isDark, onSave, onCancel }: SettingsPageProps) {
  // Original values (simulating loaded from storage)
  const [originalVoice] = useState('onyx');
  const [originalLanguage] = useState('en-US');

  // Current values being edited
  const [selectedVoice, setSelectedVoice] = useState('onyx');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  // Track if there are unsaved changes
  const hasChanges = selectedVoice !== originalVoice || selectedLanguage !== originalLanguage;

  const handleSave = () => {
    if (onSave) {
      onSave({
        voicePersona: selectedVoice,
        language: selectedLanguage,
      });
    }
    // In a real app, this would save to storage/backend
    console.log('Settings saved:', { voicePersona: selectedVoice, language: selectedLanguage });
  };

  const handleCancel = () => {
    // Revert to original values
    setSelectedVoice(originalVoice);
    setSelectedLanguage(originalLanguage);

    if (onCancel) {
      onCancel();
    }
  };

  const voicePersonas = OPENAI_VOICES.map(voice => ({
    id: voice.id,
    label: voice.name
  }));

  const languages = [
    { id: 'en-US', label: 'English (US)' },
    { id: 'en-GB', label: 'English (UK)' },
    { id: 'es-ES', label: 'Spanish (Spain)' },
    { id: 'es-MX', label: 'Spanish (Mexico)' },
    { id: 'fr-FR', label: 'French' },
    { id: 'de-DE', label: 'German' },
    { id: 'it-IT', label: 'Italian' },
    { id: 'pt-BR', label: 'Portuguese (Brazil)' },
    { id: 'ja-JP', label: 'Japanese' },
    { id: 'ko-KR', label: 'Korean' },
    { id: 'zh-CN', label: 'Chinese (Simplified)' },
    { id: 'ar-SA', label: 'Arabic' },
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
      <div
        style={{
          padding: '0 24px',
          marginBottom: '32px',
        }}
      >
        <h1
          style={{
            fontSize: '34px',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: '-0.02em',
            color: isDark ? 'var(--label-primary)' : '#000000',
            margin: 0,
            marginBottom: '8px',
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: '17px',
            color: 'var(--label-secondary)',
            margin: 0,
          }}
        >
          Customize your voice assistant experience
        </p>
      </div>

      {/* Settings Groups */}
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 16px',
        }}
      >
        {/* Voice Persona Section */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              padding: '0 8px',
              marginBottom: '8px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: '-0.01em',
                color: 'var(--label-secondary)',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Voice Persona
            </h2>
          </div>

          <div
            style={{
              position: 'relative',
              background: isDark
                ? 'rgba(28, 28, 30, 0.7)'
                : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '12px',
              border: `0.5px solid ${
                isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'
              }`,
              overflow: 'hidden',
            }}
          >
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              style={{
                width: '100%',
                padding: '20px 16px',
                fontSize: '19px',
                fontWeight: 'var(--font-weight-normal)',
                letterSpacing: '-0.01em',
                color: isDark ? 'var(--label-primary)' : '#000000',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              {voicePersonas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.label}
                </option>
              ))}
            </select>

            {/* Custom dropdown icon */}
            <div
              style={{
                position: 'absolute',
                right: '32px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--label-tertiary)',
              }}
            >
              <ChevronDown size={20} strokeWidth={2.5} />
            </div>
          </div>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--label-tertiary)',
              margin: '8px 8px 0 8px',
              lineHeight: 1.4,
            }}
          >
            Choose how your AI assistant communicates and responds to you
          </p>
        </div>

        {/* Input Language Section */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              padding: '0 8px',
              marginBottom: '8px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: '-0.01em',
                color: 'var(--label-secondary)',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Input Language
            </h2>
          </div>

          <div
            style={{
              position: 'relative',
              background: isDark
                ? 'rgba(28, 28, 30, 0.7)'
                : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '12px',
              border: `0.5px solid ${
                isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'
              }`,
              overflow: 'hidden',
            }}
          >
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '20px 16px',
                fontSize: '19px',
                fontWeight: 'var(--font-weight-normal)',
                letterSpacing: '-0.01em',
                color: isDark ? 'var(--label-primary)' : '#000000',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>

            {/* Custom dropdown icon */}
            <div
              style={{
                position: 'absolute',
                right: '32px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--label-tertiary)',
              }}
            >
              <ChevronDown size={20} strokeWidth={2.5} />
            </div>
          </div>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--label-tertiary)',
              margin: '8px 8px 0 8px',
              lineHeight: 1.4,
            }}
          >
            Select your preferred language for voice input and text display
          </p>
        </div>

        {/* Info Section */}
        <div
          style={{
            background: isDark
              ? 'rgba(28, 28, 30, 0.5)'
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '16px',
            border: `0.5px solid ${
              isDark ? 'rgba(84, 84, 88, 0.4)' : 'rgba(60, 60, 67, 0.18)'
            }`,
            marginBottom: '120px',
          }}
        >
          <p
            style={{
              fontSize: '15px',
              color: 'var(--label-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {hasChanges
              ? 'You have unsaved changes. Tap Save to apply them or Cancel to discard.'
              : 'Your settings will apply to all future conversations with your AI assistant.'}
          </p>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div
        style={{
          position: 'fixed',
          bottom: '84px', // Above the menu bar (64px + 20px spacing)
          left: 0,
          right: 0,
          padding: '0 16px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
          pointerEvents: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
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
          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            disabled={!hasChanges}
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '17px',
              fontWeight: 'var(--font-weight-semibold)',
              letterSpacing: '-0.01em',
              color: hasChanges
                ? (isDark ? 'var(--label-primary)' : '#000000')
                : 'var(--label-tertiary)',
              background: isDark
                ? 'rgba(28, 28, 30, 0.85)'
                : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `0.5px solid ${
                isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.29)'
              }`,
              borderRadius: '12px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              transition: 'transform 0.1s ease, opacity 0.2s ease',
              opacity: hasChanges ? 1 : 0.5,
            }}
            onMouseDown={(e) => {
              if (hasChanges) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Cancel
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '17px',
              fontWeight: 'var(--font-weight-semibold)',
              letterSpacing: '-0.01em',
              color: '#FFFFFF',
              background: hasChanges
                ? 'var(--accent-blue)'
                : isDark
                  ? 'rgba(94, 159, 255, 0.3)'
                  : 'rgba(94, 159, 255, 0.5)',
              border: 'none',
              borderRadius: '12px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              transition: 'transform 0.1s ease, background 0.2s ease',
              boxShadow: hasChanges
                ? '0 4px 12px rgba(94, 159, 255, 0.3)'
                : 'none',
            }}
            onMouseDown={(e) => {
              if (hasChanges) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
