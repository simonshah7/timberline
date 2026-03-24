import { NextResponse } from 'next/server';
import { chatCompletion, type ContentBlock } from '@/lib/ai-provider';
import { AGENT_TOOLS } from '@/lib/agent-tools';
import { handleAnalyticsQuery, handleListActivities } from '@/lib/analytics-handler';
import { logger } from '@/lib/logger';

interface VoiceAgentAction {
  tool: string;
  params: Record<string, unknown>;
  result?: unknown;
}

interface VoiceAgentResponse {
  speech: string;
  actions: VoiceAgentAction[];
}

export async function POST(request: Request) {
  try {
    const { transcript, calendarId, context } = await request.json();

    if (!transcript || !calendarId) {
      return NextResponse.json({ error: 'transcript and calendarId are required' }, { status: 400 });
    }

    const swimlaneNames = (context?.swimlanes || []).map((s: { name: string }) => s.name).join(', ');
    const statusNames = (context?.statuses || []).map((s: { name: string }) => s.name).join(', ');
    const campaignNames = (context?.campaigns || []).map((c: { name: string }) => c.name).join(', ');
    const activityCount = context?.activityCount || 0;

    const systemPrompt = `You are a voice assistant for Timberline, a marketing campaign planning application. The user speaks commands and you respond concisely (1-2 sentences max) since your response will be spoken aloud.

Today's date is ${new Date().toISOString().split('T')[0]}.

Current calendar context:
- Channels (swimlanes): ${swimlaneNames || 'none yet'}
- Statuses: ${statusNames || 'none yet'}
- Campaigns: ${campaignNames || 'none yet'}
- Total activities: ${activityCount}

When the user asks to create an activity without specifying a channel, use the first available channel.
When dates are relative (e.g. "next Monday"), calculate the actual date from today.
For status, default to "Considering" if not specified.
Be helpful, concise, and action-oriented. Always use tools when the user wants to perform an action.
If the user asks something conversational, just respond naturally without tools.`;

    const response = await chatCompletion(
      systemPrompt,
      [{ role: 'user', content: transcript }],
      AGENT_TOOLS,
    );

    const actions: VoiceAgentAction[] = [];
    let speechParts: string[] = [];

    // Process tool use blocks
    for (const block of response.content) {
      if (block.type === 'text') {
        speechParts.push(block.text);
      } else if (block.type === 'tool_use') {
        const toolName = block.name;
        const toolInput = block.input as Record<string, unknown>;

        // Handle server-side tools
        if (toolName === 'query_analytics') {
          const result = await handleAnalyticsQuery(calendarId, toolInput.question as string);
          speechParts.push(result.answer);
        } else if (toolName === 'list_activities') {
          const result = await handleListActivities(
            calendarId,
            toolInput.swimlaneName as string | undefined,
            toolInput.campaignName as string | undefined
          );
          speechParts.push(result.answer);
        } else {
          // Client-side actions
          actions.push({ tool: toolName, params: toolInput });
        }
      }
    }

    // If Claude only returned tool_use blocks with no text, generate appropriate speech
    if (speechParts.length === 0 && actions.length > 0) {
      const actionDescriptions = actions.map((a) => {
        switch (a.tool) {
          case 'create_activity':
            return `Created activity "${a.params.title}" from ${a.params.startDate} to ${a.params.endDate}.`;
          case 'update_activity':
            return `Updated activity "${a.params.activityTitle}".`;
          case 'delete_activity':
            return `Deleted activity "${a.params.activityTitle}".`;
          case 'switch_view':
            return `Switched to ${a.params.view} view.`;
          case 'set_filter':
            return `Applied filters.`;
          case 'clear_filters':
            return `Cleared all filters.`;
          case 'open_copilot':
            return `Opened the AI Copilot.`;
          case 'open_brief_generator':
            return `Opened the Brief Generator.`;
          case 'navigate_to_date':
            return `Navigated to ${a.params.startDate}.`;
          case 'open_activity_modal':
            return `Opened activity "${a.params.activityTitle}".`;
          case 'create_swimlane':
            return `Created channel "${a.params.name}".`;
          case 'edit_swimlane':
            return `Renamed channel "${a.params.swimlaneName}" to "${a.params.newName}".`;
          case 'delete_swimlane':
            return `Deleted channel "${a.params.swimlaneName}".`;
          case 'create_campaign':
            return `Created campaign "${a.params.name}".`;
          case 'open_export':
            return `Opened the export modal.`;
          case 'open_settings':
            return `Opened settings.`;
          case 'generate_report':
            return `Generating ${a.params.type} report.`;
          case 'send_slack_message':
            return `Sent Slack message to #${a.params.channel}.`;
          case 'search_email':
            return `Searching email for "${a.params.query}".`;
          case 'create_calendar_event':
            return `Created calendar event "${a.params.title}".`;
          default:
            return `Done.`;
        }
      });
      speechParts = actionDescriptions;
    }

    const result: VoiceAgentResponse = {
      speech: speechParts.join(' '),
      actions,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Voice agent error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Voice agent failed: ${message}` }, { status: 500 });
  }
}
