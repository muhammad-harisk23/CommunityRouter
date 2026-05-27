<div align="center">
  <br />
  <img src="https://img.shields.io/badge/status-beta-22c55e?style=flat-square" alt="Status: Beta" />
  <img src="https://img.shields.io/badge/devvit-0.13.0-ff6b35?style=flat-square" alt="Devvit 0.13.0" />
  <img src="https://img.shields.io/badge/license-BSD--3--Clause-blue?style=flat-square" alt="License" />
  <br /><br />
</div>

<h1 align="center">
  CommunityRouter
</h1>

<p align="center">
  <strong>Pre-post onboarding infrastructure for Reddit communities.</strong><br />
  Reduce onboarding chaos. Guide new members into the right participation paths before posting begins.
</p>

<br />

---

## Problem

Reddit communities with active onboarding pipelines — freelance hubs, startup networks, learning spaces, and collaboration communities — face a persistent structural problem:

**Users arrive without context. Moderators pay the price.**

Every day, moderators deal with:

- **Repetitive discovery questions** — *"Where do I find work?"* *"Where do I hire developers?"* *"Where do I find cofounders?"*
- **Misplaced posts** — Portfolio reviews in discussion threads. Hiring posts in learning subreddits. Beginner questions in advanced spaces.
- **Dead wiki onboarding** — Giant walls of text that new users scroll past without reading.
- **Moderator fatigue** — The same explanations, the same redirects, the same pinned comments.

The current onboarding stack — sidebars, wiki pages, pinned posts — is **passive, text-heavy, and easy to ignore.**

---

## Solution

**CommunityRouter transforms static subreddit onboarding into an interactive, guided routing system.**

Instead of a wiki page, users see a curated onboarding hub that asks: *"What are you looking for?"* From there, they are guided step-by-step toward the correct communities, megathreads, and posting paths — **before they create a post.**

Moderators configure the routing logic. CommunityRouter handles the rest.

---

## The innovation

CommunityRouter is **not** a subreddit discovery tool.

It is **onboarding infrastructure** — a proactive moderation layer that intercepts confusion at the point of entry, before repetitive moderation work begins.

Most moderation tools are **reactive**. CommunityRouter is **preventative**.

---

## Key features

| Feature | Description |
|---|---|
| **Intent-based routing** | Users select their goal — Find Work, Hire Talent, Find Cofounders, Learn Skills — and are routed to the right communities |
| **Moderator routing dashboard** | Full control over categories, subreddit destinations, posting guidance, and moderation warnings |
| **Smart community recommendations** | Each destination includes fit score, strictness level, badges, requirements, and avoid-if notes |
| **Dynamic live preview** | Shows users what the onboarding flow looks like as moderators configure it |
| **Redis persistence** | All categories, routes, and analytics survive restarts via Devvit Redis |
| **Analytics dashboard** | Track routed users, popular destinations, estimated moderation impact |
| **Community health impact panel** | Visual before/after comparison of onboarding quality |
| **Light / Dark mode** | Full theme support with smooth transitions and semantic tokens |
| **Keyboard accessible** | Full focus-visible rings, aria labels, ESC-to-close, screen reader support |
| **Responsive layout** | Works across desktop and mobile viewports |

---

## Architecture overview

```
┌──────────────────────────────────────────────────────┐
│                    Reddit Feed                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Splash (inline post preview)                │   │
│  │  • Project overview                          │   │
│  │  • Call to action → Expand                    │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │ requestExpandedMode()              │
│                 ▼                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Game (full-screen expanded view)            │   │
│  │                                              │   │
│  │  ┌─────────────┐   ┌─────────────────────┐   │   │
│  │  │ Hero/Landing│   │ Onboarding Panel    │   │   │
│  │  │ • Stats     │   │ • Intent selection  │   │   │
│  │  │ • Steps     │   │ • Recommendations   │   │   │
│  │  │ • Health    │   │ • Routing           │   │   │
│  │  └─────────────┘   └─────────────────────┘   │   │
│  │                                                │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  Moderator Panel                        │   │   │
│  │  │  • Category management                  │   │   │
│  │  │  • Community routing                    │   │   │
│  │  │  • Tips & warnings                      │   │   │
│  │  │  • Search & filter                      │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                │   │
│  │  ┌─────────────────┐  ┌──────────────────┐    │   │
│  │  │ Analytics Panel  │  │ Live Preview     │    │   │
│  │  └─────────────────┘  └──────────────────┘    │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘

                    │ tRPC (HTTP)
                    ▼
┌──────────────────────────────────────────────────────┐
│  Hono + tRPC Server (Devvit serverless)              │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  CommunityRouter Core                         │   │
│  │  • getRouterCategories()                     │   │
│  │  • saveRouterCategories()                    │   │
│  │  • getRouterAnalytics()                      │   │
│  │  • trackCategoryClick()                      │   │
│  │  • trackDestinationClick()                   │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│                     ▼                                │
│  ┌──────────────────────────────────────────────┐   │
│  │  Devvit Redis                                │   │
│  │  • community-router:{sub}:config             │   │
│  │  • community-router:{sub}:category-clicks    │   │
│  │  • community-router:{sub}:destination-clicks │   │
│  │  • community-router:{sub}:recent-activity    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Stack

| Layer | Technology |
|---|---|
| Client | React 19, Tailwind CSS 4, TypeScript 6 |
| Build | Vite 8, @devvit/start |
| Server | Hono 4, tRPC 11 |
| Persistence | Devvit Redis |
| Validation | Zod 4 |
| Runtime | Node 22+ (Devvit serverless) |

---

## Screenshots

> *Screenshots will be added here before submission.*

| View | Preview |
|---|---|
| **Splash page** (inline post preview) | — |
| **Onboarding hub** (intent selection) | — |
| **Recommendation cards** (with badges, fit scores) | — |
| **Moderator dashboard** (category routing) | — |
| **Analytics panel** (usage metrics) | — |
| **Community health impact** (before/after) | — |
| **Live preview** (user simulation) | — |

---

## Demo video

> *Link to demo video will be added before submission.*

The demo walkthrough covers:

1. **User perspective** — Landing on the subreddit, selecting an intent, viewing recommendations, navigating to the correct community
2. **Moderator perspective** — Installing the app, creating routing categories, configuring destinations, enabling/disabling routes, monitoring analytics
3. **Product narrative** — The problem, the solution, the impact on community health

---

## Installation

### Prerequisites

- **Node.js >= 22.2.0**
- **Reddit Developer Account** — [developers.reddit.com](https://developers.reddit.com)
- **Devvit CLI** — installed via `npm create devvit@latest`

### Quick start

```bash
# 1. Create a new project from the template
npm create devvit@latest --template=vibe-coding

# 2. Follow the installation wizard to connect your Reddit account

# 3. Clone this repository into your project
cd my-app
# ... copy communityrouter source files into src/

# 4. Install dependencies
npm install

# 5. Start local development
npm run dev
```

### Deployment

```bash
# Type-check, lint, and test
npm run type-check
npm run lint
npm run test

# Build client and server
npm run build

# Upload to Devvit
npx devvit upload

# Publish to subreddit
npx devvit publish
```

---

## Local development

```bash
# Start Devvit playtest (live preview on Reddit)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test -- src/client/splash.test.ts   # Run specific test

# Production build
npm run build

# Full deploy pipeline
npm run deploy

# Production launch (deploy + publish)
npm run launch
```

---

## Project structure

```
communityrouter/
├── devvit.json                      # Devvit configuration (entrypoints, permissions, menus)
├── package.json                     # Dependencies and scripts
├── vite.config.ts                   # Vite build config (React + Tailwind + Devvit)
├── vitest.config.ts                 # Test runner configuration
│
├── src/
│   ├── client/                      # Frontend (React app, runs in Reddit iFrame)
│   │   ├── splash.html              # Inline post preview entrypoint
│   │   ├── splash.tsx               # Splash page component (lightweight, fast)
│   │   ├── splash.test.ts           # Splash page tests
│   │   ├── game.html                # Expanded view entrypoint
│   │   ├── game.tsx                 # Main app (onboarding + moderator panel)
│   │   ├── index.css                # Tailwind + theme CSS variables + animations
│   │   └── trpc.ts                  # tRPC client configuration
│   │
│   ├── server/                      # Backend (Devvit serverless runtime)
│   │   ├── index.ts                 # Hono server entry + tRPC middleware
│   │   ├── context.ts               # tRPC context initialization
│   │   ├── trpc.ts                  # tRPC router (onboarding procedures)
│   │   ├── core/
│   │   │   ├── communityRouter.ts   # Redis persistence + analytics engine
│   │   │   └── post.ts             # Custom post creation
│   │   └── routes/
│   │       ├── menu.ts             # Moderator menu endpoint
│   │       └── triggers.ts         # App install trigger handler
│   │
│   └── shared/                      # Shared types and validation
│       ├── communityRouter.ts       # Zod schemas, types, default data
│       └── transformer.ts           # Superjson transformer
│
├── tools/                           # TypeScript project references
│   ├── tsconfig.base.json
│   ├── tsconfig.client.json
│   ├── tsconfig.server.json
│   ├── tsconfig.shared.json
│   └── tsconfig.vite.json
│
├── splash-light.html                # Light mode redirect helper
├── test-light.html                  # Light mode test helper
├── serve-test.mjs                   # Local static file server for testing
│
├── .prettierrc                      # Code formatting config
├── eslint.config.js                 # Linting config
├── AGENTS.md                        # AI coding assistant instructions
└── master-context.md                # Product vision document
```

---

## Moderator workflow

```
1. INSTALL
   └── Moderator installs CommunityRouter via Reddit Developer Platform

2. CONFIGURE
   └── Opens the expanded onboarding view
       └── Sees the Moderator Dashboard at the bottom of the page
           └── Creates onboarding categories (e.g., "Find Work", "Hire Talent")
               └── Adds subreddit destinations to each category
                   └── Configures fit descriptions, badges, strictness, requirements
                   └── Adds posting tips and moderation warnings
                   └── Enables/disables categories as needed
                   └── Reorders categories by priority

3. PREVIEW
   └── Live Preview panel shows exactly what users will see
       └── Adjusts categories until the onboarding flow feels right

4. MONITOR
   └── Analytics panel tracks:
       └── Total users routed
       └── Most popular onboarding paths
       └── Top community destinations
       └── Estimated moderation impact
       └── Recent onboarding activity
```

---

## User onboarding flow

```
1. LAND
   └── User opens a subreddit with CommunityRouter installed
       └── Sees the interactive onboarding block at the top of the feed

2. EXPAND
   └── Clicks "Start onboarding"
       └── Opens the full expanded view with the onboarding hub

3. SELECT INTENT
   └── Asked: "What are you looking for?"
       └── Options: Find Work, Hire Talent, Find Cofounders, Learn Skills
       └── Each card shows description, marker icon, and accent gradient

4. REVIEW RECOMMENDATIONS
   └── Sees curated community recommendations with:
       └── Subreddit name and fit score (%)
       └── Moderation strictness (Low / Medium / High)
       └── Badges (Beginner Friendly, Fast Responses, Portfolio Required, etc.)
       └── Requirements checklist (what they need before posting)
       └── Avoid-if notes (common mistakes)
       └── Posting tips and moderation warnings
       └── Recommended posting path

5. ROUTE
   └── Clicks "Open Community"
       └── Navigated directly to the correct subreddit
       └── Knows the rules, expectations, and posting guidelines before arriving

6. POST (with confidence)
   └── User creates a post that fits the community
       └── Moderators see fewer misplaced posts
       └── Community experiences less onboarding clutter
```

---

## Analytics

CommunityRouter includes a lightweight analytics dashboard designed to demonstrate measurable impact.

### Tracked metrics

| Metric | Source |
|---|---|
| **Users routed** | Total onboarding intent selections |
| **Communities opened** | Total "Open Community" clicks |
| **Category usage percentages** | Distribution of selected intents (Find Work, Hire Talent, etc.) |
| **Most selected path** | Highest-traffic onboarding category |
| **Top destination** | Most-opened subreddit route |
| **Recent activity** | Chronological log of routing events |

### Derived impact metrics

| Metric | Calculation |
|---|---|
| **Misroutes prevented** | Estimated based on routed users who would have posted incorrectly without guidance |
| **Repetitive questions reduced** | Estimated based on users who found their destination without asking for help |
| **Moderation efficiency gain** | Combined impact score as a percentage improvement |

> Analytics are computed from real Redis-stored click data. Derived impact metrics are estimates based on routing engagement patterns.

---

## Scalability

CommunityRouter is designed for subreddit-level deployment but scales across communities through Devvit's platform infrastructure.

**Per-subreddit isolation.** Each subreddit's configuration and analytics are stored under distinct Redis keyspaced by subreddit ID. One subreddit's data never leaks into another's.

**No external dependencies.** The entire application — client, server, persistence — runs within Devvit's sandboxed environment. No databases, no APIs, no external infrastructure.

**Configuration limits.** Categories are capped at 30, communities at 5 per category, ensuring Redis operations remain fast regardless of subreddit size.

**Cache-friendly.** Analytics are computed from aggregated Redis counters (O(1) increments) rather than scanned event logs. Recent activity is capped at 8 entries.

---

## Why this matters for Reddit

Reddit communities rely on **passive onboarding** — sidebar links, wiki pages, pinned posts. These systems are:

- **Easily ignored.** New users rarely read wikis before posting.
- **Difficult to maintain.** Wikis grow stale. Pinned posts get buried.
- **One-size-fits-all.** The same text is shown to every user, regardless of intent.

CommunityRouter provides **active onboarding infrastructure** — an interactive layer that:

- **Meets users where they are.** Instead of "read the wiki," users get "what are you looking for?"
- **Adapts to intent.** The same subreddit can route different users to different destinations based on their goals.
- **Gives moderators control.** No code required. Categories, routes, and guidance are configurable through the dashboard.
- **Demonstrates impact.** Analytics show exactly how many users were guided, where they went, and what chaos was prevented.

This aligns directly with Reddit's platform goals:
- **Reduce moderation load** by preventing problems before they happen
- **Improve community operation** with structured, guided onboarding
- **Create thoughtful engagement** through intent-based participation routing
- **Build community health** with preventive rather than reactive tooling

---

## Future roadmap

| Phase | Feature | Status |
|---|---|---|
| **MVP** | Intent-based routing, moderator dashboard, Redis persistence, analytics | ✅ Complete |
| **Q2 2025** | Guided refinement questions (beginner/experienced, paid/collaboration, remote/local) | Planned |
| **Q3 2025** | Multi-language onboarding, custom badge creation, template sharing between subreddits | Considered |
| **Q4 2025** | Automated routing suggestions based on posting patterns, community health reports | Research |

### Not planned

CommunityRouter is onboarding infrastructure — not a marketplace, chat system, or AI recommendation engine. The following are explicitly out of scope:

- Freelancer marketplaces or job boards
- Direct messaging or chat systems
- AI-generated recommendations (moderator-curated only)
- External API integrations
- Authentication systems
- Karma or reputation gating

---

## Hackathon positioning

**Category:** Moderation tooling / Community infrastructure

**Differentiator:** CommunityRouter competes on **onboarding UX sophistication** — not backend complexity. The product wins through:

- Emotional onboarding design quality
- Interaction polish and clarity
- Moderator usefulness and configurability
- Measurable impact through analytics
- Visual and interaction quality

**One-line pitch:**

> *"Pre-post onboarding infrastructure that reduces chaos before moderation begins."*

**Keywords for judging:**

- Reducing onboarding chaos
- Guided onboarding infrastructure
- Proactive moderation tooling
- Community routing and participation guidance
- Onboarding intelligence system

---

## Contributors

- **Your Name** — [u/yourusername](https://reddit.com/u/yourusername)
- **Team Member** — [u/teammember2](https://reddit.com/u/teammember2)

---

## License

CommunityRouter is licensed under the [BSD 3-Clause License](LICENSE).

```
Copyright (c) 2025 CommunityRouter Contributors

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.
```

---

<div align="center">
  <br />
  <sub>
    Built with <a href="https://developers.reddit.com/">Devvit</a> — Reddit's developer platform
  </sub>
  <br />
  <sub>
    <em>Reducing onboarding chaos.</em>
  </sub>
</div>
