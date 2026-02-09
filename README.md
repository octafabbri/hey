<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16NEuqJMjeChSCj4cy9qSMMCVXt492kka

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file and add your OpenAI API key:
   ```bash
   VITE_OPENAI_API_KEY=your-openai-api-key-here
   ```
   Get your API key from: https://platform.openai.com/api-keys

3. Run the app:
   ```bash
   npm run dev
   ```

The app will be available at http://localhost:3000
