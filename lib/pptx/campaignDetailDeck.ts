import {
  createPptx,
  addTitleSlide,
  addKpiSlide,
  addTableSlide,
  addInsightsSlide,
  addSectionSlide,
  addTwoColumnKpiSlide,
  fmtCurrency,
  fmtCompact,
  fmtPct,
  safeDiv,
  downloadPptx,
} from './shared';
import type { InsightItem } from './shared';

interface CampaignDetailData {
  campaign: { id: string; name: string; budget: number };
  summary: {
    budget: number;
    totalPlanned: number;
    totalSpend: number;
    totalSaos: number;
    totalExpectedSaos: number;
    totalPipeline: number;
    totalRevenue: number;
    budgetUtilization: number;
    roi: number;
    costPerSao: number;
    activityCount: number;
    eventCount: number;
  };
  funnel: {
    impressions: number;
    clicks: number;
    mqls: number;
    saos: number;
    pipeline: number;
    revenue: number;
  };
  bySwimlane: Array<{ name: string; count: number; spend: number; pipeline: number; saos: number }>;
  byStatus: Array<{ name: string; color: string; count: number; spend: number }>;
  byRegion: Array<{ region: string; count: number; spend: number; pipeline: number; saos: number; roi: number }>;
  activities: Array<{
    id: string;
    title: string;
    swimlane: string;
    status: string;
    startDate: string;
    endDate: string;
    cost: number;
    actualCost: number;
    expectedSaos: number;
    actualSaos: number;
    pipelineGenerated: number;
    revenueGenerated: number;
    region: string;
    roi: number;
  }>;
  linkedEvents: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    location: string | null;
    cost: number;
    actualCost: number;
    expectedSaos: number;
    actualSaos: number;
    pipelineGenerated: number;
    revenueGenerated: number;
    totalPasses: number;
    attendeeCount: number;
    passesUsed: number;
    checklistTotal: number;
    checklistDone: number;
  }>;
  sourceDetails: Record<string, Array<{ label: string; metrics: Record<string, number> }>>;
}

export async function generateCampaignDetailDeck(
  data: CampaignDetailData,
  insights: InsightItem[],
  periodLabel: string,
): Promise<void> {
  const pptx = createPptx();
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const s = data.summary;

  // Slide 1: Title
  addTitleSlide(pptx, `${data.campaign.name}`, `Campaign Detail Report — ${periodLabel}`, today);

  // Slide 2: Executive Summary KPIs
  addKpiSlide(pptx, 'Campaign Summary', [
    { label: 'Budget', value: fmtCurrency(s.budget), sub: `${fmtPct(s.budgetUtilization)} utilized` },
    { label: 'Total Spend', value: fmtCurrency(s.totalSpend), sub: `${fmtCurrency(s.totalPlanned)} planned` },
    { label: 'Pipeline', value: fmtCurrency(s.totalPipeline) },
    { label: 'Revenue', value: fmtCurrency(s.totalRevenue) },
    { label: 'SAOs', value: fmtCompact(s.totalSaos), sub: `${fmtCompact(s.totalExpectedSaos)} expected` },
    { label: 'ROI', value: `${s.roi.toFixed(1)}x`, sub: `${fmtCurrency(s.costPerSao)} / SAO` },
  ]);

  // Slide 3: Budget & Performance Two-Column
  addTwoColumnKpiSlide(
    pptx,
    'Budget & Performance',
    'Budget',
    [
      { label: 'Total Budget', value: fmtCurrency(s.budget) },
      { label: 'Planned Spend', value: fmtCurrency(s.totalPlanned) },
      { label: 'Actual Spend', value: fmtCurrency(s.totalSpend) },
      { label: 'Remaining', value: fmtCurrency(s.budget - s.totalSpend) },
    ],
    'Performance',
    [
      { label: 'Pipeline Generated', value: fmtCurrency(s.totalPipeline) },
      { label: 'Revenue Closed', value: fmtCurrency(s.totalRevenue) },
      { label: 'Cost per SAO', value: fmtCurrency(s.costPerSao) },
      { label: 'Overall ROI', value: `${s.roi.toFixed(1)}x` },
    ],
  );

  // Slide 4: Full Funnel
  const f = data.funnel;
  if (f.impressions > 0 || f.mqls > 0 || f.saos > 0) {
    addTableSlide(
      pptx,
      'Full Funnel Performance',
      ['Stage', 'Volume', 'Conversion Rate'],
      [
        ['Impressions', fmtCompact(f.impressions), '-'],
        ['Clicks', fmtCompact(f.clicks), fmtPct(safeDiv(f.clicks, f.impressions))],
        ['MQLs', fmtCompact(f.mqls), fmtPct(safeDiv(f.mqls, f.clicks))],
        ['SAOs', fmtCompact(f.saos), fmtPct(safeDiv(f.saos, f.mqls))],
        ['Pipeline', fmtCurrency(f.pipeline), '-'],
        ['Revenue', fmtCurrency(f.revenue), fmtPct(safeDiv(f.revenue, f.pipeline))],
      ],
      { subtitle: 'Impressions → Clicks → MQLs → SAOs → Pipeline → Revenue' },
    );
  }

  // Slide 5: Spend by Channel (Swimlane)
  if (data.bySwimlane.length > 0) {
    addTableSlide(
      pptx,
      'Spend by Channel',
      ['Channel', 'Activities', 'Spend', 'Pipeline', 'SAOs', 'ROI'],
      data.bySwimlane.map((sw) => [
        sw.name,
        String(sw.count),
        fmtCurrency(sw.spend),
        fmtCurrency(sw.pipeline),
        fmtCompact(sw.saos),
        sw.spend > 0 ? `${(sw.pipeline / sw.spend).toFixed(1)}x` : '-',
      ]),
    );
  }

  // Slide 6: Regional Breakdown
  if (data.byRegion.length > 0) {
    addTableSlide(
      pptx,
      'Regional Breakdown',
      ['Region', 'Activities', 'Spend', 'Pipeline', 'SAOs', 'ROI'],
      data.byRegion.map((r) => [
        r.region,
        String(r.count),
        fmtCurrency(r.spend),
        fmtCurrency(r.pipeline),
        fmtCompact(r.saos),
        r.spend > 0 ? `${r.roi.toFixed(1)}x` : '-',
      ]),
    );
  }

  // Slide 7: Linked Events
  if (data.linkedEvents.length > 0) {
    addSectionSlide(pptx, 'Linked Events');
    addTableSlide(
      pptx,
      'Event Performance',
      ['Event', 'Dates', 'Spend', 'SAOs', 'Pipeline', 'Attendees'],
      data.linkedEvents.map((ev) => [
        ev.title,
        `${ev.startDate} – ${ev.endDate}`,
        fmtCurrency(ev.actualCost),
        fmtCompact(ev.actualSaos),
        fmtCurrency(ev.pipelineGenerated),
        String(ev.attendeeCount),
      ]),
    );
  }

  // Slide 8+: Source Detail Slides
  const sourceSlides: Array<{ source: string; title: string; metricKeys: string[] }> = [
    { source: 'marketo_theme', title: 'Marketo Themes', metricKeys: ['impressions', 'clicks', 'mqls', 'saos', 'pipeline', 'spend'] },
    { source: 'linkedin_ads', title: 'LinkedIn Ads', metricKeys: ['impressions', 'clicks', 'spend', 'leads', 'mqls', 'saos'] },
    { source: 'hero_asset', title: 'Hero Assets', metricKeys: ['pageViews', 'downloads', 'completions', 'mqls', 'saos', 'pipeline'] },
    { source: 'outreach_sequence', title: 'Outreach Sequences', metricKeys: ['sent', 'opened', 'replied', 'meetings', 'saos'] },
    { source: 'sfdc_event_leads', title: 'SFDC Event Leads', metricKeys: ['registered', 'attended', 'mqls', 'saos', 'opportunities', 'closedWonRevenue'] },
  ];

  const hasSourceData = sourceSlides.some((ss) => (data.sourceDetails[ss.source]?.length ?? 0) > 0);
  if (hasSourceData) {
    addSectionSlide(pptx, 'Source Detail');
  }

  for (const { source, title, metricKeys } of sourceSlides) {
    const details = data.sourceDetails[source];
    if (!details || details.length === 0) continue;

    const headers = ['Name', ...metricKeys.map((k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase()))];
    const rows = details.slice(0, 12).map((d) => [
      d.label,
      ...metricKeys.map((k) => {
        const v = d.metrics[k] ?? 0;
        if (k.includes('spend') || k.includes('pipeline') || k.includes('revenue') || k.includes('Revenue')) {
          return fmtCurrency(v);
        }
        return fmtCompact(v);
      }),
    ]);

    addTableSlide(pptx, title, headers, rows);
  }

  // Activity Table (top 15)
  if (data.activities.length > 0) {
    addSectionSlide(pptx, 'Activity Detail');
    addTableSlide(
      pptx,
      `Activities (${data.activities.length})`,
      ['Activity', 'Channel', 'Status', 'Spend', 'SAOs', 'Pipeline', 'ROI'],
      data.activities.slice(0, 15).map((a) => [
        a.title,
        a.swimlane,
        a.status,
        fmtCurrency(a.actualCost),
        fmtCompact(a.actualSaos),
        fmtCurrency(a.pipelineGenerated),
        a.actualCost > 0 ? `${a.roi.toFixed(1)}x` : '-',
      ]),
      data.activities.length > 15 ? { subtitle: `Showing top 15 of ${data.activities.length} activities by spend` } : undefined,
    );
  }

  // AI Insights
  if (insights.length > 0) {
    const highPriority = insights.filter((i) => i.priority === 'high');
    const otherInsights = insights.filter((i) => i.priority !== 'high');
    addInsightsSlide(pptx, 'Key Insights & Learnings', [...highPriority, ...otherInsights].slice(0, 8));

    if (highPriority.length > 0) {
      addInsightsSlide(pptx, 'Recommendations & Action Items', highPriority.slice(0, 6));
    }
  }

  const safeName = data.campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  await downloadPptx(pptx, `Campaign_Detail_${safeName}_${periodLabel.replace(/\s+/g, '_')}`);
}
