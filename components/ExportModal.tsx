'use client';

import { useState } from 'react';
import { generateCampaignPerformanceDeck } from '@/lib/pptx/campaignDeck';
import { generateBudgetReviewDeck } from '@/lib/pptx/budgetDeck';
import type { InsightItem } from '@/lib/pptx/shared';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startDate: string, endDate: string, exportType: 'timeline' | 'calendar' | 'table', exportFormat: 'png' | 'csv') => void;
  currentView: string;
  calendarId?: string;
}

type ExportFormat = 'png' | 'csv' | 'pptx';
type PptxReportType = 'campaign-performance' | 'budget-review';

export function ExportModal({ isOpen, onClose, onExport, currentView, calendarId }: ExportModalProps) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastOfMonth.toISOString().split('T')[0]);
  const [exportType, setExportType] = useState<'timeline' | 'calendar' | 'table'>(
    currentView === 'timeline' || currentView === 'calendar' || currentView === 'table'
      ? currentView
      : 'timeline'
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [pptxReportType, setPptxReportType] = useState<PptxReportType>('campaign-performance');
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const setQuickRange = (range: 'month' | 'quarter' | 'year' | 'all') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (range) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() + 1, 11, 31);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExport = async () => {
    if (exportFormat === 'pptx') {
      if (!calendarId) {
        alert('Calendar context required for PPTX export');
        return;
      }
      setGenerating(true);
      try {
        const periodLabel = `${startDate} to ${endDate}`;

        if (pptxReportType === 'campaign-performance') {
          const res = await fetch(`/api/reports/campaign-performance?calendarId=${calendarId}&periodStart=${startDate}&periodEnd=${endDate}`);
          if (!res.ok) throw new Error('Failed to fetch report data');
          const data = await res.json();

          let insights: InsightItem[] = [];
          try {
            const insightRes = await fetch(`/api/ai/campaign-insights?calendarId=${calendarId}`);
            if (insightRes.ok) {
              const insightData = await insightRes.json();
              insights = insightData.insights || [];
            }
          } catch {
            // Continue without insights
          }

          await generateCampaignPerformanceDeck(data, insights, periodLabel);
        } else if (pptxReportType === 'budget-review') {
          const res = await fetch(`/api/reports/budget-review?calendarId=${calendarId}&periodStart=${startDate}&periodEnd=${endDate}`);
          if (!res.ok) throw new Error('Failed to fetch budget data');
          const data = await res.json();

          let insights: InsightItem[] = [];
          try {
            const insightRes = await fetch(`/api/ai/budget-insights?calendarId=${calendarId}`);
            if (insightRes.ok) {
              const insightData = await insightRes.json();
              insights = (insightData.insights || []).map((i: { type: string; title: string; description: string }) => ({
                type: i.type,
                title: i.title,
                description: i.description,
                priority: 'medium',
              }));
            }
          } catch {
            // Continue without insights
          }

          await generateBudgetReviewDeck(data, insights, periodLabel);
        }

        onClose();
      } catch (error) {
        console.error('Error generating PPTX:', error);
        alert('Failed to generate PPTX report');
      }
      setGenerating(false);
    } else {
      onExport(startDate, endDate, exportType, exportFormat as 'png' | 'csv');
      onClose();
    }
  };

  const handleTypeChange = (type: 'timeline' | 'calendar' | 'table') => {
    setExportType(type);
    if (type !== 'table' && exportFormat === 'csv') {
      setExportFormat('png');
    }
  };

  const handleFormatChange = (format: ExportFormat) => {
    setExportFormat(format);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-card-border">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Export Data
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Download your campaign data as an image, spreadsheet, or presentation deck.
        </p>

        <div className="space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleFormatChange('png')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${exportFormat === 'png'
                    ? 'bg-accent-purple-btn text-white'
                    : 'bg-muted text-foreground hover:opacity-80'
                  }`}
              >
                PNG Image
              </button>
              <button
                onClick={() => handleFormatChange('csv')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${exportFormat === 'csv'
                    ? 'bg-accent-purple-btn text-white'
                    : 'bg-muted text-foreground hover:opacity-80'
                  }`}
              >
                CSV
              </button>
              <button
                onClick={() => handleFormatChange('pptx')}
                disabled={!calendarId}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${exportFormat === 'pptx'
                    ? 'bg-accent-purple-btn text-white'
                    : !calendarId
                      ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                      : 'bg-muted text-foreground hover:opacity-80'
                  }`}
              >
                PPTX Deck
              </button>
            </div>
          </div>

          {/* View selector - only for PNG/CSV */}
          {exportFormat !== 'pptx' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select View to Export
              </label>
              <div className="flex gap-2">
                {(['timeline', 'calendar', 'table'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${exportType === type
                        ? 'bg-accent-purple-btn text-white'
                        : 'bg-muted text-foreground hover:opacity-80'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {exportFormat === 'csv' && exportType !== 'table' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  CSV export is only available for Table view.
                </p>
              )}
            </div>
          )}

          {/* PPTX Report Type selector */}
          {exportFormat === 'pptx' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Report Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPptxReportType('campaign-performance')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pptxReportType === 'campaign-performance'
                      ? 'bg-accent-purple-btn text-white'
                      : 'bg-muted text-foreground hover:opacity-80'
                    }`}
                >
                  Campaign Performance
                </button>
                <button
                  onClick={() => setPptxReportType('budget-review')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pptxReportType === 'budget-review'
                      ? 'bg-accent-purple-btn text-white'
                      : 'bg-muted text-foreground hover:opacity-80'
                    }`}
                >
                  Budget Review
                </button>
              </div>
            </div>
          )}

          {/* Quick Selects */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quick Range
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickRange('month')}
                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:opacity-80"
              >
                This Month
              </button>
              <button
                onClick={() => setQuickRange('quarter')}
                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:opacity-80"
              >
                This Quarter
              </button>
              <button
                onClick={() => setQuickRange('year')}
                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:opacity-80"
              >
                This Year
              </button>
              <button
                onClick={() => setQuickRange('all')}
                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:opacity-80"
              >
                All Time
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-card-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-card-border rounded-lg bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:opacity-80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={generating}
            className="px-6 py-2 text-sm font-medium text-white bg-accent-purple-btn rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Export ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
