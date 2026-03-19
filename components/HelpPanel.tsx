'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SolarCloseLinear, SolarLightbulbLinear, SolarQuestionCircle } from './SolarIcons';

type ViewType = 'timeline' | 'calendar' | 'table' | 'dashboard' | 'events' | 'reports';

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  currentView: ViewType;
  hasCalendar: boolean;
  hasSwimlanes: boolean;
}

interface HelpSection {
  title: string;
  items: { label: string; detail: string }[];
}

/* ────────────────────────────────────────────────────────
   Context-relevant help content for every area of the app
   ──────────────────────────────────────────────────────── */

const GETTING_STARTED: HelpSection = {
  title: 'Getting Started',
  items: [
    { label: 'Create a workspace', detail: 'Click the workspace dropdown in the header and choose "New Workspace". Each workspace is an independent planning environment — use one per team, quarter, or region.' },
    { label: 'Add channels', detail: 'Channels (swimlanes) are the rows on your timeline. Type a name like "Social Media" or "Email" and press Enter. You can reorder them later by dragging.' },
    { label: 'Create activities', detail: 'Click "New Activity" in the header, or drag across a channel row in the Timeline view to create one inline. Fill in dates, budget, status, and campaign.' },
    { label: 'Load sample data', detail: 'To explore with demo data, click More > Data > Seed Sample Data in the header toolbar.' },
  ],
};

const GENERAL_TIPS: HelpSection = {
  title: 'General Tips',
  items: [
    { label: 'Switch views', detail: 'Use the tabs in the header to switch between Timeline, Calendar, Table, Events, Dashboard, and Reports.' },
    { label: 'Filter activities', detail: 'Use the filter bar to search by title, filter by campaign, or filter by status. Filters apply across Timeline, Calendar, and Table views.' },
    { label: 'Save filters', detail: 'After setting filters, click the bookmark icon to save the current filter combination for quick reuse later.' },
    { label: 'Dark mode', detail: 'Toggle dark mode with the sun/moon icon in the top-right corner of the header.' },
    { label: 'Export your data', detail: 'Click More > Export to save as PNG (screenshot), CSV (spreadsheet), or generate PowerPoint report decks.' },
    { label: 'AI Copilot', detail: 'Click More > Copilot to ask natural language questions about your budget, campaigns, or performance ("Which campaigns are over budget?").' },
    { label: 'Keyboard shortcuts', detail: 'Press Escape to close any open modal or panel.' },
  ],
};

const TIMELINE_HELP: HelpSection[] = [
  {
    title: 'Timeline View',
    items: [
      { label: 'Drag to create', detail: 'Click and drag horizontally on any channel row to create a new activity spanning those dates.' },
      { label: 'Move activities', detail: 'Drag an activity bar to move it to a different channel or date range.' },
      { label: 'Resize activities', detail: 'Drag the left or right edge of an activity bar to change its start or end date.' },
      { label: 'Click to edit', detail: 'Click any activity bar to open its detail modal where you can edit all fields.' },
      { label: 'Zoom levels', detail: 'Use the zoom controls (top-right) to switch between Month, Quarter, Half-year, and Year views. Each zoom level adjusts the day width for optimal visibility.' },
      { label: 'Card styles', detail: 'Click the card-size control to switch between Small, Medium, and Large activity bars for different information density.' },
      { label: 'Field display', detail: 'Use the display settings to toggle which fields appear on activity cards: status, campaign, cost, region, tags, or description.' },
      { label: 'Today line', detail: 'The blue vertical line marks today\'s date. Use the "Today" button to scroll back to it.' },
    ],
  },
  {
    title: 'Channel Sidebar',
    items: [
      { label: 'Add a channel', detail: 'Type a name in the input at the bottom of the sidebar and press Enter to add a new channel.' },
      { label: 'Rename a channel', detail: 'Click the pencil icon next to a channel name to rename it.' },
      { label: 'Delete a channel', detail: 'Click the trash icon to remove a channel. This will not delete the activities in it.' },
      { label: 'Reorder channels', detail: 'Drag channels up or down in the sidebar to rearrange the timeline rows.' },
      { label: 'Channel budgets', detail: 'Each channel can have an assigned budget. View budget utilization in the Dashboard.' },
    ],
  },
];

const CALENDAR_HELP: HelpSection[] = [
  {
    title: 'Calendar View',
    items: [
      { label: 'Navigate months', detail: 'Use the left/right arrows to move between months. The current month and year are shown in the header.' },
      { label: 'Create activity', detail: 'Click on any day in the grid to create a new activity starting on that date.' },
      { label: 'View activity', detail: 'Click on an activity block to open its detail modal for editing.' },
      { label: 'Multi-day activities', detail: 'Activities that span multiple days appear as colored bars across the relevant date cells.' },
      { label: 'Color coding', detail: 'Activity colors are determined by their assigned color or status. This helps visually distinguish different types of work.' },
    ],
  },
];

const TABLE_HELP: HelpSection[] = [
  {
    title: 'Table View',
    items: [
      { label: 'Sort columns', detail: 'Click any column header to sort activities by that field. Click again to reverse the sort order.' },
      { label: 'Inline editing', detail: 'Click on a cell value to edit it directly in the table without opening the full modal.' },
      { label: 'Edit full details', detail: 'Click the activity title or row to open the full activity modal with all fields.' },
      { label: 'Delete activity', detail: 'Use the delete action in the row to remove an activity. You\'ll be asked to confirm.' },
      { label: 'Columns shown', detail: 'The table shows: Title, Status, Start/End Date, Channel, Campaign, Cost, Currency, Region, SAOs, Pipeline, and Revenue.' },
    ],
  },
];

const EVENTS_HELP: HelpSection[] = [
  {
    title: 'Events View',
    items: [
      { label: 'Create an event', detail: 'Click "New Event" to create a conference, trade show, or other marketing event. Events are separate from timeline activities.' },
      { label: 'Event detail', detail: 'Click any event in the list to open its full detail panel with sub-events, attendees, and checklist.' },
      { label: 'Back to list', detail: 'Click the back arrow at the top of the event detail to return to the event list.' },
    ],
  },
  {
    title: 'Sub-Events',
    items: [
      { label: 'What are sub-events?', detail: 'Sub-events are components within an event — workshops, 1:1 meetings, dinners, hospitality suites, demos, etc.' },
      { label: 'Add sub-events', detail: 'In the event detail, use the sub-events section to add new components with their own times and descriptions.' },
      { label: 'Assign attendees', detail: 'Each sub-event can have its own attendee list, separate from the main event attendees.' },
    ],
  },
  {
    title: 'Attendees & Passes',
    items: [
      { label: 'Internal attendees', detail: 'Add team members with their role and travel status. Internal attendees consume passes from the event\'s fixed pool.' },
      { label: 'Customer attendees', detail: 'Add customers with company affiliation and confirmation status.' },
      { label: 'Pass allocation', detail: 'Events have a fixed number of passes. The event detail shows how many passes are allocated vs. remaining.' },
    ],
  },
  {
    title: 'Readiness Checklist',
    items: [
      { label: 'Checklist categories', detail: 'Track event readiness across five areas: Content, Logistics, Materials, Communications, and Registrations.' },
      { label: 'Check off items', detail: 'Click the checkbox next to each item to mark it complete. The progress bar shows overall readiness.' },
      { label: 'Add checklist items', detail: 'Add custom items to any category to track event-specific preparation tasks.' },
    ],
  },
  {
    title: 'Event Actions',
    items: [
      { label: 'Calendar invite', detail: 'Generate an .ics calendar invite file that attendees can add to their calendar app.' },
      { label: 'Slack notification', detail: 'Send an event summary to a Slack channel via webhook integration.' },
      { label: 'Logistics deck', detail: 'Generate a PowerPoint deck with event logistics, attendee list, and sub-event schedule.' },
      { label: 'Link to campaigns', detail: 'Associate events with campaigns to track how events contribute to campaign performance.' },
      { label: 'Year-over-year comparison', detail: 'Compare this event\'s metrics against previous years to measure growth and ROI improvements.' },
    ],
  },
];

const DASHBOARD_HELP: HelpSection[] = [
  {
    title: 'Dashboard View',
    items: [
      { label: 'Overview tab', detail: 'Shows budget and performance summaries across all channels and campaigns in the current workspace.' },
      { label: 'Campaign reporting', detail: 'Switch to the Campaign Reporting tab for detailed metrics from external data sources like Marketo, LinkedIn Ads, and Salesforce.' },
      { label: 'Year-over-year', detail: 'The YoY tab shows event performance comparison across years to identify trends.' },
    ],
  },
  {
    title: 'Budget Analytics',
    items: [
      { label: 'Planned vs. actual', detail: 'Each channel and campaign shows planned budget alongside actual spend, with a variance indicator.' },
      { label: 'Variance', detail: 'Green variance means under budget, red means over budget. The percentage shows how far off from the plan.' },
      { label: 'Currency', detail: 'Costs support USD, GBP, and EUR. Dashboard totals reflect the sum across currencies.' },
      { label: 'By region', detail: 'Filter or group spending by region: US, EMEA, or ROW (Rest of World).' },
    ],
  },
  {
    title: 'Performance Metrics',
    items: [
      { label: 'SAOs', detail: 'Sales Accepted Opportunities — tracked as Expected, Target, and Actual. Compare plan against delivery.' },
      { label: 'Pipeline', detail: 'Pipeline generated tracks the dollar value of sales opportunities created by marketing activities.' },
      { label: 'Revenue', detail: 'Revenue generated tracks closed-won revenue attributed to marketing activities.' },
      { label: 'ROI', detail: 'Return on investment = Revenue / Cost. Higher is better. Shown per channel and per campaign.' },
    ],
  },
  {
    title: 'Sorting & Filtering',
    items: [
      { label: 'Sort options', detail: 'Sort dashboard rows by name, budget, spend, variance, SAOs, pipeline, revenue, or ROI.' },
      { label: 'Toggle views', detail: 'Switch between channel-level and campaign-level breakdowns.' },
    ],
  },
];

const REPORTS_HELP: HelpSection[] = [
  {
    title: 'Reports View',
    items: [
      { label: 'Report types', detail: 'Choose from four report types: Campaign Performance, Campaign Detail, Budget Review, and Event ROI.' },
      { label: 'Campaign Performance', detail: 'Generates a deck with overall campaign metrics, channel breakdowns, and performance summaries.' },
      { label: 'Campaign Detail', detail: 'Focused on a single campaign with activity-level metrics, timeline, and status breakdown.' },
      { label: 'Budget Review', detail: 'Financial analysis deck with planned vs. actual spend, variance analysis, and forecasting data.' },
      { label: 'Event ROI', detail: 'Event-focused deck with attendance, cost per attendee, pipeline generated, and return on investment.' },
    ],
  },
  {
    title: 'Generating Reports',
    items: [
      { label: 'Download as PPTX', detail: 'Click "Generate" to create a PowerPoint file that downloads automatically. Reports include charts, tables, and formatted slides.' },
      { label: 'AI insights', detail: 'Reports can include AI-generated strategic insights that analyze your data and highlight key findings, risks, and recommendations.' },
      { label: 'Data sources', detail: 'Reports pull data from your workspace activities, campaigns, and events. External data (Marketo, LinkedIn, Salesforce) is included when available.' },
    ],
  },
];

function getHelpContent(view: ViewType, hasCalendar: boolean, hasSwimlanes: boolean): HelpSection[] {
  const sections: HelpSection[] = [];

  if (!hasCalendar) {
    sections.push({
      title: 'Welcome to LaunchGrid',
      items: [
        { label: 'First step', detail: 'Create your first workspace by clicking "Create Your First Workspace" or the workspace dropdown in the header.' },
        { label: 'What is a workspace?', detail: 'A workspace is a self-contained planning environment. Create one per team, quarter, or region to keep plans organized.' },
        { label: 'Sample data', detail: 'Want to explore first? Click More > Data > Seed Sample Data to load demo content.' },
      ],
    });
    sections.push(GENERAL_TIPS);
    return sections;
  }

  if (!hasSwimlanes) {
    sections.push({
      title: 'Set Up Your Channels',
      items: [
        { label: 'What are channels?', detail: 'Channels are the horizontal rows on the timeline. Each one represents a marketing category like Social Media, Email, Paid Ads, or Events.' },
        { label: 'Add your first channel', detail: 'Type a channel name in the input field and press Enter. You can add as many as you need.' },
        { label: 'Suggested channels', detail: 'Common channels include: Social Media, Email Marketing, Paid Ads, Content Marketing, Events, Webinars, PR, Partnerships.' },
      ],
    });
    return sections;
  }

  // View-specific help
  switch (view) {
    case 'timeline':
      sections.push(...TIMELINE_HELP);
      break;
    case 'calendar':
      sections.push(...CALENDAR_HELP);
      break;
    case 'table':
      sections.push(...TABLE_HELP);
      break;
    case 'events':
      sections.push(...EVENTS_HELP);
      break;
    case 'dashboard':
      sections.push(...DASHBOARD_HELP);
      break;
    case 'reports':
      sections.push(...REPORTS_HELP);
      break;
  }

  sections.push(GETTING_STARTED);
  sections.push(GENERAL_TIPS);

  return sections;
}

/* ────────────────────────────────────────────────────────
   Help Panel UI
   ──────────────────────────────────────────────────────── */

const VIEW_LABELS: Record<ViewType, string> = {
  timeline: 'Timeline',
  calendar: 'Calendar',
  table: 'Table',
  events: 'Events',
  dashboard: 'Dashboard',
  reports: 'Reports',
};

export function HelpPanel({ open, onClose, currentView, hasCalendar, hasSwimlanes }: HelpPanelProps) {
  const sections = getHelpContent(currentView, hasCalendar, hasSwimlanes);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(() => new Set([0]));

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-card-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <SolarQuestionCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Help</h2>
                  <p className="text-xs text-muted-foreground">
                    {hasCalendar && hasSwimlanes
                      ? `${VIEW_LABELS[currentView]} view`
                      : 'Getting started'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close help"
              >
                <SolarCloseLinear className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {sections.map((section, sIdx) => (
                <div key={sIdx} className="rounded-xl border border-card-border dark:border-slate-700/50 overflow-hidden">
                  <button
                    onClick={() => toggleSection(sIdx)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{section.title}</span>
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedSections.has(sIdx) ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedSections.has(sIdx) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-2.5">
                          {section.items.map((item, iIdx) => (
                            <HelpItem key={iIdx} label={item.label} detail={item.detail} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-card-border">
              <div className="flex items-start gap-2 text-xs text-muted-foreground dark:text-slate-400">
                <SolarLightbulbLinear className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                <p>
                  Tip: The help panel always shows guidance for your current view. Switch views to see relevant help for each area.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────────────────────
   Individual help item (expandable)
   ──────────────────────────────────────────────────────── */

function HelpItem({ label, detail }: { label: string; detail: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-colors ${expanded ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/25' : 'border-transparent bg-muted/40 dark:bg-muted/60'}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span className={`text-xs font-medium ${expanded ? 'text-blue-700 dark:text-blue-200' : 'text-foreground'}`}>
          {label}
        </span>
        <svg
          className={`w-3 h-3 ml-auto flex-shrink-0 text-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-2.5 text-xs text-muted-foreground dark:text-slate-300 leading-relaxed">
              {detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
