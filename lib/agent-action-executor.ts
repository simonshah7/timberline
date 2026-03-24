import type { AgentCallbacks, AgentCalendarContext } from './agent-callbacks';

type ViewType = 'timeline' | 'calendar' | 'table' | 'dashboard' | 'events' | 'reports';

export interface ActionResult {
  success: boolean;
  message: string;
}

export function resolveNames(
  params: Record<string, unknown>,
  context: AgentCalendarContext
): Record<string, unknown> {
  const resolved = { ...params };

  if (params.swimlaneName) {
    const sw = context.swimlanes.find(
      (s) => s.name.toLowerCase() === (params.swimlaneName as string).toLowerCase()
    );
    resolved.swimlaneId = sw?.id || context.swimlanes[0]?.id;
    delete resolved.swimlaneName;
  }

  if (params.statusName) {
    const st = context.statuses.find(
      (s) => s.name.toLowerCase() === (params.statusName as string).toLowerCase()
    );
    resolved.statusId = st?.id || context.statuses[0]?.id;
    delete resolved.statusName;
  }

  if (params.campaignName) {
    const camp = context.campaigns.find(
      (c) => c.name.toLowerCase() === (params.campaignName as string).toLowerCase()
    );
    resolved.campaignId = camp?.id || null;
    delete resolved.campaignName;
  }

  return resolved;
}

export async function executeAction(
  tool: string,
  params: Record<string, unknown>,
  callbacks: AgentCallbacks,
  context: AgentCalendarContext
): Promise<ActionResult> {
  switch (tool) {
    case 'create_activity': {
      const resolved = resolveNames(params, context);
      if (!resolved.swimlaneId) {
        if (!context.swimlanes[0]) {
          return { success: false, message: 'No channels available. Please create one first.' };
        }
        resolved.swimlaneId = context.swimlanes[0].id;
      }
      if (!resolved.statusId) {
        if (!context.statuses[0]) {
          return { success: false, message: 'No statuses available.' };
        }
        resolved.statusId = context.statuses[0].id;
      }
      await callbacks.onCreateActivity({
        title: resolved.title as string,
        startDate: resolved.startDate as string,
        endDate: resolved.endDate as string,
        swimlaneId: resolved.swimlaneId as string,
        statusId: resolved.statusId as string,
        description: resolved.description as string | undefined,
        cost: resolved.cost as number | undefined,
        currency: resolved.currency as string | undefined,
        region: resolved.region as string | undefined,
        campaignId: resolved.campaignId as string | null | undefined,
      });
      return { success: true, message: `Created activity "${params.title}".` };
    }

    case 'update_activity': {
      const activityTitle = (params.activityTitle as string).toLowerCase();
      const activity = context.activities.find(
        (a) => a.title.toLowerCase().includes(activityTitle)
      );
      if (!activity) {
        return { success: false, message: `Could not find activity matching "${params.activityTitle}".` };
      }
      const updates = { ...params };
      delete updates.activityTitle;
      const resolved = resolveNames(updates, context);
      await callbacks.onUpdateActivity(activity.id, resolved);
      return { success: true, message: `Updated activity "${activity.title}".` };
    }

    case 'delete_activity': {
      const activityTitle = (params.activityTitle as string).toLowerCase();
      const activity = context.activities.find(
        (a) => a.title.toLowerCase().includes(activityTitle)
      );
      if (!activity) {
        return { success: false, message: `Could not find activity matching "${params.activityTitle}".` };
      }
      await callbacks.onDeleteActivity(activity.id);
      return { success: true, message: `Deleted activity "${activity.title}".` };
    }

    case 'switch_view': {
      callbacks.onSwitchView(params.view as ViewType);
      return { success: true, message: `Switched to ${params.view} view.` };
    }

    case 'navigate_to_date': {
      callbacks.onNavigateToDate(
        params.startDate as string,
        params.endDate as string | undefined
      );
      return { success: true, message: `Navigated to ${params.startDate}${params.endDate ? ` - ${params.endDate}` : ''}.` };
    }

    case 'open_activity_modal': {
      const activityTitle = (params.activityTitle as string).toLowerCase();
      const activity = context.activities.find(
        (a) => a.title.toLowerCase().includes(activityTitle)
      );
      if (!activity) {
        return { success: false, message: `Could not find activity matching "${params.activityTitle}".` };
      }
      callbacks.onOpenActivityModal(activity.id);
      return { success: true, message: `Opened activity "${activity.title}".` };
    }

    case 'set_filter': {
      if (params.searchQuery !== undefined) {
        callbacks.onSetSearch(params.searchQuery as string);
      }
      if (params.campaignName) {
        const camp = context.campaigns.find(
          (c) => c.name.toLowerCase() === (params.campaignName as string).toLowerCase()
        );
        callbacks.onSetCampaignFilter(camp ? [camp.id] : []);
      }
      if (params.statusName) {
        const st = context.statuses.find(
          (s) => s.name.toLowerCase() === (params.statusName as string).toLowerCase()
        );
        callbacks.onSetStatusFilter(st ? [st.id] : []);
      }
      return { success: true, message: 'Applied filters.' };
    }

    case 'clear_filters': {
      callbacks.onClearFilters();
      return { success: true, message: 'Cleared all filters.' };
    }

    case 'open_copilot': {
      callbacks.onOpenCopilot();
      return { success: true, message: 'Opened AI Copilot.' };
    }

    case 'open_brief_generator': {
      callbacks.onOpenBriefGenerator();
      return { success: true, message: 'Opened Brief Generator.' };
    }

    case 'create_swimlane': {
      await callbacks.onCreateSwimlane(params.name as string);
      return { success: true, message: `Created channel "${params.name}".` };
    }

    case 'edit_swimlane': {
      const sw = context.swimlanes.find(
        (s) => s.name.toLowerCase() === (params.swimlaneName as string).toLowerCase()
      );
      if (!sw) {
        return { success: false, message: `Could not find channel "${params.swimlaneName}".` };
      }
      await callbacks.onEditSwimlane(sw.id, params.newName as string);
      return { success: true, message: `Renamed channel "${params.swimlaneName}" to "${params.newName}".` };
    }

    case 'delete_swimlane': {
      const sw = context.swimlanes.find(
        (s) => s.name.toLowerCase() === (params.swimlaneName as string).toLowerCase()
      );
      if (!sw) {
        return { success: false, message: `Could not find channel "${params.swimlaneName}".` };
      }
      await callbacks.onDeleteSwimlane(sw.id);
      return { success: true, message: `Deleted channel "${params.swimlaneName}".` };
    }

    case 'create_campaign': {
      await callbacks.onCreateCampaign(
        params.name as string,
        params.budget as number | undefined
      );
      return { success: true, message: `Created campaign "${params.name}".` };
    }

    case 'open_export': {
      callbacks.onOpenExport();
      return { success: true, message: 'Opened export modal.' };
    }

    case 'open_settings': {
      callbacks.onOpenSettings();
      return { success: true, message: 'Opened settings.' };
    }

    case 'generate_report': {
      callbacks.onGenerateReport(params.type as string);
      return { success: true, message: `Generating ${params.type} report.` };
    }

    // MCP tools - aspirational
    case 'send_slack_message':
    case 'search_email':
    case 'create_calendar_event':
      return { success: true, message: 'Action noted (requires MCP integration).' };

    default:
      return { success: false, message: `Unknown action: ${tool}` };
  }
}
