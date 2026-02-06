
// Web Speech API interfaces (kept for type compatibility/fallback for Input)
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

export interface SpeechRecognition extends EventTarget {
  grammars: any;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI: string;

  start(): void;
  stop(): void;
  abort(): void;

  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onnomatch: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

export const getSpeechRecognition = (): SpeechRecognition | null => {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionImpl) {
    console.warn("Speech Recognition API not supported in this browser.");
    return null;
  }
  return new SpeechRecognitionImpl();
};

// --- AUDIO PLAYBACK LOGIC FOR GEMINI RAW PCM ---

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    // Gemini Flash Native Audio defaults to 24kHz for TTS output.
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
}

/**
 * Must be called during a user interaction (click/tap) to ensure the AudioContext
 * is allowed to play sound (Autoplay Policy).
 */
export const initializeAudio = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn("Failed to resume audio context:", e);
    }
  }
};

function decode(base64: string): Uint8Array {
  try {
    // Clean the base64 string to remove newlines or whitespace
    const cleanBase64 = base64.replace(/[\r\n\s]/g, '');
    
    if (!cleanBase64) return new Uint8Array(0);
    
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("Failed to decode base64 audio:", error);
    return new Uint8Array(0);
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // CRITICAL FIX: Ensure alignment for Int16Array
  // 1. Ensure even byte length (drop last byte if odd)
  const safeLength = data.length - (data.length % 2);
  
  if (safeLength === 0) {
    return ctx.createBuffer(numChannels, 1, sampleRate); // Return empty silent buffer
  }

  // 2. Create a NEW ArrayBuffer to guarantee 16-bit memory alignment.
  // Using data.buffer directly or data.subarray() can crash if the underlying 
  // memory offset is not a multiple of 2, which happens frequently with generic Uint8Arrays.
  const buffer = new ArrayBuffer(safeLength);
  const view = new Uint8Array(buffer);
  view.set(data.subarray(0, safeLength));

  // 3. Create the Int16 view on the aligned buffer
  const dataInt16 = new Int16Array(buffer);

  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize 16-bit signed integer to [-1.0, 1.0] float
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
}

export const stopAudioPlayback = () => {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore errors if already stopped or invalid state
    }
    currentSource = null;
  }
};

export const playAudioContent = async (base64Audio: string, volume: number = 1.0, onEnd?: () => void): Promise<void> => {
  stopAudioPlayback(); // Stop any currently playing audio

  // Decode Base64 string to byte array
  const bytes = decode(base64Audio);
  if (bytes.length === 0) {
    console.warn("Empty audio data received");
    if (onEnd) onEnd();
    return;
  }

  const ctx = getAudioContext();

  // Ensure context is running
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn("Context resume failed in playAudioContent", e);
    }
  }

  try {
    const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
    
    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.onended = () => {
        currentSource = null;
        if (onEnd) onEnd();
        resolve();
      };

      currentSource = source;
      source.start();
    });
  } catch (error) {
    console.error("Error playing audio content:", error);
    if (onEnd) onEnd();
    return; // Resolve gracefully even on error
  }
};
