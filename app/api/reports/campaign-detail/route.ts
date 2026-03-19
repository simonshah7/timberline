import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  activities,
  campaigns,
  swimlanes,
  statuses,
  campaignReportData,
  campaignEvents,
  events,
  eventAttendees,
  checklistItems,
  Activity,
  Campaign,
  Swimlane,
  Status,
  CampaignReportData,
  Event,
  EventAttendee,
  ChecklistItem,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');
    const campaignId = searchParams.get('campaignId');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    if (!calendarId || !isUuid(calendarId)) {
      return NextResponse.json({ error: 'Valid calendarId required' }, { status: 400 });
    }
    if (!campaignId || !isUuid(campaignId)) {
      return NextResponse.json({ error: 'Valid campaignId required' }, { status: 400 });
    }

    // Fetch the campaign
    const campaignRows: Campaign[] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (campaignRows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    const campaign = campaignRows[0];

    // Fetch activities for this campaign
    let activityRows: Activity[] = await db
      .select()
      .from(activities)
      .where(eq(activities.campaignId, campaignId));

    if (periodStart && periodEnd) {
      activityRows = activityRows.filter(
        (a) => a.endDate >= periodStart && a.startDate <= periodEnd,
      );
    }

    // Fetch swimlanes and statuses for labelling
    const swimlaneRows: Swimlane[] = await db
      .select()
      .from(swimlanes)
      .where(eq(swimlanes.calendarId, calendarId));

    const statusRows: Status[] = await db
      .select()
      .from(statuses)
      .where(eq(statuses.calendarId, calendarId));

    const swimlaneMap = new Map(swimlaneRows.map((s) => [s.id, s.name]));
    const statusMap = new Map(statusRows.map((s) => [s.id, { name: s.name, color: s.color }]));

    // Fetch campaign report data
    let reportRows: CampaignReportData[] = await db
      .select()
      .from(campaignReportData)
      .where(eq(campaignReportData.calendarId, calendarId));

    if (periodStart && periodEnd) {
      reportRows = reportRows.filter(
        (r) => r.periodEnd >= periodStart && r.periodStart <= periodEnd,
      );
    }

    // Fetch linked events via campaignEvents junction
    const ceRows: { id: string; campaignId: string; eventId: string }[] = await db
      .select()
      .from(campaignEvents)
      .where(eq(campaignEvents.campaignId, campaignId));

    const linkedEventIds = ceRows.map((ce) => ce.eventId);

    let linkedEvents: Array<{
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
    }> = [];

    if (linkedEventIds.length > 0) {
      const allEvents: Event[] = await db
        .select()
        .from(events)
        .where(eq(events.calendarId, calendarId));

      const eventMap = new Map(allEvents.map((e) => [e.id, e]));

      for (const eventId of linkedEventIds) {
        const ev = eventMap.get(eventId);
        if (!ev) continue;

        const attendees: EventAttendee[] = await db
          .select()
          .from(eventAttendees)
          .where(eq(eventAttendees.eventId, eventId));

        const checklist: ChecklistItem[] = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.eventId, eventId));

        linkedEvents.push({
          id: ev.id,
          title: ev.title,
          startDate: ev.startDate,
          endDate: ev.endDate,
          location: ev.location,
          cost: num(ev.cost),
          actualCost: num(ev.actualCost),
          expectedSaos: num(ev.expectedSaos),
          actualSaos: num(ev.actualSaos),
          pipelineGenerated: num(ev.pipelineGenerated),
          revenueGenerated: num(ev.revenueGenerated),
          totalPasses: ev.totalPasses ?? 0,
          attendeeCount: attendees.length,
          passesUsed: attendees.filter((a) => a.hasPass).length,
          checklistTotal: checklist.length,
          checklistDone: checklist.filter((c) => c.isDone).length,
        });
      }
    }

    // ── Aggregate activity metrics ──
    const totalSpend = activityRows.reduce((s, a) => s + num(a.actualCost), 0);
    const totalPlanned = activityRows.reduce((s, a) => s + num(a.cost), 0);
    const totalSaos = activityRows.reduce((s, a) => s + num(a.actualSaos), 0);
    const totalExpectedSaos = activityRows.reduce((s, a) => s + num(a.expectedSaos), 0);
    const totalPipeline = activityRows.reduce((s, a) => s + num(a.pipelineGenerated), 0);
    const totalRevenue = activityRows.reduce((s, a) => s + num(a.revenueGenerated), 0);
    const campaignBudget = num(campaign.budget);

    // Add event metrics to totals
    const eventSpend = linkedEvents.reduce((s, e) => s + e.actualCost, 0);
    const eventPipeline = linkedEvents.reduce((s, e) => s + e.pipelineGenerated, 0);
    const eventRevenue = linkedEvents.reduce((s, e) => s + e.revenueGenerated, 0);
    const eventSaos = linkedEvents.reduce((s, e) => s + e.actualSaos, 0);

    const combinedSpend = totalSpend + eventSpend;
    const combinedPipeline = totalPipeline + eventPipeline;
    const combinedRevenue = totalRevenue + eventRevenue;
    const combinedSaos = totalSaos + eventSaos;

    // ── Activity breakdown by swimlane ──
    const bySwimlane: Record<string, { name: string; count: number; spend: number; pipeline: number; saos: number }> = {};
    for (const a of activityRows) {
      const name = swimlaneMap.get(a.swimlaneId) || 'Unknown';
      if (!bySwimlane[a.swimlaneId]) {
        bySwimlane[a.swimlaneId] = { name, count: 0, spend: 0, pipeline: 0, saos: 0 };
      }
      bySwimlane[a.swimlaneId].count++;
      bySwimlane[a.swimlaneId].spend += num(a.actualCost);
      bySwimlane[a.swimlaneId].pipeline += num(a.pipelineGenerated);
      bySwimlane[a.swimlaneId].saos += num(a.actualSaos);
    }

    // ── Activity breakdown by status ──
    const byStatus: Record<string, { name: string; color: string; count: number; spend: number }> = {};
    for (const a of activityRows) {
      const key = a.status || 'Considering';
      if (!byStatus[key]) {
        byStatus[key] = { name: key, color: '#7C9AA3', count: 0, spend: 0 };
      }
      // Also check statusId for custom statuses
      if (a.statusId && statusMap.has(a.statusId)) {
        const st = statusMap.get(a.statusId)!;
        byStatus[key].color = st.color;
      }
      byStatus[key].count++;
      byStatus[key].spend += num(a.actualCost);
    }

    // ── Activity breakdown by region ──
    const byRegion: Record<string, { count: number; spend: number; pipeline: number; saos: number }> = {};
    for (const a of activityRows) {
      const region = a.region || 'US';
      if (!byRegion[region]) {
        byRegion[region] = { count: 0, spend: 0, pipeline: 0, saos: 0 };
      }
      byRegion[region].count++;
      byRegion[region].spend += num(a.actualCost);
      byRegion[region].pipeline += num(a.pipelineGenerated);
      byRegion[region].saos += num(a.actualSaos);
    }

    // ── Report data by source ──
    const bySource: Record<string, Array<{ label: string; category: string; metrics: Record<string, number> }>> = {};
    for (const row of reportRows) {
      const src = row.source;
      if (!bySource[src]) bySource[src] = [];
      bySource[src].push({ label: row.label, category: row.category, metrics: row.metrics as Record<string, number> });
    }

    const sumMetric = (source: string, key: string) =>
      (bySource[source] || []).reduce((s, r) => s + (r.metrics[key] ?? 0), 0);

    // Full funnel from report data
    const funnel = {
      impressions: sumMetric('marketo_theme', 'impressions') + sumMetric('linkedin_ads', 'impressions'),
      clicks: sumMetric('marketo_theme', 'clicks') + sumMetric('linkedin_ads', 'clicks'),
      mqls: sumMetric('marketo_theme', 'mqls') + sumMetric('marketo_channel', 'mqls') +
            sumMetric('linkedin_ads', 'mqls') + sumMetric('hero_asset', 'mqls'),
      saos: combinedSaos || (sumMetric('marketo_theme', 'saos') + sumMetric('linkedin_ads', 'saos') +
            sumMetric('hero_asset', 'saos') + sumMetric('outreach_sequence', 'saos')),
      pipeline: combinedPipeline || sumMetric('hero_asset', 'pipeline') + sumMetric('marketo_theme', 'pipeline'),
      revenue: combinedRevenue,
    };

    // Source detail tables
    const sourceDetails: Record<string, Array<{ label: string; metrics: Record<string, number> }>> = {};
    for (const [source, rows] of Object.entries(bySource)) {
      const labelMap = new Map<string, Record<string, number>>();
      for (const row of rows) {
        const existing = labelMap.get(row.label) ?? {};
        for (const [k, v] of Object.entries(row.metrics)) {
          existing[k] = (existing[k] ?? 0) + v;
        }
        labelMap.set(row.label, existing);
      }
      sourceDetails[source] = [...labelMap.entries()].map(([label, metrics]) => ({ label, metrics }));
    }

    // ── Activity list (top activities by spend) ──
    const activityList = activityRows
      .map((a) => ({
        id: a.id,
        title: a.title,
        swimlane: swimlaneMap.get(a.swimlaneId) || 'Unknown',
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        cost: num(a.cost),
        actualCost: num(a.actualCost),
        expectedSaos: num(a.expectedSaos),
        actualSaos: num(a.actualSaos),
        pipelineGenerated: num(a.pipelineGenerated),
        revenueGenerated: num(a.revenueGenerated),
        region: a.region || 'US',
        roi: safeDiv(num(a.pipelineGenerated), num(a.actualCost)),
      }))
      .sort((a, b) => b.actualCost - a.actualCost);

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        budget: campaignBudget,
      },
      summary: {
        budget: campaignBudget,
        totalPlanned,
        totalSpend: combinedSpend,
        totalSaos: combinedSaos,
        totalExpectedSaos,
        totalPipeline: combinedPipeline,
        totalRevenue: combinedRevenue,
        budgetUtilization: safeDiv(combinedSpend, campaignBudget),
        roi: safeDiv(combinedPipeline, combinedSpend),
        costPerSao: safeDiv(combinedSpend, combinedSaos),
        activityCount: activityRows.length,
        eventCount: linkedEvents.length,
      },
      funnel,
      bySwimlane: Object.values(bySwimlane).sort((a, b) => b.spend - a.spend),
      byStatus: Object.values(byStatus).sort((a, b) => b.count - a.count),
      byRegion: Object.entries(byRegion).map(([region, data]) => ({
        region,
        ...data,
        roi: safeDiv(data.pipeline, data.spend),
      })),
      activities: activityList,
      linkedEvents,
      sourceDetails,
    });
  } catch (error) {
    logger.error('Error fetching campaign detail data', error);
    return NextResponse.json({ error: 'Failed to fetch campaign detail data' }, { status: 500 });
  }
}
