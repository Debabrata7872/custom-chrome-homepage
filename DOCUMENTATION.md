# 📚 Documentation

> Complete guide for the Modern Dashboard project — setup, features, admin panel, and changelog.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [Admin Panel Guide](#admin-panel-guide)
- [Analytics](#analytics)
- [Responsive Design](#responsive-design)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Security & Performance](#security--performance)
- [Changelog](#changelog)

---

## Overview

A modern, fully responsive dashboard built as a browser new tab replacement. Features dynamic time-based backgrounds, motivational quotes, quick links, task management, live weather, and a powerful admin panel.

**Tech Stack:** React 18 · Firebase · Tailwind CSS · Vite · Lucide Icons · SweetAlert2 · @dnd-kit

---

## Quick Start

### Prerequisites

- Node.js 16+
- Firebase account
- OpenWeather API key (optional)

### Installation

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd custom-chrome-homepage-new

# 2. Install dependencies
npm install

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_OPENWEATHER_API_KEY=your_openweather_key
```

### Set Admin Email

Edit `src/constants.js`:

```javascript
export const ADMIN_EMAIL = "your-email@example.com";
```

---

## Features

### Dashboard

| Feature | Description |
|---------|-------------|
| Dynamic Backgrounds | Time-based images (morning / afternoon / evening / night) with blur effect |
| Real-time Clock | Live clock with timezone support |
| Live Weather | OpenWeather API integration with city search |
| Quick Links | Customizable grid with brand icons, drag-and-drop reorder |
| Task Management | Daily tasks with drag-and-drop, mark complete/incomplete |
| Daily Quotes | Motivational quotes rotating by day of year |

### Background Fallback System

```
1. Random daily image (based on day of year)
   ↓ if broken
2. Admin-selected default image
   ↓ if broken
3. First working image from the collection
```

### Admin Panel

| Tab | Features |
|-----|----------|
| Users | View all users, search, disable/enable, delete |
| Analytics | Daily/lifetime charts, leaderboard, time tracking |
| Backgrounds | Manage 4 time-period collections, set defaults, gallery view |
| Quotes | Add/delete quotes, stats dashboard, today's highlight |

---

## Admin Panel Guide

### Accessing the Panel

1. Sign in with the configured admin email
2. Click the admin icon in the header
3. Use the sidebar to navigate tabs

### Backgrounds Tab

**Add an image:**
1. Select a time period card (morning / afternoon / evening / night)
2. Paste an image URL into the input field
3. Click **Add**

**Set a default fallback image:**
1. Open the dropdown inside a collection card
2. Select the image to use as default
3. A yellow ★ DEFAULT badge appears on the selected image

**Delete an image:**
1. Hover over the image thumbnail
2. Click the trash icon
3. Confirm deletion

**Gallery view:**
- Click **View All** when a collection has more than 3 images
- Full-screen gallery with add/delete/default controls

### Quotes Tab

**Add a quote:** Type in the input and press Enter or click **Add Quote**

**Delete a quote:** Hover over a quote card → click **Delete**

**Copy a quote:** Hover over a quote card → click **Copy**

**Today's quote** is automatically highlighted with a purple badge and shown to all users.

### Users Tab

**Disable a user:** Click ⋮ menu → **Disable User** (locks them out)

**Enable a user:** Click ⋮ menu → **Enable User** (restores access)

**Delete a user:** Click ⋮ menu → **Delete User** (permanent, cannot be undone)

**Search:** Use the search bar to filter by name or email

### Analytics Tab

**Daily view** — Select a date to see:
- Hourly activity chart (24-hour breakdown)
- Which users were active and when they started
- Time spent per user on that day

**Lifetime view** — See:
- Last 14 days activity trend
- All-time leaderboard sorted by total time
- Average session time per user

> Users without a recorded start time are still included in the chart and leaderboard. Their "started at" column shows `—`.

---

## Analytics

### Data Fields (Firestore)

| Field | Type | Description |
|-------|------|-------------|
| `loginDates` | `string[]` | Dates user was active (`YYYY-MM-DD`) |
| `firstLogin_${date}` | `string` | ISO timestamp of first login on that date |
| `timeSpentByDate` | `object` | Minutes spent per date `{ "2026-04-27": 342 }` |
| `totalTimeSpent` | `number` | Lifetime total minutes |

### Chart Logic

**Daily mode** — For each hour (0–23):
- Includes all users active on the selected date
- If `firstLogin_${date}` exists: calculates exact hourly window
- If no timestamp: user is shown as active throughout the day

**Lifetime mode** — For each of the last 14 days:
- Counts unique active users per day
- Sums total time spent across all users

### Database Schema

```javascript
// globalConfig/settings
{
  morningImages:   [...urls],
  afternoonImages: [...urls],
  eveningImages:   [...urls],
  nightImages:     [...urls],
  quotes:          [...strings],

  // Default fallback images (added in v3.0.0)
  defaultMorning:   "url",
  defaultAfternoon: "url",
  defaultEvening:   "url",
  defaultNight:     "url"
}
```

---

## Responsive Design

### Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | 320–639px | Single column, touch-optimized |
| Tablet | 640–1023px | 2–3 columns, balanced |
| Desktop | 1024–1535px | 3–5 columns, full sidebar |
| Large | 1536px+ | 4–6 columns, generous spacing |
| 4K | 2560px+ | 6–8 columns, optimal layout |

### Mobile Optimizations

- Minimum 44px touch targets
- Stacked navigation (horizontal scroll on mobile)
- Compact padding and font sizes
- Safe area insets for notched devices
- No horizontal overflow

### Admin Panel Responsive Behavior

| Section | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Sidebar | Horizontal scroll | Horizontal scroll | Vertical sidebar |
| Stat cards | 2 columns | 2–4 columns | 4 columns |
| User cards | 1 column | 2 columns | 2 columns |
| Quote cards | 1 column | 1 column | 2 columns |
| Background grid | 2 columns | 2–3 columns | 4–5 columns |
| Analytics leaderboard | Compact | Shows "started" column | Full |

---

## Customization

### Background Blur

Adjust in `src/App.jsx`:

```jsx
filter: 'blur(3px)'   // Current — hides watermarks subtly
filter: 'blur(5px)'   // More aggressive
filter: 'blur(1px)'   // Barely noticeable
```

### Time Periods

| Period | Hours |
|--------|-------|
| Morning | 5am – 12pm |
| Afternoon | 12pm – 5pm |
| Evening | 5pm – 9pm |
| Night | 9pm – 5am |

### Colors (Admin Panel)

| Color | Usage |
|-------|-------|
| Purple | Today's quote, featured items |
| Blue | Info, navigation, links |
| Amber | Stats, warnings |
| Red | Delete, danger |
| Green | Active, success |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Images not loading | Check URL is accessible and ends with an image extension |
| Admin panel inaccessible | Verify `ADMIN_EMAIL` in `constants.js` matches your login email |
| Quotes not updating | Refresh page, check Firebase connection |
| Weather not showing | Check `VITE_OPENWEATHER_API_KEY` in `.env` |
| Tasks not saving | Check Firebase connection and authentication |
| Analytics missing users | Users without `firstLogin_${date}` still appear — "started" shows `—` |

### Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ ✅ |
| Firefox | 88+ ✅ |
| Safari | 14+ ✅ |
| Edge | 90+ ✅ |
| Mobile (iOS/Android) | 14+ / 10+ ✅ |

---

## Security & Performance

### Security

- Firebase Authentication (email/password + Google)
- Firestore security rules for data isolation
- Admin-only access via `ADMIN_EMAIL` constant
- All secrets stored in `.env` (never committed)
- HTTPS only

### Performance Targets

| Metric | Target |
|--------|--------|
| Load time | < 3s |
| First Contentful Paint | < 1.8s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| First Input Delay | < 100ms |

### Optimization Techniques

- GPU-accelerated blur (`transform: scale(1.05)` + `filter: blur`)
- CSS transitions instead of JS animations
- Debounced Firestore writes (1.5s delay)
- Lazy image loading
- Tree-shaking via Vite

---

## Changelog

### [3.1.1] — 2026-04-27

#### Fixed
- **Analytics chart** was only showing 1 user in daily view even when 3 were active. Root cause: chart filtered out users without a `firstLogin_${date}` timestamp. Now all users active on the selected date are included; those without a timestamp are assumed active throughout the day.
- **"Started at" column** in the analytics leaderboard was hidden on tablets (`md` breakpoint). Changed to `sm` so it's visible on tablets and desktops.

---

### [3.1.0] — 2026-04-27

#### Added
- **Dynamic analytics charts** — Daily view now shows an hourly breakdown (24-hour chart) for the selected date; Lifetime view shows the last 14 days trend. Charts update when toggling between modes.
- **Mobile-first admin panel** — Improved responsive layout across all tabs (Users, Analytics, Backgrounds, Quotes).
- Responsive stat cards (2-column on mobile, 4-column on desktop).
- Stacked controls layout on mobile with full-width buttons.
- Compact leaderboard rows with adaptive column visibility.

#### Changed
- Header titles shortened for mobile (`Atmosphere Settings` → `Backgrounds`, etc.)
- Padding reduced on mobile (`p-4 sm:p-5 md:p-8`)
- Quote cards use smaller text and padding on mobile

---

### [3.0.0] — 2026-04-27

#### Added
- Full responsive design (320px → 4K) with custom Tailwind breakpoints (`xs`, `3xl`, `4xl`)
- `src/responsive.css` — mobile-first utility classes, safe area insets, touch optimizations
- Background blur effect (3px + scale 1.05) to hide watermarks on dashboard images
- Default image selection per time period with yellow ★ badge
- 3-tier image fallback system (random → default → first working)
- Quotes section redesign: stats dashboard, today's highlight badge, copy to clipboard, word/char counts
- Mobile meta tags in `index.html`

#### Removed
- Offline file upload from admin panel (URL-only approach)

#### Fixed
- Broken image URLs handled gracefully with fallback chain
- Mobile horizontal scroll issues
- Touch target sizes below 44px

---

### [2.0.0] — Previous

- Admin panel (users, analytics, backgrounds, quotes)
- Firebase integration with real-time updates
- Drag-and-drop for links and tasks
- Time-based backgrounds
- Daily quote rotation
- Weather integration

---

### [1.0.0] — Initial Release

- Basic dashboard (clock, weather, tasks, links)
- User authentication
- Firebase backend

---

*Last updated: 2026-04-27 · Version: 3.1.1 · Status: ✅ Production Ready*
