import {
  createPptx,
  addTitleSlide,
  addKpiSlide,
  addTableSlide,
  addInsightsSlide,
  addSectionSlide,
  fmtCurrency,
  fmtCompact,
  fmtPct,
  safeDiv,
  downloadPptx,
} from './shared';
import type { InsightItem } from './shared';

interface CampaignPerformanceData {
  summary: {
    totalBudget: number;
    totalSpend: number;
    totalPlanned: number;
    totalSaos: number;
    totalExpectedSaos: number;
    totalPipeline: number;
    totalRevenue: number;
    overallRoi: number;
    activeCampaigns: number;
    activeActivities: number;
  };
  funnel: {
    impressions: number;
    clicks: number;
    mqls: number;
    saos: number;
    pipeline: number;
    revenue: number;
  };
  channels: Array<{
    name: string;
    spend: number;
    saos: number;
    pipeline: number;
    mqls: number;
    costPerSao: number;
    roi: number;
  }>;
  campaignPerformance: Array<{
    name: string;
    budget: number;
    spend: number;
    pipeline: number;
    revenue: number;
    saos: number;
    roi: number;
    costPerSao: number;
  }>;
  icp: {
    targetAccounts: number;
    engagedAccounts: number;
    accountsWithMqls: number;
    accountsWithSaos: number;
    pipeline: number;
  };
  sourceDetails: Record<string, Array<{ label: string; metrics: Record<string, number> }>>;
}

export async function generateCampaignPerformanceDeck(
  data: CampaignPerformanceData,
  insights: InsightItem[],
  periodLabel: string,
): Promise<void> {
  const pptx = createPptx();
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Slide 1: Title
  addTitleSlide(pptx, 'Campaign Performance Report', periodLabel, today);

  // Slide 2: Executive Summary
  addKpiSlide(pptx, 'Executive Summary', [
    { label: 'Total Spend', value: fmtCurrency(data.summary.totalSpend), sub: `of ${fmtCurrency(data.summary.totalBudget)} budget` },
    { label: 'Pipeline', value: fmtCurrency(data.summary.totalPipeline) },
    { label: 'Revenue', value: fmtCurrency(data.summary.totalRevenue) },
    { label: 'SAOs', value: fmtCompact(data.summary.totalSaos), sub: `${fmtCompact(data.summary.totalExpectedSaos)} expected` },
    { label: 'Overall ROI', value: `${data.summary.overallRoi.toFixed(1)}x` },
    { label: 'Active Campaigns', value: String(data.summary.activeCampaigns) },
  ]);

  // Slide 3: Full Funnel
  const f = data.funnel;
  addTableSlide(
    pptx,
    'Full Funnel Performance',
    ['Stage', 'Volume', 'Conversion Rate'],
    [
      ['Impressions', fmtCompact(f.impressions), '-'],
      ['Clicks', fmtCompact(f.clicks), fmtPct(safeDiv(f.clicks, f.impressions))],
      ['MQLs', fmtCompact(f.mqls), fmtPct(safeDiv(f.mqls, f.clicks))],
      ['SAOs', fmtCompact(f.saos), fmtPct(safeDiv(f.saos, f.mqls))],
      ['Pipeline', fmtCurrency(f.pipeline), fmtPct(safeDiv(f.pipeline, f.saos > 0 ? f.saos : 1))],
      ['Revenue', fmtCurrency(f.revenue), fmtPct(safeDiv(f.revenue, f.pipeline))],
    ],
    { subtitle: 'Impressions → Clicks → MQLs → SAOs → Pipeline → Revenue' },
  );

  // Slide 4: Channel Comparison
  addTableSlide(
    pptx,
    'Channel Comparison',
    ['Channel', 'Spend', 'MQLs', 'SAOs', 'Pipeline', 'Cost/SAO', 'ROI'],
    data.channels.map((ch) => [
      ch.name,
      fmtCurrency(ch.spend),
      fmtCompact(ch.mqls),
      fmtCompact(ch.saos),
      fmtCurrency(ch.pipeline),
      ch.saos > 0 ? fmtCurrency(ch.costPerSao) : '-',
      ch.spend > 0 ? `${ch.roi.toFixed(1)}x` : '-',
    ]),
  );

  // Slide 5: Top Campaigns by Pipeline
  const topByPipeline = data.campaignPerformance.slice(0, 10);
  if (topByPipeline.length > 0) {
    addTableSlide(
      pptx,
      'Top Campaigns by Pipeline',
      ['Campaign', 'Pipeline', 'SAOs', 'Spend', 'ROI'],
      topByPipeline.map((c) => [
        c.name,
        fmtCurrency(c.pipeline),
        fmtCompact(c.saos),
        fmtCurrency(c.spend),
        c.spend > 0 ? `${c.roi.toFixed(1)}x` : '-',
      ]),
    );
  }

  // Slide 6: Top Campaigns by ROI
  const topByRoi = [...data.campaignPerformance]
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);
  if (topByRoi.length > 0) {
    addTableSlide(
      pptx,
      'Top Campaigns by ROI',
      ['Campaign', 'ROI', 'Spend', 'Pipeline', 'Revenue'],
      topByRoi.map((c) => [
        c.name,
        `${c.roi.toFixed(1)}x`,
        fmtCurrency(c.spend),
        fmtCurrency(c.pipeline),
        fmtCurrency(c.revenue),
      ]),
    );
  }

  // Slide 7: ICP Penetration
  if (data.icp.targetAccounts > 0) {
    addTableSlide(
      pptx,
      'ICP / Target Account Penetration',
      ['Metric', 'Value', 'Rate'],
      [
        ['Target Accounts', fmtCompact(data.icp.targetAccounts), '-'],
        ['Engaged Accounts', fmtCompact(data.icp.engagedAccounts), fmtPct(safeDiv(data.icp.engagedAccounts, data.icp.targetAccounts))],
        ['Accounts with MQLs', fmtCompact(data.icp.accountsWithMqls), fmtPct(safeDiv(data.icp.accountsWithMqls, data.icp.targetAccounts))],
        ['Accounts with SAOs', fmtCompact(data.icp.accountsWithSaos), fmtPct(safeDiv(data.icp.accountsWithSaos, data.icp.targetAccounts))],
        ['Pipeline from ICP', fmtCurrency(data.icp.pipeline), '-'],
      ],
    );
  }

  // Slides 8-12: Source Detail slides
  const sourceSlides: Array<{ source: string; title: string; metricKeys: string[] }> = [
    { source: 'marketo_theme', title: 'Marketo Themes', metricKeys: ['impressions', 'clicks', 'mqls', 'saos', 'pipeline', 'spend'] },
    { source: 'linkedin_ads', title: 'LinkedIn Ads', metricKeys: ['impressions', 'clicks', 'spend', 'leads', 'mqls', 'saos'] },
    { source: 'hero_asset', title: 'Hero Assets', metricKeys: ['pageViews', 'downloads', 'completions', 'mqls', 'saos', 'pipeline'] },
    { source: 'outreach_sequence', title: 'Outreach Sequences', metricKeys: ['sent', 'opened', 'replied', 'meetings', 'saos'] },
    { source: 'sfdc_event_leads', title: 'SFDC Event Leads', metricKeys: ['registered', 'attended', 'mqls', 'saos', 'opportunities', 'closedWonRevenue'] },
  ];

  for (const { source, title, metricKeys } of sourceSlides) {
    const details = data.sourceDetails[source];
    if (!details || details.length === 0) continue;

    const headers = ['Name', ...metricKeys.map((k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()))];
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

  // Slide 13: AI Insights
  if (insights.length > 0) {
    const highPriority = insights.filter((i) => i.priority === 'high');
    const otherInsights = insights.filter((i) => i.priority !== 'high');

    addInsightsSlide(pptx, 'Key Insights & Learnings', [...highPriority, ...otherInsights].slice(0, 8));

    // Slide 14: Recommendations (high priority only)
    if (highPriority.length > 0) {
      addInsightsSlide(
        pptx,
        'Recommendations & Action Items',
        highPriority.slice(0, 6),
      );
    }
  }

  await downloadPptx(pptx, `Campaign_Performance_${periodLabel.replace(/\s+/g, '_')}`);
}
