# HealthyME

A comprehensive health and wellness management app built with React Native and Expo. HealthyME helps users track nutrition, medications, physical activity, fasting, weight, blood pressure, blood glucose, pulse, and more — all in one place.

**Version:** 1.1.0  
**Platform:** Native iOS & Android app, exportable to web  
**Bundle ID:** `app.healthyme.health`  
**Framework:** Expo Router + React Native  

**Funded by:** [PH-cares Changemakers Grant](https://www.memphis.edu/publichealth/initiatives/ph-cares-changemakers/about-phcc.php), School of Public Health, University of Memphis

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [App Structure](#app-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Screens & Navigation](#screens--navigation)
- [Data Management](#data-management)
- [Integrations](#integrations)
- [Security](#security)
- [Localization](#localization)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

HealthyME is a cross-platform mobile health companion designed for individuals managing non-communicable diseases (NCDs) such as diabetes, hypertension, heart disease, COPD, and more. The app provides personalized health tracking, AI-powered food and medication recognition, curated health content, validated health assessments, smart device integration, and actionable insights — all stored locally on-device for privacy.

---

## Features

### Dashboard
- Daily health overview with calorie intake, calories burned, and net balance
- Personalized daily calorie requirement based on profile (Mifflin-St Jeor & Harris-Benedict equations)
- **Scoreboard** showing blood pressure, blood glucose, and pulse at a glance
- Calorie intake vs. burned chart with 7-day history
- BMI display with health category indicator
- Macro nutrient breakdown (protein, carbs, fat) with progress bars
- **Pulse chart** with trend visualization
- Blood pressure chart, weight/BMI chart, blood glucose chart
- Nutrient trends and calories burned charts
- Fasting savings tracker (daily and total savings in selected currency)
- Medication adherence overview
- Assessment scores summary
- Calendar history view
- Quick-access health tips from curated content
- **Quick links** at the bottom of dashboard: pulse measurement (camera-based, no record saved), smart devices shortcut
- Tap-to-navigate: dashboard cards link directly to their respective detail pages
- **Customizable widgets**: show/hide any dashboard chart or scoreboard from Settings

### Pulse Measurement (Quick Link)
- Camera-based pulse measurement using flashlight and camera
- Real-time pulse detection without saving records
- Accessible from dashboard quick links section
- Separate from pulse tracking in the Tracker page (which saves records)

### Nutrition Tracking
- Log food entries by meal type (breakfast, lunch, dinner, snack)
- AI-powered calorie estimation from food photos using camera or gallery
- Voice-based food entry via floating action button
- Manual food entry with full macro details
- Per-meal breakdown and daily totals
- Editable entries with inline editing support

### Medication Management
- Add medications manually or via AI image recognition (identifies name, dosage, unit, and category from photo)
- Configurable frequency: daily, twice daily, three times daily, weekly, as needed
- Customizable dose times with labels (morning, afternoon, evening, etc.)
- Medication adherence tracking with taken/missed/skipped status
- Refill reminders and supply tracking
- Color-coded medications for quick visual identification
- Medication categories: prescription, OTC, supplement, vitamin

### Activity Tracking
- Log physical activities: walking, running, cycling, swimming, gym, sports, and more
- Intensity levels: light, moderate, vigorous
- MET-based calorie burn calculation personalized to user weight
- Activity history with daily summaries

### Weight Tracking
- Log weight entries over time
- Automatic BMI calculation based on height from profile
- Weight trend visualization

### Blood Pressure Monitoring
- Log systolic, diastolic, and pulse readings
- Track blood pressure history and trends
- Interactive line charts with touch-to-inspect data points

### Blood Glucose Monitoring
- Record blood glucose levels (fasting, random, post-prandial)
- Support for mg/dL and mmol/L units
- View glucose history and patterns

### Intermittent Fasting
- Preset fasting schedules: 12:12, 14:10, 16:8, 18:6, 20:4, OMAD, 36h, custom
- Active fasting timer with start/stop controls
- Fasting session history
- Monetary savings calculator: configurable rate per hour of fasting
- Customizable currency (USD, NPR, EUR, GBP, INR, etc.)
- Persistent fasting notification on mobile devices
- Net savings displayed on dashboard

### Meal Planning
- Daily meal planner with meal assignment
- Diet recommendations and recipe suggestions
- Activity planning section
- Calorie-aware meal suggestions

### Knowledge Hub
- Curated health articles from Blogger API (phnupdates.com)
- YouTube video integration from @HealthyMe4u channel
- Daily rotating health tips filtered by user's NCD conditions
- Category-based content filtering
- In-app browser for reading articles

### Health Assessments (More Tab)
- **PHQ-9** — Depression screening
- **GAD-7** — Anxiety screening
- **ASCVD Risk** — Cardiovascular risk assessment
- **DSMQ** — Diabetes self-management questionnaire
- **Framingham Risk Score** — Heart disease risk estimation
- **AUDIT** — Alcohol use screening
- **PSQI** — Sleep quality assessment
- Score-based results with color-coded severity ranges and actionable descriptions
- All tools reference validated clinical instruments

### Profile & Settings
- User profile: name, age, gender, height, weight, activity level, profile photo
- NCD condition selection (diabetes, hypertension, heart disease, COPD, asthma, kidney disease, etc.)
- Customizable daily nutrition goals (calories, protein, carbs, fat)
- **Dashboard widget visibility**: choose which charts and scoreboard cards to display
- Notification settings: activity reminders, calorie alerts, evening reminders, health tip reminders
- App lock with PIN and biometric authentication (Face ID / Touch ID)
- Floating action button customization: choose which quick-entry tabs to show
- Fasting savings rate and currency configuration
- **Smart device management**: add, configure, sync, and remove connected devices
- **Data import**: support for CSV, XLSX (parsed as CSV), and JSON file import
- Data export (JSON) and clear all data options
- Multi-language support
- **Collapsible sections** with dropdown arrows for organized layout
- **Logical section ordering**: Personal Info, Nutrition Goals, Dashboard Widgets, Notifications, Floating Button, Fasting Savings, Smart Devices, App Security, Language, Data Management, About
- Time zone aware: all timestamps adapt to user's current time zone

### Smart Device Integration
- Link smartwatches, blood pressure monitors, scales, and glucose meters
- Configure which metrics each device syncs (pulse, blood pressure, weight, glucose)
- Simulated sync pulls average daily measurements into the app
- Device management: add, edit connection settings, remove devices
- Quick access from dashboard quick links

### Floating Action Button
- Quick-entry floating button accessible from any tab
- Supports voice input, camera-based entry, and manual forms
- Configurable tabs: food, activity, weight, medication, blood pressure, blood glucose, fasting
- Inline editing within floating tab pages for all entry types
- AI-powered image recognition for food (calorie estimation) and medications (name/dosage/unit/category detection)

### Onboarding
- Step-by-step setup wizard on first launch
- Collects profile info, NCD conditions, activity level
- Optional app lock setup with PIN and biometrics
- Personalized goal calculation based on profile

---

## App Structure

```
app/
  _layout.tsx                    # Root layout with providers
  onboarding.tsx                 # First-launch onboarding wizard
  add-food.tsx                   # Detailed food entry screen
  +not-found.tsx                 # 404 screen
  (tabs)/
    _layout.tsx                  # Tab navigator (7 tabs with swipe support)
    (home)/
      _layout.tsx                # Home stack layout
      index.tsx                  # Dashboard screen
    tracker/
      _layout.tsx                # Tracker stack layout
      index.tsx                  # Tracker hub (links to sub-trackers)
      activities.tsx             # Activity logging & history
      blood-glucose.tsx          # Blood glucose tracking
      blood-pressure.tsx         # Blood pressure tracking
      calories.tsx               # Calorie tracking details
      fasting.tsx                # Intermittent fasting tracker
      weight.tsx                 # Weight & BMI tracking
    planner/
      _layout.tsx                # Planner stack layout
      index.tsx                  # Planner hub
      activity-plan.tsx          # Activity planning
      diet.tsx                   # Diet & meal planning
    medications.tsx              # Medication management
    knowledge.tsx                # Knowledge hub (articles, videos, tips)
    more.tsx                     # Health assessments & tools
    profile.tsx                  # Profile, settings, preferences, smart devices

components/
  AppLockScreen.tsx              # PIN / biometric lock screen
  CalorieNotificationWatcher.tsx # Monitors calorie intake for alerts
  FloatingVoiceButtons.tsx       # Floating action button with multi-tab quick entry
  FoodCard.tsx                   # Food entry card component
  InfoTooltip.tsx                # Tooltip component
  InteractiveLineChart.tsx       # Touch-interactive SVG line chart with data point inspection
  MacroBar.tsx                   # Macro nutrient progress bar
  ProgressRing.tsx               # Circular progress indicator
  WelcomeModal.tsx               # Welcome/intro modal

contexts/
  FoodContext.tsx                # Food, activity, weight entries, user profile, import/export
  MealPlanContext.tsx            # Meal planning state management
  MedicationContext.tsx          # Medication & adherence state management
  SettingsContext.tsx            # Language, notifications, app lock, floating tabs, fasting savings, dashboard widgets, smart devices

constants/
  colors.ts                     # App color palette
  config.ts                     # Default goals, profile, activity types & MET values
  security.ts                   # PIN hashing, brute force protection, data validation, input sanitization
  translations.ts               # Multi-language translations (EN, ES, NE)

services/
  bloggerApi.ts                 # Blogger API integration for health articles
  calorieEstimation.ts          # AI-powered food calorie estimation
  medicationImageRecognition.ts # AI-powered medication identification from images
  youtubeApi.ts                 # YouTube API integration for health videos

mocks/
  assessments.ts                # Clinical assessment questionnaires (PHQ-9, GAD-7, etc.)
  healthTips.ts                 # Curated health tips by NCD category

types/
  food.ts                       # TypeScript interfaces for all data models
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React Native 0.81** | Cross-platform mobile framework |
| **Expo SDK 54** | Development platform and native APIs |
| **Expo Router** | File-based navigation and routing |
| **TypeScript** | Type-safe development |
| **React Query** | Server state management |
| **@nkzw/create-context-hook** | Context-based state management |
| **AsyncStorage** | Local data persistence |
| **@rork-ai/toolkit-sdk** | AI-powered food & medication image recognition |
| **Zod** | Schema validation for AI responses |
| **Lucide React Native** | Icon library |
| **expo-image** | Optimized image rendering |
| **expo-image-picker** | Camera and gallery access |
| **expo-camera** | Camera-based pulse measurement |
| **expo-av** | Audio recording for voice input |
| **expo-haptics** | Haptic feedback |
| **expo-notifications** | Local notifications and reminders |
| **expo-local-authentication** | Biometric authentication (Face ID / Touch ID) |
| **expo-linear-gradient** | Gradient backgrounds |
| **expo-web-browser** | In-app browser for articles |
| **expo-document-picker** | File import (CSV, JSON) |
| **expo-file-system** | File reading for data import |
| **expo-crypto** | Secure PIN hashing (SHA-256) |
| **react-native-svg** | SVG rendering for interactive charts and progress rings |

---

## Getting Started

### Prerequisites

- [Node.js](https://github.com/nvm-sh/nvm) (v18+)
- [Bun](https://bun.sh/docs/installation) package manager

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
bun install

# Start the development server
bun run start

# Start web preview
bun run start-web
```

### Running on Device

1. **iOS:** Download [Expo Go](https://apps.apple.com/app/expo-go/id982107779) or the [Rork app](https://apps.apple.com/app/rork) from the App Store
2. **Android:** Download [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Google Play
3. Run `bun run start` and scan the QR code with your device

### Running in Browser

```bash
bun run start-web
```

Note: The browser preview is great for quick testing, but some native features (biometrics, camera-based pulse, notifications, etc.) may not be available.

### iOS Simulator / Android Emulator

If you have Xcode (iOS) or Android Studio installed:

```bash
# iOS Simulator
bun run start -- --ios

# Android Emulator
bun run start -- --android
```

---

## Screens & Navigation

The app uses a **7-tab navigation** layout with swipe gesture support between tabs:

| Tab | Icon | Description |
|---|---|---|
| **Dashboard** | Home | Health overview, scoreboard (BP, glucose, pulse), charts, calorie stats, fasting savings, quick links, tips |
| **Tracker** | Activity | Hub for all health trackers (calories, weight, BP, glucose, fasting, activities) |
| **Meds** | Pill | Medication management with adherence tracking |
| **Planner** | CalendarDays | Meal planning and activity scheduling |
| **Knowledge** | BookOpen | Health articles, videos, and daily tips |
| **More** | ClipboardList | Health assessments and screening tools |
| **Profile** | User | Profile settings, goals, dashboard widgets, notifications, smart devices, app lock, data management |

### Additional Screens (outside tabs)

- **Onboarding** — First-launch profile setup wizard
- **Add Food** — Detailed food entry with AI estimation

---

## Data Management

All data is stored **locally on-device** using AsyncStorage. No server or cloud sync is required.

### Storage Keys

| Key | Data |
|---|---|
| `healthme_food_entries` | Food intake entries |
| `healthme_goals` | Daily nutrition goals |
| `healthme_profile` | User profile information |
| `healthme_activities` | Activity/exercise entries |
| `healthme_weight` | Weight history |
| `healthme_onboarding_complete` | Onboarding completion flag |
| `healthme_medications` | Medication list |
| `healthme_medication_logs` | Medication adherence logs |
| `healthme_language` | Selected language |
| `healthme_notification_settings` | Notification preferences |
| `healthme_app_lock_settings` | App lock configuration |
| `healthme_floating_tabs` | Floating button tab preferences |
| `healthme_fasting_savings` | Fasting savings rate and currency |
| `healthme_dashboard_widgets` | Dashboard widget visibility settings |
| `healthme_smart_devices` | Connected smart device configurations |
| `healthme_donation_history` | Donation records |
| `blood_pressure_entries` | Blood pressure & pulse readings |
| `blood_glucose_entries` | Blood glucose readings |
| `fasting_data` | Current fasting session data |
| `fasting_history` | Completed fasting session history |
| `health_assessment_results` | Assessment scores and history |

### Data Import

Users can import health data from external files:
- **CSV** — Comma-separated values with header row
- **XLSX** — Parsed as CSV (text-based extraction)
- **JSON** — Direct JSON import of structured data

All imported data is validated for format, size (max 50,000 entries / 50MB), and sanitized against potentially unsafe content (XSS, script injection).

### Data Export & Reset

Users can export all their health data as JSON from the Profile screen. A "Clear All Data" option is also available with confirmation prompt.

---

## Integrations

### AI-Powered Features

- **Food Recognition:** Take a photo of food to automatically estimate calories and macros using AI image analysis via `@rork-ai/toolkit-sdk`
- **Medication Recognition:** Photograph medication packaging to auto-detect name, dosage, unit, and category. Displays "Unable to find medicine details" for unrecognizable images.
- **Voice Input:** Record voice descriptions of food, activities, or medications for quick logging

### Smart Device Integration

- Connect smartwatches, blood pressure monitors, digital scales, and glucose meters
- Configure per-device sync settings (pulse, BP, weight, glucose)
- Simulated Bluetooth sync pulls average daily measurements
- Synced data is automatically saved to respective tracking records
- Quick access to smart device settings from dashboard

### Content APIs

- **Blogger API:** Fetches health articles from [phnupdates.com](https://www.phnupdates.com) filtered by user's NCD conditions
- **YouTube Data API:** Pulls health videos from the [@HealthyMe4u](https://youtube.com/@HealthyMe4u) YouTube channel

---

## Security

### PIN & Biometric Authentication
- App lock with 4-digit PIN code
- Optional biometric authentication (Face ID / Touch ID) via `expo-local-authentication`
- PIN is hashed using SHA-256 (via `expo-crypto`) with salt before storage
- Fallback hash implementation for environments without crypto support

### Brute Force Protection
- Maximum 5 failed PIN attempts before 30-second lockout
- Extended 5-minute lockout after 10 failed attempts
- Attempt counter resets on successful authentication

### Data Validation & Sanitization
- All imported data is validated for format and size limits
- XSS and script injection detection in imported content
- String sanitization removes potentially dangerous HTML/JS patterns
- Sensitive data (PIN, passwords, tokens) redacted from logs

### On-Device Storage
- All health data stored locally via AsyncStorage
- No cloud transmission of personal health information
- API keys stored with basic obfuscation

---

## Localization

The app supports **3 languages**:

| Language | Code | Native Label |
|---|---|---|
| English | `en` | English |
| Spanish | `es` | Espanol |
| Nepali | `ne` | Nepali |

Language can be changed anytime from the Profile screen. All UI labels, headers, descriptions, dashboard widgets, charts, tracker pages, medication screens, and assessment tools are translated.

---

## Configuration

### Default Nutrition Goals

| Nutrient | Default Target |
|---|---|
| Calories | 2,000 kcal |
| Protein | 150g |
| Carbs | 250g |
| Fat | 65g |

### Activity Types & MET Values

The app uses MET (Metabolic Equivalent of Task) values for accurate calorie burn calculation:

| Activity | Light MET | Moderate MET | Vigorous MET |
|---|---|---|---|
| Walking | 3.0 | 4.3 | 5.0 |
| Running | 6.0 | 9.8 | 11.5 |
| Cycling | 4.0 | 6.8 | 10.0 |
| Swimming | 4.5 | 7.0 | 10.0 |
| Gym/Weights | 3.5 | 5.0 | 6.0 |
| Sports | 4.5 | 6.5 | 8.0 |
| Other | 3.0 | 5.0 | 7.0 |

### Fasting Savings

- Default rate: $1.00 per hour of fasting
- Configurable currency and rate from Profile screen
- Supported currencies: USD, NPR, EUR, GBP, INR, JPY, AUD, CAD, CHF, CNY, KRW, BRL, MXN, SGD, NZD, THB, PHP, IDR, ZAR, AED, SAR

### Dashboard Widgets

All dashboard sections can be individually shown or hidden from Profile > Dashboard Widgets:

| Widget | Default |
|---|---|
| Health Alerts | Shown |
| BP & Glucose Scoreboard | Shown |
| Weight & Height Cards | Shown |
| BMI Card | Shown |
| Blood Pressure Chart | Shown |
| Pulse Chart | Shown |
| Weight/BMI Chart | Shown |
| Blood Glucose Chart | Shown |
| Daily Calorie Requirement | Shown |
| Today Summary | Shown |
| Calorie Intake Chart | Shown |
| Nutrient Trends | Shown |
| Calories Burned Chart | Shown |
| Fasting Tracker | Shown |
| Medication Adherence | Shown |
| Assessment Scores | Shown |
| Calendar History | Shown |

### Supported NCD Conditions

Diabetes, Hypertension, Heart Disease, COPD, Asthma, Kidney Disease, Liver Disease, Thyroid Disorder, Cancer, Stroke, Arthritis, Depression, Anxiety, Obesity, Other

### Smart Device Types

| Type | Sync Capabilities |
|---|---|
| Smartwatch | Pulse, Blood Pressure |
| BP Monitor | Blood Pressure, Pulse |
| Scale | Weight |
| Glucose Meter | Blood Glucose |
| Other | Configurable |

---

## Deployment

### Publish to App Store (iOS)

```bash
bun i -g @expo/eas-cli
eas build:configure
eas build --platform ios
eas submit --platform ios
```

For detailed instructions, visit [Expo's App Store deployment guide](https://docs.expo.dev/submit/ios/).

### Publish to Google Play (Android)

```bash
eas build --platform android
eas submit --platform android
```

For detailed instructions, visit [Expo's Google Play deployment guide](https://docs.expo.dev/submit/android/).

### Publish as a Website

```bash
eas build --platform web
eas hosting:configure
eas hosting:deploy
```

Alternative web deployment options: **Vercel**, **Netlify**

---

## Troubleshooting

### App not loading on device?
1. Ensure your phone and computer are on the same WiFi network
2. Try tunnel mode: `bun start -- --tunnel`
3. Check firewall settings

### Build failing?
1. Clear cache: `bunx expo start --clear`
2. Reinstall dependencies: `rm -rf node_modules && bun install`
3. See [Expo Troubleshooting](https://docs.expo.dev/troubleshooting/build-errors/)

### Biometric authentication not working?
- Biometric auth requires a physical device with Face ID / Touch ID
- Not available in web preview or simulators without biometric support
- Falls back to PIN code when biometrics are unavailable

### Camera-based pulse measurement not working?
- Requires a physical device with camera and flashlight
- Not available in web preview
- Ensure camera permissions are granted
- Place finger firmly over the camera lens and flashlight

### AI image recognition returning errors?
- Ensure the image is clear and well-lit
- For medications, photograph the label/packaging directly
- For food, capture the entire plate/dish
- If recognition fails, the app displays "Unable to find details" and allows manual entry

### Smart device sync not working?
- Smart device integration uses simulated Bluetooth sync
- Ensure the device is added and configured in Profile > Smart Devices
- Check that desired metrics (pulse, BP, weight, glucose) are enabled for the device

### Data import failing?
- Supported formats: CSV (with header row), JSON (structured arrays/objects)
- Maximum 50,000 entries per import
- Maximum file size: 50MB
- Files must not contain potentially unsafe HTML/JavaScript content

### Need help with native features?
- Check [Expo's documentation](https://docs.expo.dev/) for native APIs
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started) for core components

---

## License

This project is private and proprietary.

## Built With

Built with [Rork](https://rork.com) — AI-powered native mobile app builder using React Native and Expo.
