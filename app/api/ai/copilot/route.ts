import { NextResponse } from 'next/server';
import { chatCompletion, type ContentBlock } from '@/lib/ai-provider';
import { AGENT_TOOLS } from '@/lib/agent-tools';
import { handleAnalyticsQuery, handleListActivities } from '@/lib/analytics-handler';
import { logger } from '@/lib/logger';

interface AgentAction {
  tool: string;
  params: Record<string, unknown>;
}

interface AgentConfirmation {
  tool: string;
  params: Record<string, unknown>;
  message: string;
}

interface CopilotResponse {
  answer: string;
  data?: Record<string, unknown>[];
  actions: AgentAction[];
  confirmations: AgentConfirmation[];
}

// Tools that require user confirmation before executing
const DESTRUCTIVE_TOOLS = new Set(['delete_activity', 'delete_swimlane']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { calendarId, question, history, context } = body;

    if (!calendarId || !question) {
      return NextResponse.json({ error: 'calendarId and question are required' }, { status: 400 });
    }

    const swimlaneNames = (context?.swimlanes || []).map((s: { name: string }) => s.name).join(', ');
    const statusNames = (context?.statuses || []).map((s: { name: string }) => s.name).join(', ');
    const campaignNames = (context?.campaigns || []).map((c: { name: string }) => c.name).join(', ');
    const activityCount = context?.activityCount || 0;

    const systemPrompt = `You are the AI Copilot for Timberline, a marketing campaign planning application. You help users manage their marketing calendar through both conversation and actions.

Today's date is ${new Date().toISOString().split('T')[0]}.

Current calendar context:
- Channels (swimlanes): ${swimlaneNames || 'none yet'}
- Statuses: ${statusNames || 'none yet'}
- Campaigns: ${campaignNames || 'none yet'}
- Total activities: ${activityCount}

You can:
1. Answer questions about campaigns, budgets, ROI, spending, and metrics using the query_analytics tool
2. List activities using the list_activities tool
3. Take actions like creating/updating/deleting activities, switching views, filtering, managing channels and campaigns
4. Navigate the UI (open export, settings, reports, etc.)

Guidelines:
- When the user asks to create an activity without specifying a channel, use the first available channel.
- When dates are relative (e.g. "next Monday"), calculate the actual date from today.
- For status, default to "Considering" if not specified.
- Use markdown formatting for longer responses.
- Always use the appropriate tool when the user wants to perform an action or ask a data question.
- If the user asks something conversational, respond naturally without tools.
- Be helpful, concise, and action-oriented.`;

    // Build message history for multi-turn context
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (history && Array.isArray(history)) {
      // Include last 10 messages for context
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: question });

    const response = await chatCompletion(systemPrompt, messages, AGENT_TOOLS);

    const actions: AgentAction[] = [];
    const confirmations: AgentConfirmation[] = [];
    const textParts: string[] = [];
    let data: Record<string, unknown>[] | undefined;

    // Process response content blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        const toolName = block.name;
        const toolInput = block.input as Record<string, unknown>;

        // Handle server-side tools
        if (toolName === 'query_analytics') {
          const result = await handleAnalyticsQuery(calendarId, toolInput.question as string);
          textParts.push(result.answer);
          if (result.data) {
            data = result.data;
          }
        } else if (toolName === 'list_activities') {
          const result = await handleListActivities(
            calendarId,
            toolInput.swimlaneName as string | undefined,
            toolInput.campaignName as string | undefined
          );
          textParts.push(result.answer);
          if (result.data) {
            data = result.data;
          }
        } else if (DESTRUCTIVE_TOOLS.has(toolName)) {
          // Destructive actions require confirmation
          const confirmMessage = getConfirmationMessage(toolName, toolInput);
          confirmations.push({ tool: toolName, params: toolInput, message: confirmMessage });
        } else {
          // Client-side actions
          actions.push({ tool: toolName, params: toolInput });
        }
      }
    }

    // If Claude only returned tool blocks with no text, generate appropriate descriptions
    if (textParts.length === 0) {
      if (actions.length > 0 || confirmations.length > 0) {
        const descriptions = [
          ...actions.map((a) => getActionDescription(a.tool, a.params)),
          ...confirmations.map((c) => c.message),
        ];
        textParts.push(descriptions.join(' '));
      }
    }

    const result: CopilotResponse = {
      answer: textParts.join('\n\n'),
      data,
      actions,
      confirmations,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Copilot error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Copilot failed: ${message}` }, { status: 500 });
  }
}

function getConfirmationMessage(tool: string, params: Record<string, unknown>): string {
  switch (tool) {
    case 'delete_activity':
      return `Delete activity "${params.activityTitle}"?`;
    case 'delete_swimlane':
      return `Delete channel "${params.swimlaneName}"? This will remove all activities in this channel.`;
    default:
      return `Confirm action: ${tool}?`;
  }
}

function getActionDescription(tool: string, params: Record<string, unknown>): string {
  switch (tool) {
    case 'create_activity':
      return `Creating activity "${params.title}" from ${params.startDate} to ${params.endDate}.`;
    case 'update_activity':
      return `Updating activity "${params.activityTitle}".`;
    case 'switch_view':
      return `Switching to ${params.view} view.`;
    case 'set_filter':
      return `Applying filters.`;
    case 'clear_filters':
      return `Clearing all filters.`;
    case 'navigate_to_date':
      return `Navigating to ${params.startDate}${params.endDate ? ` - ${params.endDate}` : ''}.`;
    case 'open_activity_modal':
      return `Opening activity "${params.activityTitle}".`;
    case 'create_swimlane':
      return `Creating channel "${params.name}".`;
    case 'edit_swimlane':
      return `Renaming channel "${params.swimlaneName}" to "${params.newName}".`;
    case 'create_campaign':
      return `Creating campaign "${params.name}".`;
    case 'open_export':
      return `Opening export modal.`;
    case 'open_settings':
      return `Opening settings.`;
    case 'generate_report':
      return `Generating ${params.type} report.`;
    case 'open_copilot':
      return `Opened AI Copilot.`;
    case 'open_brief_generator':
      return `Opening Brief Generator.`;
    case 'send_slack_message':
      return `Sending Slack message to #${params.channel}.`;
    case 'search_email':
      return `Searching email for "${params.query}".`;
    case 'create_calendar_event':
      return `Creating calendar event "${params.title}".`;
    default:
      return `Performing action: ${tool}.`;
  }
}
