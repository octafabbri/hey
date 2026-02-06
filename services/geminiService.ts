
import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";
import { GEMINI_MODEL_TEXT, GEMINI_MODEL_TTS, SYSTEM_INSTRUCTIONS, API_KEY_ERROR_MESSAGE, TASK_KEYWORDS, SUPPORTED_INPUT_LANGUAGES } from '../constants';
import { AssistantTask, ParkingSpot, ParsedResponseItem, RestStop, VehicleInspectionStep, WorkoutLocation, WellnessTechnique, GroundingSource } from '../types';

let ai: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.error(API_KEY_ERROR_MESSAGE);
      throw new Error(API_KEY_ERROR_MESSAGE);
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// parseJsonFromString is kept as it might be used by other functionalities or future tasks,
// but it will be called less frequently now.
export const parseJsonFromString = <T,>(jsonString: string): T | null => {
  let cleanJsonString = jsonString.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanJsonString.match(fenceRegex);
  if (match && match[2]) {
    cleanJsonString = match[2].trim();
  }
  try {
    return JSON.parse(cleanJsonString) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error, "Raw string:", jsonString);
    return null;
  }
};

export const extractNameWithAI = async (userInput: string): Promise<string> => {
  try {
    const client = getAIClient();
    // Simple prompt to extract name or fallback to "Driver"
    const prompt = `The user was asked "What is your name?". They replied: "${userInput}". Extract the name they want to be called. Return ONLY the name as a plain string. If it's unclear or they refuse, return "Driver". Do not include punctuation or quotes.`;
    
    const response = await client.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });
    
    const name = response.text?.trim().replace(/['"]/g, '') || "Driver";
    return name;
  } catch (error) {
    console.error("Error extracting name:", error);
    return "Driver";
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Charon'): Promise<string | null> => {
  try {
    const client = getAIClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODEL_TTS,
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

export const createNewChatWithTask = (task: AssistantTask, languageCode: string, userName?: string): Chat => {
  const client = getAIClient();
  let systemInstruction = SYSTEM_INSTRUCTIONS[task];
  
  const language = SUPPORTED_INPUT_LANGUAGES.find(l => l.code === languageCode);
  const languageName = language ? language.name.split(' (')[0] : 'the user\'s language';
  const nameToUse = userName || 'Driver';

  // Replace placeholder in instruction
  systemInstruction = systemInstruction.replace(/{{USERNAME}}/g, nameToUse);

  // Make the language instruction very clear and apply it for all languages.
  systemInstruction += `\n\nImportant: The user is speaking ${languageName} (locale: ${languageCode}). ALL of your responses MUST be in ${languageName}. Do not switch languages.`;
  
  // Append reinforcement of the name rule
  systemInstruction += `\n\nConstraint: You are talking to ${nameToUse}. Do NOT start every response with their name.`;

  const taskDefinition = TASK_KEYWORDS.find(t => t.task === task);
  // requiresJson is now false for many tasks, based on constants.ts
  const requiresJson = taskDefinition?.requiresJson || false; 
  
  // Enable Google Search for General Assistance and specific retrieval tasks to ensure unified capabilities
  const useGoogleSearch = [
    AssistantTask.GENERAL_ASSISTANCE,
    AssistantTask.WEATHER,
    AssistantTask.TRAFFIC,
    AssistantTask.NEWS,
    AssistantTask.PET_FRIENDLY_REST_STOPS,
    AssistantTask.WORKOUT_LOCATIONS,
    AssistantTask.SAFE_PARKING
  ].includes(task);

  const config: { systemInstruction: string; temperature: number; tools?: any[]; responseMimeType?: string } = {
    systemInstruction,
    temperature: 0.7, // Keep some creativity for conversational responses
  };

  if (useGoogleSearch) {
    config.tools = [{ googleSearch: {} }];
     if (config.responseMimeType) { // Should not happen if requiresJson is false
        delete config.responseMimeType; 
    }
  } else if (requiresJson) { // This will only be true if a task explicitly still needs JSON
    config.responseMimeType = "application/json";
  }
  // If not useGoogleSearch and not requiresJson, no special config for tools or responseMimeType is added.
  
  return client.chats.create({
    model: GEMINI_MODEL_TEXT,
    config,
  });
};

export const startVehicleInspectionChat = (languageCode: string, userName?: string): Chat => {
  return createNewChatWithTask(AssistantTask.VEHICLE_INSPECTION, languageCode, userName);
};

export const continueVehicleInspectionChat = async (
  chatSession: Chat,
  userMessage: string
): Promise<{ text: string, data?: VehicleInspectionStep, groundingSources?: GroundingSource[] }> => {
  try {
    // The system prompt already tells the AI to guide the user step-by-step and start with the first item.
    // Sending a simple "Start" or "Begin" command is enough to kick it off in the right language.
    const messageToSend = userMessage === "START_INSPECTION" ? "Let's begin the vehicle inspection. Please describe the first step." : userMessage;

    const response: GenerateContentResponse = await chatSession.sendMessage({ message: messageToSend });
    const aiResponseText = response.text;
    
    const inspectionData: VehicleInspectionStep = {
        current_step_description: aiResponseText,
    };
    
    return { text: aiResponseText, data: inspectionData };

  } catch (error) {
    console.error("Error in vehicle inspection chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { text: `Sorry, there was an issue with the inspection guidance: ${errorMessage}` };
  }
};


export const determineTaskFromInput = (input: string): { task: AssistantTask; requiresJson: boolean } => {
  const lowerInput = input.toLowerCase();
  for (const taskDef of TASK_KEYWORDS) {
    if (taskDef.keywords.some(kw => lowerInput.includes(kw))) {
      // The requiresJson flag is now sourced directly from the updated TASK_KEYWORDS in constants.ts
      return { task: taskDef.task, requiresJson: !!taskDef.requiresJson };
    }
  }
  return { task: AssistantTask.GENERAL_ASSISTANCE, requiresJson: false };
};
