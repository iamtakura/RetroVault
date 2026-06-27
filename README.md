# RetroVault — Magnetic Dictation System

A premium 1960s-aesthetic retro voice dictation and transcription system. RetroVault transforms voice memos into text, tags them automatically using Groq's LLM APIs, and stores them in local database shelves. It features full offline capability and Progressive Web App (PWA) device installation.

## Features

- **Vintage Audio Decks**: Beautiful skeuomorphic Walnut wood and worn metal cassette/vinyl panels.
- **Micro-interactions**: Realistic spools, spin physics, hold-to-record tape buttons, and GSAP-animated cassette eject systems.
- **AI Pipelines**: Whisper-powered transcription and auto-tagging utilizing Groq completions.
- **Offline Resiliency**: Saves raw voice recordings locally to IndexedDB if connection drops, queuing auto-retries when the device recovers.
- **PWA Ready**: Portability with full offline caching and custom index-card install prompts.

## Tech Stack

- **Core**: React, Vite
- **Styling**: Vanilla CSS with custom HSL variables and keyframe animations
- **Animation**: GSAP (GreenSock Animation Platform)
- **Database**: IndexedDB (`idb` wrapper)
- **APIs**: Groq API (Whisper + Llama3)

---

## Setup & Installation

### 1. Clone & Install Dependencies
Ensure you have Node.js installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Groq API key:
```env
# Get your key from https://console.groq.com/
VITE_GROQ_API_KEY=your_actual_groq_api_key_here
```

### 3. Generate PWA Assets
Run the programmatic canvas drawing script to output PWA icons (`icon-192.png` and `icon-512.png`) directly to the `/public` directory:
```bash
node generate-icons.js
```

### 4. Run Development Server
Start the local server:
```bash
npm run dev
```

### 5. Build for Production
To test the production build and verify the service worker configurations:
```bash
npm run build
npm run preview
```

---

## Mobile PWA Installation
When running in production on a mobile device, RetroVault will trigger a custom index-card banner prompting you to add the app to your Home Screen for a standalone fullscreen viewport experience.
