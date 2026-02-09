# Hey

# **AI Demonstrator Prototype — Conversational AI for Scheduling**
 
Based on the meeting discussion, the prototype is envisioned as a **conversational, AI‑driven orchestration engine** that handles the *entire scheduling workflow* between fleets and service providers—reducing or eliminating today’s manual, multi‑step phone‑call process.
 
Below is a distilled, structured overview of what the prototype will be designed to showcase.
 
## **1. A Single Conversational Entry Point (“Call One Number”)**
 
The prototype will demonstrate that instead of fleets calling multiple dealers, they can simply **speak to an AI assistant** (referred to informally in the meeting as “Bib”):
 
*   Fleet manager calls or messages the AI.

*   AI recognizes the caller based on phone number and profile.

*   AI asks: *“What can I schedule for you today?”*
 
This preserves existing behavior (phone calls remain king) while improving efficiency—no forced behavior change.
 
## **2. AI‑Driven Request Capture**
 
The system uses conversation (voice or text) to collect all necessary details:
 
*   Vehicle ID or fleet asset info

*   Service needed (e.g., tires, PM, repair)

*   Timing constraints (“before tomorrow noon”)

*   Location

*   Driver/yard context
 
Voice AI can also extract details from a *photo or video* the user sends.
 
This makes service initiation far easier than today’s back‑and‑forth call routine.
 
## **3. Smart Scheduling & Orchestration**
 
The core of the demonstrator is an **AI “routing + orchestration engine”** that:
 
*   Contacts service providers automatically

*   Checks availability and inventory (tires or parts)

*   Coordinates technician time slots

*   Manages confirmations, negotiation, and adjustments

*   Handles batching across multiple vehicles (e.g., “I have 15 things to schedule”)

*   Considers urgency levels (ERS vs. delayed, “tomorrow morning,” etc.)
 
This is the piece the team agreed is the **most valuable and most complex** part of the prototype.
 
## **4. Intelligent Use of Fleet Profiles & Historical Data**
 
The AI uses fleet profile information to tailor conversations:
 
*   Fleet type (construction vs. line haul)

*   Known patterns and preferences

*   Typical service needs and cycles

*   Arrival/departure patterns at yards

*   Whether service bundles or batching make sense
 
Fleet profiles are considered *critical inputs* to making the conversational AI “smart.”
 
## **5. Omni‑Channel Output (Phone, Text, Email)**
 
The prototype will show that AI can confirm details using whatever channel the user prefers:
 
*   Phone call

*   Text message

*   Email
 
For example, the AI can text a service provider:
 
> “Can you service vehicle XYZ tomorrow before noon? Y/N”
 
The AI then relays that back to the fleet.
 
## **6. Integration Concept: Initiating Service via Camera or Wearable**
 
While not required for version 1, the team wants the prototype to **suggest future possibilities**, such as:
 
*   Technicians wearing glasses or body cameras

*   Automatic extraction of tire condition, wheel positions, repair evidence

*   Auto‑documenting work without paperwork
 
These ideas illustrate what future “AI‑first” service workflows could become.
 
## **7. A Demonstration Use Case (for customer & dealer feedback)**
 
The prototype will be used **by end of Q1** to engage *dealers and fleets* for real feedback:
 
*   Show the end‑to‑end conversational journey

*   Test viability of orchestration model

*   Validate what is valuable and intuitive

*   Compare with how fleets operate today (“phone is king”)
 
This aligns with the commitment made in the meeting to show a tangible concept to customers quickly.
 
# **In Summary**
 
### The AI demonstrator will model:
 
✔ A **conversational front‑end** (voice first, text capable)  

✔ A **smart orchestration engine** handling multi‑party coordination  

✔ **Automated scheduling logic** (availability, inventory, urgency)  

✔ **Profile‑aware interactions** tailored to each fleet  

✔ **Omni‑channel confirmations**  

✔ A clear, simplified user journey replacing today's cumbersome phone‑call chains
 
The outcome: **One conversation → fully AI‑managed scheduling.**
 
If you’d like, I can also create:
 
*   A one‑page **executive summary**

*   A visual **prototype flow diagram**

*   A **pitch script** for showing the demonstrator to customers

*   A **requirements list** for building the first prototype

 
ased on my comprehensive analysis of all files and folders, here's my understanding of your project:
Project Overview: "Hey Bib" - AI Voice Assistant for Truck Drivers
This is a React-based voice-activated AI assistant specifically designed for truck drivers. It uses Google's Gemini 2.5 Flash AI model with text-to-speech capabilities to provide a hands-free, conversational co-pilot experience.
Core Architecture
Technology Stack
Frontend Framework: React 19 with TypeScript
Build Tool: Vite (development server on port 3000)
Styling: Tailwind CSS (via CDN)
AI Backend: Google Gemini API (@google/genai v1.5.0)
Speech: Web Speech API for input + Gemini TTS for output
Project Structure
 
 
 
 
 
 
 
 
Key Features
1. Voice Interaction System
Speech Input: Uses Web Speech API with custom silence detection (1.5s timeout)
Speech Output: Gemini neural TTS with 5 voice personas (Charon, Fenrir, Puck, Kore, Zephyr)
Hands-free Operation: Push-to-talk mic button with visual feedback
2. AI Assistant Capabilities
The assistant ("Bib") provides 9 specialized task modes:
General Assistance (unified chat with Google Search grounding)
Weather forecasts
Traffic conditions
News headlines
Pet-Friendly Rest Stops locator
Workout Locations finder
Personal Wellness tips
Safe Parking recommendations
Vehicle Inspection step-by-step guidance
Mental Wellness/Stress Reduction techniques
3. Wellness Check-in System
Prompted by keywords like "wellness check-in" or "mood check"
Collects structured mood data (1-5 ratings for mood & stress, optional notes)
Stores mood history in localStorage for tracking over time
4. Conversational Persona
Talks like a "buddy in the cab" with trucker slang ("10-4", "copy that", "what's your 20?")
Personalized with user's name (extracted via AI if not provided)
Multi-language support (6 languages: English US/UK, Spanish, French, German)
5. User Settings
Voice output controls (enable/disable, volume, voice persona)
Voice input language selection
Persistent profile storage via localStorage
Settings accessible via gear icon in header
Technical Implementation Details
State Management (App.tsx)
Uses React hooks (useState, useEffect, useCallback, useRef)
Maintains two separate chat sessions:
generalChatSession: Unified context for most queries (with Google Search)
vehicleInspectionSession: Dedicated guided inspection flow
Tracks conversation states: isListening, isSpeaking, isLoadingAI, isWellnessCheckinActive, isAskingName
AI Service (geminiService.ts)
Task Routing: Keyword-based detection determines which system prompt to use
Google Search Integration: Enabled for real-time data queries (weather, traffic, etc.)
Grounding Sources: Displays web sources when AI uses search results
TTS Generation: Uses gemini-2.5-flash-preview-tts model with configurable voices
Audio Pipeline (speechService.ts)
Critical PCM Decoding Fix: Handles 16-bit alignment issues in raw audio data
24kHz Sample Rate: Matches Gemini's default output format
Volume Control: Gain node for user-adjustable volume
Autoplay Policy Compliance: Explicitly initializes AudioContext on user interaction
Data Persistence (userProfileService.ts)
Stores user profile in localStorage under heyBibUserProfile key
Default voice: Charon (deep/smooth)
Maintains mood history array for wellness tracking
Design Patterns
1. Component Architecture
Separation of Concerns: UI components are purely presentational
Props-Based Configuration: IconButton and Modal are highly reusable
Type Safety: Comprehensive TypeScript interfaces prevent runtime errors
2. Service Layer Pattern
All API calls and business logic isolated from UI
Single responsibility: geminiService for AI, speechService for audio, etc.
Easy to test and mock
3. Accessibility
ARIA labels on all interactive elements
Screen reader support (sr-only classes)
Keyboard navigation support
Semantic HTML structure
Configuration Files
package.json
Project name: "hey-bib---octa"
Scripts: dev, build, preview
Minimal dependencies (React, Gemini SDK only)
vite.config.ts
Injects GEMINI_API_KEY from .env.local as process.env.API_KEY
Path alias: @/ points to root directory
Dev server on 0.0.0.0:3000 for network access
tsconfig.json
Target: ES2022 with modern features
React JSX support
Bundler module resolution (for Vite)
Node types included for process.env access
metadata.json
App description: "A voice-activated AI assistant for truck drivers..."
Requests microphone permissions (for AI Studio integration)
User Flow
Initial Load: User sees splash screen with truck icon and "Start Assistant" button
Name Collection: AI asks for user's name (or defaults to "Driver")
Ready State: Chat interface opens with mic button and text input
Voice Interaction:
User taps mic → speech recognition starts
1.5s silence → automatically stops and processes
AI responds with text + speech
Task Execution: AI determines task type and routes to appropriate handler
Grounding Display: Web sources shown when AI uses Google Search
Settings Access: Gear icon opens modal for voice/language preferences
Notable Implementation Details
Silence Detection
Custom timeout logic (not relying on browser's no-speech error) provides smoother UX
Unified Chat Context
Recent refactor consolidated multiple task-specific sessions into one generalChatSession to maintain conversation continuity
Audio Alignment Fix
Critical bug fix for Gemini's raw PCM data - creates new aligned ArrayBuffer to prevent crashes on odd byte offsets
Multilingual Support
System instructions dynamically inject language constraints based on user's selected input language
Wellness Tracking
Structured data collection via multi-step questionnaire, stored for potential analytics/trends
Potential Use Cases
Long-haul truckers needing hands-free navigation/weather info
Fleet drivers doing pre-trip inspections
Drivers managing stress/fatigue on the road
Pet owners looking for dog-friendly stops
Health-conscious drivers wanting workout locations
Empty Documentation
The hey-history-Feb.md file exists but is currently empty - likely intended for changelog or development notes.
This is a well-structured, production-ready voice assistant with thoughtful UX design for the trucking industry. The code shows attention to accessibility, error handling, and real-world constraints (autoplay policies, memory alignment, API rate limits).
 