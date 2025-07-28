/**
 * Chat Message Component
 * Renders individual chat messages with proper styling and actions
 */

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface ChatMessageData {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: Array<{
    feedbackId: string;
    title: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  suggestions?: string[];
  followUpQuestions?: string[];
  fallbackResponse?: boolean;
  error?: {
    type: string;
    recoverable: boolean;
  };
}

interface ChatMessageProps {
  message: ChatMessageData;
  onRetry?: () => void;
  onFollowUp?: (question: string) => void;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRetry,
  onFollowUp,
  className = ''
}) => {
  const [showActions, setShowActions] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Render confidence indicator
  const renderConfidenceIndicator = () => {
    if (!isAssistant || !message.confidence) return null;

    const confidence = message.confidence;
    let color = 'text-green-600';
    let label = 'High confidence';

    if (confidence < 0.3) {
      color = 'text-red-600';
      label = 'Low confidence';
    } else if (confidence < 0.7) {
      color = 'text-yellow-600';
      label = 'Medium confidence';
    }

    return (
      <div className={`text-xs ${color} font-medium`}>
        {label} ({Math.round(confidence * 100)}%)
      </div>
    );
  };

  // Render fallback indicator
  const renderFallbackIndicator = () => {
    if (!message.fallbackResponse) return null;

    return (
      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Limited functionality - some AI services are temporarily unavailable
        </div>
      </div>
    );
  };

  // Render suggestions
  const renderSuggestions = () => {
    if (!message.suggestions || message.suggestions.length === 0) return null;

    return (
      <div className="mt-3">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Suggestions:
        </div>
        <div className="space-y-1">
          {message.suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded"
            >
              • {suggestion}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render follow-up questions
  const renderFollowUpQuestions = () => {
    if (!message.followUpQuestions || message.followUpQuestions.length === 0) return null;

    return (
      <div className="mt-3">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          You might also ask:
        </div>
        <div className="space-y-1">
          {message.followUpQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onFollowUp?.(question)}
              className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          } ${message.error ? 'border border-red-300 bg-red-50' : ''}`}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Assistant-specific content */}
          {isAssistant && (
            <>
              {renderConfidenceIndicator()}
              {renderFallbackIndicator()}
              {renderSuggestions()}
            </>
          )}
        </div>

        {/* Follow-up questions (outside bubble) */}
        {isAssistant && renderFollowUpQuestions()}

        {/* Message metadata */}
        <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>

          {/* Message actions */}
          {showActions && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyToClipboard}
                className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Copy message"
              >
                {copiedToClipboard ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )}
              </button>

              {/* Retry button for failed assistant messages */}
              {isAssistant && onRetry && message.error?.recoverable && (
                <button
                  onClick={onRetry}
                  className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title="Retry message"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'order-1 mr-3' : 'order-2 ml-3'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
        }`}>
          {isUser ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};