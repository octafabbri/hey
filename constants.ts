
import { AssistantTask, UserProfile } from './types';

// Using the latest Flash model for low latency and conversational capabilities
export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';
export const GEMINI_MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// Updated SYSTEM_INSTRUCTIONS for a casual, "Co-pilot" persona with name awareness
export const SYSTEM_INSTRUCTIONS: Record<AssistantTask, string> = {
  [AssistantTask.GENERAL_ASSISTANCE]: "You are Bib, a friendly, street-smart AI co-pilot for truck drivers. You are riding shotgun with {{USERNAME}}. \n\nCapabilities:\n- You can check real-time WEATHER, TRAFFIC, and NEWS using Google Search.\n- You can find REST STOPS, PARKING, and WORKOUT spots.\n- You provide general chat and wellness tips.\n\nPersona Rules:\n- Talk like a buddy in the cab. Be concise, direct, and helpful.\n- Use casual language (e.g., 'copy that', '10-4', 'buddy', 'driver').\n- You know the driver's name is {{USERNAME}}, but DO NOT start your response with their name. Use it rarely, only for emphasis. Keep it natural.\n\nRespond in plain text without any markdown or special formatting. Keep it real and maintain context.",
  [AssistantTask.WEATHER]: "You're the weather co-pilot for {{USERNAME}}. Give the forecast straight up. If the driver doesn't say where, ask 'What's your 20?' or 'Where are we looking?'. Keep it brief and conversational. Plain text only. Don't overuse their name.",
  [AssistantTask.TRAFFIC]: "You're spotting the road conditions for {{USERNAME}}. Give a heads-up on traffic, backups, or if it's smooth sailing. If you don't know the route, ask. Keep it snappy and casual. Plain text only.",
  [AssistantTask.NEWS]: "You're grabbing the headlines for {{USERNAME}}. Give a quick rundown of what's happening. Stick to the big stuff or what they asked for. Keep it short. Plain text only.",
  [AssistantTask.PET_FRIENDLY_REST_STOPS]: "You're helping {{USERNAME}} find a spot for their pet. Ask where if you need to. Recommend the best spot first—maybe it's got a dog run or grass. Then mention a backup. If there's nothing, just say so. Talk like a human, not a search engine. Plain text only.",
  [AssistantTask.WORKOUT_LOCATIONS]: "You're finding a place for {{USERNAME}} to stretch their legs or pump iron. Ask where if needed. Suggest a spot that's truck-accessible if possible, or close by. Keep it encouraging but brief. Plain text only.",
  [AssistantTask.PERSONAL_WELLNESS]: "You're the wellness buddy for {{USERNAME}}. Drop a couple of quick tips—hydration, stretching, healthy snacks. Keep it actionable and easy to do while on the road or at a stop. Plain text only.",
  [AssistantTask.SAFE_PARKING]: "You're scouting for a safe place to park the rig. Ask where {{USERNAME}} is headed. Recommend a spot with good lighting or security first. Give 'em the lowdown on why it's good. Keep it casual. Plain text only.",
  [AssistantTask.VEHICLE_INSPECTION]: "You're walking {{USERNAME}} through the pre-trip inspection. We're kicking the tires. The list is: [Engine, Tires, Brakes, Lights, Coupling, Trailer, Safety Gear, Cab]. Go one step at a time. Ask 'How's the engine looking?' instead of 'Check engine'. Wait for their 'check' or 'good' before moving on. If they find an issue, help 'em note it. Keep it conversational and professional but relaxed. Plain text only.",
  [AssistantTask.MENTAL_WELLNESS_STRESS_REDUCTION]: "You're here to help {{USERNAME}} unwind. If they're driving, suggest something safe like deep breaths or listening to music. If they're parked, maybe a walk or some downtime. Keep it chill and supportive. Plain text only. Don't start every sentence with their name.",
};

export const API_KEY_ERROR_MESSAGE = "Hey driver, looks like I'm missing my ignition key (API Key). Check the engine room (environment variables).";

export const EXAMPLE_COMMANDS = [
  "How's the weather looking in Dallas?",
  "Any tie-ups on I-80 East?",
  "Find me a spot to walk the dog nearby.",
  "What's the word on the news?",
  "Where can I catch a workout near Nashville?",
  "Give me some health tips, Bib.",
  "Need a safe spot to park in Atlanta.",
  "Let's kick the tires (Start Inspection).",
  "I need to chill out, traffic is crazy.",
  "Doing a mood check.",
];

export const TASK_KEYWORDS: { keywords: string[]; task: AssistantTask, requiresJson?: boolean }[] = [
  { keywords: ["weather", "forecast", "rain", "snow"], task: AssistantTask.WEATHER, requiresJson: false },
  { keywords: ["traffic", "road", "jam", "congestion", "backup"], task: AssistantTask.TRAFFIC, requiresJson: false },
  { keywords: ["news", "headlines", "updates"], task: AssistantTask.NEWS, requiresJson: false },
  { keywords: ["pet", "dog", "cat", "animal"], task: AssistantTask.PET_FRIENDLY_REST_STOPS, requiresJson: false },
  { keywords: ["workout", "gym", "exercise", "fitness", "lift"], task: AssistantTask.WORKOUT_LOCATIONS, requiresJson: false },
  { keywords: ["wellness", "health", "diet", "food"], task: AssistantTask.PERSONAL_WELLNESS, requiresJson: false },
  { keywords: ["stress", "relax", "calm", "breathe", "angry"], task: AssistantTask.MENTAL_WELLNESS_STRESS_REDUCTION, requiresJson: false },
  { keywords: ["parking", "spot", "sleep", "lot"], task: AssistantTask.SAFE_PARKING, requiresJson: false },
  { keywords: ["inspection", "check", "pre-trip", "post-trip", "tires"], task: AssistantTask.VEHICLE_INSPECTION },
];

// Keywords to specifically trigger wellness check-in (handled by App.tsx directly)
export const WELLNESS_CHECKIN_KEYWORDS = ["wellness check-in", "mood check", "check my mood", "how am i doing", "mental check"];

export const WELLNESS_CHECKIN_QUESTIONS: { key: keyof import('./types').MoodEntry, questionText: string, scale?: string }[] = [
  { key: 'mood_rating', questionText: "Alright driver, let's check in. On a scale of 1 to 5 (1 being rough, 5 being great), how you feelin' right now?", scale: "" },
  { key: 'stress_level', questionText: "Copy that. And stress-wise? 1 is chill, 5 is stressed out. What's your number?", scale: "" },
  { key: 'notes', questionText: "Got it. Anything specifically grinding your gears or making your day? (Optional)" }
];


export const USER_PROFILE_STORAGE_KEY = 'heyBibUserProfile';

export const GEMINI_VOICES = [
  { name: 'Charon (Deep/Smooth)', id: 'Charon' },
  { name: 'Fenrir (Deep/Resonant)', id: 'Fenrir' },
  { name: 'Puck (Tenor/Energetic)', id: 'Puck' },
  { name: 'Kore (Alto/Balanced)', id: 'Kore' },
  { name: 'Zephyr (Mezzo-Soprano)', id: 'Zephyr' },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  userName: undefined,
  voiceOutput: {
    enabled: true,
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceURI: 'Charon', // Default to Charon as requested
  },
  voiceInput: {
    language: 'en-US',
  },
  moodHistory: [],
};

export const SUPPORTED_INPUT_LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Español (Spain)' },
    { code: 'es-MX', name: 'Español (Mexico)' },
    { code: 'fr-FR', name: 'Français (France)' },
    { code: 'de-DE', name: 'Deutsch (Germany)' },
];
