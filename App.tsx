import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantTask, ActiveModalInfo, ParkingSpot, UserProfile, MoodEntry, ServiceRequest } from './types';
import Modal from './components/Modal';
import SettingsModal from './components/SettingsModal';
import { IdleState } from './components/voice-ui/IdleState';
import { ListeningState } from './components/voice-ui/ListeningState';
import { ProcessingState } from './components/voice-ui/ProcessingState';
import { RespondingState } from './components/voice-ui/RespondingState';
import { UrgentResponseState } from './components/voice-ui/UrgentResponseState';
import { ResolutionState } from './components/voice-ui/ResolutionState';
import { PDFGeneratingState } from './components/voice-ui/PDFGeneratingState';
import { PDFReadyState } from './components/voice-ui/PDFReadyState';
import { BottomMenuBar } from './components/BottomMenuBar';
import { SettingsPage } from './components/SettingsPage';
import { InputModeToggle } from './components/InputModeToggle';
import { ChatInterface, ChatMessage } from './components/ChatInterface';
import { getSpeechRecognition, playAudioContent, stopAudioPlayback, initializeAudio, SpeechRecognition, SpeechRecognitionEvent } from './services/speechService';
import { determineTaskFromInput, startVehicleInspectionChat, continueVehicleInspectionChat, createNewChatWithTask, extractNameWithAI, generateSpeech, extractServiceDataFromConversation, ChatSession } from './services/aiService';
import { API_KEY_ERROR_MESSAGE, WELLNESS_CHECKIN_KEYWORDS, WELLNESS_CHECKIN_QUESTIONS, OPENAI_VOICES, SERVICE_REQUEST_KEYWORDS } from './constants';
import { loadUserProfile, saveUserProfile, addMoodEntry } from './services/userProfileService';
import { createServiceRequest, validateServiceRequest, addServiceRequest } from './services/serviceRequestService';
import { generateServiceRequestPDF, downloadPDF } from './services/pdfService';

type AssistantState = 'idle' | 'listening' | 'processing' | 'responding' | 'urgent' | 'resolution' | 'pdf-generating' | 'pdf-ready';
type NavigationTab = 'home' | 'contacts' | 'settings';
type InputMode = 'voice' | 'chat';

const App: React.FC = () => {
  // Voice-First UI State
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [transcription, setTranscription] = useState('');
  const [isResponseComplete, setIsResponseComplete] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [inputMode, setInputMode] = useState<InputMode>('voice');

  // Core Assistant State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalInfo | null>(null);

  // Chat Sessions
  const [generalChatSession, setGeneralChatSession] = useState<ChatSession | null>(null);
  const [vehicleInspectionSession, setVehicleInspectionSession] = useState<ChatSession | null>(null);

  // Assistant Lifecycle
  const [assistantStarted, setAssistantStarted] = useState(false);
  const [isAskingName, setIsAskingName] = useState(false);

  // User Profile & Settings
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [availableVoices] = useState<{name: string, id: string}[]>(OPENAI_VOICES);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Wellness Check-in
  const [isWellnessCheckinActive, setIsWellnessCheckinActive] = useState(false);
  const [wellnessCheckinStep, setWellnessCheckinStep] = useState(0);
  const [pendingMoodEntry, setPendingMoodEntry] = useState<Partial<MoodEntry> | null>(null);

  // Service Request State
  const [isServiceRequestActive, setIsServiceRequestActive] = useState(false);
  const [activeServiceRequest, setActiveServiceRequest] = useState<ServiceRequest | null>(null);
  const [serviceRequestSession, setServiceRequestSession] = useState<ChatSession | null>(null);
  const [completedServiceRequest, setCompletedServiceRequest] = useState<ServiceRequest | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [isAwaitingWorkOrderPrompt, setIsAwaitingWorkOrderPrompt] = useState(false);

  // Chat History (shared between voice and chat modes)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Offline Detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const transcriptAccumulatorRef = useRef<string>('');
  const currentAIResponseRef = useRef<string>('');
  const isListeningRef = useRef(false);
  const inputModeRef = useRef<InputMode>('voice');
  const assistantStartedRef = useRef(false);
  const toggleListenRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Dark Mode Detection - Disabled (always use light mode)
  // useEffect(() => {
  //   const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  //   setIsDark(darkModeQuery.matches);

  //   const handleChange = (e: MediaQueryListEvent) => {
  //     setIsDark(e.matches);
  //   };

  //   darkModeQuery.addEventListener('change', handleChange);
  //   return () => darkModeQuery.removeEventListener('change', handleChange);
  // }, []);

  // Keep refs in sync for use inside async callbacks (avoids stale closures)
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
  useEffect(() => { assistantStartedRef.current = assistantStarted; }, [assistantStarted]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Map existing states to voice UI states
  useEffect(() => {
    if (!assistantStarted) {
      setAssistantState('idle');
      return;
    }

    // Priority order matters!
    if (completedServiceRequest) {
      // PDF is ready for download
      setAssistantState('pdf-ready');
    } else if (isServiceRequestActive && activeServiceRequest?.urgency === 'ERS' && isSpeaking) {
      // Emergency response state
      setAssistantState('urgent');
    } else if (isSpeaking) {
      setAssistantState('responding');
    } else if (isLoadingAI) {
      setAssistantState('processing');
    } else if (isListening) {
      setAssistantState('listening');
    } else {
      setAssistantState('idle');
    }
  }, [assistantStarted, isListening, isLoadingAI, isSpeaking, isServiceRequestActive, activeServiceRequest, completedServiceRequest]);

  // Handle speaking logic using OpenAI TTS
  const speakAiResponse = useCallback(async (text: string) => {
    console.log('🔊 speakAiResponse called with text:', text);
    console.log('🔊 Voice output enabled:', userProfile.voiceOutput.enabled);

    if (!userProfile.voiceOutput.enabled || !text) {
      console.log('🔊 Early return - voice disabled or no text');
      return;
    }

    // Store current response for transcription
    currentAIResponseRef.current = text;
    setTranscription(text);
    setIsResponseComplete(false);
    setIsSpeaking(true);

    try {
      const voiceName = userProfile.voiceOutput.voiceURI || 'onyx';
      console.log('🔊 Generating speech with voice:', voiceName);
      console.log('🔊 Text to speak:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

      const base64Audio = await generateSpeech(text, voiceName);

      if (base64Audio) {
        console.log('🔊 Audio generated, playing at volume:', userProfile.voiceOutput.volume);
        await playAudioContent(base64Audio, userProfile.voiceOutput.volume);
        console.log('🔊 Audio playback completed');
      } else {
        console.warn("🔊 OpenAI TTS failed to generate audio - returned null");
      }
    } catch (e) {
      console.error("🔊 Error speaking AI response:", e);
      console.error("🔊 Error stack:", e instanceof Error ? e.stack : 'No stack trace');
      console.error("🔊 Error name:", e instanceof Error ? e.name : 'Unknown');
      console.error("🔊 Error message:", e instanceof Error ? e.message : String(e));
    } finally {
      setIsSpeaking(false);
      setIsResponseComplete(true);
      console.log('🔊 speakAiResponse finished');

      // Auto-start listening after AI finishes speaking (voice mode only)
      if (assistantStartedRef.current && !isListeningRef.current && inputModeRef.current === 'voice') {
        console.log('🎤 Auto-starting listening after AI response');
        setTimeout(() => {
          toggleListenRef.current();
        }, 500); // Small delay to ensure audio playback is fully complete
      }
    }
  }, [userProfile.voiceOutput]); // All other checks use refs to avoid stale closures

  // Get time-appropriate greeting
  const getTimeBasedGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 22) return "Good evening";
    return "Hey there";
  }, []);

  // Add message to chat history
  const addMessage = useCallback((sender: 'user' | 'ai' | 'system', text: string, data?: any) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      sender,
      text,
      timestamp: new Date(),
      ...(data && { data }),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const handleStartAssistant = async () => {
    try {
      await initializeAudio();
    } catch (e) {
      console.warn("Audio init failed", e);
    }

    setAssistantStarted(true);
    assistantStartedRef.current = true; // Set ref immediately so speakAiResponse auto-listen works
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      setApiKeyError(API_KEY_ERROR_MESSAGE);
      return;
    }

    // Time-based greeting
    const timeGreeting = getTimeBasedGreeting();
    const greeting = userProfile.userName
      ? `${timeGreeting}, ${userProfile.userName}! This is Mr. Roboto. What can I help you with?`
      : `${timeGreeting}! This is Mr. Roboto. How can I help you today?`;

    addMessage('ai', greeting);
    speakAiResponse(greeting);
  };

  const handleAiResponseDisplay = useCallback((text: string) => {
    addMessage('ai', text);
    speakAiResponse(text);
  }, [speakAiResponse, addMessage]);

  const startWellnessCheckin = useCallback(() => {
    setIsWellnessCheckinActive(true);
    setWellnessCheckinStep(0);
    setPendingMoodEntry({ timestamp: new Date() });
    const firstQuestion = WELLNESS_CHECKIN_QUESTIONS[0];
    const questionText = `${firstQuestion.questionText} ${firstQuestion.scale || ''}`;
    addMessage('ai', questionText);
    speakAiResponse(questionText);
  }, [speakAiResponse, addMessage]);

  const handleWellnessCheckinResponse = useCallback((responseText: string) => {
    if (!pendingMoodEntry || wellnessCheckinStep >= WELLNESS_CHECKIN_QUESTIONS.length) return;

    const currentQuestion = WELLNESS_CHECKIN_QUESTIONS[wellnessCheckinStep];
    let parsedValue: string | number | undefined = responseText;

    if (currentQuestion.key === 'mood_rating' || currentQuestion.key === 'stress_level') {
      const match = responseText.match(/\b([1-5])\b/);
      parsedValue = match ? parseInt(match[1], 10) : undefined;
    }

    setPendingMoodEntry(prev => ({ ...prev, [currentQuestion.key]: parsedValue }));

    const nextStep = wellnessCheckinStep + 1;
    if (nextStep < WELLNESS_CHECKIN_QUESTIONS.length) {
      setWellnessCheckinStep(nextStep);
      const nextQuestion = WELLNESS_CHECKIN_QUESTIONS[nextStep];
      const questionPrompt = `${nextQuestion.questionText} ${nextQuestion.scale || ''}`;
      addMessage('ai', questionPrompt);
      speakAiResponse(questionPrompt);
    } else {
      const finalEntry = { ...pendingMoodEntry, timestamp: pendingMoodEntry.timestamp || new Date() } as MoodEntry;
      const updatedProfile = addMoodEntry(userProfile, finalEntry);
      setUserProfile(updatedProfile);
      saveUserProfile(updatedProfile);

      const ackMsg = "Thanks for sharing. I've logged that for you. Stay safe out there.";
      addMessage('ai', ackMsg);
      speakAiResponse(ackMsg);
      setIsWellnessCheckinActive(false);
      setWellnessCheckinStep(0);
      setPendingMoodEntry(null);
    }
  }, [pendingMoodEntry, wellnessCheckinStep, userProfile, speakAiResponse, addMessage]);

  // Deep-merge extracted data into current request (nested objects like tire_info, location, etc.)
  const mergeServiceRequestData = (current: ServiceRequest, extracted: Partial<ServiceRequest>): ServiceRequest => {
    return {
      ...current,
      ...extracted,
      location: { ...current.location, ...extracted.location },
      vehicle: { ...current.vehicle, ...extracted.vehicle },
      ...(extracted.tire_info || current.tire_info
        ? { tire_info: { ...current.tire_info, ...extracted.tire_info } as ServiceRequest['tire_info'] }
        : {}),
      ...(extracted.mechanical_info || current.mechanical_info
        ? { mechanical_info: { ...current.mechanical_info, ...extracted.mechanical_info } as ServiceRequest['mechanical_info'] }
        : {}),
      ...(extracted.scheduled_appointment || current.scheduled_appointment
        ? { scheduled_appointment: { ...current.scheduled_appointment, ...extracted.scheduled_appointment } as ServiceRequest['scheduled_appointment'] }
        : {}),
    };
  };

  // Service Request Helpers
  const buildConfirmationSummary = (request: ServiceRequest): string => {
    const vehicleType = request.vehicle.vehicle_type?.toLowerCase() || 'vehicle';
    const urgencyText = request.urgency === 'ERS' ? 'emergency same-day' : request.urgency === 'DELAYED' ? 'next-day' : 'scheduled';

    let summary = `Alright, let me read this back to you. ` +
      `Driver name, ${request.driver_name}. ` +
      `Phone, ${request.contact_phone}. ` +
      `Fleet, ${request.fleet_name}. ` +
      `Location, ${request.location.current_location}. ` +
      `Vehicle type, ${vehicleType}. `;

    if (request.service_type === 'TIRE' && request.tire_info) {
      summary += `Service type, tire ${request.tire_info.requested_service?.toLowerCase() || 'service'}. ` +
        `Tire, ${request.tire_info.requested_tire}. ` +
        `Quantity, ${request.tire_info.number_of_tires}. ` +
        `Position, ${request.tire_info.tire_position}. `;
    } else if (request.service_type === 'MECHANICAL' && request.mechanical_info) {
      summary += `Service type, mechanical. ` +
        `Requested service, ${request.mechanical_info.requested_service}. ` +
        `Issue, ${request.mechanical_info.description}. `;
    }

    summary += `Priority, ${urgencyText}. `;

    if (request.urgency === 'SCHEDULED' && request.scheduled_appointment) {
      summary += `Scheduled for ${request.scheduled_appointment.scheduled_date} at ${request.scheduled_appointment.scheduled_time}. `;
    }

    summary += `Does everything look right, or do you need to change anything?`;
    return summary;
  };

  const CONFIRMATION_KEYWORDS = ['yes', 'yeah', 'yep', 'yup', 'correct', 'right', 'good', 'looks good', 'confirm', "that's right", 'perfect', 'go ahead', 'send it', 'submit', 'ok', 'okay', 'sure'];

  const finalizeServiceRequest = useCallback((request: ServiceRequest) => {
    console.log('🚨 FINALIZING SERVICE REQUEST');
    request.status = 'submitted';
    const updatedProfile = addServiceRequest(userProfile, request);
    setUserProfile(updatedProfile);
    saveUserProfile(updatedProfile);
    setCompletedServiceRequest(request);

    const completionMsg = `Got it, your work order is ready to download.`;
    addMessage('ai', completionMsg, request);
    speakAiResponse(completionMsg);

    setIsServiceRequestActive(false);
    setActiveServiceRequest(null);
    setIsAwaitingConfirmation(false);
  }, [userProfile, speakAiResponse, addMessage]);

  // Service Request Functions
  const startServiceRequest = useCallback(async (initialMessage: string) => {
    console.log('🚨 SERVICE REQUEST STARTED with initial message:', initialMessage);
    const newRequest = createServiceRequest();
    newRequest.driver_name = userProfile.userName || 'Driver';
    setIsServiceRequestActive(true);
    setIsAwaitingConfirmation(false);

    const session = createNewChatWithTask(
      AssistantTask.SERVICE_REQUEST,
      userProfile.voiceInput.language,
      userProfile.userName
    );
    setServiceRequestSession(session);

    // Immediately send the user's initial message to the AI so they don't have to repeat
    setIsLoadingAI(true);
    try {
      const response = await session.sendMessage({ message: initialMessage });
      const aiText = response.text;

      // Extract data from the first exchange
      const newExchange = `user: ${initialMessage}\nai: ${aiText}`;
      const extractedData = await extractServiceDataFromConversation(newExchange, newRequest);

      const updatedRequest = mergeServiceRequestData(newRequest, {
        ...extractedData,
        conversation_transcript: newExchange,
      });
      setActiveServiceRequest(updatedRequest);

      // Always show the AI's response in chat
      addMessage('ai', aiText);

      // Check completeness - if complete, also present confirmation
      const validation = validateServiceRequest(updatedRequest);
      if (validation.isComplete) {
        const summary = buildConfirmationSummary(updatedRequest);
        addMessage('ai', summary);
        speakAiResponse(summary);
        setIsAwaitingConfirmation(true);
      } else {
        speakAiResponse(aiText);
      }
    } catch (error) {
      console.error("Service request start error:", error);
      const errorMsg = "Error starting service request. Please try again.";
      addMessage('ai', errorMsg);
      speakAiResponse(errorMsg);
      setIsServiceRequestActive(false);
    } finally {
      setIsLoadingAI(false);
    }
  }, [userProfile, speakAiResponse, addMessage]);

  const handleServiceRequestResponse = useCallback(async (text: string) => {
    if (!serviceRequestSession || !activeServiceRequest) return;

    console.log('🚨 SERVICE REQUEST - User input:', text);

    // Handle work order prompt response
    if (isAwaitingWorkOrderPrompt) {
      const lowerText = text.toLowerCase();
      const wantsWorkOrder = CONFIRMATION_KEYWORDS.some(kw => lowerText.includes(kw));
      const declinesWorkOrder = ['no', 'nah', 'nope', 'not now', 'skip', 'no thanks'].some(kw => lowerText.includes(kw));

      if (wantsWorkOrder && !declinesWorkOrder) {
        finalizeServiceRequest(activeServiceRequest);
        setIsAwaitingWorkOrderPrompt(false);
        return;
      } else if (declinesWorkOrder) {
        const ackMsg = "No problem. Your service request has been noted. If you need a work order later, just let me know.";
        addMessage('ai', ackMsg);
        speakAiResponse(ackMsg);
        setIsServiceRequestActive(false);
        setActiveServiceRequest(null);
        setIsAwaitingWorkOrderPrompt(false);
        return;
      }
      // If unclear, fall through to normal AI processing
      setIsAwaitingWorkOrderPrompt(false);
    }

    // Handle confirmation response
    if (isAwaitingConfirmation) {
      const lowerText = text.toLowerCase();
      const isConfirmed = CONFIRMATION_KEYWORDS.some(kw => lowerText.includes(kw));
      const wantsEdit = ['no', 'change', 'edit', 'wrong', 'fix', 'update', 'actually', 'wait', 'incorrect'].some(kw => lowerText.includes(kw));

      if (isConfirmed && !wantsEdit) {
        // User confirmed details - ask if they want a work order
        setIsAwaitingConfirmation(false);
        setIsAwaitingWorkOrderPrompt(true);
        const workOrderPrompt = "Everything checks out. Would you like me to generate a work order for this?";
        addMessage('ai', workOrderPrompt);
        speakAiResponse(workOrderPrompt);
        return;
      }

      // User wants to edit - send their correction to the AI and continue
      console.log('🚨 User wants to edit service request');
      setIsAwaitingConfirmation(false);
    }

    setIsLoadingAI(true);
    try {
      const response = await serviceRequestSession.sendMessage({ message: text });
      const aiText = response.text;

      // Build conversation history - APPEND to existing transcript
      const newExchange = `user: ${text}\nai: ${aiText}`;
      const fullTranscript = activeServiceRequest.conversation_transcript
        ? `${activeServiceRequest.conversation_transcript}\n\n${newExchange}`
        : newExchange;

      // Extract structured data
      console.log('🚨 Extracting data from conversation...');
      const extractedData = await extractServiceDataFromConversation(
        fullTranscript,
        activeServiceRequest
      );
      console.log('🚨 Extracted data:', extractedData);

      // Deep-merge extracted data (preserves nested fields from prior exchanges)
      const updatedRequest = mergeServiceRequestData(activeServiceRequest, {
        ...extractedData,
        conversation_transcript: fullTranscript,
      });
      console.log('🚨 Merged request:', updatedRequest);
      setActiveServiceRequest(updatedRequest);

      // Validate completeness
      const validation = validateServiceRequest(updatedRequest);
      console.log('🚨 Validation result:', validation);

      // Always show the AI's response in chat
      addMessage('ai', aiText);

      if (validation.isComplete) {
        // Also present confirmation summary
        const summary = buildConfirmationSummary(updatedRequest);
        addMessage('ai', summary);
        speakAiResponse(summary);
        setIsAwaitingConfirmation(true);
      } else {
        console.log('🚨 SERVICE REQUEST INCOMPLETE - Missing:', validation.missingFields);
        speakAiResponse(aiText);
      }
    } catch (error) {
      console.error("Service request error:", error);
      const errorMsg = "Error processing request. Please try again.";
      addMessage('ai', errorMsg);
      speakAiResponse(errorMsg);
    } finally {
      setIsLoadingAI(false);
    }
  }, [serviceRequestSession, activeServiceRequest, isAwaitingConfirmation, isAwaitingWorkOrderPrompt, userProfile, speakAiResponse, addMessage, finalizeServiceRequest]);

  const processUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message to chat history
    addMessage('user', text);

    // Update transcription
    setTranscription(text);

    if (apiKeyError) return;

    // Handle name collection
    if (isAskingName) {
      setIsLoadingAI(true);
      try {
        const name = await extractNameWithAI(text);
        const updatedProfile = { ...userProfile, userName: name };
        setUserProfile(updatedProfile);
        saveUserProfile(updatedProfile);
        setIsAskingName(false);

        const welcomeMsg = `Copy that, ${name}. Nice to have you on board. I'm ready when you are.`;
        handleAiResponseDisplay(welcomeMsg);
      } catch (error) {
        console.error("Error setting name:", error);
        const fallbackMsg = "Didn't quite catch that name, but let's get started.";
        handleAiResponseDisplay(fallbackMsg);
        setIsAskingName(false);
      } finally {
        setIsLoadingAI(false);
      }
      return;
    }

    // Route to active service request handler
    if (isServiceRequestActive) {
      handleServiceRequestResponse(text);
      return;
    }

    if (isWellnessCheckinActive) {
      handleWellnessCheckinResponse(text);
      return;
    }

    setIsLoadingAI(true);
    const lowerText = text.toLowerCase();

    // Check for service request keywords
    if (SERVICE_REQUEST_KEYWORDS.some(kw => lowerText.includes(kw))) {
      setIsLoadingAI(false); // startServiceRequest manages its own loading state
      startServiceRequest(text);
      return;
    }

    // Check for wellness check-in
    if (WELLNESS_CHECKIN_KEYWORDS.some(kw => lowerText.includes(kw))) {
      startWellnessCheckin();
      setIsLoadingAI(false);
      return;
    }

    // General chat flow
    try {
      console.log('💬 Starting general chat flow with text:', text);
      const { task: detectedTask } = determineTaskFromInput(text);
      console.log('💬 Detected task:', detectedTask);

      let currentSession = generalChatSession;
      if (!currentSession) {
        console.log('💬 Creating new chat session');
        currentSession = createNewChatWithTask(
          detectedTask,
          userProfile.voiceInput.language,
          userProfile.userName
        );
        setGeneralChatSession(currentSession);
      }

      console.log('💬 Sending message to AI...');
      const response = await currentSession.sendMessage({ message: text });
      const aiText = response.text;
      console.log('💬 AI response received:', aiText);

      handleAiResponseDisplay(aiText);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("💬 Error processing user input:", e);
      handleAiResponseDisplay(`Having some engine trouble here: ${errorMessage || 'Check your connection.'}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [
    apiKeyError, generalChatSession, handleAiResponseDisplay,
    isWellnessCheckinActive, handleWellnessCheckinResponse, startWellnessCheckin,
    isServiceRequestActive, handleServiceRequestResponse, startServiceRequest,
    userProfile, isAskingName
  ]);

  const toggleListen = useCallback(async () => {
    await initializeAudio();

    if (isListeningRef.current) {
      // Stop listening
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
    } else {
      // Start listening
      if (isSpeaking && userProfile.voiceOutput.enabled) {
        stopAudioPlayback();
        setIsSpeaking(false);
      }

      const recognition = getSpeechRecognition();
      if (recognition) {
        speechRecognitionRef.current = recognition;
        recognition.lang = userProfile.voiceInput.language;
        recognition.continuous = true;
        recognition.interimResults = true;

        transcriptAccumulatorRef.current = '';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            transcriptAccumulatorRef.current += finalTranscript;
          }

          // Update transcription display
          const currentTranscript = transcriptAccumulatorRef.current + interimTranscript;
          setTranscription(currentTranscript);

          // Reset silence timer on new speech
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          silenceTimerRef.current = setTimeout(() => {
            if (speechRecognitionRef.current && transcriptAccumulatorRef.current.trim()) {
              speechRecognitionRef.current.stop();
              const finalText = transcriptAccumulatorRef.current.trim();
              processUserInput(finalText);
              transcriptAccumulatorRef.current = '';
              setIsListening(false);
            }
          }, 1500);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        };

        setIsListening(true);
        recognition.start();
      }
    }
  }, [isSpeaking, userProfile, processUserInput]);

  // Keep toggleListen ref in sync so speakAiResponse always calls the latest version
  useEffect(() => { toggleListenRef.current = toggleListen; }, [toggleListen]);

  // Handle sending messages from chat interface
  const handleChatSend = useCallback((message: string) => {
    if (!message.trim()) return;
    // Process the message through the same voice input pipeline
    processUserInput(message);
  }, [processUserInput]);

  const handlePDFDownload = async () => {
    if (!completedServiceRequest) return;

    try {
      const blob = await generateServiceRequestPDF(completedServiceRequest);
      const filename = `work-order-${completedServiceRequest.urgency}-${completedServiceRequest.id.slice(0, 8)}.pdf`;
      downloadPDF(blob, filename);

      // Transition to resolution state
      setTimeout(() => {
        setCompletedServiceRequest(null);
        setTranscription('');
      }, 1000);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  const handleSaveSettings = (newProfile: UserProfile) => {
    const languageChanged = newProfile.voiceInput.language !== userProfile.voiceInput.language;

    setUserProfile(newProfile);
    saveUserProfile(newProfile);
    setIsSettingsModalOpen(false);

    if (languageChanged) {
      setGeneralChatSession(null);
      setVehicleInspectionSession(null);
    }

    if (!newProfile.voiceOutput.enabled && isSpeaking) {
      stopAudioPlayback();
      setIsSpeaking(false);
    }
  };

  // Settings Page
  if (currentTab === 'settings') {
    return (
      <>
        <SettingsPage
          isDark={isDark}
          currentVoice={userProfile.voiceOutput.voiceURI || 'onyx'}
          currentLanguage={userProfile.voiceInput.language}
          onSave={(settings) => {
            console.log('Settings saved:', settings);
            // Update user profile with new voice and language settings
            const updatedProfile = {
              ...userProfile,
              voiceOutput: {
                ...userProfile.voiceOutput,
                voiceURI: settings.voicePersona,
              },
              voiceInput: {
                ...userProfile.voiceInput,
                language: settings.language,
              },
            };
            setUserProfile(updatedProfile);
            saveUserProfile(updatedProfile);
            setCurrentTab('home');
          }}
          onCancel={() => {
            console.log('Settings cancelled');
            setCurrentTab('home');
          }}
        />
        <BottomMenuBar
          isDark={isDark}
          onNavigate={(tab) => setCurrentTab(tab)}
        />
      </>
    );
  }

  // Start screen
  if (!assistantStarted) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center h-screen"
          style={{
            background: isDark ? '#000000' : '#F2F2F7'
          }}
          onClick={handleStartAssistant}
        >
          <div className="text-center">
            <div
              style={{
                fontSize: '72px',
                marginBottom: '24px',
                color: 'var(--accent-blue)'
              }}
            >
              🚛
            </div>
            <h1
              style={{
                fontSize: '34px',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--label-primary)',
                marginBottom: '12px'
              }}
            >
              Mr. Roboto
            </h1>
            <p
              style={{
                fontSize: '20px',
                color: 'var(--label-secondary)',
                marginBottom: '40px'
              }}
            >
              Your Voice Assistant
            </p>
            <div
              style={{
                fontSize: '15px',
                color: 'var(--label-tertiary)',
                cursor: 'pointer'
              }}
            >
              Tap anywhere to start
            </div>
          </div>
        </div>

        {/* Bottom Menu Bar - Persistent across all pages */}
        <BottomMenuBar
          isDark={isDark}
          onNavigate={(tab) => {
            setCurrentTab(tab);
          }}
        />
      </>
    );
  }

  // Main voice UI
  return (
    <div
      onClick={() => {
        if (!isLoadingAI && !apiKeyError && !isSpeaking) {
          toggleListen();
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        cursor: isLoadingAI || !!apiKeyError ? 'not-allowed' : 'pointer'
      }}
    >
      {/* Offline Indicator */}
      {!isOnline && (
        <div
          style={{
            position: 'fixed',
            top: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            borderRadius: '999px',
            background: isDark ? 'rgba(255, 69, 58, 0.9)' : 'rgba(255, 59, 48, 0.9)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 'var(--font-weight-medium)',
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Offline
        </div>
      )}

      {/* Input Mode Toggle - Voice/Chat switcher */}
      {currentTab === 'home' && (
        <InputModeToggle
          isDark={isDark}
          mode={inputMode}
          onModeChange={setInputMode}
        />
      )}

      {/* Voice UI States */}
      {currentTab === 'home' && inputMode === 'voice' && (
        <>
          {assistantState === 'idle' && <IdleState isDark={isDark} />}
          {assistantState === 'listening' && <ListeningState isDark={isDark} transcription={transcription} />}
          {assistantState === 'processing' && <ProcessingState isDark={isDark} transcription={transcription} />}
          {assistantState === 'responding' && <RespondingState isDark={isDark} transcription={transcription} isComplete={isResponseComplete} />}
          {assistantState === 'urgent' && <UrgentResponseState isDark={isDark} transcription={transcription} />}
          {assistantState === 'resolution' && <ResolutionState isDark={isDark} />}
          {assistantState === 'pdf-generating' && <PDFGeneratingState isDark={isDark} documentName="Work Order" />}
          {assistantState === 'pdf-ready' && completedServiceRequest && (
            <PDFReadyState
              isDark={isDark}
              serviceRequest={completedServiceRequest}
              onDownload={handlePDFDownload}
            />
          )}
        </>
      )}

      {/* Chat Interface */}
      {currentTab === 'home' && inputMode === 'chat' && (
        <ChatInterface
          isDark={isDark}
          messages={messages}
          onSendMessage={handleChatSend}
          onSwitchToVoice={() => setInputMode('voice')}
          isAIResponding={isLoadingAI}
        />
      )}

      {/* Modals */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentProfile={userProfile}
          onSave={handleSaveSettings}
          availableVoices={availableVoices}
        />
      )}

      {activeModal?.type === 'parkingConfirmation' && (
        <Modal isOpen={true} onClose={() => setActiveModal(null)} title="Confirm Booking">
          <p className="mb-4">Book parking at {(activeModal.data as ParkingSpot).name}?</p>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-gray-600 rounded">
              Cancel
            </button>
            <button onClick={() => {
              const spotName = (activeModal.data as ParkingSpot).name;
              speakAiResponse(`10-4. Simulated booking for ${spotName}. Call ahead to confirm.`);
              setActiveModal(null);
            }} className="px-4 py-2 bg-blue-600 rounded">
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* Bottom Menu Bar */}
      <BottomMenuBar
        isDark={isDark}
        onNavigate={(tab) => {
          if (tab === 'home') {
            // Reset to startup page
            setAssistantStarted(false);
            setIsListening(false);
            setIsSpeaking(false);
            setIsLoadingAI(false);
            setTranscription('');
            stopAudioPlayback();
          }
          setCurrentTab(tab);
        }}
      />
    </div>
  );
};

export default App;
