# LaunchGrid

A marketing campaign planning and event management platform that replaces spreadsheet-based planning with an interactive, timeline-first interface. Built for marketing managers, campaign coordinators, directors, and agency partners.

## What It Does

LaunchGrid lets you plan, visualize, and manage marketing campaigns across channels, regions, and time periods — all from a single unified interface.

### Core Features

- **Timeline View** — Gantt-style drag-and-drop timeline with swimlane rows for each marketing channel. Drag to create, move, or resize activities. Zoom from month to year level.
- **Calendar View** — Traditional month grid showing activities as colored blocks spanning their date range.
- **Table View** — Spreadsheet-style view with sortable columns and inline editing.
- **Events Management** — Full event lifecycle: sub-events (workshops, dinners, demos), attendee tracking (internal + customer), pass allocation, readiness checklists, calendar invites, and Slack notifications.
- **Dashboard & Analytics** — Budget tracking (planned vs. actual), SAO metrics, pipeline and revenue tracking, ROI calculations, variance analysis — all broken down by channel, campaign, or region.
- **Reports** — Generate PowerPoint decks for campaign performance, budget reviews, campaign details, and event ROI. Includes AI-generated strategic insights.
- **AI Copilot** — Natural language Q&A on your data ("How much have we spent on paid ads?", "Which campaigns are over budget?"). Also includes an AI brief generator that converts marketing briefs into structured activities.
- **Multi-Currency & Region** — Track costs in USD, GBP, or EUR across US, EMEA, and ROW regions.
- **Export** — PNG screenshots, CSV data exports, and PPTX report decks.

### Integrations

- **Slack** — Link activities to Slack channels, send event notifications via webhooks
- **Google Drive** — Browse and attach files from Drive
- **Google Calendar** — Generate .ics calendar invites for events
- **AI Providers** — Anthropic Claude (default), OpenAI, or Google Gemini for copilot and insights

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Drizzle ORM |
| AI | Anthropic SDK, OpenAI, Google Generative AI |
| Reports | pptxgenjs (PowerPoint generation) |
| Testing | Playwright (E2E) |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (recommended: [Neon](https://neon.tech) — free tier available)

### Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repo-url>
   cd ralphcalendar
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `DATABASE_URL` | Yes | PostgreSQL connection string (e.g., from Neon) |
   | `ANTHROPIC_API_KEY` | No | Fallback AI key — can also be set in the Settings UI |
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | No | Full JSON of a Google service account key for Drive integration |

3. **Push the database schema**

   ```bash
   npm run db:push
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Load sample data (optional)**

   In the app, click **More > Data > Seed Sample Data** in the header to populate demo workspaces, channels, campaigns, and activities.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production (syncs DB schema first) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Run database migrations (force push) |

## Project Structure

```
app/
  layout.tsx              Root layout
  page.tsx                Main app entry (single-page client app)
  api/                    REST API routes (46 endpoints)
    calendars/            Workspace CRUD
    swimlanes/            Channel CRUD + reorder
    activities/           Activity CRUD + batch create
    events/               Event management + logistics
    campaigns/            Campaign grouping
    ai/                   AI copilot, brief generator, insights
    reports/              Report data endpoints
    ...
components/               React components
  Header.tsx              Navigation with view tabs and tools menu
  FilterBar.tsx           Search, campaign, and status filters
  TimelineView.tsx        Gantt-style timeline (primary view)
  CalendarView.tsx        Month grid view
  TableView.tsx           Spreadsheet view
  DashboardView.tsx       Analytics dashboard
  EventsListView.tsx      Event list
  EventDetailView.tsx     Event detail with sub-events and attendees
  ReportsView.tsx         Report generation
  AICopilot.tsx           AI assistant panel
  ActivityModal.tsx       Activity create/edit form
  HelpPanel.tsx           Context-sensitive help system
  ...
db/
  schema.ts               Database schema (Drizzle ORM)
  index.ts                Database client
lib/
  utils.ts                Date, currency, and color utilities
  ai-provider.ts          AI provider abstraction
  export.ts               PNG/CSV export
  pptx/                   PowerPoint deck generators
hooks/
  useVoiceAgent.ts        Voice agent state
e2e/                      Playwright E2E tests
drizzle/                  Database migrations
```

## How It Works

### Architecture

LaunchGrid is a single-page client-side React app built on Next.js App Router. All data is fetched via REST API routes in `/app/api/`. State lives in the main `HomeInner` component (`app/page.tsx`) and is passed down to views via props.

### Key Concepts

- **Workspace** — A self-contained calendar/planning environment (one per team, quarter, or region)
- **Channel (Swimlane)** — A row on the timeline representing a marketing category (Social, Email, Paid Ads, Events, etc.)
- **Activity** — An individual task or campaign item placed on the timeline with dates, budget, status, and performance metrics
- **Campaign** — A grouping of related activities with aggregate budget tracking
- **Event** — A standalone entity for event logistics (conferences, trade shows, etc.) with sub-events, attendees, and checklists
- **Status** — Customizable labels (e.g., Draft, In Progress, Complete) with colors, defined per workspace

### Database

PostgreSQL with 20 tables managed by Drizzle ORM. Key entities: users, calendars, swimlanes, activities, campaigns, events, event_attendees, sub_events, checklist_items. Full schema in `db/schema.ts`.

### AI Features

The AI system supports three providers (Anthropic, OpenAI, Gemini) configured via the Settings panel. Features include:

- **Copilot** — Natural language queries about budget, performance, and campaign data
- **Brief Generator** — Paste a marketing brief, get structured activities auto-created
- **Budget & Campaign Insights** — AI-generated analysis for report decks

## In-App Help

LaunchGrid includes a built-in context-sensitive help system. Click the **?** button in the header to open the help panel — it automatically shows guidance relevant to your current view:

- **Timeline** — How to drag-create activities, zoom, resize, manage channels
- **Calendar** — Navigating months, clicking to create activities
- **Table** — Sorting, inline editing, bulk actions
- **Events** — Managing sub-events, attendees, checklists, pass allocation
- **Dashboard** — Understanding budget variance, SAO metrics, sorting options
- **Reports** — Generating PowerPoint decks, AI insights

## Deployment

Designed for deployment on [Vercel](https://vercel.com):

```bash
npm run build
```

The build command automatically syncs the database schema before building. Set the same environment variables in your Vercel project settings.

## License

Private — all rights reserved.
