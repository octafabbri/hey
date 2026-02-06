
import { Chat } from "@google/genai";

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  data?: ParsedResponseItem[] | VehicleInspectionStep | WellnessTechnique[] | string;
  groundingSources?: GroundingSource[];
  timestamp: Date;
}

export enum AssistantTask {
  GENERAL_ASSISTANCE = 'GENERAL_ASSISTANCE',
  WEATHER = 'WEATHER',
  TRAFFIC = 'TRAFFIC',
  NEWS = 'NEWS',
  PET_FRIENDLY_REST_STOPS = 'PET_FRIENDLY_REST_STOPS',
  WORKOUT_LOCATIONS = 'WORKOUT_LOCATIONS',
  PERSONAL_WELLNESS = 'PERSONAL_WELLNESS',
  SAFE_PARKING = 'SAFE_PARKING',
  VEHICLE_INSPECTION = 'VEHICLE_INSPECTION',
  MENTAL_WELLNESS_STRESS_REDUCTION = 'MENTAL_WELLNESS_STRESS_REDUCTION',
}

export interface ParsedResponseItem {
  name: string;
  [key: string]: any; 
}

export interface RestStop extends ParsedResponseItem {
  location_description: string;
  amenities: string[];
}

export interface WorkoutLocation extends ParsedResponseItem {
  type: string;
  details: string;
}

export interface ParkingSpot extends ParsedResponseItem {
  location: string;
  security_features: string[];
  availability: string;
}

export interface VehicleInspectionStep {
  current_step_description: string;
  next_prompt?: string; // Prompt for user, e.g., "What do you see?" or "Is this item okay?"
  is_final_step?: boolean;
}

export interface WellnessTechnique {
  name: string;
  description: string;
  suitable_for: 'driving' | 'parked' | 'any';
}

export interface MoodEntry {
  timestamp: Date;
  mood_rating?: number; // e.g., 1-5
  stress_level?: number; // e.g., 1-5
  notes?: string; // Optional free-form notes from user's response
}

export interface ActiveModalInfo {
  type: 'parkingConfirmation' | 'inspectionItemDetail' | 'settings';
  data: ParkingSpot | VehicleInspectionStep | UserProfile | null;
}

// User Profile and Settings
export interface VoiceOutputSettings {
  enabled: boolean;
  rate: number; // 0.1 to 10
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
  voiceURI: string | null; // This now holds the Gemini Voice Name (e.g. 'Charon')
}

export interface VoiceInputSettings {
  language: string; // e.g., 'en-US'
}

export interface UserProfile {
  userName?: string; // The driver's name or handle
  voiceOutput: VoiceOutputSettings;
  voiceInput: VoiceInputSettings;
  moodHistory: MoodEntry[];
}
