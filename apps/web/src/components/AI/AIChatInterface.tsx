/**
 * AI Chat Interface Component
 * Main chat interface for RAG-powered feedback conversations
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../../hooks/useAIChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { TypingIndicator } from './TypingIndicator';
import { ChatSources } from './ChatSources';
import { EmptyStates } from '../Empty/EmptyStates';

interface AIChatInterfaceProps {
  organizationId: string;
  sessionId?: string;
  onNewSession?: (sessionId: string) => void;
  className?: string;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  organizationId,
  sessionId: initialSessionId,
  onNewSession,
  className = ''
}) => {
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const [showSources, setShowSources] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sessions,
    isLoading,
    isConnected,
    isTyping,
    error,
    sendMessage,
    createSession,
    switchSession,
    clearSession,
    retryLastMessage,
    currentSources
  } = useAIChat(organizationId, currentSessionId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle new session creation
  const handleNewSession = async (title?: string) => {
    try {
      const newSessionId = await createSession(title);
      setCurrentSessionId(newSessionId);
      onNewSession?.(newSessionId);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  // Handle session switching
  const handleSessionSwitch = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    switchSession(sessionId);
  };

  // Handle message sending
  const handleSendMessage = async (message: string) => {
    if (!currentSessionId) {
      // Create a new session if none exists
      await handleNewSession();
    }
    await sendMessage(message);
  };

  return (
    <div className={`flex h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Chat Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSwitch}
        onNewSession={handleNewSession}
        onDeleteSession={clearSession}
        className="w-80 border-r border-gray-200 dark:border-gray-700"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Assistant
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ask questions about your feedback data
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Sources Toggle */}
              {currentSources && currentSources.length > 0 && (
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  Sources ({currentSources.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <EmptyStates.aiChatWelcome
                  onSampleQuestion={handleSendMessage}
                />
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={`${message.id || index}`}
                      message={message}
                      onRetry={message.role === 'user' ? undefined : retryLastMessage}
                      className="max-w-4xl"
                    />
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <TypingIndicator className="max-w-4xl" />
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-4xl">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Something went wrong
                          </h3>
                          <p className="mt-1 text-sm text-red-700">{error}</p>
                          <button
                            onClick={retryLastMessage}
                            className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading || !isConnected}
                placeholder={
                  isConnected
                    ? "Ask me anything about your feedback..."
                    : "Connecting to AI service..."
                }
              />
            </div>
          </div>

          {/* Sources Panel */}
          {showSources && (
            <ChatSources
              sources={currentSources || []}
              onClose={() => setShowSources(false)}
              className="w-96 border-l border-gray-200 dark:border-gray-700"
            />
          )}
        </div>
      </div>
    </div>
  );
};