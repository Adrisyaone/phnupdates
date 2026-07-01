# Public Health Updates (phnupdates)

A comprehensive public health information and resource app built with React Native and Expo. The app supports public health professionals, students, and researchers with news, job opportunities, exam preparation, knowledge resources, and practical tools.

**Version:** 2.0.0  
**Platform:** Android, iOS, and Web (Expo)  
**Bundle ID:** `app.publichealthnepalupdates.com`  
**Framework:** Expo Router + React Native  
**Owner:** Adrisya (EAS project: `phnupdates`)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [App Structure](#app-structure)
- [Screens & Navigation](#screens--navigation)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

Public Health Updates is a mobile platform for the public health community. It aggregates blog posts, job listings, research tools, exam resources, and daily health awareness content in one app. Content is fetched live from the phnupdates Blogger site and a Google Apps Script-based job portal, with AI-powered exam tools powered by the Gemini API.

---

## Features

### Home Dashboard
- **Hero banner** with app branding and tagline
- **Daily Health Tip** — rotating tip with AI-powered detailed guidance on tap
- **Public Health Days Calendar** — today's awareness days + monthly list with navigation
- **Quote of the Day** — daily rotating public health quote
- **Latest News** — live-fetched recent public health news cards
- **Job Portal Preview** — active job listings with deadlines
- **New Opportunities** — recent vacancy, grant, scholarship, and call-for-paper posts
- **Menu Grid** — icon grid for quick navigation to all app sections
- **Side Drawer** — swipe-right or tap Menu for full navigation

### News & Content
- Public health news articles from [phnupdates.com](https://phnupdates.com)
- Opportunities: vacancies, grants, scholarships, expression of interest, call for papers
- Reports & Documents: international and national public health documents
- Fact Sheets: scales, policies, and public health dashboard facts
- Literature: stories, poems, and creative public health writing
- Knowledge Hub: curated articles per category

### Job Portal
- Live job listings from a Google Apps Script backend
- Filter by organization, type, and deadline
- Save interested jobs with deadline reminder notifications
- Deadline tracking with visual indicators

### Exam Preparation
- **Syllabus** viewer for public health exams
- **Practice MCQs** with answer reveal
- **Random Quiz** mode
- **AI Quiz** — AI-generated questions via Gemini API
- **AI Tutor** — conversational exam help powered by Gemini
- **Flashcards** for key concepts
- **Progress** tracking across sessions

### Books & References
- Recommended public health books and references

### Tools
| Tool | Description |
|---|---|
| **Calorie Estimation** | AI-powered calorie estimation from food description, photo, or voice |
| **BMI Calculator** | Calculate BMI from height and weight |
| **Measurement Converter** | Convert between common health measurement units |
| **Date Converter** | Convert between BS (Bikram Sambat) and AD dates |
| **CamScanner** | Scan documents with the camera and export as PDF |
| **PDF Converter** | Merge, split, compress PDF files |
| **Image Size** | Resize images for form submissions and uploads |

### Knowledge Hub
- Curated health articles from the Blogger API filtered by NCD conditions
- In-app browser for reading full articles
- Category tabs: blog posts, videos, health tips

### Keep Notes
- Day-wise personal notes for researchers and professionals

### Selected Blogs
- Bookmarked / selected posts grouped by category

### Settings
- Theme: Light / Dark mode
- Language: English, Español, Nepali
- Feature visibility: toggle individual home screen sections on/off
- Notification reminders: health tips, quote of the day, public health day alerts, job deadline alerts
- Customizable reminder times (morning / afternoon / evening / custom)
- App update button linking to Play Store

### About Us
- Profile of Bikram Adhikari (founder/author)
- Publication list
- Computer skills and competencies
- Social links: Facebook page, Facebook group, Blog site

---

## App Structure

```
app/
  _layout.tsx                      # Root layout with notifications and theme providers
  onboarding.tsx                   # First-launch onboarding
  settings.tsx                     # Settings screen (theme, language, notifications, features)
  about-us.tsx                     # About the author and app
  privacy-policy.tsx               # Privacy policy
  web-viewer.tsx                   # In-app browser modal
  public-health-day.tsx            # AI-powered public health day detail screen
  +not-found.tsx                   # 404 fallback screen
  +native-intent.tsx               # Native intent redirect handler
  (tabs)/
    _layout.tsx                    # Tab stack layout
    knowledge.tsx                  # Knowledge Hub (articles, videos, tips)
    (home)/
      _layout.tsx                  # Home stack with all sub-screen registrations
      index.tsx                    # Dashboard (hero, news, jobs, menu grid, drawer)
      category.tsx                 # Blog post category listing
      jobs.tsx                     # Job/opportunity listings
      job-portal.tsx               # Job portal (main portal view)
      books.tsx                    # Books and references
      calculator.tsx               # Calculator hub (links to sub-tools)
      calorie-estimator.tsx        # AI calorie estimation tool
      bmi-calculator.tsx           # BMI calculator
      measurement-converter.tsx    # Unit conversion tool
      date-converter.tsx           # BS/AD date converter
      camscanner.tsx               # Camera-based document scanner
      pdf-converter.tsx            # PDF merge/split/compress tool
      pdf-tools.tsx                # PDF action screen (used by pdf-converter)
      image-size.tsx               # Image resizing tool
      keep-notes.tsx               # Personal note-keeping screen
      selected-blogs.tsx           # Bookmarked posts screen
      interested.tsx               # Saved/interested posts per menu
      exam-preparation/
        _layout.tsx                # Exam preparation stack layout
        index.tsx                  # Exam prep hub
        syllabus.tsx               # Syllabus viewer
        practice-mcqs.tsx          # Practice multiple choice questions
        random-quiz.tsx            # Random quiz mode
        ai-quiz.tsx                # AI-generated quiz (Gemini)
        tutor.tsx                  # AI tutor chat (Gemini)
        flashcards.tsx             # Flashcard viewer
        progress.tsx               # Progress tracker
        settings.tsx               # Exam prep settings

constants/
  colors.ts                        # Light/dark color palettes and themedStyles helper
  blogMenus.ts                     # Dashboard menu definitions and theme colors
  config.ts                        # App config (version, update URL, default goals)
  publicHealthDays.ts              # Full list of public health awareness days
  publicHealthQuotes.ts            # Curated public health quotes
  translations.ts                  # Multi-language strings (EN, ES, NE)
  security.ts                      # Input sanitization and validation utilities

services/
  bloggerApi.ts                    # Blogger API: fetch posts by label, extract images/excerpts
  jobPortal.ts                     # Google Apps Script job portal API
  publicHealthDayInfo.ts           # AI summary generator for public health days
  healthTipInfo.ts                 # AI detailed health tip generator
  interestedPosts.ts               # AsyncStorage for saved/interested posts
  calorieEstimation.ts             # AI calorie estimator (text + image)
  notificationQuickLogState.ts     # Notification access token state
  appUpdate.ts                     # App version and update utilities
  youtubeApi.ts                    # YouTube API for knowledge hub videos

contexts/
  SettingsContext.tsx              # Theme, language, notifications, feature flags, settings persistence
  FoodContext.tsx                  # User profile and food tracking (used by calorie/BMI tools)

components/
  FloatingVoiceButtons.tsx         # Floating action button (voice, camera, manual entry)
  AppLockScreen.tsx                # PIN / biometric lock screen

mocks/
  healthTips.ts                    # Curated health tips array
```

---

## Screens & Navigation

The app uses a single-stack navigation rooted at `(tabs)`, accessed via the home drawer. There is no bottom tab bar — all navigation flows from the home screen drawer and grid menu.

| Section | Route | Description |
|---|---|---|
| **Home** | `/(tabs)/(home)` | Dashboard with news, jobs, menu grid |
| **Knowledge** | `/(tabs)/knowledge` | Articles, videos, tips by condition |
| **Category** | `/(tabs)/(home)/category` | Blog posts by menu/submenu key |
| **Jobs** | `/(tabs)/(home)/jobs` | Job and opportunity listings |
| **Job Portal** | `/(tabs)/(home)/job-portal` | Full job portal |
| **Books** | `/(tabs)/(home)/books` | Recommended books |
| **Calculator** | `/(tabs)/(home)/calculator` | Tools hub |
| **Exam Prep** | `/(tabs)/(home)/exam-preparation` | Exam prep suite |
| **Keep Notes** | `/(tabs)/(home)/keep-notes` | Personal notes |
| **Selected Blogs** | `/(tabs)/(home)/selected-blogs` | Saved posts |
| **Settings** | `/settings` | App preferences |
| **About Us** | `/about-us` | Author profile and links |
| **Public Health Day** | `/public-health-day` | AI detail page for awareness days |
| **Web Viewer** | `/web-viewer` | In-app browser (modal) |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React Native 0.81** | Cross-platform mobile framework |
| **Expo SDK 54** | Development platform and native APIs |
| **Expo Router 6** | File-based navigation |
| **TypeScript** | Type-safe development |
| **React Query (TanStack)** | Async data fetching and caching |
| **Zustand** | Lightweight state management |
| **AsyncStorage** | Local data persistence |
| **Zod** | Schema validation for API responses |
| **@rork-ai/toolkit-sdk** | AI image and voice processing |
| **Lucide React Native** | Icon library |
| **expo-image** | Optimized image rendering |
| **expo-camera** | Document scanning (CamScanner) |
| **expo-image-picker** | Gallery and camera access |
| **expo-notifications** | Local notification reminders |
| **expo-web-browser** | In-app browser for articles |
| **expo-document-picker** | File import for PDF tools |
| **expo-file-system** | File reading and writing |
| **expo-print** | PDF generation from scanned pages |
| **react-native-web** | Web platform support |
| **react-native-ble-plx** | Bluetooth (reserved for future device features) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- npm or [Bun](https://bun.sh)

### Installation

```bash
# Clone the repository
git clone https://github.com/Adrisyaone/phnupdates

# Install dependencies
npm install

# Start development server (LAN)
npm run start

# Start web preview
npm run start-web
```

### Run on Device

1. Install **Expo Go** on iOS or Android
2. Run `npm run start` and scan the QR code

### Build for Web (Netlify)

```bash
npm run build:web
# Output is in the /dist folder
# Deploy via Netlify dashboard or CLI
```

---

## Configuration

### app.json Key Settings

| Field | Value |
|---|---|
| App name | `Public Health Updates` |
| Slug | `phnupdates` |
| Bundle ID | `app.publichealthnepalupdates.com` |
| EAS Project | `8629caf7-00cb-4d2d-a7fc-a39cd6705d1e` |
| Owner | `adrisya` |

### Environment Variables (`app.json` → `extra`)

| Key | Purpose |
|---|---|
| `examPreparation.gasUrl` | Google Apps Script for MCQ data |
| `examPreparation.flashcardsGasUrl` | Google Apps Script for flashcard data |
| `examPreparation.geminiApiKey` | Gemini API key for AI quiz/tutor |
| `examPreparation.geminiModel` | Gemini model name (default: `gemini-1.5-flash`) |
| `jobPortal.jobPortalGasUrl` | Google Apps Script for job listings |

### Supported Languages

| Language | Code |
|---|---|
| English | `en` |
| Español | `es` |
| Nepali | `ne` |

---

## Deployment

### Android (Google Play)

```bash
npm install -g eas-cli
eas build --platform android
eas submit --platform android
```

### iOS (App Store)

```bash
eas build --platform ios
eas submit --platform ios
```

### Web (Netlify)

The repo includes a `netlify.toml` configured for web builds:

```toml
[build]
  command = "npm run build:web"
  publish = "dist"
```

1. Push the repo to GitHub
2. Connect to Netlify and import the project
3. Netlify auto-reads `netlify.toml` — no extra config needed
4. Deploy → live at `https://your-site.netlify.app`

---

## Troubleshooting

### App not loading on device?
- Ensure phone and computer are on the same Wi-Fi network
- Try tunnel mode: `npm run start-tunnel`

### Build failing on Netlify?
- Verify the **Base directory** in Netlify dashboard is empty (not `phnupdates`)
- The project root is the build root — `netlify.toml` handles the rest

### AI features not working?
- Check that `geminiApiKey` is set in `app.json → extra.examPreparation`
- AI quiz, tutor, health tip details, and public health day summaries all require a valid Gemini API key

### Job portal not loading?
- Verify `jobPortalGasUrl` in `app.json → extra.jobPortal` points to a deployed Google Apps Script web app
- The GAS endpoint must be deployed as "Execute as: Me" and "Who has access: Anyone"

### Notifications not working?
- Grant notification permissions when prompted
- On Android, ensure battery optimization is not blocking background notifications
- Notifications require a physical device (not web preview)

### CamScanner / PDF tools not available on web?
- These features require native camera and file system access
- Use the Android or iOS app for document scanning and PDF tools

---

## License

This project is private and proprietary.

## Contact

- **Website:** [phnupdates.com](https://phnupdates.com)
- **Facebook:** [facebook.com/phnupdates](https://www.facebook.com/phnupdates)
- **WhatsApp/Viber:** +977-9849746375
- **Blog:** [phnupdates.blogspot.com](https://phnupdates.blogspot.com)
