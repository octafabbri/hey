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

EXTRACTION RULES:
1. Extract ANY information mentioned - be thorough as these fields are required for dispatch
2. Infer service_type from problem descriptions:
   - "flat tire", "tire blow", "tire change", "blowout", "tire repair", "tire replace" → TIRE
   - "engine", "transmission", "overheating", "coolant", "oil leak", "brakes", "towing", "jump start", "battery", "fuel", "lockout", "won't start" → MECHANICAL
   - DO NOT infer service_type from vague terms like "broke down" alone - wait for specific details
3. Infer urgency CAREFULLY:
   - ERS: Unsafe location (highway shoulder, blocking lane) OR user says "emergency", "urgent", "ASAP", "right now"
   - DELAYED: User says "tomorrow", "tomorrow morning", "next day"
   - SCHEDULED: User mentions scheduling, future dates, appointments
   - DEFAULT: If unclear, leave as empty string
4. Extract driver_name from any mention of the driver's name
5. Extract location from highway numbers, mile markers, city names, streets, rest stops, exits
6. Extract phone from ANY mention of phone/contact number
7. Extract fleet_name from company name, fleet name, or trucking company mentions
8. Infer vehicle_type: "truck" or "semi" → TRUCK, "trailer" → TRAILER

FOR TIRE REQUESTS - extract tire_info:
   - requested_service: "REPLACE" or "REPAIR" (from "replace", "new tire" → REPLACE; "repair", "patch", "plug" → REPAIR)
   - requested_tire: tire size/brand (e.g., "295/75R22.5", "11R22.5")
   - number_of_tires: how many tires needed (integer)
   - tire_position: which position (e.g., "left front steer", "right rear drive", "trailer axle 2 outside")

FOR MECHANICAL REQUESTS - extract mechanical_info:
   - requested_service: type of service (e.g., "engine repair", "brake service", "towing", "jump start", "fuel delivery")
   - description: detailed problem description from everything user said

Return JSON with ALL extracted fields. Include fields even if partially complete:
{
  "driver_name": "string",
  "contact_phone": "string",
  "fleet_name": "string",
  "service_type": "TIRE" | "MECHANICAL",
  "urgency": "ERS" | "DELAYED" | "SCHEDULED",
  "location": {
    "current_location": "string",
    "highway_or_road": "string",
    "nearest_mile_marker": "string",
    "is_safe_location": boolean
  },
  "vehicle": {
    "vehicle_type": "TRUCK" | "TRAILER"
  },
  "tire_info": {
    "requested_service": "REPLACE" | "REPAIR",
    "requested_tire": "string",
    "number_of_tires": number,
    "tire_position": "string"
  },
  "mechanical_info": {
    "requested_service": "string",
    "description": "string"
  },
  "scheduled_appointment": {
    "scheduled_date": "string",
    "scheduled_time": "string"
  }
}

IMPORTANT:
- Only include "tire_info" if service_type is "TIRE". Otherwise omit it.
- Only include "mechanical_info" if service_type is "MECHANICAL". Otherwise omit it.
- Only include "scheduled_appointment" if urgency is "SCHEDULED". Otherwise omit it.
- Omit any field where the value is unknown or not mentioned.

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
