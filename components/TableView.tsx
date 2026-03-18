'use client';

import { useState } from 'react';
import { Activity, Status, Swimlane, Campaign } from '@/db/schema';
import { formatDate, formatCurrency, CURRENCIES, REGIONS } from '@/lib/utils';

interface TableViewProps {
  activities: Activity[];
  statuses: Status[];
  swimlanes: Swimlane[];
  campaigns: Campaign[];
  onActivityClick: (activity: Activity) => void;
  onActivityUpdate: (id: string, updates: Partial<Activity>) => Promise<void>;
}

type SortField = 'title' | 'startDate' | 'endDate' | 'status' | 'swimlane' | 'campaign' | 'cost';
type SortDirection = 'asc' | 'desc';

export function TableView({
  activities,
  statuses,
  swimlanes,
  campaigns,
  onActivityClick,
  onActivityUpdate,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedActivities = [...activities].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortField) {
      case 'title': aValue = a.title.toLowerCase(); bValue = b.title.toLowerCase(); break;
      case 'startDate': aValue = a.startDate; bValue = b.startDate; break;
      case 'endDate': aValue = a.endDate; bValue = b.endDate; break;
      case 'status': aValue = statuses.find((s) => s.id === a.statusId)?.name || ''; bValue = statuses.find((s) => s.id === b.statusId)?.name || ''; break;
      case 'swimlane': aValue = swimlanes.find((s) => s.id === a.swimlaneId)?.name || ''; bValue = swimlanes.find((s) => s.id === b.swimlaneId)?.name || ''; break;
      case 'campaign': aValue = campaigns.find((c) => c.id === a.campaignId)?.name || ''; bValue = campaigns.find((c) => c.id === b.campaignId)?.name || ''; break;
      case 'cost': aValue = Number(a.cost) || 0; bValue = Number(b.cost) || 0; break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3.5 h-3.5 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    );
  };

  const handleInlineEdit = async (activityId: string, field: string, value: string | null) => {
    const updates: Partial<Activity> = {};
    switch (field) {
      case 'title': if (value && value.trim()) updates.title = value.trim(); break;
      case 'statusId': updates.statusId = value || ''; break;
      case 'swimlaneId': updates.swimlaneId = value || ''; break;
      case 'campaignId': updates.campaignId = value; break;
      case 'startDate': case 'endDate': if (value) (updates as Record<string, string>)[field] = value; break;
      case 'cost': updates.cost = String(parseFloat(value || '0')); break;
      case 'currency': updates.currency = (value || 'US$') as 'US$' | 'UK£' | 'EUR'; break;
      case 'region': updates.region = (value || 'US') as 'US' | 'EMEA' | 'ROW'; break;
    }
    if (Object.keys(updates).length > 0) await onActivityUpdate(activityId, updates);
    setEditingCell(null);
  };

  const thClass = "text-left px-4 py-2.5";
  const thBtnClass = "flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors";
  const inputClass = "text-sm px-2 py-1 border border-card-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40";

  return (
    <div className="flex-1 overflow-auto bg-card">
      <table className="w-full min-w-[1200px]">
        <thead className="sticky top-0 bg-surface z-10 border-b border-card-border">
          <tr>
            <th className={thClass}>
              <button onClick={() => handleSort('title')} className={thBtnClass}>
                Title <SortIcon field="title" />
              </button>
            </th>
            <th className={thClass}>
              <button onClick={() => handleSort('status')} className={thBtnClass}>
                Status <SortIcon field="status" />
              </button>
            </th>
            <th className={thClass}>
              <button onClick={() => handleSort('startDate')} className={thBtnClass}>
                Start <SortIcon field="startDate" />
              </button>
            </th>
            <th className={thClass}>
              <button onClick={() => handleSort('endDate')} className={thBtnClass}>
                End <SortIcon field="endDate" />
              </button>
            </th>
            <th className={thClass}>
              <button onClick={() => handleSort('swimlane')} className={thBtnClass}>
                Channel <SortIcon field="swimlane" />
              </button>
            </th>
            <th className={thClass}>
              <button onClick={() => handleSort('campaign')} className={thBtnClass}>
                Campaign <SortIcon field="campaign" />
              </button>
            </th>
            <th className={thClass}>
              <button onClick={() => handleSort('cost')} className={thBtnClass}>
                Cost <SortIcon field="cost" />
              </button>
            </th>
            <th className={`${thClass} text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`}>
              Currency
            </th>
            <th className={`${thClass} text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`}>
              Region
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedActivities.map((activity, index) => {
            const status = statuses.find((s) => s.id === activity.statusId);
            const swimlane = swimlanes.find((s) => s.id === activity.swimlaneId);
            const campaign = campaigns.find((c) => c.id === activity.campaignId);

            return (
              <tr
                key={activity.id}
                className={`border-b border-card-border/30 hover:bg-muted/50 cursor-pointer transition-colors ${
                  index % 2 === 0 ? '' : 'bg-surface/20'
                }`}
                onClick={() => onActivityClick(activity)}
              >
                <td className="px-4 py-2.5">
                  {editingCell?.id === activity.id && editingCell?.field === 'title' ? (
                    <input
                      type="text"
                      defaultValue={activity.title}
                      autoFocus
                      className={`w-full ${inputClass} ring-1 ring-accent/40`}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => handleInlineEdit(activity.id, 'title', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInlineEdit(activity.id, 'title', e.currentTarget.value);
                        else if (e.key === 'Escape') setEditingCell(null);
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm font-medium text-foreground"
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingCell({ id: activity.id, field: 'title' }); }}
                    >
                      {activity.title}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: status?.color }} />
                    <select
                      value={activity.statusId || ''}
                      onChange={(e) => handleInlineEdit(activity.id, 'statusId', e.target.value)}
                      className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                    >
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="date"
                    value={activity.startDate}
                    onChange={(e) => handleInlineEdit(activity.id, 'startDate', e.target.value)}
                    className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                  />
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="date"
                    value={activity.endDate}
                    onChange={(e) => handleInlineEdit(activity.id, 'endDate', e.target.value)}
                    className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                  />
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={activity.swimlaneId}
                    onChange={(e) => handleInlineEdit(activity.id, 'swimlaneId', e.target.value)}
                    className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                  >
                    {swimlanes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={activity.campaignId || ''}
                    onChange={(e) => handleInlineEdit(activity.id, 'campaignId', e.target.value || null)}
                    className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                  >
                    <option value="">None</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activity.cost || '0'}
                    onChange={(e) => handleInlineEdit(activity.id, 'cost', e.target.value)}
                    className={`text-sm w-24 ${inputClass} border-transparent bg-transparent hover:bg-muted tabular-nums`}
                  />
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={activity.currency || 'US$'}
                    onChange={(e) => handleInlineEdit(activity.id, 'currency', e.target.value)}
                    className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={activity.region || 'US'}
                    onChange={(e) => handleInlineEdit(activity.id, 'region', e.target.value)}
                    className={`text-sm ${inputClass} border-transparent bg-transparent hover:bg-muted`}
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activities.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <svg className="w-10 h-10 text-muted-foreground/30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-sm text-muted-foreground">No activities found</p>
        </div>
      )}
    </div>
  );
}
