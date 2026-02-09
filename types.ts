
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  data?: ParsedResponseItem[] | VehicleInspectionStep | WellnessTechnique[] | ServiceRequest | string;
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
  SERVICE_REQUEST = 'SERVICE_REQUEST',
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

// Service Coordination Types
export enum ServiceType {
  TOWING = 'TOWING',
  TIRE_SERVICE = 'TIRE_SERVICE',
  JUMP_START = 'JUMP_START',
  FUEL_DELIVERY = 'FUEL_DELIVERY',
  LOCKOUT = 'LOCKOUT',
  MECHANICAL_REPAIR = 'MECHANICAL_REPAIR',
  OTHER = 'OTHER'
}

export enum VehicleType {
  TRUCK = 'TRUCK',
  TRAILER = 'TRAILER'
}

export enum ServiceUrgency {
  ERS = 'ERS',           // Emergency Road Service - TODAY/SAME-DAY
  DELAYED = 'DELAYED',   // Tomorrow/next day
  SCHEDULED = 'SCHEDULED' // 2+ days out, future appointments
}

export interface VehicleInfo {
  vehicle_type: VehicleType; // Required: TRUCK or TRAILER
  make?: string;
  model?: string;
  year?: string;
  license_plate?: string;
  unit_number?: string; // Fleet tracking number
}

export interface LocationInfo {
  current_location?: string;
  highway_or_road?: string;
  nearest_mile_marker?: string;
  is_safe_location?: boolean;
}

export interface ScheduledAppointmentInfo {
  scheduled_date: string;       // e.g., "2025-02-15" or "Next Monday"
  scheduled_time: string;       // e.g., "10:00 AM" or "Morning"
  scheduled_location: string;   // Where service should take place
}

export interface ServiceRequest {
  id: string;
  timestamp: Date;

  // Contact
  driver_name: string;
  contact_phone: string;

  // Service details
  service_type: ServiceType;
  urgency: ServiceUrgency;
  description: string;

  // Location & vehicle
  location: LocationInfo;
  vehicle: VehicleInfo;

  // Scheduled appointment (only for SCHEDULED urgency)
  scheduled_appointment?: ScheduledAppointmentInfo;

  // Status
  status: 'draft' | 'submitted' | 'completed';
  conversation_transcript?: string;
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
  serviceRequests: ServiceRequest[]; // Service coordination history
}
