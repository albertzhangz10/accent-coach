# Accent Coach

An English pronunciation coaching app that runs as a **web PWA** and on **iOS / Android**. Pick a lesson, listen to a neural reference voice, record yourself, and get **word-by-word** and **phoneme-level** feedback powered by Azure's Speech Pronunciation Assessment API.

The web version works in any modern browser and can be added to your home screen as a PWA. The mobile version runs via Expo Go — no Apple Developer account required.

*中文版: [README.md](README.md)*

---

## Features

- **~42 lessons** across 6 weeks, from foundation sounds to near-native polish (flap T, dark L, nasal T, TR/DR affrication, weak forms, prosody)
- **Per-word scoring** with inline highlighting of the phrase you spoke
- **Per-phoneme IPA feedback** — "your /θ/ sounded like /s/"
- **"Focus on" coaching cards** with mechanical tips per weak sound and tappable examples
- **Azure Neural TTS** reference voices (8 American + British, friendly-styled SSML)
- **Prosody / intonation scoring**
- **Progress tracking** — streaks, per-lesson best scores, day-by-day curriculum
- **Full VoiceOver support**, Reduce Motion respected, WCAG-AA contrast
- **Haptics** throughout; cancelable scoring; graceful mic-permission recovery
- **Bilingual UI** (English / 中文) — switch in settings, preference saved automatically
- Dark theme, onboarding flow, language and voice picker in Settings

---

## Tech stack

**Backend** (`/`): Next.js 14, Node 18+, TypeScript
- `app/api/score-audio` — receives WAV, forwards to Azure Speech Pronunciation Assessment REST, returns normalized scores (with IPA phonemes, top-5 alternatives, prosody)
- `app/api/tts` — Azure Neural TTS with in-memory LRU cache + retry/backoff

**Mobile** (`/mobile`): Expo SDK 54, React Native 0.81, expo-router, expo-audio, expo-haptics, AsyncStorage

**External services**: Azure Cognitive Services — Speech (Pronunciation Assessment + Neural TTS)

---

## Prerequisites

Before you start, make sure you have:

1. **Node.js 18 or newer** — [download](https://nodejs.org)
2. **(Mobile only)** An iPhone or Android phone on the same Wi-Fi network as your computer
3. **(Mobile only)** Expo Go installed from the App Store or Google Play
4. **A free Azure account** — https://azure.microsoft.com/free (needed for the Speech service). A **Visa or MasterCard** is required for identity verification during registration (no charges will be made)
5. **`git`** (comes with Xcode Command Line Tools on macOS)

That's it. You don't need Xcode, don't need an Apple Developer account, don't need a paid Azure plan.

---

## Get your Azure Speech keys (5 minutes, free)

1. Sign in at https://portal.azure.com
2. In the top search bar type **Speech services** and click **Create**
3. Fill in:
   - **Subscription**: your default (free trial is fine)
   - **Resource group**: create a new one, e.g. `accent-coach-rg`
   - **Region**: pick a region near you, e.g. `East US`
   - **Name**: any globally-unique name, e.g. `accent-coach-yourname-1`
   - **Pricing tier**: **Free F0** (5 audio hours/month free + 500k TTS characters/month free)
4. Click **Review + create** → **Create**. Wait ~30 seconds for deployment.
5. Open the resource → click **Keys and Endpoint** in the left sidebar
6. Copy **KEY 1** and note the **Location/Region** (e.g. `eastus`)

The free tier is generous enough for solo / personal use — you will not hit the limits.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/accent-coach.git
cd accent-coach

# Install backend deps
npm install

# Install mobile deps
cd mobile
npm install
cd ..
```

### 2. Configure Azure credentials

In the **project root** (not `mobile/`), create a file called `.env.local`:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your Azure key and region:

```
AZURE_SPEECH_KEY=paste-your-key-1-here
AZURE_SPEECH_REGION=eastus
```

⚠️ **Never commit this file.** It's already in `.gitignore`, but double-check if you fork this project.

### 3. Start the backend

From the project root:

```bash
npm run dev
```

This starts Next.js on **http://0.0.0.0:3001** (port 3000 is often taken). It binds to all network interfaces so your phone can reach it over Wi-Fi.

Leave this terminal running.

### 4. Start the Expo mobile dev server

Open a **second terminal**:

```bash
cd mobile
npm start
```

Metro will boot on port 8081. Leave this running too.

### 5. Connect your iPhone

1. Open **Expo Go** on your phone
2. Make sure your phone is on the **same Wi-Fi network** as your Mac
3. In Expo Go, tap **"Enter URL manually"** and type:
   ```
   exp://YOUR_MAC_LAN_IP:8081
   ```
   To find your Mac's LAN IP, run `ipconfig getifaddr en0` in a terminal.
4. Tap **Connect**. The first bundle takes ~30 seconds to compile, then the app launches.
5. Allow microphone permission when prompted.

**Alternative**: open Safari on your iPhone and visit `http://YOUR_MAC_LAN_IP:8081` — it'll prompt to open in Expo Go.

---

## Deploy to Vercel (optional)

If you prefer not to run the backend locally, you can deploy to Vercel in one click:

1. **Fork the repo**: Fork `albertzhangz10/accent-coach` to your own GitHub account
2. **Import to Vercel**: Sign in at [vercel.com](https://vercel.com), click **"Add New Project"**, and select your forked `accent-coach` repo
3. **Set environment variables**: In the deployment UI under **"Environment Variables"**, add your Azure credentials (required — the API will fail without them):
   ```
   AZURE_SPEECH_KEY = your-azure-key
   AZURE_SPEECH_REGION = your-azure-region (e.g. eastus)
   ```
4. Click **Deploy** and wait for it to finish. Vercel will assign you a domain — you can start using the app immediately

---

## Using the app

1. First launch runs a 3-step onboarding
2. Home screen groups lessons by level — start with Week 1 Beginner lessons and work forward linearly
3. In a lesson, tap **Listen** to hear the reference phrase, then **Record** and say it. Tap **Stop** when done.
4. You'll see per-word scores, a highlighted sentence, and a "Focus on these words" box with phoneme tips and tappable examples
5. Tap any colored word in the highlighted sentence to hear just that word spoken
6. Tap the gear icon (top-right) to switch **interface language** (English / 中文) and **reference voice**

Your progress is saved locally on-device only — no account, no cloud sync.

---

## Troubleshooting

**"Cannot connect" when opening `exp://...` in Expo Go**
- Phone and Mac must be on the same Wi-Fi network (not one on a guest SSID)
- macOS firewall: System Settings → Network → Firewall → either off, or allow Node
- Check `ipconfig getifaddr en0` returns an IP on the same subnet as your phone

**Scores come back as 0 with transcript populated**
- Means Azure recognized the audio but didn't run pronunciation assessment
- Check the Next.js terminal for `[score-audio]` logs — they print the Azure raw response
- Almost always a WAV format or sample rate issue

**"Azure not configured" error**
- You haven't created `.env.local` or the vars are wrong
- Restart `npm run dev` after editing `.env.local` — Next.js only reads env on startup
- Make sure there are no quotes around the key: `AZURE_SPEECH_KEY=abc123`, not `AZURE_SPEECH_KEY="abc123"`

**Microphone permission denied on iPhone**
- iPhone Settings → Privacy & Security → Microphone → Expo Go → turn on
- If you denied once, the in-app "Open Settings" button takes you there

**Volume too low / audio comes from earpiece**
- iOS routes audio through the earpiece after recording. The app resets the audio session before each playback, but if you still hit this, flip the physical ringer switch on your iPhone to ON (no orange stripe) and press volume-up while audio is playing.

**TTS returns 401 Unauthorized**
- Your Azure key is wrong, expired, or from a different region than `AZURE_SPEECH_REGION`
- Go to Azure portal → Speech resource → Keys and Endpoint → regenerate Key 1 and re-paste

---

## Cost

For solo personal use, this runs at **$0/month**. Azure's free tier F0 includes:
- **5 audio hours/month** of Pronunciation Assessment (roughly 3,600 attempts)
- **500,000 characters/month** of Neural TTS

You'd need heavy daily practice to exceed either limit. The mobile app caches TTS responses in the backend so repeated "Listen" taps on the same phrase cost zero Azure calls.

If you hit the limits, upgrading to the Standard S0 tier is pay-as-you-go at about **$1/audio hour** for Pronunciation Assessment and **$16/1M characters** for Neural TTS.

---

## License

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

- **You may**: copy, modify, and redistribute for personal and non-commercial use
- **You must**: give credit to the original author, indicate changes, and release derivative works under the same license (ShareAlike)
- **You may not**: use this project for any commercial purpose (including but not limited to charging fees, ad monetization, or paid add-ons)

For commercial licensing, contact the project author.

---

## Acknowledgements

Inspired by commercial accent-coaching apps. The pronunciation feedback loop is powered by Microsoft Azure Cognitive Services. Icons by Ionicons (bundled with Expo).
