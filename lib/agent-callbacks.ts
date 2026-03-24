type ViewType = 'timeline' | 'calendar' | 'table' | 'dashboard' | 'events' | 'reports';

export interface AgentCallbacks {
  // Activity CRUD
  onCreateActivity: (data: {
    title: string;
    startDate: string;
    endDate: string;
    swimlaneId: string;
    statusId: string;
    description?: string;
    cost?: number;
    currency?: string;
    region?: string;
    campaignId?: string | null;
  }) => Promise<void>;
  onUpdateActivity: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;

  // Navigation & views
  onSwitchView: (view: ViewType) => void;
  onNavigateToDate: (startDate: string, endDate?: string) => void;
  onOpenActivityModal: (activityId: string) => void;

  // Filtering
  onSetSearch: (query: string) => void;
  onSetCampaignFilter: (ids: string[]) => void;
  onSetStatusFilter: (ids: string[]) => void;
  onClearFilters: () => void;

  // Copilot panels
  onOpenCopilot: () => void;
  onOpenBriefGenerator: () => void;

  // Swimlane/channel management
  onCreateSwimlane: (name: string) => Promise<void>;
  onEditSwimlane: (id: string, name: string) => Promise<void>;
  onDeleteSwimlane: (id: string) => Promise<void>;

  // Campaign management
  onCreateCampaign: (name: string, budget?: number) => Promise<void>;

  // UI panels
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onGenerateReport: (type: string) => void;
}

export interface AgentCalendarContext {
  calendarId: string;
  swimlanes: Array<{ id: string; name: string }>;
  statuses: Array<{ id: string; name: string; color: string }>;
  campaigns: Array<{ id: string; name: string }>;
  activities: Array<{ id: string; title: string; swimlaneId: string; statusId: string; campaignId: string | null }>;
}
