import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// ─── Types ──────────────────────────────────────────────

export interface ICPOpportunity {
  accountName: string;
  accountId: string;
  oppOwner: string;
  opportunityId: string;
  opportunityName: string;
  oppStage: string;
  oppType: string;
  oppCreatedDate: string;
  saoDate: string;
  leadSource: string;
  salesNextSteps: string;
  lastStageChangeDate: string;
  prospectAccountTier: string;
  capdbScore: string;
  billingCountry: string;
  oppNotes: string;
}

export interface ICPUntouchedAccount {
  accountName: string;
  accountId: string;
  accountTeam: string;
  accountType: string;
  prospectAccountTier: string;
  capdbScore: string;
  billingCountry: string;
}

export interface ICPSummaryMetrics {
  totalAccounts: number;
  totalOpportunities: number;
  untouchedAccounts: number;
  // Stage funnel
  stageDistribution: Record<string, number>;
  // Opp type breakdown
  oppTypeDistribution: Record<string, number>;
  // Lead source breakdown
  leadSourceDistribution: Record<string, number>;
  // CAPdB FA score breakdown
  faScoreDistribution: Record<string, number>;
  // Country/region breakdown
  countryDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  // Opp owner distribution
  ownerDistribution: Record<string, number>;
  // Untouched account type breakdown
  untouchedAccountTypeDistribution: Record<string, number>;
  // Active pipeline stages (non-closed)
  activePipelineCount: number;
  closedWonCount: number;
  closedLostCount: number;
}

export interface ICPAccountSummary {
  accountName: string;
  accountId: string;
  totalOpps: number;
  activeOpps: number;
  closedWon: number;
  closedLost: number;
  faScore: string;
  topStage: string;
  leadSources: string[];
  country: string;
  owners: string[];
  oppTypes: string[];
}

// ─── Helpers ────────────────────────────────────────────

const COUNTRY_TO_REGION: Record<string, string> = {
  'United States': 'Americas',
  'Canada': 'Americas',
  'Mexico': 'Americas',
  'Brazil': 'Americas',
  'Argentina': 'Americas',
  'Colombia': 'Americas',
  'United Kingdom': 'EMEA',
  'Germany': 'EMEA',
  'France': 'EMEA',
  'Switzerland': 'EMEA',
  'Netherlands': 'EMEA',
  'Denmark': 'EMEA',
  'Sweden': 'EMEA',
  'Finland': 'EMEA',
  'Belgium': 'EMEA',
  'Austria': 'EMEA',
  'Italy': 'EMEA',
  'Spain': 'EMEA',
  'Ireland': 'EMEA',
  'Poland': 'EMEA',
  'Hungary': 'EMEA',
  'Luxembourg': 'EMEA',
  'Saudi Arabia': 'EMEA',
  'United Arab Emirates': 'EMEA',
  'Japan': 'APAC',
  'Australia': 'APAC',
  'Singapore': 'APAC',
  'India': 'APAC',
};

const ACTIVE_STAGES = ['Identify', 'Discovery', 'Solution Overview', 'Eval Planning', 'Structured Eval', 'Offer', 'Negotiation'];
const STAGE_ORDER = ['Untouched', 'Identify', 'Discovery', 'Solution Overview', 'Eval Planning', 'Structured Eval', 'Offer', 'Negotiation', 'Closed Won', 'Closed Lost'];

function extractFAScore(capdbScore: string): string {
  if (!capdbScore) return 'Unknown';
  const parts = capdbScore.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('FA-')) return trimmed;
  }
  return 'Unknown';
}

function getTopStage(stages: string[]): string {
  let bestIdx = -1;
  for (const s of stages) {
    const idx = STAGE_ORDER.indexOf(s);
    if (idx > bestIdx) bestIdx = idx;
  }
  return bestIdx >= 0 ? STAGE_ORDER[bestIdx] : 'Unknown';
}

// ─── Parser ─────────────────────────────────────────────

export function parseICPSpreadsheet(filePath?: string): {
  opportunities: ICPOpportunity[];
  untouchedAccounts: ICPUntouchedAccount[];
  summary: ICPSummaryMetrics;
  topAccounts: ICPAccountSummary[];
} {
  const resolvedPath = filePath || path.join(process.cwd(), 'public', 'FA ICP Opps.xlsx');
  const fileBuffer = fs.readFileSync(resolvedPath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  // ── Parse ICP Opps ──
  const oppsSheet = workbook.Sheets['ICP Opps - Extract'];
  const oppsRaw = XLSX.utils.sheet_to_json<Record<string, string>>(oppsSheet);
  const opportunities: ICPOpportunity[] = oppsRaw.map((row) => ({
    accountName: row['AccountName'] || '',
    accountId: row['AccountId'] || '',
    oppOwner: row['OppOwner'] || '',
    opportunityId: row['OpportunityId'] || '',
    opportunityName: row['OpportunityName'] || '',
    oppStage: row['OppStage'] || '',
    oppType: row['OppType'] || '',
    oppCreatedDate: row['OppCreatedDate'] || '',
    saoDate: row['SAODate'] || '',
    leadSource: row['LeadSource'] || '',
    salesNextSteps: row['SalesNextSteps'] || '',
    lastStageChangeDate: row['LastStageChangeDate'] || '',
    prospectAccountTier: row['ProspectAccountTier'] || '',
    capdbScore: row['CAPdB_Score'] || '',
    billingCountry: row['BillingCountry'] || '',
    oppNotes: row['OppNotes'] || '',
  }));

  // ── Parse Untouched ICP ──
  const untouchedSheet = workbook.Sheets['Untouched ICP - Extract'];
  const untouchedRaw = XLSX.utils.sheet_to_json<Record<string, string>>(untouchedSheet);
  const untouchedAccounts: ICPUntouchedAccount[] = untouchedRaw.map((row) => ({
    accountName: row['AccountName'] || '',
    accountId: row['AccountId'] || '',
    accountTeam: row['AccountTeam'] || '',
    accountType: row['AccountType'] || '',
    prospectAccountTier: row['ProspectAccountTier'] || '',
    capdbScore: row['CAPdB_Score'] || '',
    billingCountry: row['BillingCountry'] || '',
  }));

  // ── Compute Summary ──
  const stageDistribution: Record<string, number> = {};
  const oppTypeDistribution: Record<string, number> = {};
  const leadSourceDistribution: Record<string, number> = {};
  const faScoreDistribution: Record<string, number> = {};
  const countryDistribution: Record<string, number> = {};
  const regionDistribution: Record<string, number> = {};
  const ownerDistribution: Record<string, number> = {};

  const uniqueAccounts = new Set<string>();
  let activePipelineCount = 0;
  let closedWonCount = 0;
  let closedLostCount = 0;

  for (const opp of opportunities) {
    uniqueAccounts.add(opp.accountId);

    // Stage
    const stage = opp.oppStage || 'Unknown';
    stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;

    if (ACTIVE_STAGES.includes(stage)) activePipelineCount++;
    if (stage === 'Closed Won') closedWonCount++;
    if (stage === 'Closed Lost') closedLostCount++;

    // Opp type
    if (opp.oppType) {
      oppTypeDistribution[opp.oppType] = (oppTypeDistribution[opp.oppType] || 0) + 1;
    }

    // Lead source
    if (opp.leadSource) {
      leadSourceDistribution[opp.leadSource] = (leadSourceDistribution[opp.leadSource] || 0) + 1;
    }

    // FA score
    const faScore = extractFAScore(opp.capdbScore);
    faScoreDistribution[faScore] = (faScoreDistribution[faScore] || 0) + 1;

    // Country & region
    if (opp.billingCountry) {
      countryDistribution[opp.billingCountry] = (countryDistribution[opp.billingCountry] || 0) + 1;
      const region = COUNTRY_TO_REGION[opp.billingCountry] || 'Other';
      regionDistribution[region] = (regionDistribution[region] || 0) + 1;
    }

    // Owner
    if (opp.oppOwner) {
      ownerDistribution[opp.oppOwner] = (ownerDistribution[opp.oppOwner] || 0) + 1;
    }
  }

  // Untouched account type distribution
  const untouchedAccountTypeDistribution: Record<string, number> = {};
  for (const acct of untouchedAccounts) {
    if (acct.accountType) {
      untouchedAccountTypeDistribution[acct.accountType] = (untouchedAccountTypeDistribution[acct.accountType] || 0) + 1;
    }
  }

  const summary: ICPSummaryMetrics = {
    totalAccounts: uniqueAccounts.size,
    totalOpportunities: opportunities.length,
    untouchedAccounts: untouchedAccounts.length,
    stageDistribution,
    oppTypeDistribution,
    leadSourceDistribution,
    faScoreDistribution,
    countryDistribution,
    regionDistribution,
    ownerDistribution,
    untouchedAccountTypeDistribution,
    activePipelineCount,
    closedWonCount,
    closedLostCount,
  };

  // ── Build per-account summaries ──
  const accountMap = new Map<string, ICPAccountSummary>();
  for (const opp of opportunities) {
    let acct = accountMap.get(opp.accountId);
    if (!acct) {
      acct = {
        accountName: opp.accountName,
        accountId: opp.accountId,
        totalOpps: 0,
        activeOpps: 0,
        closedWon: 0,
        closedLost: 0,
        faScore: extractFAScore(opp.capdbScore),
        topStage: 'Unknown',
        leadSources: [],
        country: opp.billingCountry,
        owners: [],
        oppTypes: [],
      };
      accountMap.set(opp.accountId, acct);
    }
    acct.totalOpps++;
    if (ACTIVE_STAGES.includes(opp.oppStage)) acct.activeOpps++;
    if (opp.oppStage === 'Closed Won') acct.closedWon++;
    if (opp.oppStage === 'Closed Lost') acct.closedLost++;
    if (opp.leadSource && !acct.leadSources.includes(opp.leadSource)) {
      acct.leadSources.push(opp.leadSource);
    }
    if (opp.oppOwner && !acct.owners.includes(opp.oppOwner)) {
      acct.owners.push(opp.oppOwner);
    }
    if (opp.oppType && !acct.oppTypes.includes(opp.oppType)) {
      acct.oppTypes.push(opp.oppType);
    }
  }

  // Compute top stage for each account
  for (const acct of accountMap.values()) {
    const acctOpps = opportunities.filter((o) => o.accountId === acct.accountId);
    acct.topStage = getTopStage(acctOpps.map((o) => o.oppStage));
  }

  // Sort by active opps descending, then total opps
  const topAccounts = Array.from(accountMap.values())
    .sort((a, b) => b.activeOpps - a.activeOpps || b.totalOpps - a.totalOpps)
    .slice(0, 25);

  return { opportunities, untouchedAccounts, summary, topAccounts };
}
