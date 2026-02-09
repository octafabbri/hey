import { useEffect, useState } from 'react';
import { IdleState } from './components/IdleState';
import { ListeningState } from './components/ListeningState';
import { ProcessingState } from './components/ProcessingState';
import { RespondingState } from './components/RespondingState';
import { UrgentResponseState } from './components/UrgentResponseState';
import { ResolutionState } from './components/ResolutionState';
import { PDFGeneratingState } from './components/PDFGeneratingState';
import { PDFReadyState } from './components/PDFReadyState';

type AssistantState = 'idle' | 'listening' | 'processing' | 'responding' | 'urgent' | 'resolution' | 'pdf-generating' | 'pdf-ready';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [transcription, setTranscription] = useState('');
  const [isResponseComplete, setIsResponseComplete] = useState(false);

  // Detect system theme preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Simulate transcription updates based on state
  useEffect(() => {
    setIsResponseComplete(false);

    if (state === 'idle') {
      setTranscription('');
      return;
    }

    if (state === 'listening') {
      const phrases = [
        'What\'s the weather like today?',
        'Set a timer for 10 minutes',
        'Remind me to call mom tomorrow',
        'Play some relaxing music',
        'What\'s on my calendar today?',
        'Tell me a joke',
      ];

      let currentIndex = 0;
      const interval = setInterval(() => {
        setTranscription(phrases[currentIndex]);
        currentIndex = (currentIndex + 1) % phrases.length;
      }, 3500);

      setTranscription(phrases[0]);
      return () => clearInterval(interval);
    }

    if (state === 'responding') {
      // Chunked response - updates in readable chunks
      const responseChunks = [
        'Today will be mostly sunny with a high of 72 degrees.',
        'There\'s a 10% chance of rain in the evening.',
        'Perfect weather for outdoor activities.',
        'Don\'t forget your sunglasses!',
      ];

      let currentIndex = 0;
      setTranscription(responseChunks[0]);

      const interval = setInterval(() => {
        currentIndex++;
        if (currentIndex < responseChunks.length) {
          setTranscription(responseChunks[currentIndex]);
        } else {
          // Response complete - fade but keep visible
          setIsResponseComplete(true);
          clearInterval(interval);
        }
      }, 2800);

      return () => clearInterval(interval);
    }

    if (state === 'urgent') {
      // Concise directive phrasing for emergency roadside scenarios
      const urgentDirectives = [
        'Stay in your vehicle. Help is on the way.',
        'Turn on your hazard lights now.',
        'Roadside assistance is 12 minutes away.',
        'Keep your doors locked until help arrives.',
      ];

      let currentIndex = 0;
      setTranscription(urgentDirectives[0]);

      const interval = setInterval(() => {
        currentIndex++;
        if (currentIndex < urgentDirectives.length) {
          setTranscription(urgentDirectives[currentIndex]);
        } else {
          currentIndex = 0; // Loop directives
          setTranscription(urgentDirectives[currentIndex]);
        }
      }, 3500);

      return () => clearInterval(interval);
    }

    // Processing state keeps the last transcription frozen
  }, [state]);

  // Cycle through states on click: idle -> listening -> processing -> responding -> urgent -> resolution -> pdf-generating -> pdf-ready -> idle
  const handleToggle = () => {
    if (state === 'idle') {
      setState('listening');
    } else if (state === 'listening') {
      setState('processing');
    } else if (state === 'processing') {
      setState('responding');
    } else if (state === 'responding') {
      setState('urgent');
    } else if (state === 'urgent') {
      setState('resolution');
    } else if (state === 'resolution') {
      setState('pdf-generating');
    } else if (state === 'pdf-generating') {
      // Simulate PDF generation delay
      setTimeout(() => {
        setState('pdf-ready');
      }, 2000);
    } else if (state === 'pdf-ready') {
      setState('idle');
    }
  };

  const handleDownload = () => {
    // In a real implementation, this would trigger the native share sheet
    console.log('Download/Share PDF');
    // Could transition to resolution or idle state
  };

  return (
    <div onClick={handleToggle} style={{ cursor: 'pointer' }}>
      {state === 'listening' && (
        <ListeningState isDark={isDark} transcription={transcription} />
      )}
      {state === 'processing' && (
        <ProcessingState isDark={isDark} transcription={transcription} />
      )}
      {state === 'responding' && (
        <RespondingState 
          isDark={isDark} 
          transcription={transcription}
          isComplete={isResponseComplete}
        />
      )}
      {state === 'urgent' && (
        <UrgentResponseState 
          isDark={isDark} 
          transcription={transcription}
        />
      )}
      {state === 'resolution' && (
        <ResolutionState isDark={isDark} />
      )}
      {state === 'pdf-generating' && (
        <PDFGeneratingState 
          isDark={isDark}
          documentName="Roadside Assistance Report"
        />
      )}
      {state === 'pdf-ready' && (
        <PDFReadyState 
          isDark={isDark}
          documentName="Roadside Assistance Report"
          onDownload={handleDownload}
        />
      )}
      {state === 'idle' && (
        <IdleState isDark={isDark} />
      )}

      {/* Subtle state indicator */}
      <div 
        className="fixed top-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full"
        style={{
          background: isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          color: 'var(--label-secondary)',
          fontSize: '14px',
          fontWeight: 'var(--font-weight-medium)',
          letterSpacing: '-0.01em',
        }}
      >
        {state === 'listening' && 'Listening...'}
        {state === 'processing' && 'Processing...'}
        {state === 'responding' && (isResponseComplete ? 'Response complete' : 'Responding...')}
        {state === 'urgent' && 'Urgent Response'}
        {state === 'resolution' && 'Complete'}
        {state === 'pdf-generating' && 'Generating PDF...'}
        {state === 'pdf-ready' && 'PDF Ready'}
        {state === 'idle' && 'Tap to activate'}
      </div>
    </div>
  );
}