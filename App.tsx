
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, AssistantTask, ActiveModalInfo, ParkingSpot, VehicleInspectionStep, UserProfile, MoodEntry, GroundingSource } from './types';
import ChatMessage from './components/ChatMessage';
import IconButton from './components/IconButton';
import LoadingSpinner from './components/LoadingSpinner';
import Modal from './components/Modal';
import SettingsModal from './components/SettingsModal';
import { getSpeechRecognition, playAudioContent, stopAudioPlayback, initializeAudio, SpeechRecognition, SpeechRecognitionEvent } from './services/speechService';
import { determineTaskFromInput, startVehicleInspectionChat, continueVehicleInspectionChat, createNewChatWithTask, parseJsonFromString, extractNameWithAI, generateSpeech } from './services/geminiService';
import { EXAMPLE_COMMANDS, API_KEY_ERROR_MESSAGE, WELLNESS_CHECKIN_KEYWORDS, WELLNESS_CHECKIN_QUESTIONS, GEMINI_VOICES } from './constants';
import { loadUserProfile, saveUserProfile, addMoodEntry } from './services/userProfileService';
import { Chat, GenerateContentResponse } from '@google/genai';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalInfo | null>(null);
  
  const [generalChatSession, setGeneralChatSession] = useState<Chat | null>(null);
  // currentGeneralTask removed as we are unifying the chat session
  const [vehicleInspectionSession, setVehicleInspectionSession] = useState<Chat | null>(null);
  
  const [assistantStarted, setAssistantStarted] = useState(false);
  const [isAskingName, setIsAskingName] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [availableVoices] = useState<{name: string, id: string}[]>(GEMINI_VOICES);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [isWellnessCheckinActive, setIsWellnessCheckinActive] = useState(false);
  const [wellnessCheckinStep, setWellnessCheckinStep] = useState(0);
  const [pendingMoodEntry, setPendingMoodEntry] = useState<Partial<MoodEntry> | null>(null);

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Refs for custom silence detection
  const silenceTimerRef = useRef<any>(null);
  const transcriptAccumulatorRef = useRef<string>('');

  const addMessageToChat = useCallback((sender: Message['sender'], text: string, data?: any, groundingSources?: GroundingSource[]) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender, text, data, groundingSources, timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    if (assistantStarted) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantStarted]);

  // Handle speaking logic using Gemini TTS
  const speakAiResponse = useCallback(async (text: string) => {
    if (!userProfile.voiceOutput.enabled || !text) return;
    setIsSpeaking(true);
    try {
        const voiceName = userProfile.voiceOutput.voiceURI || 'Charon';
        const base64Audio = await generateSpeech(text, voiceName);
        
        if (base64Audio) {
             await playAudioContent(base64Audio, userProfile.voiceOutput.volume);
        } else {
             console.warn("Gemini TTS failed to generate audio.");
        }
    } catch (e) {
      console.error("Error speaking AI response:", e);
    } finally {
      setIsSpeaking(false);
    }
  }, [userProfile.voiceOutput]);


  const handleStartAssistant = async () => {
    // Explicitly initialize audio context on user click to comply with browser autoplay policies
    try {
      await initializeAudio();
    } catch (e) {
      console.warn("Audio init failed", e);
    }

    setAssistantStarted(true); 
    if (!process.env.API_KEY) {
      setApiKeyError(API_KEY_ERROR_MESSAGE);
      addMessageToChat('system', API_KEY_ERROR_MESSAGE);
      return; 
    }

    if (!userProfile.userName) {
        setIsAskingName(true);
        const nameRequest = "Hey there! I'm Bib, your AI co-pilot. Before we hit the road, what's your handle? What should I call you?";
        addMessageToChat('ai', nameRequest);
        speakAiResponse(nameRequest);
    } else {
        const initialGreeting = `Hey ${userProfile.userName}! Bib here, your co-pilot. Ready to roll? Ask me about the road, weather, or say 'wellness check-in' if you need a break.`;
        addMessageToChat('ai', initialGreeting);
        speakAiResponse(initialGreeting);
    }
  };
  
  const handleAiResponseDisplay = useCallback((text: string, data?: any, groundingSources?: GroundingSource[]) => {
    addMessageToChat('ai', text, data, groundingSources);
    speakAiResponse(text);
  }, [addMessageToChat, speakAiResponse]);

  const startWellnessCheckin = useCallback(() => {
    setIsWellnessCheckinActive(true);
    setWellnessCheckinStep(0);
    setPendingMoodEntry({ timestamp: new Date() });
    const firstQuestion = WELLNESS_CHECKIN_QUESTIONS[0];
    const questionText = `${firstQuestion.questionText} ${firstQuestion.scale || ''}`;
    addMessageToChat('ai', questionText);
    speakAiResponse(questionText);
  }, [addMessageToChat, speakAiResponse]);

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
      addMessageToChat('ai', questionPrompt);
      speakAiResponse(questionPrompt);
    } else {
      const finalEntry = { ...pendingMoodEntry, timestamp: pendingMoodEntry.timestamp || new Date() } as MoodEntry;
      const updatedProfile = addMoodEntry(userProfile, finalEntry);
      setUserProfile(updatedProfile);
      saveUserProfile(updatedProfile);
      
      const ackMsg = "Thanks for sharing, driver. I've logged that for you. Stay safe out there.";
      addMessageToChat('ai', ackMsg);
      speakAiResponse(ackMsg);
      setIsWellnessCheckinActive(false);
      setWellnessCheckinStep(0);
      setPendingMoodEntry(null);
    }
  }, [pendingMoodEntry, wellnessCheckinStep, userProfile, addMessageToChat, speakAiResponse]);


  const processUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessageToChat('user', text);
    setUserInput(''); 

    if (apiKeyError) {
      addMessageToChat('ai', "I cannot process requests due to an API key error.");
      return;
    }

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
            const fallbackMsg = "Didn't quite catch that name, but let's roll, Driver.";
            handleAiResponseDisplay(fallbackMsg);
            setIsAskingName(false);
        } finally {
            setIsLoadingAI(false);
        }
        return;
    }

    if (isWellnessCheckinActive) {
      handleWellnessCheckinResponse(text);
      return;
    }

    const lowerText = text.toLowerCase();
    if (WELLNESS_CHECKIN_KEYWORDS.some(kw => lowerText.includes(kw))) {
      startWellnessCheckin();
      return;
    }

    setIsLoadingAI(true);
    try {
      const isStoppingInspection = lowerText.includes("stop inspection") || lowerText.includes("end inspection");

      if (vehicleInspectionSession && isStoppingInspection) {
        setVehicleInspectionSession(null);
        handleAiResponseDisplay("Copy that. Inspection ended.");
        setIsLoadingAI(false);
        return;
      }
      
      const { task: newTaskType, requiresJson } = determineTaskFromInput(text);

      if (newTaskType === AssistantTask.VEHICLE_INSPECTION || vehicleInspectionSession) {
        let currentInspectionSession = vehicleInspectionSession;
        if (!currentInspectionSession) {
          currentInspectionSession = startVehicleInspectionChat(userProfile.voiceInput.language, userProfile.userName);
          setVehicleInspectionSession(currentInspectionSession);
          const { text: aiText, data: inspectionData } = await continueVehicleInspectionChat(currentInspectionSession, "START_INSPECTION");
          handleAiResponseDisplay(aiText, inspectionData);
        } else {
           const { text: aiText, data: inspectionData } = await continueVehicleInspectionChat(currentInspectionSession, text);
           handleAiResponseDisplay(aiText, inspectionData);
        }
      } else { 
        // Unified General Context Logic
        // We do NOT switch sessions based on task keywords anymore. 
        // We use one continuous 'generalChatSession' which is initialized with GENERAL_ASSISTANCE capabilities (including search).
        
        let chatToUse = generalChatSession;
        
        if (!chatToUse) {
          // Initialize the unified session
          chatToUse = createNewChatWithTask(AssistantTask.GENERAL_ASSISTANCE, userProfile.voiceInput.language, userProfile.userName);
          setGeneralChatSession(chatToUse);
        }
        
        const response: GenerateContentResponse = await chatToUse.sendMessage({ message: text });
        const aiResponseText = response.text; 
        let textToSpeakAndDisplay: string;
        let groundingSources: GroundingSource[] | undefined = undefined;
        let messageData: any = null; 

        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
             const rawGroundingChunks = response.candidates[0].groundingMetadata.groundingChunks;
             if (rawGroundingChunks && Array.isArray(rawGroundingChunks)) {
                 groundingSources = rawGroundingChunks
                     .map(chunk => chunk.web)
                     .filter(webChunk => webChunk && webChunk.uri && webChunk.title)
                     .map(webChunk => ({
                         uri: webChunk.uri as string, 
                         title: webChunk.title as string,
                     }));
             }
        }

        if (requiresJson) {
            if (aiResponseText) {
                const parsedData = parseJsonFromString<any>(aiResponseText);
                if (parsedData) {
                    textToSpeakAndDisplay = "I have some structured data for you."; 
                    messageData = parsedData;
                } else {
                    const trimmedResponse = aiResponseText.trim();
                    if (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')) {
                        textToSpeakAndDisplay = "I heard you, but I'm having trouble reading the details. Mind saying that again?";
                    } else if (trimmedResponse) {
                        textToSpeakAndDisplay = aiResponseText; 
                    } else {
                        textToSpeakAndDisplay = "Didn't copy that clearly. Say again?";
                    }
                }
            } else {
                 textToSpeakAndDisplay = "Didn't get a read on that. Try again?";
            }
            handleAiResponseDisplay(textToSpeakAndDisplay, messageData, groundingSources);
        } else { 
            textToSpeakAndDisplay = aiResponseText || "Static on the line. Didn't catch that. Once more?";
            handleAiResponseDisplay(textToSpeakAndDisplay, null, groundingSources);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error processing user input:", e);
      handleAiResponseDisplay(`Having some engine trouble here: ${errorMessage || 'Check your connection.'}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [
      addMessageToChat, apiKeyError, 
      generalChatSession, 
      vehicleInspectionSession,
      handleAiResponseDisplay, 
      isWellnessCheckinActive, handleWellnessCheckinResponse, startWellnessCheckin,
      userProfile, isAskingName
  ]);


  const toggleListen = useCallback(async () => {
    // Ensure audio context is ready if we plan to speak a response later
    await initializeAudio();

    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      speechRecognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (isSpeaking && userProfile.voiceOutput.enabled) stopAudioPlayback();
      
      const recognition = getSpeechRecognition();
      if (recognition) {
        speechRecognitionRef.current = recognition;
        // Use continuous=true to manually control stop time via silence detection
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = userProfile.voiceInput.language;
        
        transcriptAccumulatorRef.current = '';

        recognition.onstart = () => setIsListening(true);
        
        recognition.onend = () => {
          setIsListening(false);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          // When recognition ends, process what we gathered
          const finalTranscript = transcriptAccumulatorRef.current.trim();
          if (finalTranscript) {
              processUserInput(finalTranscript);
          }
        };

        recognition.onerror = (event: any) => { 
          const errorType = event.error || 'unknown';
          console.error(`Speech recognition error:`, event);
          
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          let finalUserMessage = 'Audio error.';
          if (errorType === 'not-allowed') finalUserMessage = 'Mic access denied.';
          if (errorType === 'no-speech') finalUserMessage = 'No speech detected.';
          
          // Don't show system error message for 'no-speech' if we are controlling timeouts manually,
          // usually cleaner to just stop listening. But we'll leave basic feedback.
          if (errorType !== 'no-speech') {
              addMessageToChat('system', finalUserMessage);
          }
          setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => { 
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          // Reset 1.5s timer to stop listening after silence
          silenceTimerRef.current = setTimeout(() => {
              recognition.stop();
          }, 1500);

          let fullTranscript = '';
          // Concatenate all results as continuous mode may produce multiple segments
          for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
          }
          transcriptAccumulatorRef.current = fullTranscript;
        };

        recognition.start();
      } else {
        addMessageToChat('system', "Speech recognition is not supported in this browser.");
      }
    }
  }, [isListening, isSpeaking, userProfile, processUserInput, addMessageToChat]);

  const handleInputFocus = () => {
    if (isSpeaking && userProfile.voiceOutput.enabled) stopAudioPlayback();
  };
  
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setUserInput(e.target.value);

  const handleBookParking = (spot: ParkingSpot) => setActiveModal({ type: 'parkingConfirmation', data: spot });

  const confirmParkingBooking = () => {
    if (activeModal && activeModal.type === 'parkingConfirmation' && activeModal.data) {
      const spotName = (activeModal.data as ParkingSpot).name;
      const confirmationText = `10-4. Simulated booking for ${spotName}. Call ahead to confirm, driver.`;
      addMessageToChat('ai', confirmationText); 
      speakAiResponse(confirmationText);
      setActiveModal(null);
    }
  };

  const handleSendTypedInput = async (e: React.FormEvent) => {
    e.preventDefault();
    await initializeAudio(); 
    if (isSpeaking && userProfile.voiceOutput.enabled) stopAudioPlayback();
    if (userInput.trim()) processUserInput(userInput.trim());
  };

  const handleSaveSettings = (newProfile: UserProfile) => {
    const languageChanged = newProfile.voiceInput.language !== userProfile.voiceInput.language;
    
    setUserProfile(newProfile);
    saveUserProfile(newProfile);
    setIsSettingsModalOpen(false);

    if (languageChanged) {
        setGeneralChatSession(null);
        setVehicleInspectionSession(null);
        addMessageToChat('system', 'Language changed. Resetting chat context.');
    } else {
        addMessageToChat('system', 'Settings saved.');
    }

    if (!newProfile.voiceOutput.enabled && isSpeaking) {
        stopAudioPlayback();
        setIsSpeaking(false);
    }
  };

  if (!assistantStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-100 p-4">
        <div className="text-center">
          <i className="fas fa-truck-moving fa-3x text-blue-400 mb-6"></i>
          <h1 className="text-4xl font-bold text-blue-400 mb-3">Hey Bib</h1>
          <p className="text-xl text-gray-300 mb-10">Your AI Trucker Assistant</p>
          <button
            onClick={handleStartAssistant}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg text-lg transition-colors duration-150 flex items-center justify-center space-x-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Start Assistant"
          >
            <i className="fas fa-play-circle"></i>
            <span>Start Assistant</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-400">Bib: Trucker's Voice Assistant</h1>
        <IconButton
            iconClassName="fas fa-cog text-gray-300 hover:text-blue-400"
            onClick={() => setIsSettingsModalOpen(true)}
            size="lg"
            variant="ghost"
            label="Open Settings"
            aria-label="Open settings panel"
        />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} onBookParking={handleBookParking} />
        ))}
        {isLoadingAI && (
          <div className="flex justify-center py-2">
            <LoadingSpinner />
          </div>
        )}
        <div ref={chatEndRef} />
      </main>
      
       {assistantStarted && !isLoadingAI && !isListening && !isSpeaking && !isWellnessCheckinActive && !isAskingName && messages.length > 0 && messages[0].sender === 'ai' && messages.filter(m => m.sender === 'user').length === 0 && (
          <div className="px-4 pb-2 text-sm text-gray-400">
            <p className="font-semibold mb-1">Try asking:</p>
            <ul className="list-disc list-inside">
              {EXAMPLE_COMMANDS.slice(0,3).map(cmd => <li key={cmd}>{cmd}</li>)}
            </ul>
          </div>
        )}

      <footer className="bg-gray-800 p-4 shadow-up">
        <form onSubmit={handleSendTypedInput} className="flex items-center space-x-3">
          <input 
            type="text"
            value={userInput}
            onChange={handleUserInputChange}
            onFocus={handleInputFocus}
            placeholder={isListening ? "Listening..." : (isAskingName ? "Your name..." : (isWellnessCheckinActive ? "Your response..." : "Type or tap mic..."))}
            className="flex-grow p-3 bg-gray-700 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-500"
            disabled={isLoadingAI || !!apiKeyError}
            aria-label="User input"
          />
          <IconButton
            iconClassName={`fas ${isListening ? 'fa-stop-circle text-red-500' : 'fa-microphone text-blue-400'}`}
            onClick={toggleListen}
            disabled={isLoadingAI || !!apiKeyError}
            size="xl"
            variant="ghost"
            className={`${isListening ? 'animate-pulse' : ''} ${isLoadingAI ? 'opacity-50 cursor-not-allowed' : ''}`}
            label={isListening ? "Stop listening" : "Start listening"}
          />
           <IconButton
            type="submit"
            iconClassName="fas fa-paper-plane text-green-400"
            disabled={isListening || isLoadingAI || !userInput.trim() || !!apiKeyError}
            size="xl"
            variant="ghost"
            className={`${isListening || isLoadingAI || !userInput.trim() || !!apiKeyError ? 'opacity-50 cursor-not-allowed' : ''}`}
            label="Send typed message"
          />
        </form>
         {apiKeyError && <p className="text-red-500 text-xs text-center mt-2">{apiKeyError}</p>}
      </footer>

      {activeModal && activeModal.type === 'parkingConfirmation' && activeModal.data && (
        <Modal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          title={`Confirm Parking at ${(activeModal.data as ParkingSpot).name}?`}
        >
          <p><span className="font-semibold">Name:</span> {(activeModal.data as ParkingSpot).name}</p>
          <p><span className="font-semibold">Location:</span> {(activeModal.data as ParkingSpot).location}</p>
          <p><span className="font-semibold">Security:</span> {(activeModal.data as ParkingSpot).security_features.join(', ')}</p>
          <p><span className="font-semibold">Availability:</span> {(activeModal.data as ParkingSpot).availability}</p>
          <p className="mt-4 text-sm text-yellow-400">Note: This is a simulation. Always verify.</p>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md transition-colors">Cancel</button>
            <button onClick={confirmParkingBooking} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors">Simulate Booking</button>
          </div>
        </Modal>
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentProfile={userProfile}
          onSave={handleSaveSettings}
          availableVoices={availableVoices} 
        />
      )}
    </div>
  );
};

export default App;
