'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceAgent, CalendarContext } from '@/hooks/useVoiceAgent';
import type { AgentCallbacks, AgentCalendarContext } from '@/lib/agent-callbacks';
import { executeAction } from '@/lib/agent-action-executor';
import {
  SolarLightbulbLinear,
  SolarChatRoundLinear,
  SolarTrashBinLinear,
  SolarCloseLinear,
  SolarMicrophone,
  SolarVolume,
  SolarLetterLinear,
} from '@/components/SolarIcons';
import { AIBriefPanel, GeneratedActivity } from '@/components/AIBriefPanel';

export type CopilotTab = 'chat' | 'brief';

interface AICopilotProps {
  calendarId: string;
  isOpen: boolean;
  onClose: () => void;
  agentCallbacks?: AgentCallbacks;
  voiceContext?: CalendarContext | null;
  swimlanes: Array<{ id: string; name: string }>;
  onApplyBrief: (activities: GeneratedActivity[]) => void;
  initialTab?: CopilotTab;
}

interface ActionInfo {
  tool: string;
  params: Record<string, unknown>;
  status: 'done' | 'failed';
  message: string;
}

interface ConfirmationInfo {
  tool: string;
  params: Record<string, unknown>;
  message: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, unknown>[];
  source?: 'text' | 'voice';
  timestamp: Date;
  actions?: ActionInfo[];
  confirmations?: ConfirmationInfo[];
}

const SUGGESTED_QUESTIONS = [
  'Switch to dashboard view',
  "What's our total budget?",
  'Create an activity for next week',
  'Which campaigns are over budget?',
  'Top performing campaigns',
];

const VOICE_SUGGESTIONS = [
  'Create an activity for next week',
  'Switch to dashboard view',
  'How much have we spent?',
];

export function AICopilot({ calendarId, isOpen, onClose, agentCallbacks, voiceContext, swimlanes, onApplyBrief, initialTab }: AICopilotProps) {
  const [activeTab, setActiveTab] = useState<CopilotTab>(initialTab || 'chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const callbacksRef = useRef(agentCallbacks);
  const contextRef = useRef(voiceContext);

  // Keep refs in sync
  useEffect(() => { callbacksRef.current = agentCallbacks; }, [agentCallbacks]);
  useEffect(() => { contextRef.current = voiceContext; }, [voiceContext]);

  // Respond to initialTab changes (e.g. voice agent triggers "open brief")
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Voice agent integration - use agentCallbacks for voice too
  const voiceCallbacks = agentCallbacks ? {
    onCreateActivity: agentCallbacks.onCreateActivity,
    onUpdateActivity: agentCallbacks.onUpdateActivity,
    onDeleteActivity: agentCallbacks.onDeleteActivity,
    onSwitchView: agentCallbacks.onSwitchView,
    onSetSearch: agentCallbacks.onSetSearch,
    onSetCampaignFilter: agentCallbacks.onSetCampaignFilter,
    onSetStatusFilter: agentCallbacks.onSetStatusFilter,
    onClearFilters: agentCallbacks.onClearFilters,
    onOpenCopilot: agentCallbacks.onOpenCopilot,
    onOpenBriefGenerator: agentCallbacks.onOpenBriefGenerator,
  } : undefined;

  const defaultVoiceCallbacks = {
    onCreateActivity: async () => {},
    onUpdateActivity: async () => {},
    onDeleteActivity: async () => {},
    onSwitchView: () => {},
    onSetSearch: () => {},
    onSetCampaignFilter: () => {},
    onSetStatusFilter: () => {},
    onClearFilters: () => {},
    onOpenCopilot: () => {},
    onOpenBriefGenerator: () => {},
  };

  const voice = useVoiceAgent(voiceCallbacks || defaultVoiceCallbacks, voiceContext || null);
  const hasVoice = !!agentCallbacks;

  // Sync voice conversation entries into our messages
  const lastSyncedVoiceCount = useRef(0);
  useEffect(() => {
    if (voice.conversation.length > lastSyncedVoiceCount.current) {
      const newEntries = voice.conversation.slice(lastSyncedVoiceCount.current);
      const newMessages: ChatMessage[] = newEntries.map((entry) => ({
        id: entry.id,
        role: entry.role,
        content: entry.content,
        source: 'voice' as const,
        timestamp: entry.timestamp,
      }));
      setMessages((prev) => [...prev, ...newMessages]);
      lastSyncedVoiceCount.current = voice.conversation.length;
    }
  }, [voice.conversation]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, voice.isProcessing, scrollToBottom]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, activeTab]);

  // Execute a confirmed destructive action
  const handleConfirm = useCallback(async (messageId: string, confirmationIndex: number) => {
    const cb = callbacksRef.current;
    const ctx = contextRef.current;
    if (!cb || !ctx) return;

    setMessages((prev) => prev.map((msg) => {
      if (msg.id !== messageId || !msg.confirmations) return msg;
      const updated = [...msg.confirmations];
      updated[confirmationIndex] = { ...updated[confirmationIndex], status: 'confirmed' };
      return { ...msg, confirmations: updated };
    }));

    // Find the confirmation
    const msg = messages.find((m) => m.id === messageId);
    const confirmation = msg?.confirmations?.[confirmationIndex];
    if (!confirmation) return;

    try {
      const agentContext: AgentCalendarContext = {
        calendarId,
        swimlanes: ctx.swimlanes,
        statuses: ctx.statuses,
        campaigns: ctx.campaigns,
        activities: ctx.activities,
      };
      const result = await executeAction(confirmation.tool, confirmation.params, cb, agentContext);

      // Add action result as a new message
      const resultMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message,
        source: 'text',
        timestamp: new Date(),
        actions: [{ tool: confirmation.tool, params: confirmation.params, status: result.success ? 'done' : 'failed', message: result.message }],
      };
      setMessages((prev) => [...prev, resultMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Failed to execute action. Please try again.',
        source: 'text',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [messages, calendarId]);

  const handleCancel = useCallback((messageId: string, confirmationIndex: number) => {
    setMessages((prev) => prev.map((msg) => {
      if (msg.id !== messageId || !msg.confirmations) return msg;
      const updated = [...msg.confirmations];
      updated[confirmationIndex] = { ...updated[confirmationIndex], status: 'cancelled' };
      return { ...msg, confirmations: updated };
    }));
  }, []);

  // Send text message through copilot API (now agentic)
  const sendTextMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      source: 'text',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for multi-turn context
      const history = messages
        .filter((m) => m.source === 'text')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      // Build context from voiceContext
      const ctx = contextRef.current;
      const apiContext = ctx ? {
        swimlanes: ctx.swimlanes.map((s) => ({ id: s.id, name: s.name })),
        statuses: ctx.statuses.map((s) => ({ id: s.id, name: s.name })),
        campaigns: ctx.campaigns.map((c) => ({ id: c.id, name: c.name })),
        activityCount: ctx.activities.length,
      } : undefined;

      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId,
          question: question.trim(),
          history,
          context: apiContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const result: {
        answer: string;
        data?: Record<string, unknown>[];
        actions: Array<{ tool: string; params: Record<string, unknown> }>;
        confirmations: Array<{ tool: string; params: Record<string, unknown>; message: string }>;
      } = await response.json();

      // Execute client-side actions
      const executedActions: ActionInfo[] = [];
      const cb = callbacksRef.current;

      if (cb && ctx && result.actions.length > 0) {
        const agentContext: AgentCalendarContext = {
          calendarId,
          swimlanes: ctx.swimlanes,
          statuses: ctx.statuses,
          campaigns: ctx.campaigns,
          activities: ctx.activities,
        };

        for (const action of result.actions) {
          try {
            const actionResult = await executeAction(action.tool, action.params, cb, agentContext);
            executedActions.push({
              tool: action.tool,
              params: action.params,
              status: actionResult.success ? 'done' : 'failed',
              message: actionResult.message,
            });
          } catch {
            executedActions.push({
              tool: action.tool,
              params: action.params,
              status: 'failed',
              message: `Failed to execute ${action.tool}.`,
            });
          }
        }
      }

      // Map confirmations
      const pendingConfirmations: ConfirmationInfo[] = (result.confirmations || []).map((c) => ({
        ...c,
        status: 'pending' as const,
      }));

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        data: result.data,
        source: 'text',
        timestamp: new Date(),
        actions: executedActions.length > 0 ? executedActions : undefined,
        confirmations: pendingConfirmations.length > 0 ? pendingConfirmations : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a voice command (action) through the voice agent
  const sendVoiceCommand = useCallback((text: string) => {
    if (!text.trim() || voice.isProcessing || isLoading) return;
    voice.sendToAgent(text.trim());
  }, [voice, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage(input);
    }
  };

  const handleClearAll = () => {
    setMessages([]);
    voice.clearConversation();
    lastSyncedVoiceCount.current = 0;
  };

  const renderDataTable = (data: Record<string, unknown>[]) => {
    if (!data.length) return null;
    const columns = Object.keys(data[0]);

    return (
      <div className="mt-2 overflow-x-auto rounded border border-card-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-2 py-1.5 text-left font-semibold text-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-card-border">
                {columns.map((col) => (
                  <td key={col} className="px-2 py-1.5 text-foreground whitespace-nowrap">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderActions = (actions: ActionInfo[]) => {
    return (
      <div className="mt-2 space-y-1">
        {actions.map((action, i) => (
          <div
            key={i}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${
              action.status === 'done'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${action.status === 'done' ? 'bg-green-500' : 'bg-red-500'}`} />
            {action.message}
          </div>
        ))}
      </div>
    );
  };

  const renderConfirmations = (confirmations: ConfirmationInfo[], messageId: string) => {
    return (
      <div className="mt-2 space-y-2">
        {confirmations.map((confirmation, i) => (
          <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
            <p className="text-xs text-foreground font-medium mb-2">{confirmation.message}</p>
            {confirmation.status === 'pending' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(messageId, i)}
                  className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleCancel(messageId, i)}
                  className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-muted text-foreground rounded-md hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className={`text-[11px] font-medium ${confirmation.status === 'confirmed' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                {confirmation.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const isAnyLoading = isLoading || voice.isProcessing;

  const statusLabel = voice.isListening
    ? 'Listening...'
    : voice.isProcessing
    ? 'Thinking...'
    : voice.isSpeaking
    ? 'Speaking...'
    : null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] sm:max-w-full bg-card border-l border-card-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-card-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                <SolarLightbulbLinear className="w-4 h-4 text-accent-purple" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">AI Copilot</h2>
                {statusLabel && (
                  <p className="text-[10px] text-muted-foreground">{statusLabel}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {activeTab === 'chat' && messages.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 text-gray-400 hover:text-foreground transition-colors rounded-md hover:bg-muted"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <SolarTrashBinLinear className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close copilot"
                className="p-1.5 text-gray-400 hover:text-foreground transition-colors rounded-md hover:bg-muted"
              >
                <SolarCloseLinear className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'chat'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SolarChatRoundLinear className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('brief')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'brief'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SolarLightbulbLinear className="w-3.5 h-3.5" />
              Brief
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'chat' ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !isAnyLoading && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center mx-auto mb-3">
                      <SolarChatRoundLinear className="w-6 h-6 text-accent-purple" />
                    </div>
                    <p className="text-sm text-foreground font-medium">AI Copilot</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Ask questions or give commands — I can switch views, create activities, manage channels, and more.
                      {voice.isSupported && hasVoice && ' Tap the mic button to speak a command.'}
                    </p>
                  </div>

                  {/* CTA Card for AI Brief */}
                  <button
                    onClick={() => setActiveTab('brief')}
                    className="w-full text-left p-3 rounded-lg border border-accent-purple/20 bg-accent-purple/5 hover:bg-accent-purple/10 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <SolarLightbulbLinear className="w-4 h-4 text-accent-purple" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Plan a Campaign with AI Brief</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                          Describe your goal and get a full plan of activities, dates, and costs.
                        </p>
                        <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-purple group-hover:underline">
                          Start Brief &rarr;
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Try saying
                    </p>
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendTextMessage(q)}
                        className="block w-full text-left px-3 py-2 text-sm text-foreground bg-muted rounded-lg hover:bg-accent-purple/10 hover:text-accent-purple transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {hasVoice && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Voice commands
                      </p>
                      {VOICE_SUGGESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendVoiceCommand(q)}
                          className="block w-full text-left px-3 py-2 text-sm text-foreground bg-muted rounded-lg hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          &ldquo;{q}&rdquo;
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-accent-purple text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.source === 'voice' && msg.role === 'user' && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <SolarMicrophone className="w-3 h-3 text-white/70" />
                        <span className="text-[10px] text-white/60">Voice</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.data && msg.data.length > 0 && renderDataTable(msg.data)}
                    {msg.actions && msg.actions.length > 0 && renderActions(msg.actions)}
                    {msg.confirmations && msg.confirmations.length > 0 && renderConfirmations(msg.confirmations, msg.id)}
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === 'user' ? 'text-white/60' : 'text-gray-400'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Live transcript while listening */}
              {voice.isListening && voice.transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg px-3 py-2 bg-accent-purple/60 text-white/80">
                    <p className="text-sm italic">{voice.transcript}</p>
                  </div>
                </div>
              )}

              {isAnyLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested chips when there are messages */}
            {messages.length > 0 && !isAnyLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendTextMessage(q)}
                    className="text-[11px] px-2 py-1 rounded-full border border-card-border text-gray-500 dark:text-gray-400 hover:border-accent-purple hover:text-accent-purple transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Voice error display */}
            {voice.error && (
              <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                <p className="text-xs text-red-500">{voice.error}</p>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-card-border bg-card">
              <div className="flex items-center gap-2">
                {/* Mic button */}
                {voice.isSupported && hasVoice && (
                  <button
                    onClick={voice.isSpeaking ? voice.stopSpeaking : voice.toggleListening}
                    disabled={isLoading || voice.isProcessing}
                    className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                      voice.isListening
                        ? 'bg-red-500 text-white'
                        : voice.isSpeaking
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-card-hover'
                    }`}
                    title={voice.isListening ? 'Stop listening' : voice.isSpeaking ? 'Stop speaking' : 'Start listening'}
                  >
                    {voice.isListening && (
                      <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-50" />
                    )}
                    {voice.isSpeaking ? (
                      <SolarVolume className="w-5 h-5" />
                    ) : (
                      <SolarMicrophone className="w-5 h-5" />
                    )}
                  </button>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or give a command..."
                  disabled={isAnyLoading || voice.isListening}
                  className="flex-1 px-3 py-2 text-sm border border-card-border rounded-lg bg-background text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-purple disabled:opacity-50"
                />
                <button
                  onClick={() => sendTextMessage(input)}
                  disabled={!input.trim() || isAnyLoading}
                  aria-label="Send message"
                  className="px-3 py-2 bg-accent-purple text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <SolarLetterLinear className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Brief tab */
          <AIBriefPanel
            calendarId={calendarId}
            swimlanes={swimlanes}
            onApply={onApplyBrief}
          />
        )}
      </div>
    </>
  );
}
