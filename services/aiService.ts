import OpenAI from 'openai';
import { OPENAI_MODEL_TEXT, OPENAI_MODEL_TTS, SYSTEM_INSTRUCTIONS, API_KEY_ERROR_MESSAGE, TASK_KEYWORDS, SUPPORTED_INPUT_LANGUAGES } from '../constants';
import { AssistantTask, VehicleInspectionStep, GroundingSource, ServiceRequest } from '../types';

let openai: OpenAI | null = null;

const getAIClient = (): OpenAI => {
  if (!openai) {
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      console.error(API_KEY_ERROR_MESSAGE);
      throw new Error(API_KEY_ERROR_MESSAGE);
    }
    openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }
  return openai;
};

/**
 * Chat wrapper to maintain conversation history
 * Mimics Gemini's Chat interface for compatibility
 */
export class ChatSession {
  private messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private systemInstruction: string;
  private temperature: number;

  constructor(systemInstruction: string, temperature: number = 0.7) {
    this.systemInstruction = systemInstruction;
    this.temperature = temperature;
    this.messages.push({ role: 'system', content: systemInstruction });
  }

  async sendMessage({ message }: { message: string }): Promise<{ text: string; groundingSources?: GroundingSource[] }> {
    const client = getAIClient();

    // Add user message to history
    this.messages.push({ role: 'user', content: message });

    try {
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL_TEXT,
        messages: this.messages,
        temperature: this.temperature,
      });

      const aiMessage = response.choices[0]?.message?.content || '';

      // Add assistant message to history
      this.messages.push({ role: 'assistant', content: aiMessage });

      return { text: aiMessage };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  // Get conversation history for debugging or data extraction
  getHistory(): OpenAI.Chat.ChatCompletionMessageParam[] {
    return this.messages;
  }
}

// Parse JSON from string (unchanged from Gemini version)
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

/**
 * Extract name from user input using AI
 */
export const extractNameWithAI = async (userInput: string): Promise<string> => {
  try {
    const client = getAIClient();
    const prompt = `The user was asked "What is your name?". They replied: "${userInput}". Extract the name they want to be called. Return ONLY the name as a plain string. If it's unclear or they refuse, return "Driver". Do not include punctuation or quotes.`;

    const response = await client.chat.completions.create({
      model: OPENAI_MODEL_TEXT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const name = response.choices[0]?.message?.content?.trim().replace(/['"]/g, '') || "Driver";
    return name;
  } catch (error) {
    console.error("Error extracting name:", error);
    return "Driver";
  }
};

/**
 * Generate speech using OpenAI TTS
 * Returns base64-encoded audio data
 */
/**
 * Convert ArrayBuffer to base64 string using chunked processing
 * to avoid stack overflow with large audio files
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const generateSpeech = async (text: string, voiceName: string = 'onyx'): Promise<string | null> => {
  try {
    // Validate and map voice names (handle old Gemini voices from localStorage)
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const validVoice = validVoices.includes(voiceName.toLowerCase()) ? voiceName.toLowerCase() : 'onyx';

    console.log(`🎤 Generating speech with voice: ${validVoice} (requested: ${voiceName}), text length: ${text.length}`);
    const client = getAIClient();

    const response = await client.audio.speech.create({
      model: OPENAI_MODEL_TTS,
      voice: validVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      response_format: 'mp3',
    });

    // Convert response to base64 using chunked processing
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ Received audio buffer: ${arrayBuffer.byteLength} bytes`);
    const base64Audio = arrayBufferToBase64(arrayBuffer);

    console.log(`✅ Base64 audio length: ${base64Audio.length} chars`);
    return base64Audio;
  } catch (error) {
    console.error("❌ Error generating speech:", error);
    return null;
  }
};

/**
 * Create a new chat session for a specific task
 */
export const createNewChatWithTask = (
  task: AssistantTask,
  languageCode: string,
  userName?: string
): ChatSession => {
  let systemInstruction = SYSTEM_INSTRUCTIONS[task];

  const language = SUPPORTED_INPUT_LANGUAGES.find(l => l.code === languageCode);
  const languageName = language ? language.name.split(' (')[0] : 'the user\'s language';
  const nameToUse = userName || 'Driver';

  // Replace placeholder in instruction
  systemInstruction = systemInstruction.replace(/{{USERNAME}}/g, nameToUse);

  // Language instruction
  systemInstruction += `\n\nImportant: The user is speaking ${languageName} (locale: ${languageCode}). ALL of your responses MUST be in ${languageName}. Do not switch languages.`;

  // Name usage constraint
  systemInstruction += `\n\nConstraint: You are talking to ${nameToUse}. Do NOT start every response with their name.`;

  // Note: OpenAI doesn't have built-in Google Search like Gemini
  // For tasks requiring real-time data (weather, traffic, news), you may need to implement external API calls
  // or use OpenAI's function calling feature

  const taskDefinition = TASK_KEYWORDS.find(t => t.task === task);
  const temperature = taskDefinition?.requiresJson ? 0.3 : 0.7;

  return new ChatSession(systemInstruction, temperature);
};

/**
 * Start vehicle inspection chat
 */
export const startVehicleInspectionChat = (languageCode: string, userName?: string): ChatSession => {
  return createNewChatWithTask(AssistantTask.VEHICLE_INSPECTION, languageCode, userName);
};

/**
 * Continue vehicle inspection conversation
 */
export const continueVehicleInspectionChat = async (
  chatSession: ChatSession,
  userMessage: string
): Promise<{ text: string; data?: VehicleInspectionStep; groundingSources?: GroundingSource[] }> => {
  try {
    const messageToSend = userMessage === "START_INSPECTION"
      ? "Let's begin the vehicle inspection. Please describe the first step."
      : userMessage;

    const response = await chatSession.sendMessage({ message: messageToSend });
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

/**
 * Determine task from user input based on keywords
 */
export const determineTaskFromInput = (input: string): { task: AssistantTask; requiresJson: boolean } => {
  const lowerInput = input.toLowerCase();
  for (const taskDef of TASK_KEYWORDS) {
    if (taskDef.keywords.some(kw => lowerInput.includes(kw))) {
      return { task: taskDef.task, requiresJson: !!taskDef.requiresJson };
    }
  }
  return { task: AssistantTask.GENERAL_ASSISTANCE, requiresJson: false };
};

/**
 * Extract structured service request data from conversation
 * Uses OpenAI to analyze conversation and extract fields
 */
export const extractServiceDataFromConversation = async (
  conversationHistory: string,
  currentRequest: ServiceRequest
): Promise<Partial<ServiceRequest>> => {
  const client = getAIClient();

  const prompt = `You are extracting data from a roadside assistance conversation. Extract ALL information mentioned, even if implicit.

CONVERSATION:
${conversationHistory}

CURRENT DATA (may have empty fields):
${JSON.stringify(currentRequest, null, 2)}

EXTRACTION RULES (ALL FIELDS BELOW ARE REQUIRED):
1. Extract ANY information mentioned - be thorough as these fields are required for dispatch
2. Infer service_type ONLY from SPECIFIC problem descriptions:
   - "flat tire", "tire blow", "tire change", "blowout" → TIRE_SERVICE
   - "battery dead", "jump start", "won't start" (with battery mention) → JUMP_START
   - "out of fuel", "out of diesel", "need fuel" → FUEL_DELIVERY
   - "locked out", "keys locked in" → LOCKOUT
   - "need a tow", "can't move", "tow truck" → TOWING
   - "engine problem", "transmission", "overheating", "coolant", "oil leak" → MECHANICAL_REPAIR
   - DO NOT infer service_type from vague terms like "broke down" alone - wait for specific details
3. Infer urgency CAREFULLY based on MULTIPLE context factors:

   ERS (Emergency Road Service) - ONLY if ALL these conditions are met:
   - Location is UNSAFE (highway shoulder, blocking lane, traffic area) OR
   - Vehicle is completely immobile AND in an unsafe/vulnerable location OR
   - User explicitly says "emergency", "urgent", "ASAP", "right now", "as soon as possible"

   SCHEDULED - If ANY of these apply:
   - User mentions scheduling: "schedule", "appointment", "next week", specific future dates
   - Location is SAFE (parking lot, shop, home, rest area) AND service is non-emergency (tire, maintenance)
   - User asks about timing/availability without urgency indicators

   DELAYED - If:
   - User explicitly says "tomorrow", "tomorrow morning", "next day"

   DEFAULT: If urgency is unclear, DO NOT GUESS - leave as empty string and let AI ask for clarification

4. Extract location from ANY mention of: highway numbers, mile markers, city names, street names, rest stops, exits
5. Extract phone from ANY mention of phone/contact number
6. Infer vehicle_type: "truck" or "semi" → TRUCK, "trailer" → TRAILER
7. Create description from ALL problem mentions (include everything user said about the problem)

Return JSON with ALL extracted fields. Include fields even if partially complete:
{
  "contact_phone": "string",
  "service_type": "TOWING" | "TIRE_SERVICE" | "JUMP_START" | "FUEL_DELIVERY" | "LOCKOUT" | "MECHANICAL_REPAIR" | "OTHER",
  "urgency": "ERS" | "DELAYED" | "SCHEDULED",
  "description": "string - summarize the problem",
  "location": {
    "current_location": "string",
    "highway_or_road": "string",
    "nearest_mile_marker": "string",
    "is_safe_location": boolean
  },
  "vehicle": {
    "vehicle_type": "TRUCK" | "TRAILER",
    "make": "string",
    "model": "string",
    "year": "string",
    "unit_number": "string"
  },
  "scheduled_appointment": {
    "scheduled_date": "string - e.g., 'Next Monday', 'February 15th', '2025-02-15'",
    "scheduled_time": "string - e.g., 'Morning', '2:00 PM', 'afternoon'",
    "scheduled_location": "string - where service should happen (current location or different address)"
  }
}

IMPORTANT: Only include "scheduled_appointment" field if urgency is "SCHEDULED". Otherwise omit it.

Return ONLY the JSON object, no other text.`;

  try {
    console.log('🔍 Calling OpenAI for data extraction...');
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL_TEXT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const jsonText = response.choices[0]?.message?.content || '{}';
    console.log('📥 Raw OpenAI extraction response:', jsonText);

    const parsed = parseJsonFromString(jsonText) || {};
    console.log('📦 Parsed extraction result:', parsed);

    return parsed;
  } catch (error) {
    console.error("❌ Data extraction error:", error);
    return {};
  }
};
