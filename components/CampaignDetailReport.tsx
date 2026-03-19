'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import {
  SolarAltArrowDown,
  SolarDownloadLinear,
} from './SolarIcons';
import { generateCampaignDetailDeck } from '@/lib/pptx/campaignDetailDeck';
import type { InsightItem } from '@/lib/pptx/shared';

// ─── Types ─────────────────────────────────────────────
interface CampaignOption {
  id: string;
  name: string;
  budget: string | null;
}

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

// ─── Helpers ───────────────────────────────────────────
function fmtCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function pctRaw(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ─── Sub-components ────────────────────────────────────

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-card border border-card-border rounded-lg p-4 ${className}`}
    >
      {title && <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>}
      {children}
    </motion.div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-bold" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden w-20 inline-block ml-2 align-middle">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      />
    </div>
  );
}

function FunnelChart({ stages, color }: { stages: { label: string; value: number }[]; color: string }) {
  const maxVal = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const w = Math.max((stage.value / maxVal) * 100, 8);
        const opacity = 1 - i * 0.12;
        return (
          <motion.div
            key={stage.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-muted-foreground w-24 text-right truncate">{stage.label}</span>
            <div className="flex-1 relative">
              <motion.div
                className="h-7 rounded-md flex items-center px-2"
                initial={{ width: '8%' }}
                animate={{ width: `${w}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 + i * 0.08 }}
                style={{ backgroundColor: color, opacity }}
              >
                <span className="text-xs font-semibold text-white">{fmtCompact(stage.value)}</span>
              </motion.div>
            </div>
            {i > 0 && (
              <span className="text-[10px] text-muted-foreground w-14 text-right">
                {stages[i - 1].value > 0
                  ? pctRaw((stage.value / stages[i - 1].value) * 100)
                  : '—'}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function ProgressRing({ value, max, size = 56, strokeWidth = 5, color }: { value: number; max: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pctValue = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pctValue);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{pctRaw(pctValue * 100)}</span>
    </div>
  );
}

// ─── Status colors ─────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Considering: '#7C9AA3',
  Negotiating: '#FFA943',
  Committed: '#34E5E2',
};

// ─── Source tab config ─────────────────────────────────
type SourceTab = 'themes' | 'channels' | 'hero-assets' | 'linkedin' | 'icp' | 'outreach' | 'event-leads';
const SOURCE_TABS: Array<{ key: SourceTab; label: string; source: string; metricKeys: string[] }> = [
  { key: 'themes', label: 'Marketo Themes', source: 'marketo_theme', metricKeys: ['impressions', 'clicks', 'mqls', 'saos', 'pipeline', 'spend'] },
  { key: 'channels', label: 'Marketo Channels', source: 'marketo_channel', metricKeys: ['mqls', 'saos', 'spend'] },
  { key: 'hero-assets', label: 'Hero Assets', source: 'hero_asset', metricKeys: ['pageViews', 'downloads', 'completions', 'mqls', 'saos', 'pipeline'] },
  { key: 'linkedin', label: 'LinkedIn Ads', source: 'linkedin_ads', metricKeys: ['impressions', 'clicks', 'spend', 'leads', 'mqls', 'saos'] },
  { key: 'icp', label: 'ICP Penetration', source: 'icp_penetration', metricKeys: ['targetAccounts', 'engagedAccounts', 'accountsWithMqls', 'accountsWithSaos', 'pipeline'] },
  { key: 'outreach', label: 'Outreach', source: 'outreach_sequence', metricKeys: ['sent', 'opened', 'replied', 'meetings', 'saos'] },
  { key: 'event-leads', label: 'Event Leads', source: 'sfdc_event_leads', metricKeys: ['registered', 'attended', 'mqls', 'saos', 'opportunities', 'closedWonRevenue'] },
];

// ─── Main Component ────────────────────────────────────

interface CampaignDetailReportProps {
  calendarId: string;
}

export function CampaignDetailReport({ calendarId }: CampaignDetailReportProps) {
  const [campaignList, setCampaignList] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [data, setData] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeSourceTab, setActiveSourceTab] = useState<SourceTab>('themes');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Date range (current quarter default)
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  const periodStart = qStart.toISOString().split('T')[0];
  const periodEnd = qEnd.toISOString().split('T')[0];

  // Fetch campaign list
  useEffect(() => {
    async function load() {
      setLoadingCampaigns(true);
      try {
        const res = await fetch(`/api/campaigns?calendarId=${calendarId}`);
        if (res.ok) {
          const list = await res.json();
          setCampaignList(list);
          if (list.length > 0 && !selectedCampaignId) {
            setSelectedCampaignId(list[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to fetch campaigns:', e);
      }
      setLoadingCampaigns(false);
    }
    load();
  }, [calendarId]);

  // Fetch campaign detail when selection changes
  useEffect(() => {
    if (!selectedCampaignId) return;
    async function load() {
      setLoading(true);
      setData(null);
      try {
        const res = await fetch(
          `/api/reports/campaign-detail?calendarId=${calendarId}&campaignId=${selectedCampaignId}&periodStart=${periodStart}&periodEnd=${periodEnd}`,
        );
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch campaign detail:', e);
      }
      setLoading(false);
    }
    load();
  }, [calendarId, selectedCampaignId, periodStart, periodEnd]);

  // Export PPTX
  const handleExport = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      let insights: InsightItem[] = [];
      try {
        const res = await fetch(`/api/ai/campaign-insights?calendarId=${calendarId}`);
        if (res.ok) {
          const d = await res.json();
          insights = d.insights || [];
        }
      } catch { /* continue */ }
      await generateCampaignDetailDeck(data, insights, `${periodStart} to ${periodEnd}`);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
  }, [data, calendarId, periodStart, periodEnd]);

  // Source data for active tab
  const activeSource = SOURCE_TABS.find((t) => t.key === activeSourceTab);
  const sourceRows = activeSource && data?.sourceDetails[activeSource.source]
    ? data.sourceDetails[activeSource.source]
    : [];

  const maxSpendActivity = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.activities.map((a) => a.actualCost), 1);
  }, [data]);

  const visibleActivities = showAllActivities
    ? data?.activities ?? []
    : (data?.activities ?? []).slice(0, 10);

  // ── Loading / empty states ──
  if (loadingCampaigns) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
        Loading campaigns...
      </div>
    );
  }

  if (campaignList.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        No campaigns found. Create a campaign first to generate reports.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Campaign Selector + Export ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-card-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors min-w-[240px]"
          >
            <span className="flex-1 text-left truncate">
              {campaignList.find((c) => c.id === selectedCampaignId)?.name || 'Select campaign'}
            </span>
            <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <SolarAltArrowDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </button>
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 mt-1 w-full min-w-[280px] bg-card border border-card-border rounded-lg shadow-lg overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto py-1">
                  {campaignList.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCampaignId(c.id);
                        setDropdownOpen(false);
                        setShowAllActivities(false);
                        setActiveSourceTab('themes');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                        c.id === selectedCampaignId
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {c.budget && parseFloat(c.budget) > 0 && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {fmtCurrency(parseFloat(c.budget))}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {data && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-accent-purple-btn rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <SolarDownloadLinear className="w-3.5 h-3.5" />
            {exporting ? 'Generating...' : 'Export PPTX'}
          </button>
        )}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Loading report...
        </div>
      )}

      {/* ── Report content ── */}
      {data && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* ── KPI Summary ── */}
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Stat label="Budget" value={fmtCurrency(data.summary.budget)} sub={`${pctRaw(data.summary.budgetUtilization * 100)} utilized`} />
              <Stat label="Total Spend" value={fmtCurrency(data.summary.totalSpend)} sub={`${fmtCurrency(data.summary.totalPlanned)} planned`} />
              <Stat label="Pipeline" value={fmtCurrency(data.summary.totalPipeline)} color="#34E5E2" />
              <Stat label="Revenue" value={fmtCurrency(data.summary.totalRevenue)} color="#22C55E" />
              <Stat label="SAOs" value={fmtCompact(data.summary.totalSaos)} sub={`${fmtCompact(data.summary.totalExpectedSaos)} expected`} />
              <Stat label="ROI" value={`${data.summary.roi.toFixed(1)}x`} sub={`$${fmtCompact(data.summary.costPerSao)} / SAO`} color="#7A00C1" />
            </div>
          </Card>

          {/* ── Budget Utilization + Status Distribution ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Budget Utilization">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={data.summary.totalSpend}
                  max={data.summary.budget}
                  color={data.summary.budgetUtilization > 1 ? '#FF715A' : data.summary.budgetUtilization > 0.85 ? '#FFA943' : '#34E5E2'}
                  size={80}
                  strokeWidth={6}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium text-foreground">{fmtCurrency(data.summary.budget)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-medium text-foreground">{fmtCurrency(data.summary.totalSpend)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className={`font-medium ${data.summary.budget - data.summary.totalSpend < 0 ? 'text-red-400' : 'text-foreground'}`}>
                      {fmtCurrency(data.summary.budget - data.summary.totalSpend)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Activities</span>
                    <span className="font-medium text-foreground">{data.summary.activityCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Events</span>
                    <span className="font-medium text-foreground">{data.summary.eventCount}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Activity Status">
              <div className="space-y-2">
                {data.byStatus.map((s, i) => {
                  const total = data.summary.activityCount;
                  const pct = total > 0 ? (s.count / total) * 100 : 0;
                  const color = STATUS_COLORS[s.name] || s.color || '#7C9AA3';
                  return (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-foreground flex-1">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.count}</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">{pctRaw(pct)}</span>
                    </motion.div>
                  );
                })}
                {data.byStatus.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-3">No activities</div>
                )}
              </div>
            </Card>
          </div>

          {/* ── Full Funnel ── */}
          {(data.funnel.impressions > 0 || data.funnel.mqls > 0 || data.funnel.saos > 0) && (
            <Card title="Full Funnel">
              <FunnelChart
                color="#006170"
                stages={[
                  { label: 'Impressions', value: data.funnel.impressions },
                  { label: 'Clicks', value: data.funnel.clicks },
                  { label: 'MQLs', value: data.funnel.mqls },
                  { label: 'SAOs', value: data.funnel.saos },
                  { label: 'Pipeline', value: data.funnel.pipeline },
                  { label: 'Revenue', value: data.funnel.revenue },
                ]}
              />
            </Card>
          )}

          {/* ── Swimlane Breakdown ── */}
          {data.bySwimlane.length > 0 && (
            <Card title="Spend by Channel">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-card-border">
                      <th className="text-left py-2 pr-4 font-medium">Channel</th>
                      <th className="text-right py-2 px-2 font-medium">Activities</th>
                      <th className="text-right py-2 px-2 font-medium">Spend</th>
                      <th className="text-right py-2 px-2 font-medium">Pipeline</th>
                      <th className="text-right py-2 px-2 font-medium">SAOs</th>
                      <th className="text-right py-2 pl-2 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySwimlane.map((sw, i) => (
                      <motion.tr
                        key={sw.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-card-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 pr-4 font-medium text-foreground">{sw.name}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{sw.count}</td>
                        <td className="py-2 px-2 text-right text-foreground">{fmtCurrency(sw.spend)}</td>
                        <td className="py-2 px-2 text-right text-foreground">{fmtCurrency(sw.pipeline)}</td>
                        <td className="py-2 px-2 text-right text-foreground">{fmtCompact(sw.saos)}</td>
                        <td className="py-2 pl-2 text-right font-medium" style={{ color: '#7A00C1' }}>
                          {sw.spend > 0 ? `${(sw.pipeline / sw.spend).toFixed(1)}x` : '—'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Regional Breakdown ── */}
          {data.byRegion.length > 0 && (
            <Card title="Regional Breakdown">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.byRegion.map((r, i) => (
                  <motion.div
                    key={r.region}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-muted/30 rounded-lg p-3 space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-foreground">{r.region}</div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Activities</span>
                      <span className="text-foreground">{r.count}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Spend</span>
                      <span className="text-foreground">{fmtCurrency(r.spend)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Pipeline</span>
                      <span className="text-foreground">{fmtCurrency(r.pipeline)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">ROI</span>
                      <span className="font-medium" style={{ color: '#7A00C1' }}>{r.spend > 0 ? `${r.roi.toFixed(1)}x` : '—'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Source Detail Tabs ── */}
          {Object.keys(data.sourceDetails).length > 0 && (
            <Card>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {SOURCE_TABS.filter((t) => data.sourceDetails[t.source]?.length).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSourceTab(tab.key)}
                    className={`px-2.5 py-1.5 text-[11px] rounded-md font-medium transition-colors ${
                      activeSourceTab === tab.key
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSource && sourceRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-card-border">
                        <th className="text-left py-2 pr-4 font-medium">Name</th>
                        {activeSource.metricKeys.map((k) => (
                          <th key={k} className="text-right py-2 px-2 font-medium">
                            {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRows.slice(0, 15).map((row, i) => (
                        <motion.tr
                          key={row.label}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-card-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2 pr-4 font-medium text-foreground truncate max-w-[200px]">{row.label}</td>
                          {activeSource.metricKeys.map((k) => {
                            const v = row.metrics[k] ?? 0;
                            const isCurrency = k.includes('spend') || k.includes('pipeline') || k.includes('revenue') || k.includes('Revenue');
                            return (
                              <td key={k} className="py-2 px-2 text-right text-foreground tabular-nums">
                                {isCurrency ? fmtCurrency(v) : fmtCompact(v)}
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sourceRows.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">
                  No data for this source.
                </div>
              )}
            </Card>
          )}

          {/* ── Linked Events ── */}
          {data.linkedEvents.length > 0 && (
            <Card title="Linked Events">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-card-border">
                      <th className="text-left py-2 pr-4 font-medium">Event</th>
                      <th className="text-left py-2 px-2 font-medium">Dates</th>
                      <th className="text-right py-2 px-2 font-medium">Spend</th>
                      <th className="text-right py-2 px-2 font-medium">SAOs</th>
                      <th className="text-right py-2 px-2 font-medium">Pipeline</th>
                      <th className="text-right py-2 px-2 font-medium">Attendees</th>
                      <th className="text-right py-2 px-2 font-medium">Passes</th>
                      <th className="text-right py-2 pl-2 font-medium">Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.linkedEvents.map((ev, i) => (
                      <motion.tr
                        key={ev.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-card-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 pr-4">
                          <div className="font-medium text-foreground">{ev.title}</div>
                          {ev.location && <div className="text-[10px] text-muted-foreground">{ev.location}</div>}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{ev.startDate} — {ev.endDate}</td>
                        <td className="py-2 px-2 text-right text-foreground">{fmtCurrency(ev.actualCost)}</td>
                        <td className="py-2 px-2 text-right text-foreground">{ev.actualSaos}</td>
                        <td className="py-2 px-2 text-right text-foreground">{fmtCurrency(ev.pipelineGenerated)}</td>
                        <td className="py-2 px-2 text-right text-foreground">{ev.attendeeCount}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">
                          {ev.passesUsed}/{ev.totalPasses}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          {ev.checklistTotal > 0 ? (
                            <span className={`font-medium ${ev.checklistDone === ev.checklistTotal ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {pctRaw((ev.checklistDone / ev.checklistTotal) * 100)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Activity Table ── */}
          {data.activities.length > 0 && (
            <Card title={`Activities (${data.activities.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-card-border">
                      <th className="text-left py-2 pr-4 font-medium">Activity</th>
                      <th className="text-left py-2 px-2 font-medium">Channel</th>
                      <th className="text-left py-2 px-2 font-medium">Status</th>
                      <th className="text-left py-2 px-2 font-medium">Region</th>
                      <th className="text-right py-2 px-2 font-medium">Spend</th>
                      <th className="text-right py-2 px-2 font-medium">SAOs</th>
                      <th className="text-right py-2 px-2 font-medium">Pipeline</th>
                      <th className="text-right py-2 pl-2 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleActivities.map((a, i) => {
                      const statusColor = STATUS_COLORS[a.status] || '#7C9AA3';
                      return (
                        <motion.tr
                          key={a.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-card-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2 pr-4">
                            <div className="font-medium text-foreground truncate max-w-[220px]">{a.title}</div>
                            <div className="text-[10px] text-muted-foreground">{a.startDate} — {a.endDate}</div>
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">{a.swimlane}</td>
                          <td className="py-2 px-2">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">{a.region}</td>
                          <td className="py-2 px-2 text-right text-foreground">
                            {fmtCurrency(a.actualCost)}
                            <MiniBar value={a.actualCost} max={maxSpendActivity} color="#006170" />
                          </td>
                          <td className="py-2 px-2 text-right text-foreground">{fmtCompact(a.actualSaos)}</td>
                          <td className="py-2 px-2 text-right text-foreground">{fmtCurrency(a.pipelineGenerated)}</td>
                          <td className="py-2 pl-2 text-right font-medium" style={{ color: '#7A00C1' }}>
                            {a.actualCost > 0 ? `${a.roi.toFixed(1)}x` : '—'}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {data.activities.length > 10 && (
                <button
                  onClick={() => setShowAllActivities(!showAllActivities)}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllActivities ? 'Show less' : `Show all ${data.activities.length} activities`}
                </button>
              )}
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
