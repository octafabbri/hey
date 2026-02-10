# Mr. Roboto - Conversational AI Voice Assistant

A voice-first AI dispatcher for emergency roadside assistance, built with React + TypeScript and powered by OpenAI GPT-4o. Drivers can report breakdowns, request tire or mechanical service, and receive a downloadable PDF work order — all through natural conversation via voice or text chat.

## Features

- **Voice-first UI** with OpenAI TTS and Web Speech API recognition
- **Text chat mode** with iMessage-style bubble interface
- **Service request workflow** — conversational data collection for tire and mechanical service dispatching
- **Per-service-type validation** — TIRE requests collect tire size, quantity, position; MECHANICAL requests collect service type and problem description
- **Urgency classification** — ERS (same-day), DELAYED (next-day), SCHEDULED (future appointment with date/time)
- **PDF work order generation** with urgency-colored banners (red/orange/green)
- **Confirmation flow** — AI reads back collected details before the user opts in to generate a work order
- **Vehicle inspection walkthrough** — guided pre-trip inspection checklist
- **Wellness check-in** — mood and stress tracking for drivers
- **Multi-language support** — English, Spanish, French, German

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **AI:** OpenAI GPT-4o (chat + structured extraction), OpenAI TTS
- **Voice Input:** Web Speech API (browser-native)
- **PDF:** jsPDF + html2canvas
- **Testing:** Vitest + React Testing Library
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion)

## Prerequisites

- Node.js (v18+)
- An OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/octafabbri/hey.git
   cd hey
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your API key:**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and replace the placeholder with your actual OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-key-here
   ```
   > `.env.local` is gitignored — your key will not be committed.

4. **Start the dev server:**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once and exit |
| `npm run test:ui` | Run tests with Vitest UI dashboard |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run deploy` | Build and deploy to Cloudflare Pages (production) |
| `npm run deploy:preview` | Build and deploy a preview branch |

## Deploying to Cloudflare Pages

The project is configured with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare Pages deployment.

1. **Log in to Cloudflare** (first time only):
   ```bash
   npx wrangler login
   ```

2. **Set the API key** in the Cloudflare dashboard:
   - Go to your Pages project > **Settings** > **Environment variables**
   - Add `VITE_OPENAI_API_KEY` with your OpenAI key
   - This ensures the key is baked into the build at deploy time without being in source control

3. **Deploy:**
   ```bash
   npm run deploy
   ```

> On the first deploy, Wrangler will prompt you to create the Pages project. Subsequent deploys update it in place.

## Project Structure

```
hey/
├── App.tsx                  # Main app component — state machine, routing, service request flow
├── constants.ts             # AI system prompts, keywords, voice configs
├── types.ts                 # TypeScript interfaces (ServiceRequest, TireServiceInfo, etc.)
├── index.tsx                # React entry point
├── index.html               # HTML shell
├── components/
│   ├── ChatInterface.tsx    # Text chat UI with message bubbles
│   ├── SettingsPage.tsx     # Voice persona + language settings
│   ├── BottomMenuBar.tsx    # iOS-style tab navigation
│   ├── InputModeToggle.tsx  # Voice/Chat mode switcher
│   └── voice-ui/           # Voice UI state components
│       ├── IdleState.tsx
│       ├── ListeningState.tsx
│       ├── ProcessingState.tsx
│       ├── RespondingState.tsx
│       ├── UrgentResponseState.tsx
│       ├── PDFGeneratingState.tsx
│       ├── PDFReadyState.tsx
│       └── ResolutionState.tsx
├── services/
│   ├── aiService.ts         # OpenAI chat, TTS, data extraction
│   ├── pdfService.ts        # PDF work order generation
│   ├── speechService.ts     # Web Speech API + audio playback
│   ├── serviceRequestService.ts  # Validation + CRUD for service requests
│   └── userProfileService.ts     # localStorage profile management
├── .env.example             # Template for environment variables
├── vite.config.ts           # Vite configuration
└── vitest.config.ts         # Vitest test configuration
```

## Service Request Data Model

Service requests use per-type required fields:

| Layer | Required Fields |
|-------|----------------|
| **Base (all requests)** | driver_name, contact_phone, fleet_name, location, vehicle_type, service_type, urgency |
| **+ TIRE** | requested_service (replace/repair), requested_tire (size/brand), number_of_tires, tire_position |
| **+ MECHANICAL** | requested_service, description |
| **+ SCHEDULED urgency** | scheduled_date, scheduled_time |

## Testing

See [TEST_README.md](TEST_README.md) for the full testing guide. Quick start:

```bash
npm run test:run    # 35 tests across 3 test suites
```

Test suites cover:
- Service request validation (21 tests) — all 6 service type + urgency combinations
- User profile management (6 tests)
- Settings page component (8 tests)
