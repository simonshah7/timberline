'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceAgent, VoiceAgentCallbacks, CalendarContext, ConversationEntry } from '@/hooks/useVoiceAgent';
import {
  SolarMicrophone,
  SolarVolume,
  SolarTrashBinLinear,
  SolarCloseLinear,
  SolarLetterLinear,
} from '@/components/SolarIcons';

interface VoiceAgentProps {
  callbacks: VoiceAgentCallbacks;
  context: CalendarContext | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function VoiceAgent({ callbacks, context, isOpen, onClose, onOpen }: VoiceAgentProps) {
  const {
    isSupported,
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    error,
    conversation,
    toggleListening,
    stopSpeaking,
    sendToAgent,
    clearConversation,
  } = useVoiceAgent(callbacks, context);

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isProcessing]);

  const handleTextSubmit = () => {
    if (!textInput.trim() || isProcessing) return;
    sendToAgent(textInput.trim());
    setTextInput('');
  };

  const statusLabel = isListening
    ? 'Listening...'
    : isProcessing
    ? 'Thinking...'
    : isSpeaking
    ? 'Speaking...'
    : 'Ready';

  return (
    <>
      {/* Floating Action Button - always visible when panel is closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onOpen}
            className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-accent-purple-btn text-white shadow-lg shadow-accent-purple-btn/30 hover:opacity-90 transition-opacity flex items-center justify-center"
            title="Voice Agent"
          >
            <SolarMicrophone className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: 'min(500px, calc(100vh - 6rem))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <SolarMicrophone className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Voice Agent</h2>
                  <p className="text-[10px] text-muted-foreground">{statusLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {conversation.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="p-1.5 text-gray-400 hover:text-foreground transition-colors rounded-md hover:bg-muted"
                    title="Clear conversation"
                  >
                    <SolarTrashBinLinear className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-foreground transition-colors rounded-md hover:bg-muted"
                >
                  <SolarCloseLinear className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
              {conversation.length === 0 && !isListening && !isProcessing && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <SolarMicrophone className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm text-foreground font-medium">Voice Agent</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[250px] mx-auto">
                    {isSupported
                      ? 'Tap the mic button and speak a command, or type below.'
                      : 'Voice not supported in this browser. Type your commands below.'}
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {['Create an activity for next week', 'Switch to dashboard view', 'How much have we spent?'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendToAgent(suggestion)}
                        disabled={isProcessing}
                        className="block w-full text-left px-3 py-1.5 text-xs text-foreground bg-muted rounded-lg hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                      >
                        &ldquo;{suggestion}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {conversation.map((entry: ConversationEntry) => (
                <div
                  key={entry.id}
                  className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 ${
                      entry.role === 'user'
                        ? 'bg-accent-purple-btn text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        entry.role === 'user' ? 'text-white/60' : 'text-gray-400'
                      }`}
                    >
                      {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Live transcript */}
              {isListening && transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl px-3 py-2 bg-accent-purple-btn/60 text-white/80">
                    <p className="text-sm italic">{transcript}</p>
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t border-card-border bg-card">
              <div className="flex items-center gap-2">
                {/* Mic button */}
                {isSupported && (
                  <button
                    onClick={isSpeaking ? stopSpeaking : toggleListening}
                    disabled={isProcessing}
                    className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                      isListening
                        ? 'bg-red-500 text-white'
                        : isSpeaking
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-card-hover'
                    }`}
                    title={isListening ? 'Stop listening' : isSpeaking ? 'Stop speaking' : 'Start listening'}
                  >
                    {/* Pulsing ring when listening */}
                    {isListening && (
                      <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-50" />
                    )}
                    {isSpeaking ? (
                      <SolarVolume className="w-5 h-5" />
                    ) : (
                      <SolarMicrophone className="w-5 h-5" />
                    )}
                  </button>
                )}

                {/* Text input */}
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit();
                    }
                  }}
                  placeholder="Type a command..."
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 text-sm border border-card-border rounded-lg bg-background text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                />

                {/* Send button */}
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex-shrink-0 p-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <SolarLetterLinear className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
