import {
  createPptx,
  addTitleSlide,
  addKpiSlide,
  addTableSlide,
  addInsightsSlide,
  fmtCurrency,
  fmtCompact,
  fmtPct,
  downloadPptx,
} from './shared';
import type { InsightItem } from './shared';

interface BudgetReviewData {
  summary: {
    totalBudget: number;
    totalPlanned: number;
    totalActual: number;
    totalPipeline: number;
    remaining: number;
    utilization: number;
    overallRoi: number;
  };
  bySwimlane: Array<{
    name: string;
    budget: number;
    planned: number;
    actual: number;
    variance: number;
    utilization: number;
    pipeline: number;
    saos: number;
    roi: number;
    activityCount: number;
  }>;
  byCampaign: Array<{
    name: string;
    budget: number;
    planned: number;
    actual: number;
    variance: number;
    utilization: number;
    pipeline: number;
    saos: number;
    roi: number;
    activityCount: number;
  }>;
  byRegion: Array<{
    region: string;
    spend: number;
    pipeline: number;
    saos: number;
    roi: number;
  }>;
  overBudget: Array<{
    name: string;
    type: string;
    budget: number;
    actual: number;
    overrun: number;
  }>;
  underBudget: Array<{
    name: string;
    type: string;
    budget: number;
    actual: number;
    remaining: number;
    utilization: number;
  }>;
}

export async function generateBudgetReviewDeck(
  data: BudgetReviewData,
  insights: InsightItem[],
  periodLabel: string,
): Promise<void> {
  const pptx = createPptx();
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Slide 1: Title
  addTitleSlide(pptx, 'Budget & Spend Review', periodLabel, today);

  // Slide 2: Overall Summary
  const s = data.summary;
  addKpiSlide(pptx, 'Overall Budget Summary', [
    { label: 'Total Budget', value: fmtCurrency(s.totalBudget) },
    { label: 'Total Spend', value: fmtCurrency(s.totalActual) },
    { label: 'Remaining', value: fmtCurrency(s.remaining), sub: s.remaining < 0 ? 'OVER BUDGET' : undefined },
    { label: 'Utilization', value: fmtPct(s.utilization) },
    { label: 'Pipeline', value: fmtCurrency(s.totalPipeline) },
    { label: 'Overall ROI', value: `${s.overallRoi.toFixed(1)}x` },
  ]);

  // Slide 3: Spend by Swimlane
  if (data.bySwimlane.length > 0) {
    addTableSlide(
      pptx,
      'Spend by Channel (Swimlane)',
      ['Channel', 'Budget', 'Actual', 'Variance', 'Utilization', 'Pipeline', 'ROI'],
      data.bySwimlane.map((sw) => [
        sw.name,
        fmtCurrency(sw.budget),
        fmtCurrency(sw.actual),
        `${sw.variance >= 0 ? '+' : ''}${fmtCurrency(sw.variance)}`,
        sw.budget > 0 ? fmtPct(sw.utilization) : '-',
        fmtCurrency(sw.pipeline),
        sw.actual > 0 ? `${sw.roi.toFixed(1)}x` : '-',
      ]),
    );
  }

  // Slide 4: Spend by Campaign
  if (data.byCampaign.length > 0) {
    addTableSlide(
      pptx,
      'Spend by Campaign',
      ['Campaign', 'Budget', 'Actual', 'Pipeline', 'ROI', 'Activities'],
      data.byCampaign.map((c) => [
        c.name,
        fmtCurrency(c.budget),
        fmtCurrency(c.actual),
        fmtCurrency(c.pipeline),
        c.actual > 0 ? `${c.roi.toFixed(1)}x` : '-',
        String(c.activityCount),
      ]),
    );
  }

  // Slide 5: Spend by Region
  if (data.byRegion.length > 0) {
    addTableSlide(
      pptx,
      'Spend by Region',
      ['Region', 'Spend', 'Pipeline', 'SAOs', 'ROI'],
      data.byRegion.map((r) => [
        r.region,
        fmtCurrency(r.spend),
        fmtCurrency(r.pipeline),
        fmtCompact(r.saos),
        r.spend > 0 ? `${r.roi.toFixed(1)}x` : '-',
      ]),
    );
  }

  // Slide 6: Over-Budget Alerts
  if (data.overBudget.length > 0) {
    addTableSlide(
      pptx,
      'Over-Budget Alerts',
      ['Name', 'Type', 'Budget', 'Actual', 'Overrun %'],
      data.overBudget.map((item) => [
        item.name,
        item.type,
        fmtCurrency(item.budget),
        fmtCurrency(item.actual),
        fmtPct(item.overrun),
      ]),
      { subtitle: 'Items exceeding their allocated budget' },
    );
  }

  // Slide 7: Under-Budget Opportunities
  if (data.underBudget.length > 0) {
    addTableSlide(
      pptx,
      'Under-Budget Opportunities',
      ['Name', 'Type', 'Budget', 'Spent', 'Remaining', 'Utilization'],
      data.underBudget.map((item) => [
        item.name,
        item.type,
        fmtCurrency(item.budget),
        fmtCurrency(item.actual),
        fmtCurrency(item.remaining),
        fmtPct(item.utilization),
      ]),
      { subtitle: 'Items with significant unspent budget — consider reallocation' },
    );
  }

  // Slide 8: AI Insights
  if (insights.length > 0) {
    addInsightsSlide(pptx, 'Budget Insights & Recommendations', insights.slice(0, 8));
  }

  await downloadPptx(pptx, `Budget_Review_${periodLabel.replace(/\s+/g, '_')}`);
}
