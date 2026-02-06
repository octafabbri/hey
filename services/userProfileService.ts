import { UserProfile, MoodEntry } from '../types';
import { DEFAULT_USER_PROFILE, USER_PROFILE_STORAGE_KEY } from '../constants';

export const loadUserProfile = (): UserProfile => {
  try {
    const serializedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (serializedProfile === null) {
      return { ...DEFAULT_USER_PROFILE, moodHistory: [] };
    }
    const storedProfile = JSON.parse(serializedProfile);
    // Ensure moodHistory is an array and other parts are spread with defaults
    return {
        voiceOutput: { ...DEFAULT_USER_PROFILE.voiceOutput, ...storedProfile.voiceOutput },
        voiceInput: { ...DEFAULT_USER_PROFILE.voiceInput, ...storedProfile.voiceInput },
        moodHistory: Array.isArray(storedProfile.moodHistory) ? storedProfile.moodHistory : [],
    };
  } catch (error) {
    console.error('Error loading user profile from localStorage:', error);
    return { ...DEFAULT_USER_PROFILE, moodHistory: [] };
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    // Optionally, prune moodHistory if it gets too large
    // const MAX_MOOD_ENTRIES = 100;
    // if (profile.moodHistory.length > MAX_MOOD_ENTRIES) {
    //   profile.moodHistory = profile.moodHistory.slice(-MAX_MOOD_ENTRIES);
    // }
    const serializedProfile = JSON.stringify(profile);
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, serializedProfile);
  } catch (error) {
    console.error('Error saving user profile to localStorage:', error);
  }
};

export const addMoodEntry = (profile: UserProfile, entry: MoodEntry): UserProfile => {
  const updatedMoodHistory = [...(profile.moodHistory || []), entry];
  // Optional: Limit the number of stored entries
  // const MAX_ENTRIES = 30; 
  // if (updatedMoodHistory.length > MAX_ENTRIES) {
  //   updatedMoodHistory.splice(0, updatedMoodHistory.length - MAX_ENTRIES);
  // }
  return { ...profile, moodHistory: updatedMoodHistory };
};